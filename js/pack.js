/* ============================================================
   PACKING: turn a selection into a reusable Component
   The selected circuit is stored as a definition in `lib`.
   - The internal Inputs (switch) become input pins.
   - The internal Outputs (out) become output pins.
   - The rest stays hidden inside the black box.
   ============================================================ */
let selectionStart = null;   // for selection dragging
let dragBox = null;

function makePackage(sel, name, inIdx, outIdx) {
  // sel: selected components; inIdx/outIdx: indexes within sel
  // of the Inputs/Outputs acting as pins (order chosen by the user)
  const idMap = new Map();   // old id -> new id (renumbered from 1)
  let nid = 1;
  const def = { name, inputs: [], outputs: [], inStubs: [], outStubs: [], components: [], wires: [] };

  // stubs: a "stub" component with one terminal 0, serves as pin<->internal connection
  let stubId = 1000;
  const mkStub = () => stubId++;

  for (const c of sel) {
    const newId = nid++;
    idMap.set(c.id, newId);
  }

  // classify components: pins are switch/out selected as pins
  const pinInSel = new Set(inIdx);   // ids of switches chosen as input pins
  const pinOutSel = new Set(outIdx); // ids of outs chosen as output pins

  const inPins = [];
  const outPins = [];

  for (const c of sel) {
    const newId = idMap.get(c.id);
    if (c.type === "switch" && pinInSel.has(c.id)) {
      // input pin: registered as a stub, doesn't go into the internal circuit
      inPins.push({ oldId: c.id, newId, label: c.label });
      continue;
    }
    if (c.type === "out" && pinOutSel.has(c.id)) {
      outPins.push({ oldId: c.id, newId, label: c.label });
      continue;
    }
    def.components.push({ id: newId, type: c.type, on: c.on });
  }

  // order pins according to user's click order (inIdx / outIdx)
  inPins.sort((a, b) => {
    const ia = inIdx.indexOf(a.oldId), ib = inIdx.indexOf(b.oldId);
    return (ia === -1 ? 999999 : ia) - (ib === -1 ? 999999 : ib);
  });
  outPins.sort((a, b) => {
    const ja = outIdx.indexOf(a.oldId), jb = outIdx.indexOf(b.oldId);
    return (ja === -1 ? 999999 : ja) - (jb === -1 ? 999999 : jb);
  });

  inPins.forEach((p, i) => {
    def.inStubs.push(p.newId);
    def.inputs.push(p.label || "IN" + (i + 1));
  });
  outPins.forEach((p, j) => {
    def.outStubs.push(p.newId);
    def.outputs.push(p.label || "OUT" + (j + 1));
  });

  // internal wires: only between components that go inside (or to stubs)
  for (const w of state.wires) {
    const inSelA = idMap.has(w.a.c), inSelB = idMap.has(w.b.c);
    if (!inSelA || !inSelB) continue;
    def.wires.push({
      a: { c: idMap.get(w.a.c), t: w.a.t },
      b: { c: idMap.get(w.b.c), t: w.b.t },
    });
  }

  // register the type dynamically
  registerPackedType(def);
  lib[name] = def;

  // replace the selection on the canvas with ONE instance of the component
  const instance = {
    id: state.nextId++,
    type: name,
    x: (Math.min(...sel.map(c => c.x)) + Math.max(...sel.map(c => c.x))) / 2,
    y: (Math.min(...sel.map(c => c.y)) + Math.max(...sel.map(c => c.y))) / 2,
    rot: 0,
    on: false,
  };
  // remember each piece's position relative to the instance's center,
  // so unpacking can restore it as it was
  def.layout = {};
  for (const c of sel) def.layout[idMap.get(c.id)] = { dx: c.x - instance.x, dy: c.y - instance.y };
  state.components = state.components.filter(c => !sel.includes(c));
  // Wires joining the selection with the outside world get reconnected
  // to the instance's pins (if the internal end was a pin).
  const pinTermOf = new Map(); // old pin id -> terminal index on the instance
  def.inStubs.forEach((sid, i) => {
    const oldId = [...idMap.entries()].find(([, v]) => v === sid)?.[0];
    if (oldId !== undefined) pinTermOf.set(oldId, i);
  });
  def.outStubs.forEach((oid, j) => {
    const oldId = [...idMap.entries()].find(([, v]) => v === oid)?.[0];
    if (oldId !== undefined) pinTermOf.set(oldId, def.inputs.length + j);
  });
  state.wires = state.wires.filter(w => {
    const aIn = idMap.has(w.a.c), bIn = idMap.has(w.b.c);
    if (aIn && bIn) return false;          // internal: it went with the package
    if (!aIn && !bIn) return true;         // external: it stays
    // mixed: reconnect the internal end to the instance's pin
    const inner = aIn ? w.a : w.b;
    const term = pinTermOf.get(inner.c);
    if (term === undefined) return false;  // it wasn't a pin: the wire is discarded
    if (aIn) w.a = { c: instance.id, t: term };
    else w.b = { c: instance.id, t: term };
    return true;
  });
  state.components.push(instance);

  // reconnect the external wires that reached the pin-Inputs/Outputs
  // (the ones going to other selected components are already inside)
  save();
  return instance;
}

/* Register the packed type: terminals = inStubs + outStubs */
function registerPackedType(def) {
  const terms = [];
  for (let i = 0; i < def.inputs.length; i++) terms.push([-30, (i - (def.inputs.length - 1) / 2) * 22]);
  for (let j = 0; j < def.outputs.length; j++) terms.push([30, (j - (def.outputs.length - 1) / 2) * 22]);
  TYPE_DEFS[def.name] = { label: def.name, terms, termNames: [...def.inputs, ...def.outputs] };
  OUT_IDX[def.name] = null;    // not a primitive gate: handled by the flattening
  IN_COUNT[def.name] = def.inputs.length;
  // NOTE: not added to GATE_FN — expanded in flattenCircuit()
}

/* Re-register the type after editing pin names */
function refreshPins(def) {
  registerPackedType(def);  // same terminals; termNames gets updated
  // the side panel and canvas labels refresh by themselves (rAF)
}

/* ============================================================
   SIDE PANEL FOR EDITING PACKED COMPONENTS
   Opens with a double click on an instance on the canvas.
   Allows renaming the input and output pins.
   ============================================================ */
let pinPanelFor = null; // name of the type being edited

function openPinPanel(typeName) {
  pinPanelFor = typeName;
  const def = lib[typeName];
  if (!def) return;
  const panel = document.getElementById("pinPanel");
  const rows = document.getElementById("pinPanelRows");
  rows.innerHTML = "";

  const addSection = (title, list, stubKey) => {
    const h = document.createElement("div");
    h.style.cssText = "font-size:11px;color:var(--accent);margin:10px 0 4px;font-weight:600;";
    h.textContent = title;
    rows.appendChild(h);
    list.forEach((pinName, i) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:5px;";
      const idx = document.createElement("span");
      idx.style.cssText = "font-size:11px;color:var(--dim);min-width:38px;";
      idx.textContent = stubKey === "inputs" ? "IN " + (i + 1) : "OUT " + (i + 1);
      const inp = document.createElement("input");
      inp.value = pinName;
      inp.style.cssText = "flex:1; padding:3px 7px; font-size:12px;";
      inp.addEventListener("input", () => {
        def[stubKey][i] = inp.value.trim() || (stubKey === "inputs" ? "IN" + (i + 1) : "OUT" + (i + 1));
        refreshPins(def);
        save();
      });
      row.appendChild(idx);
      row.appendChild(inp);
      rows.appendChild(row);
    });
  };

  const title = document.getElementById("pinPanelTitle");
  title.textContent = "🧩 " + typeName;
  addSection(t("pinInLabel"), def.inputs, "inputs");
  addSection(t("pinOutLabel"), def.outputs, "outputs");

  // section for renaming the whole component
  const hName = document.createElement("div");
  hName.style.cssText = "font-size:11px;color:var(--accent);margin:14px 0 4px;font-weight:600;";
  hName.textContent = t("pinNameLabel");
  rows.appendChild(hName);
  const nameRow = document.createElement("div");
  nameRow.style.cssText = "display:flex; gap:6px; align-items:center;";
  const nameInput = document.createElement("input");
  nameInput.value = typeName;
  nameInput.style.cssText = "flex:1; padding:3px 7px; font-size:12px;";
  nameInput.addEventListener("keydown", ev => {
    if (ev.key === "Enter") nameInput.blur();
  });
  nameInput.addEventListener("change", () => {
    const ok = renamePackedType(pinPanelFor, nameInput.value);
    if (ok) {
      openPinPanel(nameInput.value.trim().toUpperCase().replace(/\s+/g, "_"));
    } else {
      nameInput.value = pinPanelFor; // restore
    }
  });
  nameRow.appendChild(nameInput);
  rows.appendChild(nameRow);

  panel.style.display = "flex";
}

/* ============================================================
   RENAME A PACKED COMPONENT
   Changes the type's name in the library, re-registers the
   type, updates the placed instances and the toolbar button.
   ============================================================ */
function renamePackedType(oldName, newName) {
  newName = newName.trim().toUpperCase().replace(/\s+/g, "_");
  if (!newName || newName === oldName) return false;
  if (TYPE_DEFS[newName]) {
    alert(t("packErrDup"));
    return false;
  }
  // relocate the definition
  lib[newName] = lib[oldName];
  lib[newName].name = newName;
  delete lib[oldName];

  // update placed instances
  for (const c of state.components) {
    if (c.type === oldName) c.type = newName;
  }

  // re-register the type and delete the old one
  registerPackedType(lib[newName]);
  delete TYPE_DEFS[oldName];
  delete OUT_IDX[oldName];
  delete IN_COUNT[oldName];

  // update toolbar button
  const btn = document.querySelector(`#libTools button[data-tool="${oldName}"]`);
  if (btn) {
    btn.dataset.tool = newName;
    btn.innerHTML = "🧩 " + newName;
    const x = document.createElement("span");
    x.textContent = " ✕";
    x.style.cssText = "color:#ff7a7a; margin-left:5px; font-weight:700;";
    x.title = "Eliminar componente de la biblioteca";
    x.addEventListener("click", ev => {
      ev.stopPropagation();
      removeLibComponent(newName, btn);
    });
    btn.appendChild(x);
  }
  if (pinPanelFor === oldName) pinPanelFor = newName;
  save();
  return true;
}

function closePinPanel() {
  pinPanelFor = null;
  document.getElementById("pinPanel").style.display = "none";
}

/* ============================================================
   RAM16 HEX PANEL: double click on the RAM.
   Shows the 16 cells in hexadecimal, editable, and the
   content is written directly to the engine's Uint8Array.
   ============================================================ */
let hexPanelFor = null;
let hexInputs = [];

function openHexPanel(ramComp) {
  hexPanelFor = ramComp.id;
  const panel = document.getElementById("pinPanel");
  const rows = document.getElementById("pinPanelRows");
  rows.innerHTML = "";
  document.getElementById("pinPanelTitle").textContent = "🧠 RAM16";

  const note = document.createElement("p");
  note.style.cssText = "font-size:11.5px; color:var(--dim); margin-bottom:10px; line-height:1.5;";
  note.innerHTML = t("ramHexNote");
  rows.appendChild(note);

  const table = document.createElement("div");
  table.style.cssText = "font-family:Consolas,monospace; font-size:12px;";
  let data = ramData.get(ramComp.id);
  if (!data) { data = new Uint8Array(16); ramData.set(ramComp.id, data); }

  const inputs = [];
  for (let i = 0; i < 16; i++) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; align-items:center; gap:8px; margin-bottom:3px;";
    const lbl = document.createElement("span");
    lbl.style.cssText = "color:var(--dim); min-width:34px; text-align:right;";
    lbl.textContent = i.toString(16).toUpperCase().padStart(2, "0") + ":";
    const inp = document.createElement("input");
    inp.value = (data[i] ?? 0).toString(16).toUpperCase().padStart(2, "0");
    inp.style.cssText = "width:52px; padding:2px 6px; font-family:Consolas,monospace; font-size:12px; text-align:center;";
    const cur = i === (ramAddrView.get(ramComp.id) ?? 0);
    row.style.background = cur ? "#2a3348" : "";
    inp.addEventListener("change", () => {
      const hex = inp.value.trim();
      if (!/^[0-9a-fA-F]{1,2}$/.test(hex)) { inp.value = (data[i] ?? 0).toString(16).toUpperCase().padStart(2, "0"); return; }
      data[i] = parseInt(hex, 16) & 0xF; // 4 bits: 0-15 (nibble)
      inp.value = data[i].toString(16).toUpperCase().padStart(2, "0");
      save();
    });
    inputs.push({ inp, i });
    row.appendChild(lbl);
    row.appendChild(inp);
    // binary helper representation
    const bin = document.createElement("span");
    bin.style.cssText = "color:var(--dim); font-size:10.5px;";
    bin.textContent = "[" + (data[i] ?? 0).toString(2).padStart(4, "0") + "]";
    inp.addEventListener("input", () => {
      if (/^[0-9a-fA-F]{1,2}$/.test(inp.value) || inp.value === "")
        bin.textContent = "[" + (parseInt(inp.value || "0", 16) & 0xF).toString(2).padStart(4, "0") + "]";
    });
    row.appendChild(bin);
    table.appendChild(row);
  }
  rows.appendChild(table);

  // button to fill with a sample program ("Suma": LDA/LDB/ADD/OUT/HALT)
  const btnDemo = document.createElement("button");
  btnDemo.textContent = t("ramDemoBtn");
  btnDemo.style.cssText = "width:100%; margin-top:10px;";
  btnDemo.addEventListener("click", () => {
    fillDemoProgram(data, inputs);
    save();
  });
  rows.appendChild(btnDemo);

  panel.style.display = "flex";
}

/* Sample program in bytes — "Suma" (docs/cpu-brief.md): 2 cells per
   instruction, OP at even address, ARG at the next one */
function fillDemoProgram(data, inputs) {
  const demo = [
    0x1, 0x5,   // 00: LDA 5    A ← 5
    0x2, 0x3,   // 02: LDB 3    B ← 3
    0x3, 0x0,   // 04: ADD      A ← A + B
    0x5, 0x0,   // 06: OUT      OUT ← A
    0x7, 0x0,   // 08: HALT
  ];
  for (let i = 0; i < 16; i++) {
    data[i] = demo[i] ?? 0;
    inputs[i].inp.value = (data[i]).toString(16).toUpperCase().padStart(2, "0");
  }
}

/* Close the hex panel if the RAM gets deleted */
function closeHexPanelIfDeleted(compId) {
  if (hexPanelFor === compId) closePinPanel();
}

/* ============================================================
   CLOCK PANEL: double click on a clock to change its speed
   ============================================================ */
function openClockPanel(comp) {
  const panel = document.getElementById("pinPanel");
  const rows = document.getElementById("pinPanelRows");
  rows.innerHTML = "";
  document.getElementById("pinPanelTitle").textContent = t("clockTitle");

  const note = document.createElement("p");
  note.style.cssText = "font-size:11.5px;color:var(--dim);margin-bottom:10px;line-height:1.5;";
  note.textContent = t("clockNote");
  rows.appendChild(note);

  const input = document.createElement("input");
  input.type = "number";
  input.min = "0.5";
  input.max = "12";
  input.step = "0.5";
  input.value = globalClockFreq.get(comp.id) ?? 2;
  input.style.cssText = "width:100%; padding:6px 8px; font-size:13px;";
  input.addEventListener("change", () => {
    let v = parseFloat(input.value);
    if (isNaN(v) || v < 0.5) v = 0.5;
    if (v > 12) v = 12;
    globalClockFreq.set(comp.id, v);
    input.value = v;
    save();
  });
  rows.appendChild(input);

  // quick buttons
  const quick = document.createElement("div");
  quick.style.cssText = "display:flex; gap:5px; margin-top:10px; flex-wrap:wrap;";
  for (const f of [1, 2, 4, 8, 12]) {
    const b = document.createElement("button");
    b.textContent = f + " Hz";
    b.style.fontSize = "11.5px";
    b.addEventListener("click", () => {
      globalClockFreq.set(comp.id, f);
      input.value = f;
      save();
    });
    quick.appendChild(b);
  }
  rows.appendChild(quick);

  panel.style.display = "flex";
}

/* ============================================================
   UNPACKING AN INSTANCE
   Expands ONLY the given instance: recreates its internal
   components at their original positions (relative layout),
   recreates the internal wires and reconnects the external ones.
   The library and the other instances stay untouched.
   ============================================================ */
function unpackInstance(inst) {
  const def = lib[inst.type];
  if (!def) return;

  // 1. recreate the internal components in their relative layout
  const idMap = new Map(); // definition id -> new real id
  const recreate = (defId, type, on) => {
    const L = def.layout?.[defId] ?? { dx: 0, dy: 0 };
    const comp = {
      id: state.nextId++,
      type,
      x: inst.x + L.dx,
      y: inst.y + L.dy,
      rot: 0,
      on: !!on,
    };
    state.components.push(comp);
    idMap.set(defId, comp.id);
  };
  for (const c of def.components) recreate(c.id, c.type, c.on);

  // 3. reconnect the external wires BEFORE recreating stubs:
  //    - INPUT pins with an external wire → the wire goes straight to the
  //      internal neighbor (the switch isn't recreated, there would be two
  //      drivers in conflict)
  //    - INPUT pins without an external wire → the Input is recreated (constant)
  //    - OUTPUT pins → the Output is recreated (indicator, no conflict)
  const stubPos = new Map();
  def.inStubs.forEach((sid, i) => stubPos.set(sid, i));
  def.outStubs.forEach((oid, j) => stubPos.set(oid, def.inputs.length + j));
  const stubPeer = new Map(); // stubId -> {cid, t} of the neighboring internal component
  for (const w of def.wires) {
    if (stubPos.has(w.a.c)) stubPeer.set(w.a.c, { cid: w.b.c, t: w.b.t });
    if (stubPos.has(w.b.c)) stubPeer.set(w.b.c, { cid: w.a.c, t: w.a.t });
  }
  const externWires = state.wires.filter(w => w.a.c === inst.id || w.b.c === inst.id);
  const stubHasExtern = new Set(); // stubId with an external wire (inputs only)
  for (const w of externWires) {
    for (const end of ["a", "b"]) {
      if (w[end].c !== inst.id) continue;
      const t = w[end].t;
      if (t < def.inputs.length) {
        const stubId = def.inStubs[t];
        const peer = stubPeer.get(stubId);
        // external wire → straight to the internal neighbor (node anchor)
        if (peer) w[end] = { c: idMap.get(peer.cid), t: peer.t };
        stubHasExtern.add(stubId);
      }
    }
  }
  // in-stubs WITHOUT an external wire: recreate the Input (it stays as a loose constant)
  def.inStubs.forEach((sid, i) => {
    if (!stubHasExtern.has(sid)) recreate(sid, "switch", false);
  });
  // out-stubs: IF there is an external wire → redirect it straight to the internal
  // neighbor (the user already has their own indicator; recreating another would
  // create two drivers on the same node). IF there is no external wire → recreate the Output.
  def.outStubs.forEach((oid, j) => {
    const term = def.inputs.length + j;
    const hasExtern = externWires.some(w =>
      (w.a.c === inst.id && w.a.t === term) || (w.b.c === inst.id && w.b.t === term));
    if (!hasExtern) {
      recreate(oid, "out", false);
      return;
    }
    const peer = stubPeer.get(oid);
    const anchor = peer ? { c: idMap.get(peer.cid), t: peer.t } : null;
    for (const w of externWires) {
      for (const end of ["a", "b"]) {
        if (w[end].c === inst.id && w[end].t === term && anchor)
          w[end] = { ...anchor };
      }
    }
  });

  // 2b. recreate the internal wires.
  //     The in-stubs AND out-stubs WITH an external wire disappear: their node is
  //     held by the external wire (connected to the anchor = first neighbor). The
  //     other stub wires get reconnected to that anchor; degenerate ones are discarded.
  const stubAnchor = new Map(); // stubId -> {c, t} of the first recreated neighbor
  for (const [stubId, peer] of stubPeer) {
    if (stubHasExtern.has(stubId)) {
      stubAnchor.set(stubId, { c: idMap.get(peer.cid), t: peer.t });
    }
  }
  // mark also the out-stubs with external wire (for the map below)
  const stubOutAnchor = new Map();
  def.outStubs.forEach((oid, j) => {
    const term = def.inputs.length + j;
    const hasExtern = externWires.some(w =>
      (w.a.c === inst.id && w.a.t === term) || (w.b.c === inst.id && w.b.t === term));
    if (hasExtern) {
      const peer = stubPeer.get(oid);
      if (peer) stubOutAnchor.set(oid, { c: idMap.get(peer.cid), t: peer.t });
    }
  });
  for (const w of def.wires) {
    const map = (end) => {
      // stub (in or out) with an external wire → anchor
      if (stubAnchor.has(end.c)) return { ...stubAnchor.get(end.c) };
      if (stubOutAnchor.has(end.c)) return { ...stubOutAnchor.get(end.c) };
      if (stubPos.has(end.c)) {
        // in-stub without external (recreated constant) or out-stub without external (recreated output)
        if (idMap.has(end.c)) return { c: idMap.get(end.c), t: end.t };
        return { c: idMap.get([...stubPos.keys()][0]), t: end.t }; // fallback
      }
      return { c: idMap.get(end.c), t: end.t };
    };
    const na = map(w.a), nb = map(w.b);
    // discard degenerate wires or ones with unresolved ends
    if (!na || !nb || !na.c || !nb.c) continue;
    if (na.c === nb.c && na.t === nb.t) continue;
    state.wires.push({ id: state.nextId++, a: na, b: nb });
  }

  // 4. remove the box
  state.components = state.components.filter(c => c !== inst);
  gateOuts.delete(inst.id);
  save();
}

cv.addEventListener("mousedown", e => {
  // middle button pressed → pan the world (always)
  if (e.button === 1) {
    e.preventDefault();
    panning = true;
    panStart = { x: e.clientX - cam.x, y: e.clientY - cam.y };
    cv.style.cursor = "grabbing";
    return;
  }
  if (e.button !== 0) return;
  const p = pos(e);

  // drag from a terminal → start a wire (in any mode)
  const term0 = hitTerm(p);
  if (term0 && (state.tool === "select" || state.tool === "wireDrag")) {
    wireDrag = { from: term0, moved: false, downP: p };
    return;
  }

  if (state.tool === "pack") {
    // Pack mode: drag a selection rectangle
    selectionStart = p;
    dragBox = { x1: p.x, y1: p.y, x2: p.x, y2: p.y, tool: state.tool };
    return;
  }

  if (state.tool === "select") {
    const comp = hitComp(p);
    if (comp) {
      // If the clicked component is inside a multi-selection,
      // drag ALL the marked ones; if not, only it.
      const sel = state.components.filter(c => c.sel);
      if (comp.sel && sel.length > 1) {
        dragSel = sel.map(c => ({ c, dx: c.x - p.x, dy: c.y - p.y }));
      } else {
        dragComp = comp;
        dragOff = { x: comp.x - p.x, y: comp.y - p.y };
        if (comp.type === "switch") comp._downPos = p;
      }
    } else {
      // over empty space: area selection rectangle
      selectionStart = p;
      dragBox = { x1: p.x, y1: p.y, x2: p.x, y2: p.y, tool: state.tool };
    }
    return;
  }

  if (state.tool === "unpack") {
    // Click on a packed instance: expand it here
    const comp = hitComp(p);
    if (comp && lib[comp.type]) {
      unpackInstance(comp);
    } else if (comp) {
      alert("Ese componente no es un empaquetado (es primitivo).");
    }
    return;
  }

  if (state.tool === "delete") {
    const comp = hitComp(p);
    if (comp) { rememberForUndo(); deleteComp(comp); return; }
    const wire = hitWire(p);
    if (wire) { rememberForUndo(); state.wires = state.wires.filter(w => w !== wire); save(); }
    return;
  }

  // component placement
  if (TYPE_DEFS[state.tool]) addComp(state.tool, p.x, p.y);
});

cv.addEventListener("contextmenu", e => {
  e.preventDefault();
  const p = pos(e);
  const comp = hitComp(p);
  if (comp) { rememberForUndo(); deleteComp(comp); return; }
  const wire = hitWire(p);
  if (wire) { rememberForUndo(); state.wires = state.wires.filter(w => w !== wire); save(); }
});

cv.addEventListener("mousemove", e => {
  // pan in progress
  if (panning) {
    cam.x = e.clientX - panStart.x;
    cam.y = e.clientY - panStart.y;
    return;
  }
  // drag of the marked selection
  if (dragSel) {
    const p = pos(e);
    for (const { c, dx, dy } of dragSel) {
      c.x = snap(p.x + dx);
      c.y = snap(p.y + dy);
    }
    return;
  }
  // wire drag from a terminal
  if (wireDrag) {
    const p = pos(e);
    mouse = p;
    const moved = Math.hypot(p.x - wireDrag.downP.x, p.y - wireDrag.downP.y) > 6;
    wireDrag.moved = moved;
    if (!moved) return;
    const t = hitTerm(p);
    if (t && !wireExists(wireDrag.from, t)
        && (t.c !== wireDrag.from.c || t.t !== wireDrag.from.t)) {
      // drop on another terminal → create the wire and end the drag
      state.wires.push({ id: state.nextId++, a: wireDrag.from, b: t });
      wireDrag = null;
      save();
    }
    return;
  }
  const p = pos(e);
  mouse = p;
  hoverTerm = hitTerm(p);
  hoverWire = state.tool === "delete" ? hitWire(p) : null;
  hoverComp = !hoverTerm ? hitComp(p) : null;
  cv.style.cursor = hoverTerm
    ? "pointer"
    : (hoverComp && state.tool === "select") ? "move"
    : state.tool === "delete" ? "not-allowed" : "crosshair";

  if (dragComp) {
    dragComp.x = snap(p.x + dragOff.x);
    dragComp.y = snap(p.y + dragOff.y);
  }

  // selection rectangle (pack and select modes)
  if (dragBox && selectionStart) {
    dragBox.x2 = p.x;
    dragBox.y2 = p.y;
    const x1 = Math.min(dragBox.x1, dragBox.x2), x2 = Math.max(dragBox.x1, dragBox.x2);
    const y1 = Math.min(dragBox.y1, dragBox.y2), y2 = Math.max(dragBox.y1, dragBox.y2);
    for (const c of state.components)
      c.sel = c.x >= x1 - 32 && c.x <= x2 + 32 && c.y >= y1 - 46 && c.y <= y2 + 46;
    if (state.tool === "pack" && typeof updatePackBar === "function") updatePackBar();
  }
  save();
});

window.addEventListener("mouseup", e => {
  if (e.button === 1) {
    if (dragSel) { dragSel = null; save(); }
    if (panning) { panning = false; }
    cv.style.cursor = "crosshair";
    return;
  }
  // end of the selection rectangle
  if (dragBox) {
    // click without dragging: deselect everything
    if (Math.abs(dragBox.x2 - dragBox.x1) < 6 && Math.abs(dragBox.y2 - dragBox.y1) < 6)
      for (const c of state.components) delete c.sel;
    dragBox = null;
    selectionStart = null;
    if (state.tool === "pack" && typeof updatePackBar === "function") updatePackBar();
    save();
    return;
  }
  // end of the wire drag from a terminal (dropped in empty space → cancel)
  if (wireDrag && e.button === 0) wireDrag = null;
  // end of the multi-selection drag with left click
  if (dragSel && e.button === 0) { dragSel = null; save(); }
  if (dragComp && dragComp.type === "switch" && dragComp._downPos) {
    const p = pos(e);
    // it was a click without dragging → toggle
    if (Math.hypot(p.x - dragComp._downPos.x, p.y - dragComp._downPos.y) < 4) {
      dragComp.on = !dragComp.on;
    }
    dragComp._downPos = null;
  }
  dragComp = null;
});

/* Double click on parts → panels (pin labels, clock, RAM) */
cv.addEventListener("dblclick", e => {
  const p = pos(e);
  const comp = hitComp(p);
  if (comp && lib[comp.type]) { openPinPanel(comp.type); return; }
  if (comp && comp.type === "clock") { openClockPanel(comp); return; }
  if (comp && comp.type === "ram") { openHexPanel(comp); return; }
  if (comp && (comp.type === "switch" || comp.type === "out")) { openLabelPanel(comp); }
});

/* ============================================================
   RENAME PANEL for basic Inputs and Outputs
   (custom label; empty = show nothing)
   ============================================================ */
function openLabelPanel(comp) {
  const panel = document.getElementById("pinPanel");
  const rows = document.getElementById("pinPanelRows");
  rows.innerHTML = "";
  document.getElementById("pinPanelTitle").textContent =
    comp.type === "switch" ? "⌨ Entrada" : "💡 Salida";

  const note = document.createElement("p");
  note.style.cssText = "font-size:11.5px; color:var(--dim); margin-bottom:10px; line-height:1.5;";
  note.innerHTML = t("labelNote");
  rows.appendChild(note);

  const input = document.createElement("input");
  input.value = comp.label ?? "";
  input.placeholder = t("labelPh");
  input.style.cssText = "width:100%; padding:6px 8px; font-size:13px;";
  input.addEventListener("keydown", ev => { if (ev.key === "Enter") input.blur(); });
  input.addEventListener("input", () => {
    const v = input.value.trim();
    if (v) comp.label = v;
    else delete comp.label; // blank: show nothing
    save();
  });
  rows.appendChild(input);
  // automatic focus to type directly
  setTimeout(() => input.focus(), 0);

  panel.style.display = "flex";
}

/* Button to close the pin panel */
document.getElementById("pinPanelClose").addEventListener("click", closePinPanel);

/* Help button: shows/hides the instructions */
document.getElementById("helpBtn").addEventListener("click", e => {
  e.stopPropagation();
  const h = document.getElementById("help");
  h.style.display = h.style.display === "block" ? "none" : "block";
});
document.addEventListener("mousedown", e => {
  const h = document.getElementById("help");
  const b = document.getElementById("helpBtn");
  if (h.style.display === "block" && !h.contains(e.target) && e.target !== b) {
    h.style.display = "none";
  }
});

/* Avoid the paste menu when the middle button is released on the canvas */
cv.addEventListener("auxclick", e => {
  if (e.button === 1) e.preventDefault();
});

/* Zoom with the mouse wheel, centered on the cursor */
cv.addEventListener("wheel", e => {
  e.preventDefault();
  const sp = screenPos(e);
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  zoomAt(sp.x, sp.y, factor);
}, { passive: false });

window.addEventListener("keydown", e => {
  // ignore shortcuts while typing in an input/select (e.g.: component name)
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "select" || tag === "textarea") return;
  const toolKeys = { "1": "select", "2": "switch", "3": "out", "4": "clock", "5": "not", "6": "and", "7": "or", "8": "nand", "9": "nor", "0": "xor", "u": "unpack", "p": "pack" };
  const k = e.key.toLowerCase();
  if (toolKeys[k] && !e.ctrlKey && !e.metaKey && !e.altKey) setTool(toolKeys[k]);
  if (k === "f" && !e.ctrlKey && !e.metaKey && !e.altKey) fitView();
  if (k === "escape") wireDrag = null;
  if (k === "r" && hoverComp && state.tool === "select") { hoverComp.rot = (hoverComp.rot + 3) % 4; save(); }
  if (k === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undoDelete(); return; }
  if ((k === "delete" || k === "backspace" || k === "x") && !e.ctrlKey && !e.metaKey) {
    // if several components are marked, delete them all together (one undo step)
    const marcados = state.components.filter(c => c.sel);
    if (marcados.length > 1) {
      rememberForUndo();
      for (const c of marcados) deleteComp(c);
    } else if (hoverComp) {
      rememberForUndo(); deleteComp(hoverComp);
    } else if (hoverWire) {
      rememberForUndo(); state.wires = state.wires.filter(w => w !== hoverWire); save();
    }
  }
  // Unpack the instance under the cursor with the U shortcut
  if (k === "u" && hoverComp && lib[hoverComp.type] && state.tool !== "unpack") {
    unpackInstance(hoverComp);
  }
  if (k === "a" && (e.ctrlKey || e.metaKey) && state.tool === "pack") {
    e.preventDefault();
    for (const c of state.components) c.sel = true;
    if (typeof updatePackBar === "function") updatePackBar();
    save();
  }
});

