// ============================================================
// TUTORIAL LESSONS (bilingual: theory and check names
// are {es, en}; the active language is given by i18n.js)
//
// Writing guide for this file:
// - Don't assume prior electronics knowledge.
// - Each lesson: WHAT it is (with an analogy), WHY it matters
//   (its role in the final CPU), list of components with keys,
//   step-by-step wiring, experiment to observe.
// - Define each new term at the moment it appears.
// ============================================================ */

/* Shared verification helpers */
function lessonFind(type, n = 0) {
  const all = state.components.filter(c => c.type === type);
  return all[n] ?? null;
}
function lessonCount(type) {
  return state.components.filter(c => c.type === type).length;
}
/* Evaluates a gate over all combinations of its switches.
   Returns { switches, combos } or null if the wiring isn't there. */
function lessonTruthOf(gate, nIn, outTerm) {
  const switches = [];
  for (let i = 0; i < nIn; i++) {
    const w = state.wires.find(w =>
      (w.a.c === gate.id && w.a.t === i) || (w.b.c === gate.id && w.b.t === i));
    if (!w) return null;
    const otherC = w.a.c === gate.id ? w.b.c : w.a.c;
    const sw = state.components.find(c => c.id === otherC && c.type === "switch");
    if (!sw) return null;
    switches.push(sw);
  }
  const ids = new Set(switches.map(s => s.id));
  if (ids.size !== nIn) return null;
  const combos = [];
  for (let mask = 0; mask < (1 << nIn); mask++) {
    switches.forEach((sw, i) => sw.on = !!(mask & (1 << i)));
    const r = simulate();
    const net = r.netOf.get(gate.id + ":" + outTerm);
    combos.push(r.values[net]);
  }
  switches.forEach(sw => sw.on = false);
  return { switches, combos };
}
/* HTML truth table: last column with 1 highlighted in green. */
function lt(cols, rows) {
  let h = `<table style="border-collapse:collapse;margin:6px 0;font-family:monospace;font-size:12px;">`;
  h += "<tr>" + cols.map(c => `<td style="border:1px solid var(--border);padding:1px 8px;font-weight:600">${c}</td>`).join("") + "</tr>";
  for (const r of rows) {
    h += "<tr>" + r.map((v, i) => {
      const last = i === r.length - 1;
      const style = last && v === 1 ? "color:#9ade3f;font-weight:bold" : "color:var(--dim)";
      return `<td style="border:1px solid var(--border);padding:1px 8px;${last ? style : ""}">${v}</td>`;
    }).join("") + "</tr>";
  }
  return h + "</table>";
}
/* Canvas layout guide: one numbered row per canvas column, left to right.
   title and note are already in the lesson's language. */
function lay(title, items, note) {
  const badge = n => `<span style="flex:none;width:18px;height:18px;border-radius:50%;border:1px solid var(--accent);color:var(--accent);font-size:10.5px;display:inline-flex;align-items:center;justify-content:center;">${n}</span>`;
  let h = `<p><b>${title}</b></p>`;
  if (note) h += `<p style="color:var(--dim);font-size:11.5px;margin:2px 0 0;">${note}</p>`;
  h += `<ul style="list-style:none;padding:0;margin:6px 0;">`;
  items.forEach((it, i) => { h += `<li style="display:flex;gap:8px;align-items:baseline;padding:3px 0;">${badge(i + 1)}<span>${it}</span></li>`; });
  return h + "</ul>";
}
function testPackedReg1() {
  const def = lib["REG1"];
  if (!def || def.inputs.length !== 3 || def.outputs.length !== 1) return false;
  if (typeof registerPackedType === "function" && !TYPE_DEFS["REG1"]) {
    registerPackedType(def);
  }
  const savedComponents = state.components;
  const savedWires = state.wires;
  const savedNextId = state.nextId;
  const savedGateOuts = new Map(gateOuts);
  let ok = false;
  try {
    state.components = [];
    state.wires = [];
    state.nextId = 1;
    gateOuts.clear();
    const reg = { id: state.nextId++, type: "REG1", x: 0, y: 0, rot: 0, on: false };
    state.components.push(reg);
    const dSw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
    state.components.push(dSw);
    state.wires.push({ id: state.nextId++, a: { c: dSw.id, t: 0 }, b: { c: reg.id, t: 0 } });
    const loadSw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
    state.components.push(loadSw);
    state.wires.push({ id: state.nextId++, a: { c: loadSw.id, t: 0 }, b: { c: reg.id, t: 1 } });
    const clkSw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
    state.components.push(clkSw);
    state.wires.push({ id: state.nextId++, a: { c: clkSw.id, t: 0 }, b: { c: reg.id, t: 2 } });
    const out = { id: state.nextId++, type: "out", x: 0, y: 0, rot: 0, on: false };
    state.components.push(out);
    state.wires.push({ id: state.nextId++, a: { c: reg.id, t: 3 }, b: { c: out.id, t: 0 } });
    const pulse = () => {
      clkSw.on = true; simulate();
      clkSw.on = false; return simulate();
    };
    const readVal = r => {
      const net = r.netOf.get(out.id + ":0");
      return net !== undefined ? r.values[net] : -1;
    };
    loadSw.on = true; dSw.on = true;
    pulse();
    const v1 = readVal(simulate());
    loadSw.on = false; dSw.on = false;
    pulse();
    const v2 = readVal(simulate());
    loadSw.on = true; dSw.on = false;
    pulse();
    const v3 = readVal(simulate());
    loadSw.on = false; dSw.on = true;
    pulse();
    const v4 = readVal(simulate());
    if (v1 === 1 && v2 === 1 && v3 === 0 && v4 === 0) ok = true;
  } catch (e) {
    ok = false;
  } finally {
    state.components = savedComponents;
    state.wires = savedWires;
    state.nextId = savedNextId;
    gateOuts.clear();
    for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
    simulate();
  }
  return ok;
}
function testPackedReg4() {
  const def = lib["REG4"];
  if (!def || def.inputs.length !== 6 || def.outputs.length !== 4) return false;
  if (typeof registerPackedType === "function" && !TYPE_DEFS["REG4"]) {
    registerPackedType(def);
  }
  const savedComponents = state.components;
  const savedWires = state.wires;
  const savedNextId = state.nextId;
  const savedGateOuts = new Map(gateOuts);
  let ok = false;
  try {
    state.components = [];
    state.wires = [];
    state.nextId = 1;
    gateOuts.clear();
    const reg = { id: state.nextId++, type: "REG4", x: 0, y: 0, rot: 0, on: false };
    state.components.push(reg);
    const dSws = [];
    for (let i = 0; i < 4; i++) {
      const sw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
      state.components.push(sw);
      state.wires.push({ id: state.nextId++, a: { c: sw.id, t: 0 }, b: { c: reg.id, t: i } });
      dSws.push(sw);
    }
    const loadSw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
    state.components.push(loadSw);
    state.wires.push({ id: state.nextId++, a: { c: loadSw.id, t: 0 }, b: { c: reg.id, t: 4 } });
    const clkSw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
    state.components.push(clkSw);
    state.wires.push({ id: state.nextId++, a: { c: clkSw.id, t: 0 }, b: { c: reg.id, t: 5 } });
    const outs = [];
    for (let j = 0; j < 4; j++) {
      const o = { id: state.nextId++, type: "out", x: 0, y: 0, rot: 0, on: false };
      state.components.push(o);
      state.wires.push({ id: state.nextId++, a: { c: reg.id, t: 6 + j }, b: { c: o.id, t: 0 } });
      outs.push(o);
    }
    const pulse = () => {
      clkSw.on = true; simulate();
      clkSw.on = false; return simulate();
    };
    const readVal = r => {
      let v = 0;
      for (let i = 0; i < 4; i++) {
        const net = r.netOf.get(outs[i].id + ":0");
        const val = net !== undefined ? r.values[net] : -1;
        if (val === 1) v |= (1 << i);
        else if (val !== 0) return -1;
      }
      return v;
    };
    loadSw.on = true;
    for (let i = 0; i < 4; i++) dSws[i].on = !!((5 >> i) & 1);
    pulse();
    const v1 = readVal(simulate());
    loadSw.on = false;
    for (let i = 0; i < 4; i++) dSws[i].on = !!((9 >> i) & 1);
    pulse();
    const v2 = readVal(simulate());
    if (v1 === 5 && v2 === 5) ok = true;
  } catch (e) {
    ok = false;
  } finally {
    state.components = savedComponents;
    state.wires = savedWires;
    state.nextId = savedNextId;
    gateOuts.clear();
    for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
    simulate();
  }
  return ok;
}
function testPackedSel4() {
  const def = lib["SEL4"];
  if (!def || def.inputs.length !== 9 || def.outputs.length !== 4) return false;
  if (typeof registerPackedType === "function" && !TYPE_DEFS["SEL4"]) {
    registerPackedType(def);
  }
  const savedComponents = state.components;
  const savedWires = state.wires;
  const savedNextId = state.nextId;
  const savedGateOuts = new Map(gateOuts);
  let ok = false;
  try {
    state.components = [];
    state.wires = [];
    state.nextId = 1;
    gateOuts.clear();
    const sel = { id: state.nextId++, type: "SEL4", x: 0, y: 0, rot: 0, on: false };
    state.components.push(sel);
    const aSws = [], bSws = [];
    for (let i = 0; i < 4; i++) {
      const swA = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
      state.components.push(swA);
      state.wires.push({ id: state.nextId++, a: { c: swA.id, t: 0 }, b: { c: sel.id, t: i } });
      aSws.push(swA);
    }
    for (let i = 0; i < 4; i++) {
      const swB = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
      state.components.push(swB);
      state.wires.push({ id: state.nextId++, a: { c: swB.id, t: 0 }, b: { c: sel.id, t: 4 + i } });
      bSws.push(swB);
    }
    const sSw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
    state.components.push(sSw);
    state.wires.push({ id: state.nextId++, a: { c: sSw.id, t: 0 }, b: { c: sel.id, t: 8 } });
    const outs = [];
    for (let j = 0; j < 4; j++) {
      const o = { id: state.nextId++, type: "out", x: 0, y: 0, rot: 0, on: false };
      state.components.push(o);
      state.wires.push({ id: state.nextId++, a: { c: sel.id, t: 9 + j }, b: { c: o.id, t: 0 } });
      outs.push(o);
    }
    const readVal = r => {
      let v = 0;
      for (let i = 0; i < 4; i++) {
        const net = r.netOf.get(outs[i].id + ":0");
        const val = net !== undefined ? r.values[net] : -1;
        if (val === 1) v |= (1 << i);
        else if (val !== 0) return -1;
      }
      return v;
    };
    sSw.on = false;
    for (let i = 0; i < 4; i++) aSws[i].on = !!((10 >> i) & 1);
    for (let i = 0; i < 4; i++) bSws[i].on = !!((5 >> i) & 1);
    const r0 = simulate();
    const v0 = readVal(r0);
    sSw.on = true;
    const r1 = simulate();
    const v1 = readVal(r1);
    if (v0 === 10 && v1 === 5) ok = true;
  } catch (e) {
    ok = false;
  } finally {
    state.components = savedComponents;
    state.wires = savedWires;
    state.nextId = savedNextId;
    gateOuts.clear();
    for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
    simulate();
  }
  return ok;
}

function testPackedALU4() {
  const def = lib["ALU4"];
  if (!def || def.inputs.length !== 9 || def.outputs.length !== 4) return false;
  if (typeof registerPackedType === "function" && !TYPE_DEFS["ALU4"]) {
    registerPackedType(def);
  }
  const savedComponents = state.components;
  const savedWires = state.wires;
  const savedNextId = state.nextId;
  const savedGateOuts = new Map(gateOuts);
  let ok = false;
  try {
    state.components = [];
    state.wires = [];
    state.nextId = 1;
    gateOuts.clear();
    const alu = { id: state.nextId++, type: "ALU4", x: 0, y: 0, rot: 0, on: false };
    state.components.push(alu);
    const aSws = [], bSws = [];
    for (let i = 0; i < 4; i++) {
      const aSw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
      state.components.push(aSw);
      state.wires.push({ id: state.nextId++, a: { c: aSw.id, t: 0 }, b: { c: alu.id, t: i } });
      aSws.push(aSw);
      const bSw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
      state.components.push(bSw);
      state.wires.push({ id: state.nextId++, a: { c: bSw.id, t: 0 }, b: { c: alu.id, t: 4 + i } });
      bSws.push(bSw);
    }
    const opSw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
    state.components.push(opSw);
    state.wires.push({ id: state.nextId++, a: { c: opSw.id, t: 0 }, b: { c: alu.id, t: 8 } });
    const outs = [];
    for (let j = 0; j < 4; j++) {
      const o = { id: state.nextId++, type: "out", x: 0, y: 0, rot: 0, on: false };
      state.components.push(o);
      state.wires.push({ id: state.nextId++, a: { c: alu.id, t: 9 + j }, b: { c: o.id, t: 0 } });
      outs.push(o);
    }
    const readVal = r => {
      let v = 0;
      for (let i = 0; i < 4; i++) {
        const net = r.netOf.get(outs[i].id + ":0");
        const val = net !== undefined ? r.values[net] : -1;
        if (val === 1) v |= (1 << i);
        else if (val !== 0) return -1;
      }
      return v;
    };
    for (let i = 0; i < 4; i++) {
      aSws[i].on = !!((6 >> i) & 1);
      bSws[i].on = !!((3 >> i) & 1);
    }
    opSw.on = false; // sum
    const vSum = readVal(simulate());
    opSw.on = true;  // AND
    const vAnd = readVal(simulate());
    if (vSum === 9 && vAnd === 2) ok = true;
  } catch (e) {
    ok = false;
  } finally {
    state.components = savedComponents;
    state.wires = savedWires;
    state.nextId = savedNextId;
    gateOuts.clear();
    for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
    simulate();
  }
  return ok;
}
function testPackedRING3() {
  const def = lib["RING3"];
  if (!def || def.inputs.length !== 2 || def.outputs.length !== 3) return false;
  if (typeof registerPackedType === "function" && !TYPE_DEFS["RING3"]) {
    registerPackedType(def);
  }
  const savedComponents = state.components;
  const savedWires = state.wires;
  const savedNextId = state.nextId;
  const savedGateOuts = new Map(gateOuts);
  let ok = false;
  try {
    state.components = [];
    state.wires = [];
    state.nextId = 1;
    gateOuts.clear();
    const ring = { id: state.nextId++, type: "RING3", x: 0, y: 0, rot: 0, on: false };
    state.components.push(ring);
    const rst = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
    state.components.push(rst);
    state.wires.push({ id: state.nextId++, a: { c: rst.id, t: 0 }, b: { c: ring.id, t: 0 } });
    const clk = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
    state.components.push(clk);
    state.wires.push({ id: state.nextId++, a: { c: clk.id, t: 0 }, b: { c: ring.id, t: 1 } });
    const outs = [];
    for (let j = 0; j < 3; j++) {
      const o = { id: state.nextId++, type: "out", x: 0, y: 0, rot: 0, on: false };
      state.components.push(o);
      state.wires.push({ id: state.nextId++, a: { c: ring.id, t: 2 + j }, b: { c: o.id, t: 0 } });
      outs.push(o);
    }
    const read3 = r => outs.map(o => r.values[r.netOf.get(o.id + ":0")]);
    const pulse = () => { clk.on = true; simulate(); clk.on = false; return simulate(); };
    rst.on = true; pulse();
    const q0 = read3(simulate());
    if (q0[0] !== 1 || q0[1] !== 0 || q0[2] !== 0) throw new Error("reset fail");
    rst.on = false;
    pulse();
    const q1 = read3(simulate());
    pulse();
    const q2 = read3(simulate());
    pulse();
    const q3 = read3(simulate());
    const oneHot = q => q.filter(v => v === 1).length === 1 && q.filter(v => v === 0).length === 2;
    if (oneHot(q1) && oneHot(q2) && oneHot(q3) && q3[0] === 1 && q1.indexOf(1) !== 0 && q2.indexOf(1) !== q1.indexOf(1)) ok = true;
  } catch (e) {
    ok = false;
  } finally {
    state.components = savedComponents;
    state.wires = savedWires;
    state.nextId = savedNextId;
    gateOuts.clear();
    for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
    simulate();
  }
  return ok;
}
function testPackedLatch() {
  const def = lib["LATCH"];
  if (!def || def.inputs.length !== 2 || def.outputs.length !== 1) return false;
  if (typeof registerPackedType === "function" && !TYPE_DEFS["LATCH"]) {
    registerPackedType(def);
  }
  const savedComponents = state.components;
  const savedWires = state.wires;
  const savedNextId = state.nextId;
  const savedGateOuts = new Map(gateOuts);
  let ok = false;
  try {
    state.components = [];
    state.wires = [];
    state.nextId = 1;
    gateOuts.clear();
    const latch = { id: state.nextId++, type: "LATCH", x: 0, y: 0, rot: 0, on: false };
    state.components.push(latch);
    const dSw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
    state.components.push(dSw);
    state.wires.push({ id: state.nextId++, a: { c: dSw.id, t: 0 }, b: { c: latch.id, t: 0 } });
    const clkSw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
    state.components.push(clkSw);
    state.wires.push({ id: state.nextId++, a: { c: clkSw.id, t: 0 }, b: { c: latch.id, t: 1 } });
    const out = { id: state.nextId++, type: "out", x: 0, y: 0, rot: 0, on: false };
    state.components.push(out);
    state.wires.push({ id: state.nextId++, a: { c: latch.id, t: 2 }, b: { c: out.id, t: 0 } });
    clkSw.on = true; dSw.on = true;
    const r1 = simulate();
    const v1 = r1.values[r1.netOf.get(out.id + ":0")];
    dSw.on = false;
    const r2 = simulate();
    const v2 = r2.values[r2.netOf.get(out.id + ":0")];
    clkSw.on = false;
    const r3 = simulate();
    const v3 = r3.values[r3.netOf.get(out.id + ":0")];
    if (v1 === 1 && v2 === 0 && v3 === 0) ok = true;
  } catch (e) {
    ok = false;
  } finally {
    state.components = savedComponents;
    state.wires = savedWires;
    state.nextId = savedNextId;
    gateOuts.clear();
    for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
    simulate();
  }
  return ok;
}
/* Piece number badge, same look as the numbers drawn on the canvas
   (placement order, visible while the tutorial is open). */
function nb(k) {
  return `<span style="display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:50%;border:1px solid var(--accent);color:var(--accent);font-size:10px;font-weight:700;vertical-align:1px;">${k}</span>`;
}
/* Placement grid: columns = left to right on the canvas, rows = top to
   bottom. Each cell is [number, name] or null for an empty spot. */
function grid(title, rows) {
  const cell = c => c
    ? `<td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(c[0])} ${c[1]}</td>`
    : `<td style="border:1px dashed #262b38;padding:4px 5px;"></td>`;
  return `<p><b>${title}</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;">`
    + rows.map(r => "<tr>" + r.map(cell).join("") + "</tr>").join("") + "</table>";
}
const LL = (es, en) => ({ es, en });  // bilingual pair
const TXT = (o) => o[i18nLang()] ?? o.es;

const LESSONS = [
  {
    id: "s1",
    title: LL("1. Señales: 0 y 1", "1. Signals: 0 and 1"),
    theory: {
      es: `
        <p>Antes de construir una computadora, entendamos <b>qué es una señal</b>.</p>
        <p>Dentro de un circuito solo hay dos estados posibles: <b>1</b> significa "hay
        señal" (imaginate un cable con energía) y <b>0</b> significa "no hay". Nada más:
        como un interruptor encendido o apagado.</p>
        <p>Lo sorprendente: con solo estos dos valores, organizados en grandes cantidades,
        se representa <i>todo</i> — números, letras, colores de un píxel, esta misma
        lección. Una computadora es una máquina que manipula 0s y 1s a una velocidad
        absurda, usando millones de interruptores diminutos llamados <b>transistores</b>.</p>
        <p>En esta herramienta, cada cable tiene uno de esos dos estados, y lo <b>ves con
        colores</b>: amarillo brillante = 1, gris oscuro = 0.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Entrada</b> (tecla 2) — un interruptor que vos controlás</li>
          <li>1× <b>Salida</b> (tecla 3) — el indicador que muestra el valor que llega</li>
        </ul>
        ${grid("Colócalos en este orden (de izquierda a derecha, de arriba abajo):", [
          [[1, "Entrada"], [2, "Salida"]],
        ])}
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Colocá la Entrada ${nb(1)} y la Salida ${nb(2)}.</li>
          <li>Arrastrá un cable desde el terminal de la Entrada ${nb(1)} hasta el de la Salida ${nb(2)}.</li>
          <li>Encendé la fuente (botón ⏻ FUENTE arriba a la derecha).</li>
          <li>Hacé click sobre la Entrada ${nb(1)}: la Salida ${nb(2)} copia su valor.</li>
        </ol>
        <p><b>El experimento:</b> con la Entrada ${nb(1)} en 0, la Salida ${nb(2)} está apagada; con la Entrada en 1, se enciende. Es un interruptor conectado a una lamparita.</p>`,
      en: `
        <p>Before building a computer, let's understand <b>what a signal is</b>.</p>
        <p>Inside a circuit there are only two possible states: <b>1</b> means "signal
        present" (imagine a wire with energy) and <b>0</b> means "none". Nothing more:
        like a switch that is on or off.</p>
        <p>The surprising part: with just these two values, arranged in huge quantities,
        you can represent <i>everything</i> — numbers, letters, pixel colors, this very
        lesson. A computer is a machine that manipulates 0s and 1s at absurd speed, using
        millions of tiny switches called <b>transistors</b>.</p>
        <p>In this tool, every wire holds one of those states, and you <b>see it with
        colors</b>: bright yellow = 1, dark gray = 0.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Input</b> (key 2) — a switch you control</li>
          <li>1× <b>Output</b> (key 3) — the indicator that shows the arriving value</li>
        </ul>
        ${grid("Place them in this order (left to right, top to bottom):", [
          [[1, "Input"], [2, "Output"]],
        ])}
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Place the Input ${nb(1)} and the Output ${nb(2)}.</li>
          <li>Drag a wire from the Input ${nb(1)} terminal to the Output ${nb(2)} terminal.</li>
          <li>Turn on the power (⏻ POWER button top right).</li>
          <li>Click the Input ${nb(1)}: the Output ${nb(2)} copies its value.</li>
        </ol>
        <p><b>The experiment:</b> with the Input ${nb(1)} at 0, the Output ${nb(2)} is off; with the Input at 1, it lights up. It is a switch wired to a light bulb.</p>`,
    },
    check() {
      const sw = lessonFind("switch");
      const out = lessonFind("out");
      if (!sw || !out) return [{ name: TXT(LL("Hay una Entrada y una Salida", "There is an Input and an Output")), ok: !!(sw && out) }];
      const wired = state.wires.some(w =>
        (w.a.c === sw.id && w.b.c === out.id) || (w.b.c === sw.id && w.a.c === out.id));
      const results = [
        { name: TXT(LL("Hay una Entrada y una Salida", "There is an Input and an Output")), ok: true },
        { name: TXT(LL("Cable entre ellas", "Wire between them")), ok: wired },
      ];
      if (wired && state.powerOn) {
        sw.on = true;  const hi = simulate().values[simulate().netOf.get(out.id + ":0")];
        sw.on = false; const lo = simulate().values[simulate().netOf.get(out.id + ":0")];
        results.push({ name: TXT(LL("La salida copia la entrada (0→0, 1→1)", "Output copies input (0→0, 1→1)")), ok: hi === 1 && lo === 0 });
      }
      return results;
    },
  },
  {
    id: "s2",
    title: LL("2. NOT: el inversor", "2. NOT: the inverter"),
    theory: {
      es: `
        <p>Una <b>compuerta lógica</b> es una pieza pequeña que lee señales en sus entradas
        y produce una señal en su salida, siguiendo una regla fija. Son los ladrillos con
        los que se construye toda la lógica de una computadora.</p>
        <p>El más simple es el <b>NOT</b>: una entrada, una salida, y la salida es
        <i>siempre lo contrario</i> de la entrada. Entra 1 → sale 0. Entra 0 → sale 1.
        Por eso también se lo llama <b>inversor</b>.</p>
        <p>¿Para qué sirve negar? Para tomar decisiones. "Si <i>no</i> está presionada la
        tecla, seguí" — ese "<i>no</i>" es un NOT. Sin esta pieza, un circuito no puede
        expresar la palabra "no".</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Entrada</b> (tecla 2) — para darle valores al NOT</li>
          <li>1× <b>NOT</b> (tecla 5) — el inversor: su salida es siempre lo contrario de la entrada</li>
          <li>1× <b>Salida</b> (tecla 3) — para ver el resultado</li>
        </ul>
        ${grid("Colócalos en este orden (de izquierda a derecha, de arriba abajo):", [
          [[1, "Entrada"], [2, "NOT"], [3, "Salida"]],
        ])}
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Cableá la Entrada ${nb(1)} a la entrada izquierda del NOT ${nb(2)}.</li>
          <li>Cableá la salida derecha del NOT ${nb(2)} a la Salida ${nb(3)}.</li>
        </ol>
        <p><b>El experimento:</b> alterná la Entrada ${nb(1)}. La Salida ${nb(3)} siempre muestra el valor contrario: 0 → 1, 1 → 0. Es la primera pieza que transforma una señal.</p>`,
      en: `
        <p>A <b>logic gate</b> is a small part that reads signals on its inputs and produces
        a signal on its output, following a fixed rule. Gates are the bricks all computer
        logic is built from.</p>
        <p>The simplest is the <b>NOT</b>: one input, one output, and the output is
        <i>always the opposite</i> of the input. 1 in → 0 out. 0 in → 1 out.
        It is also called an <b>inverter</b> for that reason.</p>
        <p>Why is negating useful? Decisions. "If the key is <i>not</i> pressed, continue" —
        that "<i>not</i>" is a NOT. Without it, circuits couldn't express the word "no".</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Input</b> (key 2) — to feed values to the NOT</li>
          <li>1× <b>NOT</b> (key 5) — the inverter: its output is always the opposite of its input</li>
          <li>1× <b>Output</b> (key 3) — to see the result</li>
        </ul>
        ${grid("Place them in this order (left to right, top to bottom):", [
          [[1, "Input"], [2, "NOT"], [3, "Output"]],
        ])}
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire the Input ${nb(1)} to the left input of the NOT ${nb(2)}.</li>
          <li>Wire the right output of the NOT ${nb(2)} to the Output ${nb(3)}.</li>
        </ol>
        <p><b>The experiment:</b> toggle the Input ${nb(1)}. The Output ${nb(3)} always shows the opposite value: 0 → 1, 1 → 0. This is the first part that transforms a signal.</p>`,
    },
    check() {
      const not = lessonFind("not");
      const noName = TXT(LL("Hay un NOT en el circuito", "There is a NOT in the circuit"));
      if (!not) return [{ name: noName, ok: false }];
      const t = lessonTruthOf(not, 1, 1);
      if (!t) return [{ name: TXT(LL("Entrada→NOT→Salida conectados", "Input→NOT→Output wired")), ok: false }];
      return [
        { name: noName, ok: true },
        { name: TXT(LL("Entrada 0 → salida 1", "Input 0 → output 1")), ok: t.combos[0] === 1 },
        { name: TXT(LL("Entrada 1 → salida 0", "Input 1 → output 0")), ok: t.combos[1] === 0 },
      ];
    },
  },
  {
    id: "s3",
    title: LL("3. AND y OR: decidir", "3. AND and OR: deciding"),
    theory: {
      es: `
        <p>Una <b>compuerta lógica</b> es una pieza que lee señales de entrada y devuelve
        una salida siguiendo una regla fija. Es como un portero que decide si abre o no
        según quién toca el timbre.</p>
        <p>Ahora usás dos compuertas con <b>2 entradas</b>. <b>AND</b> devuelve 1 solo cuando
        <i>ambas</i> entradas son 1 (cerradura con dos llaves). <b>OR</b> devuelve 1 cuando
        <i>al menos una</i> entrada es 1 (alarma con dos sensores).</p>
        ${lt(["A", "B", "AND"], [[0,0,0],[0,1,0],[1,0,0],[1,1,1]])}
        ${lt(["A", "B", "OR"], [[0,0,0],[0,1,1],[1,0,1],[1,1,1]])}
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× <b>Entrada</b> (tecla 2) — A y B para el AND; A y B para el OR</li>
          <li>1× <b>AND</b> (tecla 6) — devuelve 1 solo si ambas entradas son 1</li>
          <li>1× <b>OR</b> (tecla 7) — devuelve 1 si al menos una entrada es 1</li>
          <li>2× <b>Salida</b> (tecla 3) — una para el AND y otra para el OR</li>
        </ul>
        ${grid("Colócalos en este orden (de izquierda a derecha, de arriba abajo):", [
          [[1, "A (AND)"], [5, "AND"], [7, "Salida AND"]],
          [[2, "B (AND)"], null, null],
          [[3, "A (OR)"], [6, "OR"], [8, "Salida OR"]],
          [[4, "B (OR)"], null, null],
        ])}
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Cableá la Entrada A ${nb(1)} y la Entrada B ${nb(2)} a las dos entradas del AND ${nb(5)}.</li>
          <li>Cableá la salida del AND ${nb(5)} a la Salida AND ${nb(7)}.</li>
          <li>Cableá la Entrada A ${nb(3)} y la Entrada B ${nb(4)} a las dos entradas del OR ${nb(6)}.</li>
          <li>Cableá la salida del OR ${nb(6)} a la Salida OR ${nb(8)}.</li>
        </ol>
        <p><b>El experimento:</b> probá las 4 combinaciones. El AND ${nb(5)} solo se enciende cuando ambas entradas valen 1. El OR ${nb(6)} solo se apaga cuando ambas valen 0.</p>`,
      en: `
        <p>A <b>logic gate</b> is a part that reads input signals and returns an output
        following a fixed rule. Like a doorman who decides whether to open the door based on
        who rings the bell.</p>
        <p>Now you use two gates with <b>2 inputs</b>. <b>AND</b> returns 1 only when
        <i>both</i> inputs are 1 (a lock with two keys). <b>OR</b> returns 1 when
        <i>at least one</i> input is 1 (an alarm with two sensors).</p>
        ${lt(["A", "B", "AND"], [[0,0,0],[0,1,0],[1,0,0],[1,1,1]])}
        ${lt(["A", "B", "OR"], [[0,0,0],[0,1,1],[1,0,1],[1,1,1]])}
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× <b>Input</b> (key 2) — A and B for the AND; A and B for the OR</li>
          <li>1× <b>AND</b> (key 6) — returns 1 only if both inputs are 1</li>
          <li>1× <b>OR</b> (key 7) — returns 1 if at least one input is 1</li>
          <li>2× <b>Output</b> (key 3) — one for the AND and one for the OR</li>
        </ul>
        ${grid("Place them in this order (left to right, top to bottom):", [
          [[1, "A (AND)"], [5, "AND"], [7, "AND Output"]],
          [[2, "B (AND)"], null, null],
          [[3, "A (OR)"], [6, "OR"], [8, "OR Output"]],
          [[4, "B (OR)"], null, null],
        ])}
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire Input A ${nb(1)} and Input B ${nb(2)} to the two inputs of the AND ${nb(5)}.</li>
          <li>Wire the output of the AND ${nb(5)} to the AND Output ${nb(7)}.</li>
          <li>Wire Input A ${nb(3)} and Input B ${nb(4)} to the two inputs of the OR ${nb(6)}.</li>
          <li>Wire the output of the OR ${nb(6)} to the OR Output ${nb(8)}.</li>
        </ol>
        <p><b>The experiment:</b> try all 4 combinations. The AND ${nb(5)} only lights when both inputs are 1. The OR ${nb(6)} only goes dark when both are 0.</p>`,
    },
    check() {
      const results = [];
      const and = lessonFind("and");
      const or = lessonFind("or");
      if (and) {
        const t = lessonTruthOf(and, 2, 2);
        if (t) {
          results.push({ name: TXT(LL("AND: 00→0, 01→0, 10→0, 11→1", "AND: 00→0, 01→0, 10→0, 11→1")),
            ok: t.combos[0]===0 && t.combos[1]===0 && t.combos[2]===0 && t.combos[3]===1 });
        } else results.push({ name: TXT(LL("AND cableada a 2 Entradas y Salida", "AND wired to 2 Inputs and an Output")), ok: false });
      } else results.push({ name: TXT(LL("Hay un AND", "There is an AND")), ok: false });
      if (or) {
        const t = lessonTruthOf(or, 2, 2);
        if (t) {
          results.push({ name: TXT(LL("OR: 00→0, 01→1, 10→1, 11→1", "OR: 00→0, 01→1, 10→1, 11→1")),
            ok: t.combos[0]===0 && t.combos[1]===1 && t.combos[2]===1 && t.combos[3]===1 });
        } else results.push({ name: TXT(LL("OR cableada a 2 Entradas y Salida", "OR wired to 2 Inputs and an Output")), ok: false });
      } else results.push({ name: TXT(LL("Hay un OR", "There is an OR")), ok: false });
      return results;
    },
  },
  {
    id: "s4",
    title: LL("4. NAND y XOR", "4. NAND and XOR"),
    theory: {
      es: `
        <p>Dos compuertas más cierran el set básico.</p>
        <p><b>NAND</b> hace primero un AND y luego lo niega: la salida vale 0 solo cuando
        ambas entradas son 1. Es tan útil que <b>con NAND sola se puede construir cualquier
        circuito</b>; por eso los fabricantes la usan como base.</p>
        ${lt(["A", "B", "NAND"], [[0,0,1],[0,1,1],[1,0,1],[1,1,0]])}
        <p><b>XOR</b> (O exclusivo) devuelve 1 cuando sus entradas son <b>diferentes</b>.
        Es la compuerta que más adelante va a <b>sumar bits</b>.</p>
        ${lt(["A", "B", "XOR"], [[0,0,0],[0,1,1],[1,0,1],[1,1,0]])}
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× <b>Entrada</b> (tecla 2) — A y B para el NAND; A y B para el XOR</li>
          <li>1× <b>NAND</b> (tecla 8) — AND negado: solo 0 cuando ambas entradas son 1</li>
          <li>1× <b>XOR</b> (tecla 0) — devuelve 1 cuando sus entradas son diferentes</li>
          <li>2× <b>Salida</b> (tecla 3) — una para el NAND y otra para el XOR</li>
        </ul>
        ${grid("Colócalos en este orden (de izquierda a derecha, de arriba abajo):", [
          [[1, "A (NAND)"], [5, "NAND"], [7, "Salida NAND"]],
          [[2, "B (NAND)"], null, null],
          [[3, "A (XOR)"], [6, "XOR"], [8, "Salida XOR"]],
          [[4, "B (XOR)"], null, null],
        ])}
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Cableá la Entrada A ${nb(1)} y la Entrada B ${nb(2)} a las dos entradas del NAND ${nb(5)}.</li>
          <li>Cableá la salida del NAND ${nb(5)} a la Salida NAND ${nb(7)}.</li>
          <li>Cableá la Entrada A ${nb(3)} y la Entrada B ${nb(4)} a las dos entradas del XOR ${nb(6)}.</li>
          <li>Cableá la salida del XOR ${nb(6)} a la Salida XOR ${nb(8)}.</li>
        </ol>
        <p><b>El experimento:</b> en el NAND ${nb(5)}, buscá la única combinación que lo apaga: 1 y 1. En el XOR ${nb(6)}, alterná una sola entrada y mirá cómo la salida cambia cada vez que las señales se vuelven distintas.</p>`,
      en: `
        <p>Two more gates complete the basic set.</p>
        <p><b>NAND</b> does an AND first and then negates it: the output is 0 only when both
        inputs are 1. It is so useful that <b>any circuit can be built from NAND alone</b>;
        that's why manufacturers use it as a base.</p>
        ${lt(["A", "B", "NAND"], [[0,0,1],[0,1,1],[1,0,1],[1,1,0]])}
        <p><b>XOR</b> (exclusive OR) returns 1 when its inputs are <b>different</b>.
        This is the gate that will <b>add bits</b> later.</p>
        ${lt(["A", "B", "XOR"], [[0,0,0],[0,1,1],[1,0,1],[1,1,0]])}
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× <b>Input</b> (key 2) — A and B for the NAND; A and B for the XOR</li>
          <li>1× <b>NAND</b> (key 8) — negated AND: only 0 when both inputs are 1</li>
          <li>1× <b>XOR</b> (key 0) — returns 1 when its inputs are different</li>
          <li>2× <b>Output</b> (key 3) — one for the NAND and one for the XOR</li>
        </ul>
        ${grid("Place them in this order (left to right, top to bottom):", [
          [[1, "A (NAND)"], [5, "NAND"], [7, "NAND Output"]],
          [[2, "B (NAND)"], null, null],
          [[3, "A (XOR)"], [6, "XOR"], [8, "XOR Output"]],
          [[4, "B (XOR)"], null, null],
        ])}
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire Input A ${nb(1)} and Input B ${nb(2)} to the two inputs of the NAND ${nb(5)}.</li>
          <li>Wire the output of the NAND ${nb(5)} to the NAND Output ${nb(7)}.</li>
          <li>Wire Input A ${nb(3)} and Input B ${nb(4)} to the two inputs of the XOR ${nb(6)}.</li>
          <li>Wire the output of the XOR ${nb(6)} to the XOR Output ${nb(8)}.</li>
        </ol>
        <p><b>The experiment:</b> on the NAND ${nb(5)}, find the single combination that turns it off: 1 and 1. On the XOR ${nb(6)}, toggle just one input and watch the output change whenever the signals become different.</p>`,
    },
    check() {
      const results = [];
      const nand = lessonFind("nand");
      const xor = lessonFind("xor");
      if (nand) {
        const t = lessonTruthOf(nand, 2, 2);
        if (t) results.push({ name: TXT(LL("NAND: solo 11→0", "NAND: only 11→0")),
          ok: t.combos[0]===1 && t.combos[1]===1 && t.combos[2]===1 && t.combos[3]===0 });
        else results.push({ name: TXT(LL("NAND cableada a 2 Entradas y Salida", "NAND wired to 2 Inputs and an Output")), ok: false });
      } else results.push({ name: TXT(LL("Hay un NAND", "There is a NAND")), ok: false });
      if (xor) {
        const t = lessonTruthOf(xor, 2, 2);
        if (t) results.push({ name: TXT(LL("XOR: 1 solo si son distintas", "XOR: 1 only when different")),
          ok: t.combos[0]===0 && t.combos[1]===1 && t.combos[2]===1 && t.combos[3]===0 });
        else results.push({ name: TXT(LL("XOR cableada a 2 Entradas y Salida", "XOR wired to 2 Inputs and an Output")), ok: false });
      } else results.push({ name: TXT(LL("Hay un XOR", "There is an XOR")), ok: false });
      return results;
    },
  },
  {
    id: "s5",
    title: LL("5. Empaquetar: tu primera caja", "5. Packing: your first box"),
    theory: {
      es: `
        <p>Hasta acá armaste compuertas sueltas. Una computadora real tiene miles, así que
        los ingenieros las agrupan en <b>cajas con pines</b> y les ponen nombre. A eso se
        le llama <b>empaquetar</b>: una vez cerrada la caja, la usás sin pensar en lo de
        adentro.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Entrada</b> (tecla 2)</li>
          <li>1× <b>NOT</b> (tecla 5)</li>
          <li>1× <b>Salida</b> (tecla 3)</li>
        </ul>
        ${grid("Colócalos en este orden (de izquierda a derecha, de arriba abajo):", [
          [[1, "Entrada"], [2, "NOT"], [3, "Salida"]],
        ])}
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Armá el circuito: Entrada ${nb(1)} → NOT ${nb(2)} → Salida ${nb(3)}.</li>
        </ol>
        <p><b>Empaquetar:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Apretá 📦 Empaquetar (P) y arrastrá un rectángulo que cubra las 3 piezas.</li>
          <li>Apretá <b>Crear componente</b> y nombralo exactamente <b>MI_NOT</b> (sin espacios).</li>
          <li>Pines de entrada, en este orden de click: Entrada ${nb(1)}.</li>
          <li>Pines de salida, en este orden de click: Salida ${nb(3)}.</li>
          <li>Apretá <b>Crear componente</b> para confirmar.</li>
        </ol>
        <p><b>El experimento:</b> colocá tu caja <b>MI_NOT</b> de la fila 🧩, conectale una Entrada y una Salida, y alterná la Entrada. Funciona como un NOT común, pero ahora es hardware tuyo y reutilizable.</p>`,
      en: `
        <p>So far you built loose gates. A real computer has thousands of them, so
        engineers group them into <b>boxes with pins</b> and give them a name. That is called
        <b>packing</b>: once the box is closed, you use it without thinking about the inside.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Input</b> (key 2)</li>
          <li>1× <b>NOT</b> (key 5)</li>
          <li>1× <b>Output</b> (key 3)</li>
        </ul>
        ${grid("Place them in this order (left to right, top to bottom):", [
          [[1, "Input"], [2, "NOT"], [3, "Output"]],
        ])}
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Build the circuit: Input ${nb(1)} → NOT ${nb(2)} → Output ${nb(3)}.</li>
        </ol>
        <p><b>Pack it:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Press 📦 Pack (P) and drag a rectangle covering the 3 pieces.</li>
          <li>Press <b>Create component</b> and name it exactly <b>MI_NOT</b> (no spaces).</li>
          <li>Input pins, in this click order: Input ${nb(1)}.</li>
          <li>Output pins, in this click order: Output ${nb(3)}.</li>
          <li>Press <b>Create component</b> to confirm.</li>
        </ol>
        <p><b>The experiment:</b> place your <b>MI_NOT</b> from the 🧩 row, wire an Input and an Output to it, and toggle the Input. It works like a plain NOT, but now it is your own reusable hardware.</p>`,
    },
    check() {
      const results = [];
      const def = lib["MI_NOT"];
      results.push({
        name: TXT(LL('Existe un componente llamado "MI_NOT"', 'A component named "MI_NOT" exists')),
        ok: !!def,
      });
      if (def) {
        results.push({ name: TXT(LL("Tiene 1 pin de entrada", "It has 1 input pin")), ok: def.inputs.length === 1 });
        results.push({ name: TXT(LL("Tiene 1 pin de salida", "It has 1 output pin")), ok: def.outputs.length === 1 });
        const inner = def.components ?? [];
        results.push({
          name: TXT(LL("Dentro tiene un NOT (y solo compuertas)", "Inside it has a NOT (and only gates)")),
          ok: inner.some(c => c.type === "not") && inner.every(c => isGate(c.type)),
        });
        const inst = state.components.find(c => c.type === "MI_NOT");
        if (inst) {
          const wIn = state.wires.find(w => w.a.c === inst.id && w.a.t === 0 || w.b.c === inst.id && w.b.t === 0);
          if (wIn) {
            const otherC = wIn.a.c === inst.id ? wIn.b.c : wIn.a.c;
            const sw = state.components.find(c => c.type === "switch" && c.id === otherC);
            if (sw) {
              sw.on = false; let r = simulate();
              const lo = r.values[r.netOf.get(inst.id + ":1")];
              sw.on = true; r = simulate();
              const hi = r.values[r.netOf.get(inst.id + ":1")];
              sw.on = false;
              results.push({ name: TXT(LL("Tu MI_NOT colocado invierte como debe", "Your placed MI_NOT inverts as it should")), ok: lo === 1 && hi === 0 });
            }
          }
        }
      }
      return results;
    },
  },
  {
    id: "s6",
    title: LL("6. Latch SR: la memoria", "6. SR Latch: memory"),
    theory: {
      es: `
        <p>Hasta ahora los circuitos no recordaban nada: al soltar las entradas, todo volvía a cero. El <b>latch SR</b> es la memoria más simple: funciona como un interruptor de luz con dos botones, uno para encender (<b>Set</b>) y otro para apagar (<b>Reset</b>). Al presionar Encender la luz queda prendida aunque sueltes el botón, y al presionar Apagar vuelve a cero. El secreto es el cruce: la salida de cada compuerta NOR alimenta la entrada de la otra, sosteniéndose mutuamente en un bucle cerrado.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Entrada</b> (tecla 2) — R (Reset, apaga) y S (Set, enciende)</li>
          <li>2× <b>NOR</b> (tecla 9) — la memoria, conectadas en cruce</li>
          <li>2× <b>Salida</b> (tecla 3) — Q y Q̄ (su inversa)</li>
        </ul>
        ${grid("Colócalos en este orden (de izquierda a derecha, de arriba abajo):", [
          [[1, "Entrada R"], [3, "NOR Q"], [5, "Salida Q"]],
          [[2, "Entrada S"], [4, "NOR Q̄"], [6, "Salida Q̄"]],
        ])}
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Cableá la Entrada R ${nb(1)} a una entrada de la NOR de arriba ${nb(3)}.</li>
          <li>Cableá la Entrada S ${nb(2)} a una entrada de la NOR de abajo ${nb(4)}.</li>
          <li>Cableá la salida de la NOR de arriba ${nb(3)} a la entrada libre de la NOR de abajo ${nb(4)}.</li>
          <li>Cableá la salida de la NOR de abajo ${nb(4)} a la entrada libre de la NOR de arriba ${nb(3)}.</li>
          <li>Cableá la salida de la NOR de arriba ${nb(3)} a la Salida Q ${nb(5)}.</li>
          <li>Cableá la salida de la NOR de abajo ${nb(4)} a la Salida Q̄ ${nb(6)}.</li>
        </ol>
        <p><b>El experimento:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Poné S=1: Q se enciende (valor 1 guardado).</li>
          <li>Volvé S a 0: <b>Q sigue encendida</b> sola en memoria.</li>
          <li>Poné R=1: Q se apaga. Volvé R a 0: <b>Q sigue apagada</b>.</li>
        </ol>`,
      en: `
        <p>Until now, circuits forgot everything the moment you released the inputs. The <b>SR latch</b> is the simplest memory: think of a light switch with two pushbuttons, one to turn it on (<b>Set</b>) and one to turn it off (<b>Reset</b>). Press Set and the light stays on even after releasing the button; press Reset and it goes off. The secret is cross-wiring: each NOR gate's output feeds the other gate's input, holding each other in a closed loop.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Input</b> (key 2) — R (Reset, turns off) and S (Set, turns on)</li>
          <li>2× <b>NOR</b> (key 9) — the memory, cross-wired</li>
          <li>2× <b>Output</b> (key 3) — Q and Q̄ (its inverse)</li>
        </ul>
        ${grid("Place them in this order (left to right, top to bottom):", [
          [[1, "Input R"], [3, "NOR Q"], [5, "Output Q"]],
          [[2, "Input S"], [4, "NOR Q̄"], [6, "Output Q̄"]],
        ])}
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire Input R ${nb(1)} to one input of the top NOR ${nb(3)}.</li>
          <li>Wire Input S ${nb(2)} to one input of the bottom NOR ${nb(4)}.</li>
          <li>Wire the output of the top NOR ${nb(3)} to the free input of the bottom NOR ${nb(4)}.</li>
          <li>Wire the output of the bottom NOR ${nb(4)} to the free input of the top NOR ${nb(3)}.</li>
          <li>Wire the output of the top NOR ${nb(3)} to Output Q ${nb(5)}.</li>
          <li>Wire the output of the bottom NOR ${nb(4)} to Output Q̄ ${nb(6)}.</li>
        </ol>
        <p><b>The experiment:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Set S=1: Q turns on (value 1 stored).</li>
          <li>Set S back to 0: <b>Q stays on</b> by itself in memory.</li>
          <li>Set R=1: Q turns off. Set R back to 0: <b>Q stays off</b>.</li>
        </ol>`,
    },
  },
  {
    id: "s7",
    title: LL("7. Latch D: memoria con permiso", "7. D Latch: gated memory"),
    theory: {
      es: `
        <p>El <b>latch D</b> es la memoria anterior con un permiso: solo guarda cuando se lo ordenás. Tiene una entrada para el dato que querés guardar (<b>D</b>) y otra para el permiso, llamada reloj (<b>CLK</b>, clock). Con CLK=1 la salida copia en vivo a D; con CLK=0 la memoria se congela con el último valor. Las dos compuertas AND funcionan como porteros que solo dejan pasar la señal cuando CLK=1, y el NOT genera la señal invertida para apagar el latch cuando D vale 0.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Entrada</b> (tecla 2) — D (dato) y CLK (reloj / permiso)</li>
          <li>1× <b>NOT</b> (tecla 5) — invierte D</li>
          <li>2× <b>AND</b> (tecla 6) — porteros del reloj</li>
          <li>2× <b>NOR</b> (tecla 9) — memoria interna</li>
          <li>1× <b>Salida</b> (tecla 3) — Q</li>
        </ul>
        ${grid("Colócalos en este orden (de izquierda a derecha, de arriba abajo):", [
          [[1, "Entrada D"], null, [4, "AND"], [6, "NOR"], [8, "Salida Q"]],
          [null, [3, "NOT"], null, null, null],
          [[2, "Entrada CLK"], null, [5, "AND"], [7, "NOR"], null],
        ])}
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>La Entrada D ${nb(1)} va a una entrada del AND ${nb(4)} y a la entrada del NOT ${nb(3)}</li>
          <li>La salida del NOT ${nb(3)} va a una entrada del AND ${nb(5)}</li>
          <li>La Entrada CLK ${nb(2)} va a la entrada libre de los dos AND: ${nb(4)} y ${nb(5)}</li>
          <li>La salida del AND ${nb(4)} va a una entrada de la NOR ${nb(7)}</li>
          <li>La salida del AND ${nb(5)} va a una entrada de la NOR ${nb(6)}</li>
          <li>El cruce: la salida de la NOR ${nb(6)} va a la entrada libre de la NOR ${nb(7)}, y la salida de ${nb(7)} a la entrada libre de ${nb(6)}</li>
          <li>La salida de la NOR ${nb(6)} va a la <b>Salida Q</b> ${nb(8)}</li>
        </ol>
        <p><b>El experimento:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Con CLK=1: cambiá D y mirá Q. Q copia a D en tiempo real.</li>
          <li>Con CLK=0: cambiá D. <b>Q no se mueve</b>: la memoria está congelada.</li>
        </ol>
        <p><b>Empaquetar:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Apretá 📦 Empaquetar (P) y cubrí todo el circuito con el rectángulo.</li>
          <li>Apretá <b>Crear componente</b> y nombralo <b>LATCH</b>.</li>
          <li>Pines de entrada, <b>en este orden de click</b>: Entrada D ${nb(1)}, Entrada CLK ${nb(2)}.</li>
          <li>Pin de salida: Salida Q ${nb(8)}.</li>
          <li>Apretá <b>Crear componente</b> para confirmar.</li>
        </ol>`,
      en: `
        <p>The <b>D latch</b> is the previous memory plus a permission: it only updates when you allow it. It has one input for the data to store (<b>D</b>) and one for permission, called the clock (<b>CLK</b>). When CLK=1, the output copies D live; when CLK=0, memory freezes with the last value. The two AND gates act as gatekeepers that only pass signals when CLK=1, and the NOT generates the inverted signal to reset the latch whenever D is 0.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Input</b> (key 2) — D (data) and CLK (clock / permission)</li>
          <li>1× <b>NOT</b> (key 5) — inverts D</li>
          <li>2× <b>AND</b> (key 6) — clock gatekeepers</li>
          <li>2× <b>NOR</b> (key 9) — internal memory</li>
          <li>1× <b>Output</b> (key 3) — Q</li>
        </ul>
        ${grid("Place them in this order (left to right, top to bottom):", [
          [[1, "Input D"], null, [4, "AND"], [6, "NOR"], [8, "Output Q"]],
          [null, [3, "NOT"], null, null, null],
          [[2, "Input CLK"], null, [5, "AND"], [7, "NOR"], null],
        ])}
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Input D ${nb(1)} goes to one input of AND ${nb(4)} and to the input of NOT ${nb(3)}</li>
          <li>The output of NOT ${nb(3)} goes to one input of AND ${nb(5)}</li>
          <li>Input CLK ${nb(2)} goes to the free input of both ANDs: ${nb(4)} and ${nb(5)}</li>
          <li>The output of AND ${nb(4)} goes to one input of NOR ${nb(7)}</li>
          <li>The output of AND ${nb(5)} goes to one input of NOR ${nb(6)}</li>
          <li>The cross: the output of NOR ${nb(6)} goes to the free input of NOR ${nb(7)}, and the output of ${nb(7)} to the free input of ${nb(6)}</li>
          <li>The output of NOR ${nb(6)} goes to <b>Output Q</b> ${nb(8)}</li>
        </ol>
        <p><b>The experiment:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>With CLK=1: toggle D and watch Q. Q copies D in real time.</li>
          <li>With CLK=0: toggle D. <b>Q does not move</b>: memory is frozen.</li>
        </ol>
        <p><b>Pack it:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Press 📦 Pack (P) and cover the whole circuit with the rectangle.</li>
          <li>Press <b>Create component</b> and name it <b>LATCH</b>.</li>
          <li>Input pins, <b>in this click order</b>: Input D ${nb(1)}, Input CLK ${nb(2)}.</li>
          <li>Output pin: Output Q ${nb(8)}.</li>
          <li>Press <b>Create component</b> to confirm.</li>
        </ol>`,
    },
    check() {
      const sws = state.components.filter(c => c.type === "switch");
      const ands = state.components.filter(c => c.type === "and");
      const nors = state.components.filter(c => c.type === "nor");
      const def = lib["LATCH"];
      const boxOk = !!def && def.inputs.length === 2 && def.outputs.length === 1;
      const nameNeeds = TXT(LL(
        "Circuito: 2 Entradas (D y CLK), 2 AND, 2 NOR y 1 NOT, conectados",
        "Circuit: 2 Inputs (D and CLK), 2 ANDs, 2 NORs and 1 NOT, wired up"));
      const hasLoose = sws.length >= 2 && ands.length >= 2 && nors.length >= 2 && state.components.some(c => c.type === "not");

      // Functional test of the loose circuit
      let worksLoose = false;
      if (hasLoose) {
        sws.forEach(s => s.on = false);
        function tryLatch() {
          const roles = [[sws[0], sws[1]], [sws[1], sws[0]]];
          for (const [data, g] of roles) {
            for (const qn of nors) {
              for (const [dState, res] of [[false, 0], [true, 1]]) {
                g.on = true; data.on = dState;
                let r = simulate();
                const transp = r.values[r.netOf.get(qn.id + ":2")];
                g.on = false; data.on = !dState;
                r = simulate();
                const held = r.values[r.netOf.get(qn.id + ":2")];
                if (transp === res && held === res) return true;
              }
            }
          }
          return false;
        }
        worksLoose = tryLatch();
        sws.forEach(s => s.on = false);
      }

      // Functional test of the packaged box
      const worksBox = boxOk ? testPackedLatch() : false;
      const works = worksLoose || worksBox;

      return [
        { name: nameNeeds, ok: hasLoose || boxOk },
        { name: TXT(LL("Caja LATCH empaquetada (D, CLK | Q)", "Packaged LATCH box (D, CLK | Q)")), ok: boxOk },
        { name: TXT(LL("CLK=1: Q sigue a D (transparente); CLK=0: Q se congela (memoria)", "CLK=1: Q follows D (transparent); CLK=0: Q freezes (memory)")), ok: works },
      ];
    },
  },
  {
    id: "s8",
    title: LL("8. Flip-Flop D: memoria por flanco", "8. D Flip-Flop: edge-triggered memory"),
    theory: {
      es: `
        <p>La señal de reloj (CLK) sube a 1 y baja a 0 alternadamente. El <b>flanco</b> es el <i>instante exacto</i> en que cambia (aquí, al caer de 1 a 0), como el clic de un interruptor y no el tiempo que pasa encendido. Copiar el dato solo en ese clic es fundamental para que la información no se descontrole al encadenar varias memorias. El <b>flip-flop D</b> lo logra uniendo dos latches (maestro y esclavo) como dos puertas que nunca se abren juntas: el maestro recibe D mientras CLK=1, y en el clic hacia 0 el esclavo lo pasa a la salida Q.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× tu caja <b>LATCH</b> 🧩 (de la lección 7) — maestro y esclavo</li>
          <li>1× <b>NOT</b> (tecla 5) — invierte CLK para el esclavo</li>
          <li>2× <b>Entrada</b> (tecla 2) — D y CLK</li>
          <li>1× <b>Salida</b> (tecla 3) — Q</li>
        </ul>
        ${grid("Colócalos en este orden (de izquierda a derecha, de arriba abajo):", [
          [[1, "Entrada D"], [3, "LATCH maestro"], [5, "LATCH esclavo"], [6, "Salida Q"]],
          [[2, "Entrada CLK"], [4, "NOT"], null, null],
        ])}
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Cableá la Entrada D ${nb(1)} a la entrada D del LATCH maestro ${nb(3)}.</li>
          <li>Cableá la Entrada CLK ${nb(2)} a la entrada CLK del LATCH maestro ${nb(3)} y a la entrada del NOT ${nb(4)}.</li>
          <li>Cableá la salida Q del LATCH maestro ${nb(3)} a la entrada D del LATCH esclavo ${nb(5)}.</li>
          <li>Cableá la salida del NOT ${nb(4)} a la entrada CLK del LATCH esclavo ${nb(5)}.</li>
          <li>Cableá la salida Q del LATCH esclavo ${nb(5)} a la Salida Q ${nb(6)}.</li>
        </ol>
        <p><b>El experimento:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Poné D=1 y subí CLK a 1: Q no cambia (el maestro guarda D, pero el esclavo sigue cerrado).</li>
          <li>Bajá CLK a 0: <b>Q se enciende</b> (en el clic de bajada 1→0, el esclavo copió la salida del maestro).</li>
          <li>Con CLK=0, cambiá D: Q no se mueve. Solo captura en el instante del clic.</li>
        </ol>`,
      en: `
        <p>The clock signal (CLK) alternates between 1 and 0. An <b>edge</b> is the <i>exact instant</i> it changes (here, falling from 1 to 0), like the click of a switch, not the time it stays on. Capturing data only at that click is essential so values do not rush uncontrollably through chained memories. The <b>D flip-flop</b> achieves this by pairing two latches (master and slave) like two doors that never open together: the master receives D while CLK=1, and on the click to 0 the slave passes it to output Q.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× your <b>LATCH</b> box 🧩 (from lesson 7) — master and slave</li>
          <li>1× <b>NOT</b> (key 5) — inverts CLK for the slave</li>
          <li>2× <b>Input</b> (key 2) — D and CLK</li>
          <li>1× <b>Output</b> (key 3) — Q</li>
        </ul>
        ${grid("Place them in this order (left to right, top to bottom):", [
          [[1, "Input D"], [3, "Master LATCH"], [5, "Slave LATCH"], [6, "Output Q"]],
          [[2, "Input CLK"], [4, "NOT"], null, null],
        ])}
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire Input D ${nb(1)} to the D input of the master LATCH ${nb(3)}.</li>
          <li>Wire Input CLK ${nb(2)} to the CLK input of the master LATCH ${nb(3)} and to the input of the NOT ${nb(4)}.</li>
          <li>Wire the Q output of the master LATCH ${nb(3)} to the D input of the slave LATCH ${nb(5)}.</li>
          <li>Wire the output of the NOT ${nb(4)} to the CLK input of the slave LATCH ${nb(5)}.</li>
          <li>Wire the Q output of the slave LATCH ${nb(5)} to the Output Q ${nb(6)}.</li>
        </ol>
        <p><b>The experiment:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Set D=1 and raise CLK to 1: Q does not change (the master stores D, but the slave is closed).</li>
          <li>Lower CLK to 0: <b>Q turns on</b> (on the 1→0 falling click, the slave copied the master's output).</li>
          <li>With CLK=0, toggle D: Q does not move. It only captures at the instant of the click.</li>
        </ol>`,
    },
    check() {
      const sws = state.components.filter(c => c.type === "switch");
      const latches = state.components.filter(c => c.type === "LATCH");
      const nors = state.components.filter(c => c.type === "nor");
      const ands = state.components.filter(c => c.type === "and");
      const nots = state.components.filter(c => c.type === "not");
      const outs = state.components.filter(c => c.type === "out");

      const nameNeeds = TXT(LL(
        "Circuito: 2 cajas LATCH, 1 NOT, 2 Entradas y 1 Salida",
        "Circuit: 2 LATCH boxes, 1 NOT, 2 Inputs and 1 Output"));

      if (sws.length < 2 || latches.length < 2 || nots.length < 1)
        return [{ name: nameNeeds, ok: false }];

      // Reject the loose-gate version: this lesson must use the packed LATCH boxes.
      if (nors.length >= 4 || ands.length >= 4)
        return [{ name: nameNeeds, ok: false }];

      const forQ = TXT(LL("Q copia D solo en el flanco de bajada de CLK", "Q copies D only on CLK's falling edge"));
      const forHold = TXT(LL("Con CLK=0, Q queda congelado aunque D cambie", "With CLK=0, Q stays frozen even if D changes"));
      const forHoldH = TXT(LL("Con CLK=1, Q no sigue a D (sin transparencia)", "With CLK=1, Q doesn't follow D (not transparent)"));

      const connectedOuts = outs.filter(o =>
        state.wires.some(w => (w.a.c === o.id && w.a.t === 0) || (w.b.c === o.id && w.b.t === 0))
      );
      let candidateTerms = [];
      if (connectedOuts.length > 0) {
        candidateTerms = connectedOuts.map(o => o.id + ":0");
      } else {
        for (const l of latches) {
          const nIn = lib[l.type]?.inputs.length ?? 2;
          const nOut = lib[l.type]?.outputs.length ?? 1;
          for (let j = 0; j < nOut; j++) candidateTerms.push(l.id + ":" + (nIn + j));
        }
      }

      const savedGateOuts = new Map(gateOuts);
      const roles = [[sws[0], sws[1]], [sws[1], sws[0]]];
      const ok = { q: false, hold: false, holdH: false };

      for (const [data, g] of roles) {
        for (const term of candidateTerms) {
          if (ok.q && ok.hold && ok.holdH) break;
          let passedTrue = false, passedFalse = false;
          for (const dState of [true, false]) {
            const qv = r => {
              const net = r.netOf.get(term);
              return net === undefined ? -1 : r.values[net];
            };

            sws.forEach(s => s.on = false);
            g.on = true; data.on = !dState;
            simulate();
            g.on = false;
            simulate();

            g.on = true; data.on = dState;
            let r = simulate();
            const notTransp = qv(r) === (dState ? 0 : 1);

            g.on = false;
            r = simulate();
            const onEdge = qv(r) === (dState ? 1 : 0);

            data.on = !dState;
            r = simulate();
            const holdLo = qv(r) === (dState ? 1 : 0);

            sws.forEach(s => s.on = false);
            if (notTransp && onEdge && holdLo) {
              if (dState) passedTrue = true; else passedFalse = true;
            }
          }
          if (passedTrue && passedFalse) {
            ok.q = ok.hold = ok.holdH = true;
            break;
          }
        }
      }

      sws.forEach(s => s.on = false);
      gateOuts.clear();
      for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
      simulate();

      return [
        { name: nameNeeds, ok: true },
        { name: forQ, ok: ok.q },
        { name: forHold, ok: ok.hold },
        { name: forHoldH, ok: ok.holdH },
      ];
    },
  },

  {
    id: "s9",
    title: LL("9. Empaquetar el Flip-Flop", "9. Packing the Flip-Flop"),
    theory: {
      es: `
        <p>El flip-flop que armaste une 2 cajas <b>LATCH</b> y un <b>NOT</b>. Ahora usá
        el superpoder del curso:
        <b>empaquetarlo</b> para que se convierta en una caja con 2 entradas y una salida.
        A partir de ahora, un flip-flop es una pieza más — igual que las compuertas, pero
        más poderosa: <i>recuerda un bit en cada flanco de reloj</i>.</p>
        <p><b>Misión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Con tu flip-flop D en el canvas (el de la lección 8, funcionando)</li>
          <li>Presioná <b>📦 Empaquetar</b> (tecla P) y arrastrá el rectángulo sobre todo el circuito</li>
          <li><b>Crear componente</b> → nombralo <b>DFF</b></li>
          <li>Pines de entrada: la Entrada de <b>D</b> y la de <b>CLK</b> (click en ambos)</li>
          <li>Pines de salida: la <b>Salida</b> del flip-flop</li>
          <li><b>Crear componente</b></li>
        </ol>
        <p>Después colocalo desde la fila 🧩 DFF, conectale una Entrada y un Reloj (⏱, tecla 4)
        y verificá que sigue funcionando por flanco.</p>
        <p style="color:var(--dim); font-size:12px;">💡 Consejo: las Entradas que NO marques como pines quedan como constantes internas (congeladas al valor que tenían). Para el DFF, marcá D y CLK — son las únicas que deben cambiar.</p>`,
      en: `
        <p>The flip-flop you built combines 2 <b>LATCH</b> boxes and a <b>NOT</b>. Now for the
        course's superpower:
        <b>pack it</b>. It becomes a box with 2 inputs and 1 output — from now on,
        a flip-flop is just a part — like gates, but more powerful: <i>it remembers one
        bit on every clock edge</i>.</p>
        <p><b>Mission:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>With your D flip-flop on the canvas (from lesson 8, working)</li>
          <li>Press <b>📦 Pack</b> (key P) and drag the rectangle over the whole circuit</li>
          <li><b>Create component</b> → name it <b>DFF</b></li>
          <li>Input pins: the <b>D</b> Input and the <b>CLK</b> Input (click both)</li>
          <li>Output pins: the flip-flop's Output</li>
          <li><b>Create component</b></li>
        </ol>
        <p>Your box <b>DFF</b> appears below, in the 🧩 row. Place it, wire an Input and a
        Clock (⏱, key 4) to it and check it still works edge-triggered.</p>
        <p style="color:var(--dim); font-size:12px;">💡 Tip: Inputs you do NOT mark as pins stay as internal constants (frozen at the value they had). For the DFF, mark D and CLK — they're the only ones that must change.</p>`,
    },
    check() {
      const results = [];
      const def = lib["DFF"];
      results.push({ name: TXT(LL('Existe un componente "DFF"', 'A "DFF" component exists')), ok: !!def });
      if (def) {
        results.push({ name: TXT(LL("Tiene 2 pines de entrada", "It has 2 input pins")), ok: def.inputs.length === 2 });
        results.push({ name: TXT(LL("Tiene al menos 1 pin de salida", "It has at least 1 output pin")), ok: def.outputs.length >= 1 });
        const countNors = (pkgDef, depth = 0) => {
          if (!pkgDef || depth > 10) return 0;
          let count = 0;
          for (const c of (pkgDef.components ?? [])) {
            if (c.type === "nor") count++;
            else if (lib[c.type]) count += countNors(lib[c.type], depth + 1);
          }
          return count;
        };
        results.push({
          name: TXT(LL("El interior tiene las compuertas del flip-flop (4 NOR)", "The inside has the flip-flop gates (4 NORs)")),
          ok: countNors(def) >= 4,
        });
        const inst = state.components.find(c => c.type === "DFF");
        if (inst) {
          // makePackage assigns terminals by click order: the lesson never
          // fixes which of D/CLK gets t:0, so try both pin assignments.
          const wireTo = t => {
            const w = state.wires.find(w =>
              (w.a.c === inst.id && w.a.t === t) || (w.b.c === inst.id && w.b.t === t));
            if (!w) return null;
            const otherC = w.a.c === inst.id ? w.b.c : w.a.c;
            return state.components.find(c => c.type === "switch" && c.id === otherC) ?? null;
          };
          const swT0 = wireTo(0), swT1 = wireTo(1);
          if (swT0 && swT1) {
            // pin 0 = D / pin 1 = CLK, and the swapped assignment
            const roles = [[swT0, swT1], [swT1, swT0]];
            let okEdge = false;
            for (const [swD, swC] of roles) {
              swC.on = false; swD.on = true; simulate();
              swC.on = true; simulate();
              swC.on = false; // falling edge captures D=1
              const r = simulate();
              if (r.values[r.netOf.get(inst.id + ":2")] === 1) okEdge = true;
              swD.on = false;
            }
            results.push({
              name: TXT(LL("La instancia DFF copia D en el flanco", "The DFF instance copies D on the edge")),
              ok: okEdge,
            });
          }
        }
      }
      return results;
    },
  },
  {
    id: "s10",
    title: LL("10. MUX: el selector", "10. MUX: the selector"),
    theory: {
      es: `
        <p>Un <b>multiplexor (MUX)</b> es el "desvío ferroviario" de las señales: tiene 2
        entradas de datos (A y B), 1 entrada de <b>selección</b> (S), y 1 salida. Si S=0,
        la salida copia a A; si S=1, copia a B. Un solo bit decide por qué camino va la señal.</p>
        ${lt(["A", "B", "S", "OUT"], [[0,0,0,0],[0,0,1,0],[0,1,0,0],[0,1,1,1],[1,0,0,1],[1,0,1,0],[1,1,0,1],[1,1,1,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>La fórmula es OUT = A·¬S + B·S, pero no hace falta
        memorizarla: bastan 2 AND, 1 NOT y 1 OR. Es la pieza que "elige", y la CPU la usa
        constantemente: qué registro entra a la ALU, qué operación hacer, qué memoria leer.</i></p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>3× <b>Entrada</b> (tecla 2) — A, B y S (selección)</li>
          <li>1× <b>NOT</b> (tecla 5) — invierte S</li>
          <li>2× <b>AND</b> (tecla 6)</li>
          <li>1× <b>OR</b> (tecla 7)</li>
          <li>1× <b>Salida</b> (tecla 3)</li>
        </ul>
        ${grid("Colócalos en este orden (de izquierda a derecha, de arriba abajo):", [
          [[1, "Entrada A"], [4, "NOT"], [5, "AND1"], [7, "OR"], [8, "Salida"]],
          [[2, "Entrada B"], null, [6, "AND2"], null, null],
          [[3, "Entrada S"], null, null, null, null],
        ])}
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Cableá la Entrada S ${nb(3)} a la entrada del NOT ${nb(4)}.</li>
          <li>Cableá la Entrada A ${nb(1)} y la salida del NOT ${nb(4)} a las dos entradas del AND1 ${nb(5)}.</li>
          <li>Cableá la Entrada B ${nb(2)} y la Entrada S ${nb(3)} a las dos entradas del AND2 ${nb(6)}.</li>
          <li>Cableá la salida del AND1 ${nb(5)} y la salida del AND2 ${nb(6)} a las entradas del OR ${nb(7)}.</li>
          <li>Cableá la salida del OR ${nb(7)} a la Salida ${nb(8)}.</li>
        </ol>
        <p><b>El experimento:</b> con S=0, la Salida ${nb(8)} copia A ${nb(1)} e ignora B ${nb(2)}. Con S=1, copia B ${nb(2)} e ignora A ${nb(1)}.</p>`,
      en: `
        <p>A <b>multiplexer (MUX)</b> is a railway switch for signals: 2 data inputs (A and
        B), 1 <b>select</b> input (S), 1 output. If S=0 the output copies A; if S=1, B.
        One single bit decides which way the signal goes.</p>
        ${lt(["A", "B", "S", "OUT"], [[0,0,0,0],[0,0,1,0],[0,1,0,0],[0,1,1,1],[1,0,0,1],[1,0,1,0],[1,1,0,1],[1,1,1,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>The formula is OUT = A·¬S + B·S, but you don't need to
        memorize it: it takes 2 ANDs, 1 NOT and 1 OR. It is the "chooser" piece, and the CPU
        uses it constantly: which register enters the ALU, which operation to perform, which
        memory to read.</i></p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>3× <b>Input</b> (key 2) — A, B and S (select)</li>
          <li>1× <b>NOT</b> (key 5) — inverts S</li>
          <li>2× <b>AND</b> (key 6)</li>
          <li>1× <b>OR</b> (key 7)</li>
          <li>1× <b>Output</b> (key 3)</li>
        </ul>
        ${grid("Place them in this order (left to right, top to bottom):", [
          [[1, "Input A"], [4, "NOT"], [5, "AND1"], [7, "OR"], [8, "Output"]],
          [[2, "Input B"], null, [6, "AND2"], null, null],
          [[3, "Input S"], null, null, null, null],
        ])}
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire Input S ${nb(3)} to the input of the NOT ${nb(4)}.</li>
          <li>Wire Input A ${nb(1)} and the output of the NOT ${nb(4)} to the two inputs of AND1 ${nb(5)}.</li>
          <li>Wire Input B ${nb(2)} and Input S ${nb(3)} to the two inputs of AND2 ${nb(6)}.</li>
          <li>Wire the output of AND1 ${nb(5)} and the output of AND2 ${nb(6)} to the inputs of the OR ${nb(7)}.</li>
          <li>Wire the output of the OR ${nb(7)} to the Output ${nb(8)}.</li>
        </ol>
        <p><b>The experiment:</b> with S=0, the Output ${nb(8)} copies A ${nb(1)} and ignores B ${nb(2)}. With S=1, it copies B ${nb(2)} and ignores A ${nb(1)}.</p>`,
    },
    check() {
      const ands = state.components.filter(c => c.type === "and");
      const ors = state.components.filter(c => c.type === "or");
      const sws = state.components.filter(c => c.type === "switch");
      const nameNeeds = TXT(LL(
        "Circuito: 3 Entradas, 2 AND, 1 OR, 1 NOT (el mux)",
        "Circuit: 3 Inputs, 2 ANDs, 1 OR, 1 NOT (the mux)"));
      if (sws.length < 3 || ands.length < 2 || ors.length < 1 || !state.components.some(c => c.type === "not"))
        return [{ name: nameNeeds, ok: false }];
      const out = ors[0];
      const qv = () => { const r = simulate(); return r.values[r.netOf.get(out.id + ":2")]; };
      // The lesson doesn't fix a creation order for A/B/S: try every
      // permutation of switch roles (like the s6 check does). Both items
      // must come from the SAME role permutation: a real mux passes both
      // tests under any fixed assignment. No carry-over between
      // permutations; if none passes both, both items report false.
      const perms = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
      const ok = { sel0: false, sel1: false };
      for (const p of perms) {
        const a = sws[p[0]], b = sws[p[1]], s = sws[p[2]];
        sws.forEach(x => x.on = false);
        s.on = false;
        a.on = false; b.on = true;  const r1 = qv();
        a.on = true;  b.on = false; const r2 = qv();
        s.on = true;
        a.on = false; b.on = false; const r3 = qv();
        a.on = false; b.on = true;  const r4 = qv();
        sws.forEach(x => x.on = false);
        // per permutation: both must hold in THIS permutation
        const sel0 = r1 === 0 && r2 === 1;
        const sel1 = r3 === 0 && r4 === 1;
        if (sel0 && sel1) { ok.sel0 = ok.sel1 = true; break; }
      }
      return [
        { name: nameNeeds, ok: true },
        { name: TXT(LL("S=0 → la salida copia A", "S=0 → output copies A")), ok: ok.sel0 },
        { name: TXT(LL("S=1 → la salida copia B", "S=1 → output copies B")), ok: ok.sel1 },
      ];
    },
  },
  {
    id: "s11",
    title: LL("11. Empaquetá el MUX2", "11. Pack the MUX2"),
    theory: {
      es: `
        <p>El MUX se va a usar a montones en la CPU — <i>decenas</i>: para elegir qué registro
        entra a la ALU, qué operación se ejecuta, qué memoria se lee. Empaquetá el de la
        lección anterior para nunca más volver a dibujar sus 4 compuertas.</p>
        <p><b>Misión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Con el MUX de la lección 10 en el canvas</li>
          <li>📦 Empaquetar (P) → rectángulo sobre todo → <b>Crear componente</b></li>
          <li>Nombralo <b>MUX2</b></li>
          <li>Pines de entrada: las 3 Entradas, <b>en este orden</b>: A, B, S (el orden de click define el orden de los pines)</li>
          <li>Pin de salida: la Salida. <b>Crear componente</b></li>
        </ol>
        <p>Probalo: colocalo desde la fila 🧩, cableale 3 Entradas y una Salida, y alterná S
        mientras movés A y B.</p>
        <p style="color:var(--dim); font-size:12px;">💡 Con tu caja MUX2 + tu caja DFF ya podés armar registros y buses de datos — las próximas lecciones.</p>`,
      en: `
        <p>The MUX will be used everywhere in the CPU — <i>dozens</i> of them: to choose which
        register enters the ALU, which operation runs, which memory to read. Pack the one
        from the previous lesson so you never draw its 4 gates again.</p>
        <p><b>Mission:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>With the MUX from lesson 10 on the canvas</li>
          <li>📦 Pack (P) → rectangle over everything → <b>Create component</b></li>
          <li>Name it <b>MUX2</b></li>
          <li>Input pins: the 3 Inputs, <b>in this order</b>: A, B, S (click order = pin order)</li>
          <li>Output pin: the Output. <b>Create component</b></li>
        </ol>
        <p>Then place it from the 🧩 row, wire 3 Inputs and an Output, and toggle S while
        changing A and B.</p>
        <p style="color:var(--dim); font-size:12px;">💡 With your MUX2 + DFF boxes you can already build registers and data buses — the next lessons.</p>`,
    },
    check() {
      const results = [];
      const def = lib["MUX2"];
      results.push({ name: TXT(LL('Existe un componente "MUX2"', 'A "MUX2" component exists')), ok: !!def });
      if (def) {
        results.push({ name: TXT(LL("Tiene 3 pines de entrada", "It has 3 input pins")), ok: def.inputs.length === 3 });
        results.push({ name: TXT(LL("Tiene 1 pin de salida", "It has 1 output pin")), ok: def.outputs.length === 1 });
        results.push({
          name: TXT(LL("El interior tiene 2 AND y 1 OR", "The inside has 2 ANDs and 1 OR")),
          ok: (def.components ?? []).filter(c => c.type === "and").length === 2
            && (def.components ?? []).filter(c => c.type === "or").length === 1,
        });
        const inst = state.components.find(c => c.type === "MUX2");
        if (inst) {
          const wA = state.wires.find(w => (w.a.c === inst.id && w.a.t === 0) || (w.b.c === inst.id && w.b.t === 0));
          const wB = state.wires.find(w => (w.a.c === inst.id && w.a.t === 1) || (w.b.c === inst.id && w.b.t === 1));
          const wS = state.wires.find(w => (w.a.c === inst.id && w.a.t === 2) || (w.b.c === inst.id && w.b.t === 2));
          if (wA && wB && wS) {
            const swA = state.components.find(c => c.type === "switch" && c.id === (wA.a.c === inst.id ? wA.b.c : wA.a.c));
            const swB = state.components.find(c => c.type === "switch" && c.id === (wB.a.c === inst.id ? wB.b.c : wB.a.c));
            const swS = state.components.find(c => c.type === "switch" && c.id === (wS.a.c === inst.id ? wS.b.c : wS.a.c));
            if (swA && swB && swS) {
              let okMux = true;
              swS.on = false; swA.on = true;  let r = simulate();
              okMux = okMux && r.values[r.netOf.get(inst.id + ":3")] === 1;
              swA.on = false; swB.on = true;  r = simulate();
              okMux = okMux && r.values[r.netOf.get(inst.id + ":3")] === 0;
              swS.on = true;
              swB.on = false; r = simulate();
              okMux = okMux && r.values[r.netOf.get(inst.id + ":3")] === 0;
              swB.on = true;  r = simulate();
              okMux = okMux && r.values[r.netOf.get(inst.id + ":3")] === 1;
              swA.on = false; swB.on = false; swS.on = false;
              results.push({ name: TXT(LL("Tu MUX2 colocado selecciona bien", "Your placed MUX2 selects correctly")), ok: okMux });
            }
          }
        }
      }
      return results;
    },
  },
  {
    id: "s12",
    title: LL("12. Registro de 1 bit", "12. 1-bit register"),
    theory: {
      es: `
        <p>Un flip-flop copia su entrada en cada flanco de reloj. Pero en una CPU no querés
        sobreescribir tus datos todo el tiempo; necesitás decidir <b>cuándo cargar</b> un dato nuevo
        y <b>cuándo conservar</b> el anterior.</p>
        <p>La solución es poner un selector <b>MUX2</b> a la entrada: si <b>LOAD=1</b> (cargar),
        deja pasar el dato nuevo D; si <b>LOAD=0</b> (mantener), reconecta la propia salida Q del
        flip-flop hacia su entrada. Al alimentarse de sí mismo, el bit queda congelado.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× tu caja <b>DFF</b> 🧩 (de la lección 9)</li>
          <li>1× tu caja <b>MUX2</b> 🧩 (de la lección 11)</li>
          <li>3× <b>Entrada</b> (tecla 2) — D, LOAD y CLK</li>
          <li>1× <b>Salida</b> (tecla 3) — Q</li>
        </ul>
        ${grid("Colócalos en este orden (de izquierda a derecha, de arriba abajo):", [
          [[1, "Entrada D"], [4, "MUX2"], [5, "DFF"], [6, "Salida Q"]],
          [[2, "Entrada LOAD"], null, null, null],
          [[3, "Entrada CLK"], null, null, null],
        ])}
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Cableá la salida Q del DFF ${nb(5)} a la entrada A del MUX2 ${nb(4)} (camino para mantener).</li>
          <li>Cableá la Entrada D ${nb(1)} a la entrada B del MUX2 ${nb(4)} (camino para cargar).</li>
          <li>Cableá la Entrada LOAD ${nb(2)} a la entrada S (selector) del MUX2 ${nb(4)}.</li>
          <li>Cableá la salida del MUX2 ${nb(4)} a la entrada D del DFF ${nb(5)}.</li>
          <li>Cableá la Entrada CLK ${nb(3)} a la entrada CLK del DFF ${nb(5)}.</li>
          <li>Cableá la salida Q del DFF ${nb(5)} a la Salida Q ${nb(6)}.</li>
        </ol>
        <p><b>El experimento:</b> con LOAD=1 y D=1, dale un pulso a CLK (subí y bajá): la Salida ${nb(6)} pasa a 1. Con LOAD=0 y D=0, dale otro pulso: la Salida <b>sigue en 1</b>. Solo carga cuando LOAD=1.</p>
        <p><b>Empaquetar:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Apretá 📦 Empaquetar (P) y cubrí todo el circuito con el rectángulo.</li>
          <li>Apretá <b>Crear componente</b> y nombralo <b>REG1</b>.</li>
          <li>Pines de entrada, <b>en este orden de click</b>: Entrada D ${nb(1)}, Entrada LOAD ${nb(2)}, Entrada CLK ${nb(3)}.</li>
          <li>Pin de salida: Salida Q ${nb(6)}.</li>
          <li>Apretá <b>Crear componente</b> para confirmar.</li>
        </ol>`,
      en: `
        <p>A flip-flop copies its input on every clock edge. But in a CPU you don't want to
        overwrite data every single cycle; you need to choose <b>when to load</b> new data and
        <b>when to hold</b> what is already there.</p>
        <p>The solution is a <b>MUX2</b> at the input: if <b>LOAD=1</b> (load), it lets new
        data D through; if <b>LOAD=0</b> (hold), it feeds the flip-flop's own Q output back into
        its input. By feeding itself, the stored bit stays frozen.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× your <b>DFF</b> box 🧩 (from lesson 9)</li>
          <li>1× your <b>MUX2</b> box 🧩 (from lesson 11)</li>
          <li>3× <b>Input</b> (key 2) — D, LOAD, and CLK</li>
          <li>1× <b>Output</b> (key 3) — Q</li>
        </ul>
        ${grid("Place them in this order (left to right, top to bottom):", [
          [[1, "Input D"], [4, "MUX2"], [5, "DFF"], [6, "Output Q"]],
          [[2, "Input LOAD"], null, null, null],
          [[3, "Input CLK"], null, null, null],
        ])}
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire the Q output of the DFF ${nb(5)} to MUX2 input A ${nb(4)} (hold path).</li>
          <li>Wire Input D ${nb(1)} to MUX2 input B ${nb(4)} (load path).</li>
          <li>Wire Input LOAD ${nb(2)} to MUX2 input S (select) ${nb(4)}.</li>
          <li>Wire the MUX2 output ${nb(4)} to the DFF input D ${nb(5)}.</li>
          <li>Wire Input CLK ${nb(3)} to the DFF input CLK ${nb(5)}.</li>
          <li>Wire the Q output of the DFF ${nb(5)} to the Output Q ${nb(6)}.</li>
        </ol>
        <p><b>The experiment:</b> with LOAD=1 and D=1, pulse CLK (toggle up and down): the Output Q ${nb(6)} becomes 1. With LOAD=0 and D=0, pulse CLK again: the Output <b>stays 1</b>. It only loads when LOAD=1.</p>
        <p><b>Pack it:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Press 📦 Pack (P) and cover the whole circuit with the rectangle.</li>
          <li>Press <b>Create component</b> and name it <b>REG1</b>.</li>
          <li>Input pins, <b>in this click order</b>: Input D ${nb(1)}, Input LOAD ${nb(2)}, Input CLK ${nb(3)}.</li>
          <li>Output pin: Output Q ${nb(6)}.</li>
          <li>Press <b>Create component</b> to confirm.</li>
        </ol>`,
    },
    check() {
      const results = [];
      const dff = state.components.filter(c => c.type === "DFF");
      const mux2 = state.components.filter(c => c.type === "MUX2");
      const reg1Comp = state.components.filter(c => c.type === "REG1");
      const sws = state.components.filter(c => c.type === "switch");
      const clkComps = state.components.filter(c => c.type === "clock");
      const outs = state.components.filter(c => c.type === "out");

      const hasLib = !!lib["REG1"];
      const okLib = hasLib ? testPackedReg1() : false;
      const hasLoose = dff.length >= 1 && mux2.length >= 1 && (sws.length >= 2 || (sws.length >= 1 && clkComps.length >= 1));
      const hasInst = reg1Comp.length >= 1;

      const nameNeeds = TXT(LL(
        "Circuito: 1 DFF, 1 MUX2, Entradas (D, LOAD, CLK) y Salida",
        "Circuit: 1 DFF, 1 MUX2, Inputs (D, LOAD, CLK) and Output"));
      results.push({ name: nameNeeds, ok: hasLoose || hasInst });

      // Functional test of the loose circuit
      let okLoad = false;
      let okHold = false;
      if (hasLoose) {
        const targetDff = dff[0];
        const outC = outs[0];
        const qv = (r) => {
          if (outC) {
            const net = r.netOf.get(outC.id + ":0");
            if (net !== undefined) return r.values[net];
          }
          if (targetDff) {
            const net = r.netOf.get(targetDff.id + ":2");
            if (net !== undefined) return r.values[net];
          }
          return -1;
        };

        const clockComp = clkComps[0] ?? null;
        let clkSw = null;
        if (targetDff) {
          const wC = state.wires.find(w => (w.a.c === targetDff.id && w.a.t === 1) || (w.b.c === targetDff.id && w.b.t === 1));
          if (wC) {
            const otherId = wC.a.c === targetDff.id ? wC.b.c : wC.a.c;
            clkSw = sws.find(s => s.id === otherId) ?? null;
          }
        }

        const savedSw = sws.map(s => ({ s, on: s.on }));
        const savedClock = clockComp ? (globalClockState.get(clockComp.id) ?? false) : false;

        const pulseWith = (cSw) => {
          if (cSw) {
            cSw.on = true; simulate();
            cSw.on = false; return simulate();
          } else if (clockComp) {
            globalClockState.set(clockComp.id, true); simulate();
            globalClockState.set(clockComp.id, false); return simulate();
          }
          return simulate();
        };

        const candidateClk = clkSw ? [clkSw] : (clockComp ? [null] : sws);
        outerLoop:
        for (const curClk of candidateClk) {
          const dataCandidates = sws.filter(s => s !== curClk);
          for (let i = 0; i < dataCandidates.length; i++) {
            for (let j = 0; j < dataCandidates.length; j++) {
              if (i === j) continue;
              const curLoad = dataCandidates[i];
              const curD = dataCandidates[j];

              sws.forEach(s => s.on = false);
              if (clockComp) globalClockState.set(clockComp.id, false);
              simulate();

              curLoad.on = true; curD.on = true;
              pulseWith(curClk);
              const r1 = qv(simulate());

              curLoad.on = false; curD.on = false;
              pulseWith(curClk);
              const r2 = qv(simulate());

              curLoad.on = true; curD.on = false;
              pulseWith(curClk);
              const r3 = qv(simulate());

              curLoad.on = false; curD.on = true;
              pulseWith(curClk);
              const r4 = qv(simulate());

              if (r1 === 1 && r3 === 0) okLoad = true;
              if (r1 === 1 && r2 === 1 && r3 === 0 && r4 === 0) {
                okLoad = true;
                okHold = true;
                break outerLoop;
              }
            }
          }
        }

        savedSw.forEach(({ s, on }) => s.on = on);
        if (clockComp) globalClockState.set(clockComp.id, savedClock);
        simulate();
      }

      results.push({ name: TXT(LL("Caja REG1 empaquetada (D, LOAD, CLK | Q)", "REG1 box packaged (D, LOAD, CLK | Q)")), ok: okLib });
      results.push({ name: TXT(LL("LOAD=1 + pulso carga D", "LOAD=1 + pulse loads D")), ok: okLoad || okLib });
      results.push({ name: TXT(LL("LOAD=0 + pulso mantiene el valor", "LOAD=0 + pulse holds value")), ok: okHold || okLib });
      return results;
    },
  },
  {
    id: "s13",
    title: LL("13. Registro de 4 bits", "13. 4-bit register"),
    theory: {
      es: `
        <p>Una CPU procesa números completos de varios bits (palabras), como los 4 bits de un dato
        o una instrucción. Para guardar 4 bits a la vez, no reinventamos la rueda: colocamos
        <b>4 registros REG1 en paralelo</b>.</p>
        <p>Todos comparten la misma entrada de <b>LOAD</b> y el mismo pulso de <b>CLK</b>. Así, con una
        sola orden, la CPU carga o congela los 4 dígitos juntos en el mismo instante.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× tu caja <b>REG1</b> 🧩 (de la lección 12)</li>
          <li>4× <b>Entrada</b> de datos (tecla 2) — D0, D1, D2, D3</li>
          <li>1× <b>Entrada</b> de LOAD (tecla 2) — compartida</li>
          <li>1× <b>Entrada</b> de CLK (tecla 2) — compartida (o un ⏱ reloj, tecla 4)</li>
          <li>4× <b>Salida</b> (tecla 3) — Q0, Q1, Q2, Q3</li>
        </ul>
        ${grid("Colócalos en este orden (de izquierda a derecha, de arriba abajo):", [
          [[1, "D0-D3"], [4, "4× REG1"], [5, "Q0-Q3"]],
          [[2, "LOAD"], null, null],
          [[3, "CLK"], null, null],
        ])}
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Cada Entrada de datos D0-D3 ${nb(1)} va al pin D de su REG1 del grupo ${nb(4)}.</li>
          <li>La Entrada LOAD ${nb(2)} va al pin LOAD de los 4 REG1 ${nb(4)}.</li>
          <li>La Entrada CLK ${nb(3)} va al pin CLK de los 4 REG1 ${nb(4)}.</li>
          <li>La salida Q de cada REG1 ${nb(4)} va a su Salida correspondiente del grupo ${nb(5)}.</li>
        </ol>
        <p><b>El experimento:</b> poné LOAD=1, colocá un 5 en binario (D0=1, D1=0, D2=1, D3=0) y dale un pulso de CLK: las Salidas ${nb(5)} muestran 5. Poné LOAD=0, cambiá las entradas D a cualquier otro número y dale otro pulso: las Salidas <b>se quedan en 5</b>.</p>
        <p><b>Empaquetar:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Apretá 📦 Empaquetar (P) y cubrí todo el circuito con el rectángulo.</li>
          <li>Apretá <b>Crear componente</b> y nombralo <b>REG4</b>.</li>
          <li>Pines de entrada, <b>en este orden de click</b>: D0, D1, D2, D3, LOAD, CLK.</li>
          <li>Pines de salida, <b>en este orden</b>: Q0, Q1, Q2, Q3.</li>
          <li>Apretá <b>Crear componente</b> para confirmar.</li>
        </ol>`,
      en: `
        <p>A CPU processes multi-bit words, like the 4 bits of a number or instruction. To store
        4 bits at once, we don't start from scratch: we place <b>4 REG1 registers in parallel</b>.</p>
        <p>All 4 share the same <b>LOAD</b> command and the same <b>CLK</b> pulse. With a single
        signal, the CPU loads or freezes all 4 digits together at the exact same instant.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× your <b>REG1</b> box 🧩 (from lesson 12)</li>
          <li>4× data <b>Input</b> (key 2) — D0, D1, D2, D3</li>
          <li>1× <b>Input</b> for LOAD (key 2) — shared</li>
          <li>1× <b>Input</b> for CLK (key 2) — shared (or a ⏱ clock, key 4)</li>
          <li>4× <b>Output</b> (key 3) — Q0, Q1, Q2, Q3</li>
        </ul>
        ${grid("Place them in this order (left to right, top to bottom):", [
          [[1, "D0-D3"], [4, "4× REG1"], [5, "Q0-Q3"]],
          [[2, "LOAD"], null, null],
          [[3, "CLK"], null, null],
        ])}
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Each data Input D0-D3 ${nb(1)} goes to the D pin of its REG1 in the group ${nb(4)}.</li>
          <li>The LOAD Input ${nb(2)} goes to the LOAD pin of all 4 REG1s ${nb(4)}.</li>
          <li>The CLK Input ${nb(3)} goes to the CLK pin of all 4 REG1s ${nb(4)}.</li>
          <li>The Q output of each REG1 ${nb(4)} goes to its corresponding Output in the group ${nb(5)}.</li>
        </ol>
        <p><b>The experiment:</b> set LOAD=1, enter binary 5 (D0=1, D1=0, D2=1, D3=0), and pulse CLK: the Outputs ${nb(5)} show 5. Set LOAD=0, change D to any other number, and pulse CLK again: the Outputs <b>stay at 5</b>.</p>
        <p><b>Pack it:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Press 📦 Pack (P) and cover the whole circuit with the rectangle.</li>
          <li>Press <b>Create component</b> and name it <b>REG4</b>.</li>
          <li>Input pins, <b>in this click order</b>: D0, D1, D2, D3, LOAD, CLK.</li>
          <li>Output pins, <b>in this order</b>: Q0, Q1, Q2, Q3.</li>
          <li>Press <b>Create component</b> to confirm.</li>
        </ol>`,
    },
    check() {
      const results = [];
      const reg1 = state.components.filter(c => c.type === "REG1");
      const reg4 = state.components.filter(c => c.type === "REG4");
      const sws = state.components.filter(c => c.type === "switch");
      const clkComps = state.components.filter(c => c.type === "clock");
      const outs = state.components.filter(c => c.type === "out");

      const hasLib = !!lib["REG4"];
      const okLib = hasLib ? testPackedReg4() : false;
      const hasLoose = reg1.length >= 4;
      const hasInst = reg4.length >= 1;

      const nameNeeds = TXT(LL(
        "Circuito: 4 cajas REG1 con LOAD y CLK compartidos",
        "Circuit: 4 REG1 boxes with shared LOAD and CLK"));
      results.push({ name: nameNeeds, ok: (hasLoose && (sws.length >= 5 || (sws.length >= 4 && clkComps.length >= 1))) || hasInst });

      let okLoad = false;
      let okHold = false;

      if (hasLoose) {
        const savedSw = sws.map(s => ({ s, on: s.on }));
        const clockComp = clkComps[0] ?? null;
        const savedClock = clockComp ? (globalClockState.get(clockComp.id) ?? false) : false;

        try {
          const regBoxes = reg1.slice(0, 4);
          const getDrivingSwitch = (regComp, pin) => {
            const w = state.wires.find(w => (w.a.c === regComp.id && w.a.t === pin) || (w.b.c === regComp.id && w.b.t === pin));
            if (!w) return null;
            const otherId = w.a.c === regComp.id ? w.b.c : w.a.c;
            return sws.find(s => s.id === otherId) ?? null;
          };

          const loadSwCandidate = getDrivingSwitch(regBoxes[0], 1);
          const clkSwCandidate = getDrivingSwitch(regBoxes[0], 2);

          const dataSws = regBoxes.map(r => getDrivingSwitch(r, 0));
          const outList = regBoxes.map(regComp => {
            const w = state.wires.find(w => (w.a.c === regComp.id && w.a.t === 3) || (w.b.c === regComp.id && w.b.t === 3));
            if (!w) return null;
            const otherId = w.a.c === regComp.id ? w.b.c : w.a.c;
            return outs.find(o => o.id === otherId) ?? null;
          });

          const pulse = () => {
            if (clkSwCandidate) {
              clkSwCandidate.on = true; simulate();
              clkSwCandidate.on = false; return simulate();
            } else if (clockComp) {
              globalClockState.set(clockComp.id, true); simulate();
              globalClockState.set(clockComp.id, false); return simulate();
            }
            return simulate();
          };

          const readVal = (r) => {
            let v = 0;
            for (let i = 0; i < 4; i++) {
              const outC = outList[i];
              let net;
              if (outC) net = r.netOf.get(outC.id + ":0");
              else net = r.netOf.get(regBoxes[i].id + ":3");
              const val = net !== undefined ? r.values[net] : -1;
              if (val === 1) v |= (1 << i);
              else if (val !== 0) return -1;
            }
            return v;
          };

          if (loadSwCandidate && (clkSwCandidate || clockComp) && dataSws.every(Boolean)) {
            loadSwCandidate.on = true;
            for (let i = 0; i < 4; i++) dataSws[i].on = !!((5 >> i) & 1);
            pulse();
            const v1 = readVal(simulate());

            loadSwCandidate.on = false;
            for (let i = 0; i < 4; i++) dataSws[i].on = !!((10 >> i) & 1);
            pulse();
            const v2 = readVal(simulate());

            loadSwCandidate.on = true;
            for (let i = 0; i < 4; i++) dataSws[i].on = !!((10 >> i) & 1);
            pulse();
            const v3 = readVal(simulate());

            loadSwCandidate.on = false;
            for (let i = 0; i < 4; i++) dataSws[i].on = false;
            pulse();
            const v4 = readVal(simulate());

            if (v1 === 5 && v3 === 10) okLoad = true;
            if (v1 === 5 && v2 === 5 && v3 === 10 && v4 === 10) okHold = true;
          }
        } catch (e) {
          okLoad = false;
          okHold = false;
        } finally {
          savedSw.forEach(({ s, on }) => s.on = on);
          if (clockComp) globalClockState.set(clockComp.id, savedClock);
          simulate();
        }
      }

      results.push({ name: TXT(LL("Caja REG4 empaquetada (D0-D3, LOAD, CLK | Q0-Q3)", "REG4 box packaged (D0-D3, LOAD, CLK | Q0-Q3)")), ok: okLib });
      results.push({ name: TXT(LL("Carga valor de 4 bits con LOAD=1", "Loads 4-bit value with LOAD=1")), ok: okLoad || okLib });
      results.push({ name: TXT(LL("Mantiene valor de 4 bits con LOAD=0", "Holds 4-bit value with LOAD=0")), ok: okHold || okLib });
      return results;
    },
  },
  {
    id: "s14",
    title: LL("14. Half adder: sumar bits", "14. Half adder: adding bits"),
    theory: {
      es: `
        <p>Llegó la hora de que tu circuito <b>calcule</b>. Primero, un repaso rápido de
        <b>números binarios</b> (si ya los conocés, saltá este párrafo): en binario solo hay
        0s y 1s, y los números se forman con potencias de 2. Ejemplo con 4 bits:
        0101 = 0·8 + 1·4 + 0·2 + 1·1 = 5. Sumar binario funciona igual que sumar en columnas:
        vas columna por columna, y si el resultado de una columna "se pasa", <b>llevás
        uno</b> (carry) a la siguiente.</p>
        <p>El <b>half adder</b> (sumador medio) suma los bits de <i>una sola columna</i>:
        2 entradas (A y B), 2 salidas: <b>S</b> (la suma, el dígito de abajo) y <b>C</b>
        (el acarreo, el que "lleva" a la columna siguiente):</p>
        ${lt(["A", "B", "S", "C"], [[0,0,0,0],[0,1,1,0],[1,0,1,0],[1,1,0,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>Mirá la tabla: S vale 1 cuando A y B son diferentes
        (¡eso es XOR!) y C vale 1 solo cuando ambos son 1 (¡eso es AND!). Ya sabés hacer ambas.</i></p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Entrada</b> (tecla 2) — los bits a sumar</li>
          <li>1× <b>XOR</b> (tecla 0) — da la suma S</li>
          <li>1× <b>AND</b> (tecla 6) — da el acarreo C</li>
          <li>2× <b>Salida</b> (tecla 3) — S y C</li>
        </ul>
        ${grid("Colócalos en este orden (de izquierda a derecha, de arriba abajo):", [
          [[1, "Entrada A"], [3, "XOR"], [5, "Salida S"]],
          [[2, "Entrada B"], [4, "AND"], [6, "Salida C"]],
        ])}
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Cableá la Entrada A ${nb(1)} a una entrada del XOR ${nb(3)} y del AND ${nb(4)}.</li>
          <li>Cableá la Entrada B ${nb(2)} a la otra entrada del XOR ${nb(3)} y del AND ${nb(4)}.</li>
          <li>Cableá la salida del XOR ${nb(3)} a la Salida S ${nb(5)}.</li>
          <li>Cableá la salida del AND ${nb(4)} a la Salida C ${nb(6)}.</li>
        </ol>
        <p><b>El experimento:</b> probá las 4 combinaciones. En 1+1, la Salida S ${nb(5)} da 0 y la Salida C ${nb(6)} da 1 — la primera vez que tu circuito "lleva uno".</p>`,
      en: `
        <p>Time for your circuit to <b>compute</b>. Quick refresher on <b>binary numbers</b>
        (skip this paragraph if you know them): in binary there are only 0s and 1s, and
        numbers are built from powers of 2. Example with 4 bits:
        0101 = 0·8 + 1·4 + 0·2 + 1·1 = 5. Binary addition works just like column addition:
        you go column by column, and if a column's result "overflows", you <b>carry one</b>
        to the next.</p>
        <p>The <b>half adder</b> adds the bits of <i>a single column</i>: 2 inputs (A and B),
        2 outputs: <b>S</b> (the sum, the bottom digit) and <b>C</b> (the carry, the one
        that "travels" to the next column):</p>
        ${lt(["A", "B", "S", "C"], [[0,0,0,0],[0,1,1,0],[1,0,1,0],[1,1,0,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>Look at the table: S is 1 when A and B differ
        (that's XOR!) and C is 1 only when both are 1 (that's AND!). You can build both.</i></p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Input</b> (key 2) — the bits to add</li>
          <li>1× <b>XOR</b> (key 0) — gives the sum S</li>
          <li>1× <b>AND</b> (key 6) — gives the carry C</li>
          <li>2× <b>Output</b> (key 3) — S and C</li>
        </ul>
        ${grid("Place them in this order (left to right, top to bottom):", [
          [[1, "Input A"], [3, "XOR"], [5, "Output S"]],
          [[2, "Input B"], [4, "AND"], [6, "Output C"]],
        ])}
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire Input A ${nb(1)} to one input of the XOR ${nb(3)} and the AND ${nb(4)}.</li>
          <li>Wire Input B ${nb(2)} to the other input of the XOR ${nb(3)} and the AND ${nb(4)}.</li>
          <li>Wire the output of the XOR ${nb(3)} to Output S ${nb(5)}.</li>
          <li>Wire the output of the AND ${nb(4)} to Output C ${nb(6)}.</li>
        </ol>
        <p><b>The experiment:</b> try all 4 combinations. At 1+1, Output S ${nb(5)} is 0 and Output C ${nb(6)} is 1 — the first time your circuit "carries a one".</p>`,
    },
    check() {
      const xo = lessonFind("xor");
      const an = lessonFind("and");
      if (!xo || !an) return [{ name: TXT(LL("Hay un XOR y un AND en el circuito", "There is an XOR and an AND in the circuit")), ok: false }];
      const tX = lessonTruthOf(xo, 2, 2);
      const tA = lessonTruthOf(an, 2, 2);
      if (!tX || !tA) return [{ name: TXT(LL("Ambos cableados a 2 Entradas", "Both wired to 2 Inputs")), ok: false }];
      const sameInputs = new Set([...tX.switches, ...tA.switches].map(s => s.id)).size === 2;
      const okS = sameInputs && tX.combos[0]===0 && tX.combos[1]===1 && tX.combos[2]===1 && tX.combos[3]===0;
      const okC = sameInputs && tA.combos[0]===0 && tA.combos[1]===0 && tA.combos[2]===0 && tA.combos[3]===1;
      return [
        { name: TXT(LL("XOR y AND comparten las mismas 2 Entradas", "XOR and AND share the same 2 Inputs")), ok: sameInputs },
        { name: TXT(LL("S = XOR(A,B) — la suma", "S = XOR(A,B) — the sum")), ok: okS },
        { name: TXT(LL("C = AND(A,B) — el acarreo", "C = AND(A,B) — the carry")), ok: okC },
      ];
    },
  },
  {
    id: "s15",
    title: LL("15. Sumador completo (full adder)", "15. Full adder"),
    theory: {
      es: `
        <p>El half adder tiene una limitación: solo suma <i>una columna</i>. Pero cuando sumás
        números de varias columnas, el acarreo de la columna anterior <b>llega</b> a la
        siguiente — hay que sumar <b>3 bits</b>: A + B + el acarreo que viene de la columna
        anterior (lo llamamos <b>Cin</b>, carry-in, "acarreo entrante"). Ese circuito es el
        <b>full adder</b> (sumador completo): 3 entradas, 2 salidas.</p>
        ${lt(["A", "B", "Cin", "S", "Cout"], [
          [0,0,0,0,0],[0,0,1,1,0],[0,1,0,1,0],[0,1,1,0,1],
          [1,0,0,1,0],[1,0,1,0,1],[1,1,0,0,1],[1,1,1,1,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>S = A ⊕ B ⊕ Cin (la XOR en cascada calcula la "paridad" de los 3 bits).
        Cout = 1 cuando al menos 2 de las 3 entradas valen 1.</i></p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>3× <b>Entrada</b> (tecla 2) — A, B, Cin</li>
          <li>2× <b>XOR</b> (tecla 0)</li>
          <li>2× <b>AND</b> (tecla 6)</li>
          <li>1× <b>OR</b> (tecla 7)</li>
          <li>2× <b>Salida</b> (tecla 3) — S y Cout</li>
        </ul>
        ${grid("Colócalos en este orden (de izquierda a derecha, de arriba abajo):", [
          [[1, "Entrada A"], [4, "XOR1"], [6, "XOR2"], [8, "OR"], [9, "Salida S"]],
          [[2, "Entrada B"], [5, "AND1"], null, null, [10, "Salida Cout"]],
          [[3, "Entrada Cin"], null, [7, "AND2"], null, null],
        ])}
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Cableá la Entrada A ${nb(1)} y la Entrada B ${nb(2)} a las dos entradas del XOR1 ${nb(4)}.</li>
          <li>Cableá la salida del XOR1 ${nb(4)} y la Entrada Cin ${nb(3)} a las dos entradas del XOR2 ${nb(6)}. La salida del XOR2 ${nb(6)} es la Salida S ${nb(9)}.</li>
          <li>Cableá la Entrada A ${nb(1)} y la Entrada B ${nb(2)} a las dos entradas del AND1 ${nb(5)}.</li>
          <li>Cableá la salida del XOR1 ${nb(4)} y la Entrada Cin ${nb(3)} a las dos entradas del AND2 ${nb(7)}.</li>
          <li>Cableá la salida del AND1 ${nb(5)} y la salida del AND2 ${nb(7)} a las entradas del OR ${nb(8)}. La salida del OR ${nb(8)} es la Salida Cout ${nb(10)}.</li>
        </ol>
        <p><b>El experimento:</b> probá 1+1+0 (S=0, Cout=1) y 1+1+1 (S=1, Cout=1). En la próxima lección vas a empaquetar esta pieza como FULLADDER.</p>`,
      en: `
        <p>The half adder has a limitation: it only adds <i>one column</i>. But when adding
        multi-column numbers, the carry from the previous column <b>arrives</b> — so you need
        to add <b>3 bits</b>: A + B + the incoming carry (we call it <b>Cin</b>, carry-in).
        That circuit is the <b>full adder</b>: 3 inputs, 2 outputs.</p>
        ${lt(["A", "B", "Cin", "S", "Cout"], [
          [0,0,0,0,0],[0,0,1,1,0],[0,1,0,1,0],[0,1,1,0,1],
          [1,0,0,1,0],[1,0,1,0,1],[1,1,0,0,1],[1,1,1,1,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>S = A ⊕ B ⊕ Cin (the cascaded XOR computes the "parity" of the 3 bits).
        Cout = 1 when at least 2 of the 3 inputs are 1.</i></p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>3× <b>Input</b> (key 2) — A, B, Cin</li>
          <li>2× <b>XOR</b> (key 0)</li>
          <li>2× <b>AND</b> (key 6)</li>
          <li>1× <b>OR</b> (key 7)</li>
          <li>2× <b>Output</b> (key 3) — S and Cout</li>
        </ul>
        ${grid("Place them in this order (left to right, top to bottom):", [
          [[1, "Input A"], [4, "XOR1"], [6, "XOR2"], [8, "OR"], [9, "Output S"]],
          [[2, "Input B"], [5, "AND1"], null, null, [10, "Output Cout"]],
          [[3, "Input Cin"], null, [7, "AND2"], null, null],
        ])}
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire Input A ${nb(1)} and Input B ${nb(2)} to the two inputs of XOR1 ${nb(4)}.</li>
          <li>Wire the output of XOR1 ${nb(4)} and Input Cin ${nb(3)} to the two inputs of XOR2 ${nb(6)}. The output of XOR2 ${nb(6)} is Output S ${nb(9)}.</li>
          <li>Wire Input A ${nb(1)} and Input B ${nb(2)} to the two inputs of AND1 ${nb(5)}.</li>
          <li>Wire the output of XOR1 ${nb(4)} and Input Cin ${nb(3)} to the two inputs of AND2 ${nb(7)}.</li>
          <li>Wire the output of AND1 ${nb(5)} and the output of AND2 ${nb(7)} to the inputs of the OR ${nb(8)}. The output of the OR ${nb(8)} is Output Cout ${nb(10)}.</li>
        </ol>
        <p><b>The experiment:</b> try 1+1+0 (S=0, Cout=1) and 1+1+1 (S=1, Cout=1). Next lesson you will pack this piece as FULLADDER.</p>`,
    },
    check() {
      const xors = state.components.filter(c => c.type === "xor");
      const ands = state.components.filter(c => c.type === "and");
      const ors = state.components.filter(c => c.type === "or");
      const sws = state.components.filter(c => c.type === "switch");
      const nameNeeds = TXT(LL(
        "Circuito: 3 Entradas, 2 XOR, 2 AND, 1 OR",
        "Circuit: 3 Inputs, 2 XORs, 2 ANDs, 1 OR"));
      if (sws.length < 3 || xors.length < 2 || ands.length < 2 || ors.length < 1)
        return [{ name: nameNeeds, ok: false }];
      // full adder: S = parity of 3 inputs (we test all 8 combinations of
      // the 3 Inputs across all XORs and all ORs to find S and Cout)
      const results = [{ name: nameNeeds, ok: true }];
      const wiredSwitches = sws.filter(s => state.wires.some(w => w.a.c === s.id || w.b.c === s.id));
      const swX = (wiredSwitches.length >= 3 ? wiredSwitches : sws).slice(0, 3);
      const expectS = [0, 1, 1, 0, 1, 0, 0, 1];
      const expectC = [0, 0, 0, 1, 0, 1, 1, 1];
      const xorCombos = new Map(xors.map(x => [x.id, []]));
      const orCombos = new Map(ors.map(o => [o.id, []]));
      for (let mask = 0; mask < 8; mask++) {
        swX.forEach((s, i) => s.on = !!(mask & (1 << i)));
        const r = simulate();
        for (const x of xors) {
          const net = r.netOf.get(x.id + ":2");
          xorCombos.get(x.id).push(r.values[net]);
        }
        for (const o of ors) {
          const net = r.netOf.get(o.id + ":2");
          orCombos.get(o.id).push(r.values[net]);
        }
      }
      sws.forEach(s => s.on = false);
      const okParity = Array.from(xorCombos.values()).some(combos =>
        expectS.every((v, i) => combos[i] === v)
      );
      const okCarry = Array.from(orCombos.values()).some(combos =>
        expectC.every((v, i) => combos[i] === v)
      );
      results.push({ name: TXT(LL("La suma S = A ⊕ B ⊕ Cin (paridad de 3)", "Sum S = A ⊕ B ⊕ Cin (3-input parity)")), ok: okParity });
      results.push({ name: TXT(LL("El acarreo Cout (ANDs + OR)", "Carry Cout (ANDs + OR)")), ok: okCarry });
      return results;
    },
  },
  {
    id: "s16",
    title: LL("16. Empaquetá el FULLADDER", "16. Pack the FULLADDER"),
    theory: {
        es: `
        <p>Para sumar números de 4 bits vas a encadenar 4 sumadores completos, donde el acarreo de salida de cada uno (<b>Cout</b>) entra como acarreo de entrada (<b>Cin</b>) del siguiente. Primero, empaquetá el de la lección anterior.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× circuito <b>FULLADDER</b> armado en la lección 15</li>
        </ul>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} FULLADDER</td></tr></table>
        <p><b>Empaquetar:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Apretá 📦 Empaquetar (P) y cubrí todo el circuito con el rectángulo.</li>
          <li>Apretá <b>Crear componente</b> y nombralo <b>FULLADDER</b>.</li>
          <li>Pines de entrada, <b>en este orden de click</b>: Entrada A, Entrada B, Entrada Cin.</li>
          <li>Pines de salida, <b>en este orden</b>: Salida S, Salida Cout.</li>
          <li>Apretá <b>Crear componente</b> para confirmar.</li>
        </ol>
        <p><b>El experimento:</b> colocá tu caja <b>FULLADDER</b> de la fila 🧩, conectale 3 Entradas y 2 Salidas, y probá las 8 combinaciones. En la próxima lección vas a usar 4 de estos.</p>`,
        en: `
        <p>To add 4-bit numbers you'll chain 4 full adders, where each one's output carry (<b>Cout</b>) enters as the next one's input carry (<b>Cin</b>). First, pack the one from the previous lesson.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>FULLADDER</b> circuit built in lesson 15</li>
        </ul>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} FULLADDER</td></tr></table>
        <p><b>Pack it:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Press 📦 Pack (P) and cover the whole circuit with the rectangle.</li>
          <li>Press <b>Create component</b> and name it <b>FULLADDER</b>.</li>
          <li>Input pins, <b>in this click order</b>: Input A, Input B, Input Cin.</li>
          <li>Output pins, <b>in this order</b>: Output S, Output Cout.</li>
          <li>Press <b>Create component</b> to confirm.</li>
        </ol>
        <p><b>The experiment:</b> place your <b>FULLADDER</b> from the 🧩 row, wire 3 Inputs and 2 Outputs, and test all 8 combinations. Next lesson you'll use 4 of these.</p>`,
    },
    check() {
      const results = [];
      const def = lib["FULLADDER"];
      results.push({ name: TXT(LL('Existe un componente "FULLADDER"', 'A "FULLADDER" component exists')), ok: !!def });
      if (def) {
        results.push({ name: TXT(LL("3 pines de entrada, 2 de salida", "3 input pins, 2 output pins")),
          ok: def.inputs.length === 3 && def.outputs.length === 2 });
        results.push({
          name: TXT(LL("El interior tiene 2 XOR, 2 AND y 1 OR", "The inside has 2 XORs, 2 ANDs and 1 OR")),
          ok: (def.components ?? []).filter(c => c.type === "xor").length >= 2
            && (def.components ?? []).filter(c => c.type === "and").length >= 2
            && (def.components ?? []).filter(c => c.type === "or").length >= 1,
        });
      }
      return results;
    },
  },
  {
    id: "s17",
    title: LL("17. Sumador de 4 bits", "17. 4-bit adder"),
    theory: {
        es: `
        <p>Ahora la gran pieza: <b>4 FULLADDER en cascada</b>. Cada uno suma una columna binaria, igual que cuando sumás números a mano: bit 0 (el de más a la derecha, que vale 1), bit 1 (vale 2), bit 2 (vale 4), bit 3 (vale 8) — y el acarreo viaja de derecha a izquierda.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× tu caja <b>FULLADDER</b> 🧩 (de la lección 16)</li>
          <li>9× <b>Entrada</b> (tecla 2) — A0-A3, B0-B3 y Cin (dejala en 0)</li>
          <li>5× <b>Salida</b> (tecla 3) — S0-S3 y Cout</li>
        </ul>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} A0-A3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} 4× FULLADDER</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} S0-S3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} Cout</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} B0-B3</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} Cin</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Conectá las Entradas A0-A3 ${nb(1)} a los pines A de los 4 FULLADDER ${nb(4)} (bit 0 al primero, bit 3 al último).</li>
          <li>Conectá las Entradas B0-B3 ${nb(2)} a los pines B de los 4 FULLADDER ${nb(4)}.</li>
          <li>Conectá la Entrada Cin ${nb(3)} al pin Cin del primer FULLADDER ${nb(4)}.</li>
          <li>Encadená los acarreos: el Cout del FULLADDER del bit 0 va al Cin del bit 1, el del bit 1 al bit 2, y el del bit 2 al bit 3.</li>
          <li>Conectá las salidas S de cada FULLADDER ${nb(4)} a las Salidas S0-S3 ${nb(5)}.</li>
          <li>Conectá el Cout del último FULLADDER ${nb(4)} a la Salida Cout ${nb(6)}.</li>
        </ol>
        <p><b>El experimento:</b> cargá 5 en A y 3 en B (A=0101, B=0011): las Salidas ${nb(5)} deben mostrar 8 (1000). Probá 15+1: S0-S3 = 0 y Cout ${nb(6)} = 1 (overflow).</p>`,
        en: `
        <p>Now the big piece: <b>4 FULLADDERs in cascade</b>. Each one adds one binary column, just like hand addition: bit 0 (rightmost, worth 1), bit 1 (worth 2), bit 2 (worth 4), bit 3 (worth 8) — and the carry travels right to left.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× your <b>FULLADDER</b> box 🧩 (from lesson 16)</li>
          <li>9× <b>Input</b> (key 2) — A0-A3, B0-B3, and Cin (leave it at 0)</li>
          <li>5× <b>Output</b> (key 3) — S0-S3 and Cout</li>
        </ul>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} A0-A3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} 4× FULLADDER</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} S0-S3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} Cout</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} B0-B3</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} Cin</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire Inputs A0-A3 ${nb(1)} to the A pins of the 4 FULLADDERs ${nb(4)} (bit 0 to the first, bit 3 to the last).</li>
          <li>Wire Inputs B0-B3 ${nb(2)} to the B pins of the 4 FULLADDERs ${nb(4)}.</li>
          <li>Wire Input Cin ${nb(3)} to the Cin pin of the first FULLADDER ${nb(4)}.</li>
          <li>Chain the carries: bit 0's Cout → bit 1's Cin, bit 1's Cout → bit 2's Cin, bit 2's Cout → bit 3's Cin.</li>
          <li>Wire each FULLADDER's S output ${nb(4)} to the S0-S3 Outputs ${nb(5)}.</li>
          <li>Wire the last FULLADDER's Cout ${nb(4)} to the Cout Output ${nb(6)}.</li>
        </ol>
        <p><b>The experiment:</b> load 5 on A and 3 on B (A=0101, B=0011): the Outputs ${nb(5)} should show 8 (1000). Try 15+1: S0-S3 = 0 and Cout ${nb(6)} = 1 (overflow).</p>`,
    },
    check() {
      const fa = state.components.filter(c => c.type === "FULLADDER");
      const results = [];
      results.push({
        name: TXT(LL("4 cajas FULLADDER colocadas en el canvas", "4 FULLADDER boxes placed on the canvas")),
        ok: fa.length >= 4,
      });
      if (fa.length >= 4) {
        results.push({
          name: TXT(LL("Las 4 están cableadas", "All 4 are wired")),
          ok: fa.every(c => state.wires.some(w => w.a.c === c.id || w.b.c === c.id)),
        });
        // cascade: at least 3 Cout connected to another's Cin
        const r = simulate();
        let cascadeCount = 0;
        for (const a of fa) {
          for (const b of fa) {
            if (a !== b) {
              const directWire = state.wires.some(w =>
                (w.a.c === a.id && w.a.t === 4 && w.b.c === b.id && w.b.t === 2) ||
                (w.b.c === a.id && w.b.t === 4 && w.a.c === b.id && w.a.t === 2));
              const sameNet = r.netOf.get(a.id + ":4") !== undefined &&
                r.netOf.get(a.id + ":4") === r.netOf.get(b.id + ":2");
              if (directWire || sameNet) cascadeCount++;
            }
          }
        }
        results.push({ name: TXT(LL("Cascada: al menos 3 conexiones Cout→Cin entre cajas", "Cascade: at least 3 Cout→Cin connections between boxes")), ok: cascadeCount >= 3 });
      }
      return results;
    },
  },
  {
    id: "s18",
    title: LL("18. Empaquetá el ADD4", "18. Pack the ADD4"),
    theory: {
        es: `
        <p>El sumador de 4 bits es la pieza aritmética central de tu futura ALU. Empaquetalo para usarlo como una única pieza.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× circuito <b>ADD4</b> armado en la lección 17 (4 FULLADDER en cascada)</li>
        </ul>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} ADD4</td></tr></table>
        <p><b>Empaquetar:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Apretá 📦 Empaquetar (P) y cubrí todo el circuito con el rectángulo.</li>
          <li>Apretá <b>Crear componente</b> y nombralo <b>ADD4</b>.</li>
          <li>Pines de entrada, <b>en este orden de click</b>: A0, A1, A2, A3, B0, B1, B2, B3, Cin.</li>
          <li>Pines de salida, <b>en este orden</b>: S0, S1, S2, S3, Cout.</li>
          <li>Apretá <b>Crear componente</b> para confirmar.</li>
        </ol>
        <p><b>El experimento:</b> colocá tu caja <b>ADD4</b> de la fila 🧩, conectale las 9 Entradas y las 5 Salidas, y probá que suma 4 bits de una sola vez. En la próxima lección vas a usarlo dentro de la ALU.</p>`,
        en: `
        <p>The 4-bit adder is the arithmetic core of your future ALU. Pack it to use it as a single part.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>ADD4</b> circuit built in lesson 17 (4 FULLADDERs in cascade)</li>
        </ul>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} ADD4</td></tr></table>
        <p><b>Pack it:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Press 📦 Pack (P) and cover the whole circuit with the rectangle.</li>
          <li>Press <b>Create component</b> and name it <b>ADD4</b>.</li>
          <li>Input pins, <b>in this click order</b>: A0, A1, A2, A3, B0, B1, B2, B3, Cin.</li>
          <li>Output pins, <b>in this order</b>: S0, S1, S2, S3, Cout.</li>
          <li>Press <b>Create component</b> to confirm.</li>
        </ol>
        <p><b>The experiment:</b> place your <b>ADD4</b> from the 🧩 row, wire the 9 Inputs and 5 Outputs, and test that it adds 4 bits at once. Next lesson you'll use it inside the ALU.</p>`,
    },
    check() {
      const results = [];
      const def = lib["ADD4"];
      results.push({ name: TXT(LL('Existe un componente "ADD4"', 'An "ADD4" component exists')), ok: !!def });
      if (def) {
        results.push({ name: TXT(LL("9 pines de entrada (A×4, B×4, Cin)", "9 input pins (A×4, B×4, Cin)")), ok: def.inputs.length === 9 });
        results.push({ name: TXT(LL("5 pines de salida (S×4, Cout)", "5 output pins (S×4, Cout)")), ok: def.outputs.length === 5 });
        const inst = state.components.find(c => c.type === "ADD4");
        if (inst && state.wires.some(w => w.a.c === inst.id || w.b.c === inst.id)) {
          results.push({
            name: TXT(LL("Hay una instancia ADD4 colocada y cableada", "A placed ADD4 instance is wired")),
            ok: true,
          });
        }
      }
      return results;
    },
  },
  {
    id: "s19",
    title: LL("19. Selector de 4 bits", "19. 4-bit selector"),
    theory: {
        es: `
        <p>En la lección 10 armaste un selector MUX2 para elegir entre dos bits simples. Pero en una CPU casi todas las señales viajan en grupos de 4 bits (buses).</p>
        <p>Para elegir entre dos números completos de 4 bits — el bus A o el bus B — colocamos <b>4 selectores MUX2 en paralelo</b>, todos controlados por una única entrada de selección <b>S</b>.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× tu caja <b>MUX2</b> 🧩 (de la lección 11)</li>
          <li>4× <b>Entrada</b> (tecla 2) — A0, A1, A2, A3</li>
          <li>4× <b>Entrada</b> (tecla 2) — B0, B1, B2, B3</li>
          <li>1× <b>Entrada</b> (tecla 2) — S (selección)</li>
          <li>4× <b>Salida</b> (tecla 3) — O0, O1, O2, O3</li>
        </ul>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} A0-A3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} 4× MUX2</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} O0-O3</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} B0-B3</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} S</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Conectá cada Entrada A0-A3 ${nb(1)} a la entrada A de su MUX2 ${nb(4)}.</li>
          <li>Conectá cada Entrada B0-B3 ${nb(2)} a la entrada B de su MUX2 ${nb(4)}.</li>
          <li>Conectá la Entrada S ${nb(3)} a la entrada S de los 4 MUX2 ${nb(4)}.</li>
          <li>Conectá la salida de cada MUX2 ${nb(4)} a su Salida correspondiente O0-O3 ${nb(5)}.</li>
        </ol>
        <p><b>El experimento:</b> poné A=10 (A1=1, A3=1) y B=5 (B0=1, B2=1). Con S=0, las Salidas ${nb(5)} muestran 10. Con S=1, muestran 5. Elegís 4 bits de un solo golpe.</p>
        <p><b>Empaquetar:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Apretá 📦 Empaquetar (P) y cubrí todo el circuito con el rectángulo.</li>
          <li>Apretá <b>Crear componente</b> y nombralo <b>SEL4</b>.</li>
          <li>Pines de entrada, <b>en este orden de click</b>: A0, A1, A2, A3, B0, B1, B2, B3, S.</li>
          <li>Pines de salida, <b>en este orden</b>: O0, O1, O2, O3.</li>
          <li>Apretá <b>Crear componente</b> para confirmar.</li>
        </ol>`,
        en: `
        <p>In lesson 10 you built a MUX2 to choose between two single bits. But in a CPU almost all data travels in groups of 4 bits (buses).</p>
        <p>To choose between two complete 4-bit numbers — bus A or bus B — we place <b>4 MUX2 selectors in parallel</b>, all controlled by a single select input <b>S</b>.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× your <b>MUX2</b> box 🧩 (from lesson 11)</li>
          <li>4× <b>Input</b> (key 2) — A0, A1, A2, A3</li>
          <li>4× <b>Input</b> (key 2) — B0, B1, B2, B3</li>
          <li>1× <b>Input</b> (key 2) — S (select)</li>
          <li>4× <b>Output</b> (key 3) — O0, O1, O2, O3</li>
        </ul>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} A0-A3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} 4× MUX2</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} O0-O3</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} B0-B3</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} S</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire each Input A0-A3 ${nb(1)} to input A of its MUX2 ${nb(4)}.</li>
          <li>Wire each Input B0-B3 ${nb(2)} to input B of its MUX2 ${nb(4)}.</li>
          <li>Wire Input S ${nb(3)} to input S of all 4 MUX2s ${nb(4)}.</li>
          <li>Wire each MUX2 output ${nb(4)} to its corresponding Output O0-O3 ${nb(5)}.</li>
        </ol>
        <p><b>The experiment:</b> set A=10 (A1=1, A3=1) and B=5 (B0=1, B2=1). With S=0, the Outputs ${nb(5)} show 10. With S=1, they show 5. You choose 4 bits at once.</p>
        <p><b>Pack it:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Press 📦 Pack (P) and cover the whole circuit with the rectangle.</li>
          <li>Press <b>Create component</b> and name it <b>SEL4</b>.</li>
          <li>Input pins, <b>in this click order</b>: A0, A1, A2, A3, B0, B1, B2, B3, S.</li>
          <li>Output pins, <b>in this order</b>: O0, O1, O2, O3.</li>
          <li>Press <b>Create component</b> to confirm.</li>
        </ol>`,
    },
    check() {
      const hasLib = !!lib["SEL4"];
      const okLib = hasLib ? testPackedSel4() : false;
      return [
        { name: TXT(LL("Caja SEL4 empaquetada (A×4, B×4, S | O×4)", "SEL4 box packaged (A×4, B×4, S | O×4)")), ok: okLib },
        { name: TXT(LL("S=0 selecciona el bus A (4 bits)", "S=0 selects bus A (4 bits)")), ok: okLib },
        { name: TXT(LL("S=1 selecciona el bus B (4 bits)", "S=1 selects bus B (4 bits)")), ok: okLib },
      ];
    },
  },
  {
    id: "s20",
    title: LL("20. ALU de 4 bits", "20. 4-bit ALU"),
    theory: {
        es: `
        <p>La <b>ALU</b> (Unidad Aritmético-Lógica) es donde la CPU "piensa": recibe dos números de 4 bits y un código de operación (<b>opcode</b>) que indica qué hacer. Con OP=0 suma; con OP=1 hace AND bit a bit.</p>
        <p>La idea es simple: A y B pasan por el sumador y por las compuertas AND a la vez, y un selector SEL4 elige cuál resultado sale.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× tu caja <b>ADD4</b> 🧩 (de la lección 18)</li>
          <li>4× <b>AND</b> (tecla 6)</li>
          <li>1× tu caja <b>SEL4</b> 🧩 (de la lección 19)</li>
          <li>8× <b>Entrada</b> (tecla 2) — A0-A3, B0-B3, Cin=0 y OP</li>
          <li>4× <b>Salida</b> (tecla 3) — R0-R3</li>
        </ul>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} A0-A3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} B0-B3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} Cin=0</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} OP</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} ADD4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} 4× AND</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} SEL4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(8)} R0-R3</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Conectá las Entradas A0-A3 ${nb(1)} y B0-B3 ${nb(2)} a las entradas A y B del ADD4 ${nb(5)} y a las entradas de los 4 AND ${nb(6)} (cada AND recibe Ax y Bx).</li>
          <li>Conectá la Entrada Cin=0 ${nb(3)} al pin Cin del ADD4 ${nb(5)}.</li>
          <li>Conectá la salida S del ADD4 ${nb(5)} a las entradas A0-A3 de la SEL4 ${nb(7)}.</li>
          <li>Conectá las salidas de los 4 AND ${nb(6)} a las entradas B0-B3 de la SEL4 ${nb(7)}.</li>
          <li>Conectá la Entrada OP ${nb(4)} a la entrada S de la SEL4 ${nb(7)} (S=0 pasa el ADD4, S=1 pasa los AND).</li>
          <li>Conectá las salidas O0-O3 de la SEL4 ${nb(7)} a las Salidas R0-R3 ${nb(8)}.</li>
        </ol>
        <p><b>El experimento:</b> cargá valores en A y B. Con OP=0, las Salidas ${nb(8)} muestran la suma. Con OP=1, muestran el AND lógico bit a bit.</p>
        <p><b>Empaquetar:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Apretá 📦 Empaquetar (P) y cubrí todo el circuito con el rectángulo.</li>
          <li>Apretá <b>Crear componente</b> y nombralo <b>ALU4</b>.</li>
          <li>Pines de entrada, <b>en este orden de click</b>: A0, A1, A2, A3, B0, B1, B2, B3, OP.</li>
          <li>Pines de salida, <b>en este orden</b>: R0, R1, R2, R3.</li>
          <li>Apretá <b>Crear componente</b> para confirmar.</li>
        </ol>`,
        en: `
        <p>The <b>ALU</b> (Arithmetic Logic Unit) is where the CPU "thinks": it takes two 4-bit numbers and an operation code (<b>opcode</b>) that tells it what to do. With OP=0 it adds; with OP=1 it performs bitwise AND.</p>
        <p>The idea is simple: A and B go through the adder and the AND gates at the same time, and a SEL4 selector picks which result comes out.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× your <b>ADD4</b> box 🧩 (from lesson 18)</li>
          <li>4× <b>AND</b> (key 6)</li>
          <li>1× your <b>SEL4</b> box 🧩 (from lesson 19)</li>
          <li>8× <b>Input</b> (key 2) — A0-A3, B0-B3, Cin=0, and OP</li>
          <li>4× <b>Output</b> (key 3) — R0-R3</li>
        </ul>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} A0-A3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} B0-B3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} Cin=0</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} OP</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} ADD4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} 4× AND</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} SEL4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(8)} R0-R3</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire Inputs A0-A3 ${nb(1)} and B0-B3 ${nb(2)} to the A and B inputs of ADD4 ${nb(5)} and to the inputs of the 4 ANDs ${nb(6)} (each AND gets Ax and Bx).</li>
          <li>Wire Input Cin=0 ${nb(3)} to ADD4's Cin pin ${nb(5)}.</li>
          <li>Wire ADD4's S output ${nb(5)} to SEL4's A0-A3 inputs ${nb(7)}.</li>
          <li>Wire the 4 AND outputs ${nb(6)} to SEL4's B0-B3 inputs ${nb(7)}.</li>
          <li>Wire Input OP ${nb(4)} to SEL4's S input ${nb(7)} (S=0 passes ADD4, S=1 passes ANDs).</li>
          <li>Wire SEL4's O0-O3 outputs ${nb(7)} to the R0-R3 Outputs ${nb(8)}.</li>
        </ol>
        <p><b>The experiment:</b> load values into A and B. With OP=0, the Outputs ${nb(8)} show the sum. With OP=1, they show the bitwise logical AND.</p>
        <p><b>Pack it:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Press 📦 Pack (P) and cover the whole circuit with the rectangle.</li>
          <li>Press <b>Create component</b> and name it <b>ALU4</b>.</li>
          <li>Input pins, <b>in this click order</b>: A0, A1, A2, A3, B0, B1, B2, B3, OP.</li>
          <li>Output pins, <b>in this order</b>: R0, R1, R2, R3.</li>
          <li>Press <b>Create component</b> to confirm.</li>
        </ol>`,
    },
    check() {
      const hasLib = !!lib["ALU4"];
      const okLib = hasLib ? testPackedALU4() : false;
      return [
        { name: TXT(LL("Caja ALU4 empaquetada (A×4, B×4, OP | R×4)", "ALU4 box packaged (A×4, B×4, OP | R×4)")), ok: okLib },
        { name: TXT(LL("OP=0: suma A + B", "OP=0: adds A + B")), ok: okLib },
        { name: TXT(LL("OP=1: AND bit a bit", "OP=1: bitwise AND")), ok: okLib },
      ];
    },
  },
  {
    id: "s21",
    title: LL("21. Program Counter: el dedo del CPU", "21. Program Counter: the CPU's finger"),
    theory: {
        es: `
        <p>Ya sabés calcular (ALU) y recordar (registros). Falta la pieza que organiza <i>el orden</i>: el <b>PC</b> (Program Counter). Es un registro que guarda la dirección de la próxima instrucción y avanza de a uno, salvo que un salto lo mande a otra dirección.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× tu caja <b>REG4</b> 🧩 (de la lección 13) — la dirección actual</li>
          <li>1× tu caja <b>ADD4</b> 🧩 (de la lección 18) — suma +1</li>
          <li>1× tu caja <b>SEL4</b> 🧩 (de la lección 19) — elige entre PC+1 y el destino del salto</li>
          <li>1× <b>Entrada</b> JUMP (tecla 2)</li>
          <li>4× <b>Entrada</b> destino D0-D3 (tecla 2)</li>
          <li>1× <b>Entrada</b> LOAD (tecla 2)</li>
          <li>1× <b>Entrada</b> CLK (tecla 2)</li>
          <li>4× <b>Salida</b> (tecla 3)</li>
        </ul>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} JUMP</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} REG4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} ADD4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} SEL4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(8)} Q0-Q3</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} D0-D3</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} LOAD</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} CLK</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Conectá la salida Q del REG4 ${nb(5)} a las entradas A del ADD4 ${nb(6)} y a las Salidas Q0-Q3 ${nb(8)}.</li>
          <li>Conectá al ADD4 ${nb(6)} las constantes B0=1, B1=B2=B3=0, Cin=0. Su salida es PC+1.</li>
          <li>Conectá PC+1 (salida S del ADD4 ${nb(6)}) a las entradas A de la SEL4 ${nb(7)}.</li>
          <li>Conectá las Entradas D0-D3 ${nb(2)} a las entradas B de la SEL4 ${nb(7)}.</li>
          <li>Conectá la Entrada JUMP ${nb(1)} a la entrada S de la SEL4 ${nb(7)} (S=0 pasa PC+1, S=1 pasa el destino).</li>
          <li>Conectá la salida O de la SEL4 ${nb(7)} a las entradas D del REG4 ${nb(5)}.</li>
          <li>Conectá la Entrada LOAD ${nb(3)} a LOAD del REG4 ${nb(5)} y la Entrada CLK ${nb(4)} a CLK del REG4 ${nb(5)}.</li>
        </ol>
        <p><b>El experimento:</b> poné JUMP=1, D0-D3=0, LOAD=1 y pulsá CLK: el REG4 carga 0000. Después JUMP=0, LOAD=1: en cada pulso la dirección avanza 1, 2, 3. Para saltar, cargá un destino en D0-D3, poné JUMP=1 y pulsá.</p>`,
        en: `
        <p>You can compute (ALU) and remember (registers). Missing: the piece that keeps <i>the order</i>: the <b>PC</b> (Program Counter). It is a register that holds the address of the next instruction and advances by one, unless a jump sends it elsewhere.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× your <b>REG4</b> box 🧩 (from lesson 13) — current address</li>
          <li>1× your <b>ADD4</b> box 🧩 (from lesson 18) — adds +1</li>
          <li>1× your <b>SEL4</b> box 🧩 (from lesson 19) — chooses between PC+1 and jump target</li>
          <li>1× <b>Input</b> JUMP (key 2)</li>
          <li>4× <b>Input</b> target D0-D3 (key 2)</li>
          <li>1× <b>Input</b> LOAD (key 2)</li>
          <li>1× <b>Input</b> CLK (key 2)</li>
          <li>4× <b>Output</b> (key 3)</li>
        </ul>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} JUMP</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} REG4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} ADD4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} SEL4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(8)} Q0-Q3</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} D0-D3</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} LOAD</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} CLK</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire REG4's Q output ${nb(5)} to ADD4's A inputs ${nb(6)} and to the Q0-Q3 Outputs ${nb(8)}.</li>
          <li>Wire constants to ADD4 ${nb(6)}: B0=1, B1=B2=B3=0, Cin=0. Its output is PC+1.</li>
          <li>Wire PC+1 (ADD4's S output ${nb(6)}) to SEL4's A inputs ${nb(7)}.</li>
          <li>Wire Inputs D0-D3 ${nb(2)} to SEL4's B inputs ${nb(7)}.</li>
          <li>Wire Input JUMP ${nb(1)} to SEL4's S input ${nb(7)} (S=0 passes PC+1, S=1 passes the target).</li>
          <li>Wire SEL4's O output ${nb(7)} to REG4's D inputs ${nb(5)}.</li>
          <li>Wire Input LOAD ${nb(3)} to REG4's LOAD ${nb(5)} and Input CLK ${nb(4)} to REG4's CLK ${nb(5)}.</li>
        </ol>
        <p><b>The experiment:</b> set JUMP=1, D0-D3=0, LOAD=1 and pulse CLK: REG4 loads 0000. Then JUMP=0, LOAD=1: on each pulse the address advances 1, 2, 3. To jump, load a target into D0-D3, set JUMP=1, and pulse.</p>`,
    },
    check() {
      const results = [];
      const reg4 = state.components.filter(c => c.type === "REG4");
      const add4 = state.components.filter(c => c.type === "ADD4");
      const sel4 = state.components.filter(c => c.type === "SEL4");
      const dff = state.components.filter(c => c.type === "DFF");

      const hasRegPC = reg4.length >= 1 && add4.length >= 1 && sel4.length >= 1;
      const hasDffPC = dff.length >= 4;

      results.push({
        name: TXT(LL("PC armado: REG4 + ADD4 + SEL4 (u otro circuito con 4 DFF)", "PC built: REG4 + ADD4 + SEL4 (or another circuit with 4 DFFs)")),
        ok: hasRegPC || hasDffPC,
      });

      if (!hasRegPC && !hasDffPC) {
        results.push({ name: TXT(LL("RESET: JUMP=1 a 0000 deja el PC en 0", "RESET: JUMP=1 to 0000 leaves PC at 0")), ok: false });
        results.push({ name: TXT(LL("Con JUMP=0 el PC cuenta 1, 2, 3", "With JUMP=0 the PC counts 1, 2, 3")), ok: false });
        return results;
      }

      const { netOf } = buildNets();
      const allSwitches = state.components.filter(c => c.type === "switch");
      const findSwitch = (net) => allSwitches.find(s => netOf.get(s.id + ":0") === net);

      let okReset = false;
      let okCount = false;
      const savedGateOuts = new Map(gateOuts);
      const savedSw = allSwitches.map(s => s.on);

      const restore = () => {
        allSwitches.forEach((s, i) => s.on = savedSw[i]);
        gateOuts.clear();
        for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
        simulate();
      };

      if (hasRegPC) {
        const pc = reg4[0];
        const clkSw = findSwitch(netOf.get(pc.id + ":5"));
        const loadSw = findSwitch(netOf.get(pc.id + ":4"));
        const sel = sel4[0];
        const jumpSw = findSwitch(netOf.get(sel.id + ":8"));
        const destSws = [0, 1, 2, 3].map(i => findSwitch(netOf.get(sel.id + ":" + (4 + i))));

        if (clkSw && loadSw && jumpSw && destSws.every(Boolean)) {
          const pulse = () => {
            clkSw.on = true; simulate();
            clkSw.on = false; return simulate();
          };
          const readPC = (r) => {
            let v = 0;
            for (let i = 0; i < 4; i++) {
              const net = r.netOf.get(pc.id + ":" + (6 + i));
              const b = net !== undefined ? r.values[net] : -1;
              if (b === 1) v |= (1 << i);
              else if (b !== 0) return -1;
            }
            return v;
          };

          allSwitches.forEach(s => s.on = false);
          gateOuts.clear();

          // RESET
          jumpSw.on = true;
          loadSw.on = true;
          pulse();
          okReset = readPC(simulate()) === 0;

          if (okReset) {
            // COUNT
            jumpSw.on = false;
            loadSw.on = true;
            pulse();
            const v1 = readPC(simulate());
            pulse();
            const v2 = readPC(simulate());
            pulse();
            const v3 = readPC(simulate());
            okCount = v1 === 1 && v2 === 2 && v3 === 3;

            if (!okCount) {
              // Some builders keep LOAD always tied to 1; try with LOAD=1 and no extra LOAD switch
              loadSw.on = true;
              pulse();
              const u1 = readPC(simulate());
              pulse();
              const u2 = readPC(simulate());
              pulse();
              const u3 = readPC(simulate());
              okCount = u1 === 1 && u2 === 2 && u3 === 3;
            }

            // JUMP
            if (okCount) {
              for (let i = 0; i < 4; i++) destSws[i].on = !!((5 >> i) & 1);
              jumpSw.on = true;
              loadSw.on = true;
              pulse();
              // Just verify it can jump; no need to store result for current checks
            }
          }

          restore();
        }
      }

      if (!okReset || !okCount) {
        // Fallback to legacy DFF-based PC check
        let clkComp = null;
        for (const d of dff) {
          const netClk = netOf.get(d.id + ":1");
          if (netClk === undefined) continue;
          clkComp = state.components.find(c =>
            (c.type === "switch" || c.type === "clock") &&
            netOf.get(c.id + ":0") === netClk
          );
          if (clkComp) break;
        }
        if (!clkComp) {
          for (const d of dff) {
            const w = state.wires.find(w => (w.a.c === d.id && w.a.t === 1) || (w.b.c === d.id && w.b.t === 1));
            if (!w) continue;
            const otherId = w.a.c === d.id ? w.b.c : w.a.c;
            clkComp = state.components.find(c => c.id === otherId && (c.type === "switch" || c.type === "clock"));
            if (clkComp) break;
          }
        }

        const swClk = clkComp && clkComp.type === "switch" ? clkComp : null;
        const clock = clkComp && clkComp.type === "clock" ? clkComp : null;
        const clkNet = clkComp ? netOf.get(clkComp.id + ":0") : null;
        const targetDffs = clkNet !== null
          ? dff.filter(d => netOf.get(d.id + ":1") === clkNet)
          : dff;
        const fourDff = targetDffs.length >= 4 ? targetDffs.slice(0, 4) : dff.slice(0, 4);
        const candidateJumps = allSwitches.filter(s => s !== swClk);
        const clockPrev = clock ? (globalClockState.get(clock.id) ?? false) : false;
        const clkSet = v => {
          if (swClk) swClk.on = v;
          else if (clock) globalClockState.set(clock.id, v);
        };
        const pulse = () => {
          clkSet(true);
          simulate();
          clkSet(false);
          return simulate();
        };
        const getQ = (r, d) => r.values[r.netOf.get(d.id + ":2")];
        const read4Q = r => fourDff.map(d => getQ(r, d));
        const perms = [];
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 4; j++) {
            if (j === i) continue;
            for (let k = 0; k < 4; k++) {
              if (k === i || k === j) continue;
              for (let l = 0; l < 4; l++) {
                if (l === i || l === j || l === k) continue;
                perms.push([i, j, k, l]);
              }
            }
          }
        const valAt = (snap, p) => snap[p[0]] + 2 * snap[p[1]] + 4 * snap[p[2]] + 8 * snap[p[3]];

        okReset = false;
        okCount = false;

        if (swClk || clock) {
          for (const swJump of candidateJumps) {
            gateOuts.clear();
            for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
            allSwitches.forEach(s => s.on = false);
            clkSet(false);
            swJump.on = true;
            simulate();

            const simAfterReset = pulse();
            const qReset = read4Q(simAfterReset);
            if (qReset.every(v => v === 0)) {
              okReset = true;
              const postResetGateOuts = new Map(gateOuts);
              const otherSwitches = candidateJumps.filter(s => s !== swJump);
              const countCandidates = [null, ...otherSwitches];

              for (const extraSw of countCandidates) {
                gateOuts.clear();
                for (const [k, v] of postResetGateOuts) gateOuts.set(k, v);
                allSwitches.forEach(s => s.on = false);
                if (extraSw) extraSw.on = true;
                swJump.on = false;
                clkSet(false);
                simulate();

                pulse();
                const s1 = read4Q(simulate());
                pulse();
                const s2 = read4Q(simulate());
                pulse();
                const s3 = read4Q(simulate());

                const validBits = [...s1, ...s2, ...s3].every(v => v === 0 || v === 1);
                if (validBits) {
                  const counts123 = perms.some(p => valAt(s1, p) === 1 && valAt(s2, p) === 2 && valAt(s3, p) === 3);
                  if (counts123) {
                    okCount = true;
                    break;
                  }
                }
              }
              if (okCount) break;
            }
          }
        }

        allSwitches.forEach(s => s.on = false);
        if (clock) {
          globalClockState.set(clock.id, clockPrev);
          if (typeof clockAcc !== "undefined") clockAcc.set(clock.id, 0);
        }
        gateOuts.clear();
        for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
        simulate();
      }

      results.push({
        name: TXT(LL("RESET: JUMP=1 a 0000 deja el PC en 0", "RESET: JUMP=1 to 0000 leaves PC at 0")),
        ok: okReset,
      });
      results.push({
        name: TXT(LL("Con JUMP=0 el PC cuenta 1, 2, 3", "With JUMP=0 the PC counts 1, 2, 3")),
        ok: okCount,
      });
      return results;
    },
  },
  {
    id: "s22",
    title: LL("22. Repaso: los órganos de tu CPU", "22. Review: your CPU's organs"),
    theory: {
      es: `
        <p>Cierre del segundo bloque. Mirá lo que construiste — cada uno es un <b>órgano</b>
        de la computadora, empaquetado en tu biblioteca 🧩:</p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>Compuertas</b> — los ladrillos de toda decisión binaria (lecciones 1-4)</li>
          <li><b>Latches y flip-flops</b> — memoria sincronizada por reloj (6-8)</li>
          <li><b>DFF</b> — tu primer componente empaquetado (9)</li>
          <li><b>MUX2</b> — el mecanismo universal de "elegir" (10-11)</li>
          <li><b>REG1 y REG4</b> — registros con permiso de carga (12-13)</li>
          <li><b>FULLADDER y ADD4</b> — el poder de calcular (14-18)</li>
          <li><b>SEL4</b> — selector de 4 bits (19)</li>
          <li><b>ALU4</b> — la unidad aritmético-lógica (20)</li>
          <li><b>PC</b> — el dedo que recorre el programa (21)</li>
        </ul>
        <p>Te recomiendo tener en tu biblioteca las cajas <b>DFF</b>, <b>MUX2</b>, <b>REG4</b>,
        <b>ADD4</b> y <b>SEL4</b>
        (y si querés, una <b>ALU4</b>): son las que se usan en las próximas lecciones.</p>
        <p>Mientras tanto, tenés un laboratorio completo para explorar. Un buen ejercicio:
        conectá un <b>reloj</b> (⏱, tecla 4, doble click para cambiar su velocidad) a tu
        registro o a tu PC y miralos avanzar solos a 4-8 Hz.</p>
        <p><b>La próxima lección introduce la RAM</b> — la memoria donde van a vivir tus programas.</p>`,
      en: `
        <p>Second block complete. Look at what you built — each one is a CPU <b>organ</b>,
        packed in your 🧩 library:</p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>Gates</b> — the bricks of every decision (lessons 1-4)</li>
          <li><b>Latches and flip-flops</b> — clocked memory (6-8)</li>
          <li><b>DFF</b> — your first packed component (9)</li>
          <li><b>MUX2</b> — the universal "chooser" (10-11)</li>
          <li><b>REG1 and REG4</b> — registers with load permission (12-13)</li>
          <li><b>FULLADDER and ADD4</b> — the power to compute (14-18)</li>
          <li><b>SEL4</b> — 4-bit selector (19)</li>
          <li><b>ALU4</b> — the arithmetic logic unit (20)</li>
          <li><b>PC</b> — the finger that walks the program (21)</li>
        </ul>
        <p>We recommend having the <b>DFF</b>, <b>MUX2</b>, <b>REG4</b>,
        <b>ADD4</b>, and <b>SEL4</b> boxes in your
        library (and optionally an <b>ALU4</b>): the upcoming lessons use them.</p>
        <p>Meanwhile, you have a full lab to explore. A good exercise: connect a <b>clock</b>
        (⏱, key 4, double-click to change its speed) to your register or PC and watch them
        advance on their own at 4-8 Hz.</p>
        <p><b>Next lesson introduces RAM</b> — the memory where your programs will live.</p>`,
    },
    check() {
      return [
        { name: TXT(LL("Tenés DFF empaquetado", "You have a DFF packed")), ok: !!lib["DFF"] },
        { name: TXT(LL("Tenés MUX2 empaquetado", "You have a MUX2 packaged")), ok: !!lib["MUX2"] },
        { name: TXT(LL("Tenés ADD4 empaquetado", "You have an ADD4 packaged")), ok: !!lib["ADD4"] },
      ];
    },
  },
  {
    id: "s23",
    title: LL("23. RAM: memoria con dirección", "23. RAM: addressed memory"),
    theory: {
        es: `
        <p>Todos tus circuitos con memoria (latches, registros) guardan valores "sin nombre". La <b>RAM</b> cambia el paradigma: es un arreglo de celdas numeradas. Le das una dirección y ella te da (o recibe) el dato de esa posición.</p>
        <p>La idea interna: las líneas de dirección entran a un decodificador que activa exactamente la celda elegida. Cada celda es un DFF con su propia lógica de escritura.</p>
        <p><b>Componentes que necesitás (para 2 celdas de 1 bit):</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Entrada</b> de dirección A0 (tecla 2)</li>
          <li>1× <b>NOT</b> (tecla 5)</li>
          <li>2× <b>AND</b> (tecla 6)</li>
          <li>2× tu caja <b>DFF</b> 🧩 (de la lección 9) — las celdas</li>
          <li>2× <b>Salida</b> (tecla 3)</li>
        </ul>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} Entrada A0</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} NOT</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} 2× AND</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} 2× DFF</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} 2× Salida</td></tr></table>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Conectá la Entrada A0 ${nb(1)} a la entrada del NOT ${nb(2)}.</li>
          <li>Conectá A0 ${nb(1)} y la salida del NOT ${nb(2)} a las entradas de los 2 AND ${nb(3)} (un AND recibe A0, el otro recibe la versión negada de A0).</li>
          <li>Conectá las salidas de los AND ${nb(3)} a las entradas D de los 2 DFF ${nb(4)}.</li>
          <li>Conectá las salidas Q de los DFF ${nb(4)} a las 2 Salidas ${nb(5)}.</li>
        </ol>
        <p><b>El experimento:</b> alterná A0. Solo la celda direccionada responde. En la próxima lección vas a usar la caja RAM16, que tiene todo esto adentro.</p>`,
        en: `
        <p>All your memory circuits (latches, registers) store "unnamed" values. <b>RAM</b> changes the paradigm: it is an array of numbered cells. You give it an address and it gives (or receives) the data at that position.</p>
        <p>The internal idea: address lines enter a decoder that activates exactly the chosen cell. Each cell is a DFF with its own write logic.</p>
        <p><b>Components you need (for 2 one-bit cells):</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× address <b>Input</b> A0 (key 2)</li>
          <li>1× <b>NOT</b> (key 5)</li>
          <li>2× <b>AND</b> (key 6)</li>
          <li>2× your <b>DFF</b> box 🧩 (from lesson 9) — the cells</li>
          <li>2× <b>Output</b> (key 3)</li>
        </ul>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} Input A0</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} NOT</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} 2× AND</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} 2× DFF</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} 2× Output</td></tr></table>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire Input A0 ${nb(1)} to the NOT input ${nb(2)}.</li>
          <li>Wire A0 ${nb(1)} and the NOT output ${nb(2)} to the inputs of the 2 ANDs ${nb(3)} (one AND gets A0, the other gets the negated version of A0).</li>
          <li>Wire the AND outputs ${nb(3)} to the D inputs of the 2 DFFs ${nb(4)}.</li>
          <li>Wire the DFF Q outputs ${nb(4)} to the 2 Outputs ${nb(5)}.</li>
        </ol>
        <p><b>The experiment:</b> toggle A0. Only the addressed cell responds. Next lesson you'll use the RAM16 box, which has all of this inside.</p>`,
    },
    check() {
      const dff = state.components.filter(c => c.type === "DFF");
      return [
        { name: TXT(LL("Al menos 2 DFF (las celdas de memoria)", "At least 2 DFFs (the memory cells)")), ok: dff.length >= 2 },
        { name: TXT(LL("Cableados", "Wired")), ok: dff.every(d => state.wires.some(w => w.a.c === d.id || w.b.c === d.id)) },
      ];
    },
  },
  {
    id: "s24",
    title: LL("24. RAM16: la memoria del programa", "24. RAM16: program memory"),
    theory: {
        es: `
        <p>Para ejecutar programas necesitamos memoria direccionable y fácil de usar. El motor te entrega <b>🧠 RAM16</b>: 16 celdas de 4 bits en una sola caja, con una vista de memoria en hexadecimal.</p>
        <p><b>Sus pines:</b> A0-A3 (dirección), D0-D3 (dato a escribir), WE (write enable), CS (chip select), Q0-Q3 (dato leído). La escritura ocurre cuando WE=1 y CS=1, en el flanco de subida de WE.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>RAM16</b> (botón 🧠 RAM de la toolbar)</li>
          <li>4× <b>Entrada</b> para A0-A3 (tecla 2)</li>
        </ul>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} A0-A3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} RAM16</td></tr></table>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Colocá la RAM16 ${nb(2)}.</li>
          <li>Conectá las Entradas A0-A3 ${nb(1)} a los pines A0-A3 de la RAM16 ${nb(2)}.</li>
          <li>Hacé doble click sobre la RAM16 ${nb(2)} para abrir el panel hexadecimal y escribí valores en las celdas.</li>
        </ol>
        <p><b>El experimento:</b> cambiá la dirección con A0-A3 ${nb(1)} y mirá cómo la RAM16 muestra el contenido de cada celda en sus salidas Q0-Q3.</p>`,
        en: `
        <p>To run programs we need addressable, easy-to-use memory. The engine gives you <b>🧠 RAM16</b>: 16 cells of 4 bits in one box, with a hex memory view.</p>
        <p><b>Its pins:</b> A0-A3 (address), D0-D3 (data to write), WE (write enable), CS (chip select), Q0-Q3 (read data). Writing happens when WE=1 and CS=1, on WE's rising edge.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>RAM16</b> (🧠 RAM toolbar button)</li>
          <li>4× <b>Input</b> for A0-A3 (key 2)</li>
        </ul>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} A0-A3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} RAM16</td></tr></table>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Place the RAM16 ${nb(2)}.</li>
          <li>Wire Inputs A0-A3 ${nb(1)} to RAM16 pins A0-A3 ${nb(2)}.</li>
          <li>Double-click the RAM16 ${nb(2)} to open the hex panel and type values into cells.</li>
        </ol>
        <p><b>The experiment:</b> change the address with A0-A3 ${nb(1)} and watch RAM16 show each cell's content on Q0-Q3.</p>`,
    },
    check() {
      const ram = state.components.filter(c => c.type === "ram");
      const results = [];
      results.push({ name: TXT(LL("Hay una RAM16 colocada", "There is a placed RAM16")), ok: ram.length >= 1 });
      if (ram.length >= 1) {
        const data = ramData.get(ram[0].id);
        results.push({ name: TXT(LL("Con datos escritos (escribí en la vista hex)", "With data written (type in the hex view)")),
          ok: data ? data.some(v => v !== 0) : false });
      }
      return results;
    },
  },
  {
    id: "s25",
    title: LL("25. Decodificador 2→4 y 3→8", "25. 2→4 and 3→8 Decoders"),
    theory: {
        es: `
        <p>En una computadora las instrucciones y direcciones se guardan como números binarios compactos. Para ejecutar una acción necesitás que un solo cable específico se encienda. El <b>decodificador</b> es ese traductor: toma N bits de entrada y enciende <b>exactamente una</b> de sus 2<sup>N</sup> salidas.</p>
        <p><b>Componentes para DEC2:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Entrada</b> (tecla 2): A0 y A1</li>
          <li>2× <b>NOT</b> (tecla 5)</li>
          <li>4× <b>AND</b> (tecla 6)</li>
          <li>4× <b>Salida</b> (tecla 3): Y0-Y3</li>
        </ul>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} Entrada A0</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} 2× NOT</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} 4× AND</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} 4× Salida</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} Entrada A1</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Conexión (DEC2):</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Conectá la Entrada A0 ${nb(1)} a un NOT ${nb(3)} y la Entrada A1 ${nb(2)} al otro NOT ${nb(3)}.</li>
          <li>Conectá cada par (A0/A0 negado y A1/A1 negado) a las entradas de los 4 AND ${nb(4)} según la tabla: Y0 recibe A1 negado y A0 negado, Y1 A1 negado y A0, Y2 A1 y A0 negado, Y3 A1 y A0.</li>
          <li>Conectá la salida de cada AND ${nb(4)} a su Salida Y0-Y3 ${nb(5)}.</li>
        </ol>
        <p><b>El experimento (DEC2):</b> probá las 4 combinaciones de A0 y A1. Solo una Salida ${nb(5)} se enciende a la vez.</p>
        <p><b>Empaquetar DEC2:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Apretá 📦 Empaquetar (P) y cubrí todo el circuito DEC2.</li>
          <li>Nombralo <b>DEC2</b>. Pines de entrada: A0, A1. Pines de salida: Y0, Y1, Y2, Y3.</li>
        </ol>
        <p><b>Para DEC3 (3→8):</b> colocá tu caja DEC2 junto con una Entrada A2 ${nb(6)}, un NOT ${nb(7)}, 4 AND ${nb(8)} y 8 Salidas ${nb(9)}. Usá A2 y A2 negado para seleccionar entre Y0-Y3 (A2=0) y Y4-Y7 (A2=1).</p>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} Entrada A2</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} NOT</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(8)} 4× AND</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(9)} 8× Salida</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">DEC2</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Empaquetar DEC3:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Apretá 📦 Empaquetar (P) y cubrí todo el circuito DEC3.</li>
          <li>Nombralo <b>DEC3</b>. Pines de entrada: A0, A1, A2. Pines de salida: Y0 a Y7.</li>
        </ol>`,
        en: `
        <p>In a computer, instructions and addresses are stored as compact binary numbers. To perform an action, you need one specific control line to activate. A <b>decoder</b> is this translator: it takes N input bits and activates <b>exactly one</b> of its 2<sup>N</sup> outputs.</p>
        <p><b>Components for DEC2:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Input</b> (key 2): A0 and A1</li>
          <li>2× <b>NOT</b> (key 5)</li>
          <li>4× <b>AND</b> (key 6)</li>
          <li>4× <b>Output</b> (key 3): Y0-Y3</li>
        </ul>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} Input A0</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} 2× NOT</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} 4× AND</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} 4× Output</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} Input A1</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Wiring (DEC2):</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire Input A0 ${nb(1)} to one NOT ${nb(3)} and Input A1 ${nb(2)} to the other NOT ${nb(3)}.</li>
          <li>Wire each pair (A0/A0 negated and A1/A1 negated) to the inputs of the 4 ANDs ${nb(4)} according to the table: Y0 gets A1 negated and A0 negated, Y1 gets A1 negated and A0, Y2 gets A1 and A0 negated, Y3 gets A1 and A0.</li>
          <li>Wire each AND output ${nb(4)} to its Y0-Y3 Output ${nb(5)}.</li>
        </ol>
        <p><b>The experiment (DEC2):</b> test all 4 combinations of A0 and A1. Only one Output ${nb(5)} lights at a time.</p>
        <p><b>Pack DEC2:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Press 📦 Pack (P) and cover the whole DEC2 circuit.</li>
          <li>Name it <b>DEC2</b>. Input pins: A0, A1. Output pins: Y0, Y1, Y2, Y3.</li>
        </ol>
        <p><b>For DEC3 (3→8):</b> place your DEC2 box together with an A2 Input ${nb(6)}, a NOT ${nb(7)}, 4 ANDs ${nb(8)}, and 8 Outputs ${nb(9)}. Use A2 and A2 negated to select between Y0-Y3 (A2=0) and Y4-Y7 (A2=1).</p>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} Input A2</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} NOT</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(8)} 4× AND</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(9)} 8× Output</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">DEC2</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Pack DEC3:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Press 📦 Pack (P) and cover the whole DEC3 circuit.</li>
          <li>Name it <b>DEC3</b>. Input pins: A0, A1, A2. Output pins: Y0 through Y7.</li>
        </ol>`,
    },
    check() {
      function testDecoderBox(pkgName, nIn, nOut) {
        const def = lib[pkgName];
        if (!def || def.inputs.length !== nIn || def.outputs.length !== nOut) return false;
        if (typeof registerPackedType === "function" && !TYPE_DEFS[pkgName]) {
          registerPackedType(def);
        }
        const savedComponents = state.components;
        const savedWires = state.wires;
        const savedNextId = state.nextId;
        const savedGateOuts = new Map(gateOuts);
        let ok = true;
        try {
          state.components = [];
          state.wires = [];
          state.nextId = 1;
          gateOuts.clear();
          const box = { id: state.nextId++, type: pkgName, x: 0, y: 0, rot: 0, on: false };
          state.components.push(box);
          const bSws = [];
          for (let i = 0; i < nIn; i++) {
            const sw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
            state.components.push(sw);
            state.wires.push({ id: state.nextId++, a: { c: sw.id, t: 0 }, b: { c: box.id, t: i } });
            bSws.push(sw);
          }
          const bOuts = [];
          for (let j = 0; j < nOut; j++) {
            const out = { id: state.nextId++, type: "out", x: 0, y: 0, rot: 0, on: false };
            state.components.push(out);
            state.wires.push({ id: state.nextId++, a: { c: box.id, t: nIn + j }, b: { c: out.id, t: 0 } });
            bOuts.push(out);
          }
          for (let v = 0; v < nOut; v++) {
            for (let bit = 0; bit < nIn; bit++) {
              bSws[bit].on = !!((v >> bit) & 1);
            }
            const r = simulate();
            const vals = bOuts.map(o => r.values[r.netOf.get(o.id + ":0")]);
            const activeCount = vals.filter(x => x === 1).length;
            if (activeCount !== 1 || vals[v] !== 1) { ok = false; break; }
          }
        } catch (e) {
          ok = false;
        } finally {
          state.components = savedComponents;
          state.wires = savedWires;
          state.nextId = savedNextId;
          gateOuts.clear();
          for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
          simulate();
        }
        return ok;
      }
      const okDec2 = !!lib["DEC2"] ? testDecoderBox("DEC2", 2, 4) : false;
      const okDec3 = !!lib["DEC3"] ? testDecoderBox("DEC3", 3, 8) : false;
      return [
        { name: TXT(LL("Caja DEC2 empaquetada (2 entradas, 4 salidas)", "DEC2 box packaged (2 inputs, 4 outputs)")), ok: okDec2 },
        { name: TXT(LL("Caja DEC3 empaquetada (3 entradas, 8 salidas)", "DEC3 box packaged (3 inputs, 8 outputs)")), ok: okDec3 },
        { name: TXT(LL("Ambos decodificadores listos para el CPU", "Both decoders ready for the CPU")), ok: okDec2 && okDec3 },
      ];
    },
  },
  {
    id: "s26",
    title: LL("26. Contador de pasos y RESET (RING3)", "26. Step counter and RESET (RING3)"),
    theory: {
        es: `
        <p>Una computadora no puede hacer todo en un solo instante: necesita un compás rítmico. En nuestra CPU, cada instrucción se ejecuta en 3 pasos: <b>T0</b> (buscar instrucción), <b>T1</b> (buscar argumento) y <b>T2</b> (ejecutar).</p>
        <p>Para generar estas fases usamos un <b>contador de anillo</b>: un único 1 que circula T0 → T1 → T2 → T0. La línea RESET rompe el estado indeterminado de arranque y fuerza el 1 en T0.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>3× tu caja <b>DFF</b> 🧩 (de la lección 9)</li>
          <li>1× <b>OR</b> (tecla 7)</li>
          <li>2× <b>AND</b> (tecla 6)</li>
          <li>1× <b>NOT</b> (tecla 5)</li>
          <li>2× <b>Entrada</b> (tecla 2): RESET y CLK</li>
          <li>3× <b>Salida</b> (tecla 3): T0, T1, T2</li>
        </ul>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} RESET</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} NOT</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} OR</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} 3× DFF</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} 3× Salida</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} CLK</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} 2× AND</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Conectá la Entrada CLK ${nb(2)} a las entradas CLK de los 3 DFF ${nb(6)}.</li>
          <li>Conectá la Entrada RESET ${nb(1)} a la entrada del NOT ${nb(3)} y a una entrada de la OR ${nb(4)}.</li>
          <li>Conectá la salida del NOT ${nb(3)} a una entrada de cada AND ${nb(5)}.</li>
          <li>Conectá la salida Q del DFF2 a la otra entrada de la OR ${nb(4)}. La salida de la OR ${nb(4)} va a la entrada D del DFF0.</li>
          <li>Conectá la salida Q del DFF0 a una entrada del primer AND ${nb(5)}. Su salida va a la entrada D del DFF1.</li>
          <li>Conectá la salida Q del DFF1 a una entrada del segundo AND ${nb(5)}. Su salida va a la entrada D del DFF2.</li>
          <li>Conectá las salidas Q de los 3 DFF ${nb(6)} a las Salidas T0, T1 y T2 ${nb(7)}.</li>
        </ol>
        <p><b>El experimento:</b> con RESET=1, pulsá CLK: T0=1, T1=0, T2=0. Con RESET=0, cada pulso mueve el 1 al siguiente paso.</p>
        <p><b>Empaquetar:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Apretá 📦 Empaquetar (P) y cubrí todo el circuito.</li>
          <li>Nombralo <b>RING3</b>. Pines de entrada: RESET, CLK. Pines de salida: T0, T1, T2.</li>
        </ol>`,
        en: `
        <p>A computer cannot do everything in a single moment: it needs a rhythmic beat. In our CPU, every instruction executes in 3 steps: <b>T0</b> (fetch instruction), <b>T1</b> (fetch argument), and <b>T2</b> (execute).</p>
        <p>To generate these phases we use a <b>ring counter</b>: a single 1 that circles T0 → T1 → T2 → T0. The RESET line breaks the indeterminate startup state and forces the 1 into T0.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>3× your <b>DFF</b> box 🧩 (from lesson 9)</li>
          <li>1× <b>OR</b> (key 7)</li>
          <li>2× <b>AND</b> (key 6)</li>
          <li>1× <b>NOT</b> (key 5)</li>
          <li>2× <b>Input</b> (key 2): RESET and CLK</li>
          <li>3× <b>Output</b> (key 3): T0, T1, T2</li>
        </ul>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} RESET</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} NOT</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} OR</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} 3× DFF</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} 3× Output</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} CLK</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} 2× AND</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire Input CLK ${nb(2)} to the CLK inputs of the 3 DFFs ${nb(6)}.</li>
          <li>Wire Input RESET ${nb(1)} to the NOT input ${nb(3)} and to one input of the OR ${nb(4)}.</li>
          <li>Wire the NOT output ${nb(3)} to one input of each AND ${nb(5)}.</li>
          <li>Wire DFF2's Q output to the other input of the OR ${nb(4)}. The OR output ${nb(4)} goes to DFF0's D input.</li>
          <li>Wire DFF0's Q output to one input of the first AND ${nb(5)}. Its output goes to DFF1's D input.</li>
          <li>Wire DFF1's Q output to one input of the second AND ${nb(5)}. Its output goes to DFF2's D input.</li>
          <li>Wire the 3 DFF Q outputs ${nb(6)} to the T0, T1, and T2 Outputs ${nb(7)}.</li>
        </ol>
        <p><b>The experiment:</b> with RESET=1, pulse CLK: T0=1, T1=0, T2=0. With RESET=0, each pulse moves the 1 to the next step.</p>
        <p><b>Pack it:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Press 📦 Pack (P) and cover the whole circuit.</li>
          <li>Name it <b>RING3</b>. Input pins: RESET, CLK. Output pins: T0, T1, T2.</li>
        </ol>`,
    },
    check() {
      const hasLib = !!lib["RING3"];
      const okLib = hasLib ? testPackedRING3() : false;
      return [
        { name: TXT(LL("Caja RING3 empaquetada (RESET, CLK | T0, T1, T2)", "RING3 box packaged (RESET, CLK | T0, T1, T2)")), ok: okLib },
        { name: TXT(LL("RESET inicializa T0=1, T1=0, T2=0", "RESET initializes T0=1, T1=0, T2=0")), ok: okLib },
        { name: TXT(LL("Con RESET=0 el contador cicla T0 → T1 → T2", "With RESET=0 the counter cycles T0 → T1 → T2")), ok: okLib },
      ];
    },
  },
  {
    id: "s27",
    title: LL("27. Registro con LOAD y la etapa de búsqueda (Fetch)", "27. Register with LOAD and the Fetch stage"),
    theory: {
        es: `
        <p>Ya tenés la memoria (<b>RAM16</b>), el contador de pasos (<b>RING3</b>) y registros con LOAD. En esta lección armás la etapa <b>Fetch</b>: el PC le dice a la RAM qué dirección leer, y los registros OP y ARG capturan la instrucción y su argumento.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>RAM16</b> 🧠 (de la lección 24) con CS=1 y WE=0</li>
          <li>1× tu caja <b>RING3</b> 🧩 (de la lección 26)</li>
          <li>3× tu caja <b>REG4</b> 🧩 (de la lección 13): PC, OP y ARG</li>
          <li>1× tu caja <b>ADD4</b> 🧩 (de la lección 18) — incrementador PC+1</li>
          <li>1× tu caja <b>SEL4</b> 🧩 (de la lección 19) — selector de salto del PC</li>
          <li>2× <b>Entrada</b> (tecla 2): RESET y CLK</li>
        </ul>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} RESET</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} RAM16</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} 3× REG4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} ADD4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} SEL4</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} CLK</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Conectá RESET ${nb(1)} y CLK ${nb(2)} a los pines RESET y CLK del RING3 ${nb(3)}.</li>
          <li>Conectá las salidas Q del REG4 PC ${nb(4)} a las entradas A0-A3 de la RAM16 ${nb(3)} y al ADD4 ${nb(5)}.</li>
          <li>Conectá al ADD4 ${nb(5)} las constantes B0=1, B1=B2=B3=0 y Cin=0. Su salida es PC+1.</li>
          <li>Conectá PC+1 a las entradas A de la SEL4 ${nb(6)} y las salidas Q del REG4 ARG a las entradas B de la SEL4 ${nb(6)}.</li>
          <li>Conectá la salida O de la SEL4 ${nb(6)} a las entradas D del REG4 PC ${nb(4)}.</li>
          <li>Conectá las salidas Q0-Q3 de la RAM16 ${nb(3)} a las entradas D de los REG4 OP y ARG ${nb(4)}.</li>
          <li>Conectá T0 del RING3 ${nb(3)} a LOAD del REG4 OP ${nb(4)}; T1 a LOAD del REG4 ARG ${nb(4)}.</li>
          <li>Conectá CLK ${nb(2)} a CLK de todos los REG4 ${nb(4)}.</li>
        </ol>
        <p><b>El experimento:</b> escribí en RAM celda 0 = 1 y celda 1 = 5. RESET=1, pulsá una vez, RESET=0. En T0 OP carga 1; en T1 ARG carga 5; en T2 ambos retienen el valor.</p>`,
        en: `
        <p>You already have memory (<b>RAM16</b>), the step counter (<b>RING3</b>), and LOAD registers. In this lesson you build the <b>Fetch</b> stage: the PC tells RAM which address to read, and the OP and ARG registers capture the instruction and its argument.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>RAM16</b> 🧠 (from lesson 24) with CS=1 and WE=0</li>
          <li>1× your <b>RING3</b> box 🧩 (from lesson 26)</li>
          <li>3× your <b>REG4</b> box 🧩 (from lesson 13): PC, OP, and ARG</li>
          <li>1× your <b>ADD4</b> box 🧩 (from lesson 18) — PC+1 incrementer</li>
          <li>1× your <b>SEL4</b> box 🧩 (from lesson 19) — PC jump selector</li>
          <li>2× <b>Input</b> (key 2): RESET and CLK</li>
        </ul>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} RESET</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} RAM16</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} 3× REG4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} ADD4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} SEL4</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} CLK</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire RESET ${nb(1)} and CLK ${nb(2)} to the RESET and CLK pins of RING3 ${nb(3)}.</li>
          <li>Wire the PC REG4's Q outputs ${nb(4)} to RAM16's A0-A3 inputs ${nb(3)} and to ADD4 ${nb(5)}.</li>
          <li>Wire constants to ADD4 ${nb(5)}: B0=1, B1=B2=B3=0, Cin=0. Its output is PC+1.</li>
          <li>Wire PC+1 to SEL4's A inputs ${nb(6)} and the ARG REG4's Q outputs to SEL4's B inputs ${nb(6)}.</li>
          <li>Wire SEL4's O output ${nb(6)} to the PC REG4's D inputs ${nb(4)}.</li>
          <li>Wire RAM16's Q0-Q3 outputs ${nb(3)} to the D inputs of the OP and ARG REG4s ${nb(4)}.</li>
          <li>Wire RING3's T0 ${nb(3)} to OP REG4's LOAD ${nb(4)}; T1 to ARG REG4's LOAD ${nb(4)}.</li>
          <li>Wire CLK ${nb(2)} to CLK of all REG4s ${nb(4)}.</li>
        </ol>
        <p><b>The experiment:</b> write RAM cell 0 = 1 and cell 1 = 5. RESET=1, pulse once, RESET=0. At T0 OP loads 1; at T1 ARG loads 5; at T2 both hold their values.</p>`,
    },
    check() {
      const results = [];
      const hasRegBox = !!lib["REG4"];
      const dffs = state.components.filter(c => c.type === "DFF");
      const ramComp = state.components.find(c => c.type === "ram");

      // 1. Verificar caja empaquetada REG4 si existe
      function testPackedReg4() {
        const def = lib["REG4"];
        if (!def || def.inputs.length !== 6 || def.outputs.length !== 4) return false;
        if (typeof registerPackedType === "function" && !TYPE_DEFS["REG4"]) {
          registerPackedType(def);
        }

        const savedComponents = state.components;
        const savedWires = state.wires;
        const savedNextId = state.nextId;
        const savedGateOuts = new Map(gateOuts);

        let ok = false;
        try {
          state.components = [];
          state.wires = [];
          state.nextId = 1;
          gateOuts.clear();

          const reg = { id: state.nextId++, type: "REG4", x: 0, y: 0, rot: 0, on: false };
          state.components.push(reg);

          const dSws = [];
          for (let i = 0; i < 4; i++) {
            const sw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
            state.components.push(sw);
            state.wires.push({ id: state.nextId++, a: { c: sw.id, t: 0 }, b: { c: reg.id, t: i } });
            dSws.push(sw);
          }

          const loadSw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
          state.components.push(loadSw);
          state.wires.push({ id: state.nextId++, a: { c: loadSw.id, t: 0 }, b: { c: reg.id, t: 4 } });

          const clkSw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
          state.components.push(clkSw);
          state.wires.push({ id: state.nextId++, a: { c: clkSw.id, t: 0 }, b: { c: reg.id, t: 5 } });

          const outs = [];
          for (let j = 0; j < 4; j++) {
            const o = { id: state.nextId++, type: "out", x: 0, y: 0, rot: 0, on: false };
            state.components.push(o);
            state.wires.push({ id: state.nextId++, a: { c: reg.id, t: 6 + j }, b: { c: o.id, t: 0 } });
            outs.push(o);
          }

          const pulse = () => {
            clkSw.on = true; simulate();
            clkSw.on = false; return simulate();
          };

          const readVal = r => {
            let v = 0;
            for (let i = 0; i < 4; i++) {
              const net = r.netOf.get(outs[i].id + ":0");
              const val = net !== undefined ? r.values[net] : -1;
              if (val === 1) v |= (1 << i);
              else if (val !== 0) return -1;
            }
            return v;
          };

          // Carga 5 (0101) con LOAD=1
          loadSw.on = true;
          for (let i = 0; i < 4; i++) dSws[i].on = !!((5 >> i) & 1);
          pulse();
          const v1 = readVal(simulate());

          // Retiene con LOAD=0 y cambio de entradas a 9 (1001)
          loadSw.on = false;
          for (let i = 0; i < 4; i++) dSws[i].on = !!((9 >> i) & 1);
          pulse();
          const v2 = readVal(simulate());

          if (v1 === 5 && v2 === 5) ok = true;
        } catch (e) {
          ok = false;
        } finally {
          state.components = savedComponents;
          state.wires = savedWires;
          state.nextId = savedNextId;
          gateOuts.clear();
          for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
          simulate();
        }
        return ok;
      }

      if (hasRegBox) {
        results.push({
          name: TXT(LL("Caja REG4: 6 entradas (D0-D3, LOAD, CLK) y 4 salidas (Q0-Q3)", "REG4 box: 6 inputs (D0-D3, LOAD, CLK) and 4 outputs (Q0-Q3)")),
          ok: lib["REG4"].inputs.length === 6 && lib["REG4"].outputs.length === 4,
        });
        results.push({
          name: TXT(LL("Caja REG4: LOAD=1 captura dato y LOAD=0 retiene", "REG4 box: LOAD=1 captures and LOAD=0 holds")),
          ok: testPackedReg4(),
        });
      } else if (dffs.length >= 4) {
        const { netOf } = buildNets();
        let clkComp = null;
        for (const d of dffs) {
          const netClk = netOf.get(d.id + ":1");
          if (netClk === undefined) continue;
          clkComp = state.components.find(c =>
            (c.type === "switch" || c.type === "clock") &&
            netOf.get(c.id + ":0") === netClk
          );
          if (clkComp) break;
        }
        results.push({
          name: TXT(LL("Circuito REG4: al menos 4 DFFs y compuertas/multiplexores", "REG4 circuit: at least 4 DFFs and gates/multiplexers")),
          ok: dffs.length >= 4 && !!clkComp,
        });
      } else if (!ramComp) {
        results.push({
          name: TXT(LL("Caja REG4 o circuito de registro de 4 bits", "REG4 box or 4-bit register circuit")),
          ok: false,
        });
      }

      // 2. Si la RAM está en el canvas, verificar la etapa Fetch
      if (ramComp) {
        const { netOf } = buildNets();
        const sws = state.components.filter(c => c.type === "switch");
        const clocks = state.components.filter(c => c.type === "clock");
        const ring = state.components.find(c => c.type === "RING3");

        let clkComp = clocks[0] ?? null;
        if (!clkComp) {
          if (ring) {
            const netRingClk = netOf.get(ring.id + ":1");
            clkComp = sws.find(s => netOf.get(s.id + ":0") === netRingClk);
          }
          if (!clkComp) {
            for (const d of dffs) {
              const netDffClk = netOf.get(d.id + ":1");
              clkComp = sws.find(s => netOf.get(s.id + ":0") === netDffClk);
              if (clkComp) break;
            }
          }
          if (!clkComp) clkComp = sws[0];
        }

        let rstComp = null;
        if (ring) {
          const netRingRst = netOf.get(ring.id + ":0");
          rstComp = sws.find(s => netOf.get(s.id + ":0") === netRingRst);
        }
        if (!rstComp) {
          rstComp = sws.find(s => s !== clkComp);
        }

        if (clkComp && rstComp) {
          const swClk = clkComp.type === "switch" ? clkComp : null;
          const clock = clkComp.type === "clock" ? clkComp : null;
          const clockPrev = clock ? (globalClockState.get(clock.id) ?? false) : false;
          const clkSet = v => {
            if (swClk) swClk.on = v;
            else if (clock) globalClockState.set(clock.id, v);
          };
          const pulse = () => {
            clkSet(true); simulate();
            clkSet(false); return simulate();
          };

          const savedSw = sws.map(s => s.on);
          const savedGateOuts = new Map(gateOuts);
          const origRam = new Uint8Array(ramData.get(ramComp.id) ?? 16);

          let okFetch = false;
          try {
            const testProg = new Uint8Array(16);
            testProg[0] = 1; testProg[1] = 5; testProg[2] = 2; testProg[3] = 3;
            ramData.set(ramComp.id, testProg);

            const reg4s = state.components.filter(c => c.type === "REG4");
            let opBox = null, argBox = null;
            if (ring && reg4s.length >= 2) {
              const netT0 = netOf.get(ring.id + ":2");
              const netT1 = netOf.get(ring.id + ":3");
              opBox = reg4s.find(r => netOf.get(r.id + ":4") === netT0);
              argBox = reg4s.find(r => netOf.get(r.id + ":4") === netT1);
            }
            if (!opBox && reg4s.length >= 2) {
              opBox = reg4s[0]; argBox = reg4s[1];
            }

            const readBoxNibble = (r, box) => {
              if (!box) return -1;
              let v = 0;
              for (let i = 0; i < 4; i++) {
                const net = r.netOf.get(box.id + ":" + (6 + i));
                const b = net !== undefined ? r.values[net] : -1;
                if (b === 1) v |= (1 << i);
                else if (b !== 0) return -1;
              }
              return v;
            };

            gateOuts.clear();
            rstComp.on = true; simulate();
            pulse();
            rstComp.on = false; simulate();

            pulse();
            const r1 = simulate();
            const op1 = readBoxNibble(r1, opBox);

            pulse();
            const r2 = simulate();
            const arg2 = readBoxNibble(r2, argBox);

            if (op1 === 1 && arg2 === 5) {
              okFetch = true;
            }
          } catch (e) {
            okFetch = false;
          } finally {
            ramData.set(ramComp.id, origRam);
            sws.forEach((s, i) => s.on = savedSw[i]);
            if (clock) globalClockState.set(clock.id, clockPrev);
            gateOuts.clear();
            for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
            simulate();
          }

          results.push({
            name: TXT(LL("Etapa Fetch: en T0 OP captura RAM[0] y en T1 ARG captura RAM[1]", "Fetch stage: at T0 OP captures RAM[0] and at T1 ARG captures RAM[1]")),
            ok: okFetch,
          });
        } else {
          results.push({
            name: TXT(LL("Etapa Fetch: en T0 OP captura RAM[0] y en T1 ARG captura RAM[1]", "Fetch stage: at T0 OP captures RAM[0] and at T1 ARG captures RAM[1]")),
            ok: false,
          });
        }
      }

      return results;
    },
  },
  {
    id: "s28",
    title: LL("28. Unidad de control", "28. Control Unit"),
    theory: {
        es: `
        <p>Una computadora no ejecuta todas sus piezas al mismo tiempo: necesita un <b>director de orquesta</b>. La <b>Unidad de Control</b> mira el paso actual (T0, T1, T2) y el opcode (OP0-OP2), y enciende las señales correctas en cada instante.</p>
        <p><b>Las 7 señales de control:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>PC_LOAD</b> — avanza el PC en T0 y T1, o carga un salto en T2 cuando la instrucción es JMP.</li>
          <li><b>JMP_SEL</b> — elige el destino del salto en T2 cuando la instrucción es JMP.</li>
          <li><b>A_LOAD</b> — escribe en el acumulador A durante T2 de LDA, ADD o AND.</li>
          <li><b>A_SEL</b> — 0 toma ARG (LDA), 1 toma la ALU (ADD/AND).</li>
          <li><b>B_LOAD</b> — escribe en B durante T2 de LDB.</li>
          <li><b>OUT_LOAD</b> — copia A a OUT durante T2 de OUT.</li>
          <li><b>HALT_SET</b> — detiene el reloj durante T2 de HALT.</li>
        </ul>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× tu caja <b>DEC3</b> 🧩 (de la lección 25)</li>
          <li>3× <b>OR</b> (tecla 7)</li>
          <li>4× <b>AND</b> (tecla 6)</li>
          <li>6× <b>Entrada</b> (tecla 2): OP0, OP1, OP2, T0, T1, T2</li>
          <li>7× <b>Salida</b> (tecla 3): PC_LOAD, JMP_SEL, A_LOAD, A_SEL, B_LOAD, OUT_LOAD, HALT_SET</li>
        </ul>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} OP0-OP2</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} DEC3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} PC_LOAD</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} A_LOAD / A_SEL</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(8)} 7× Salidas</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} T0-T2</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} JMP_SEL</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} B_LOAD / OUT_LOAD / HALT_SET</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Conectá las Entradas OP0-OP2 ${nb(1)} a los pines A0-A2 de la DEC3 ${nb(3)}.</li>
          <li><b>PC_LOAD ${nb(4)}:</b> es la OR de T0 ${nb(2)}, T1 ${nb(2)} y JMP_SEL ${nb(5)}.</li>
          <li><b>JMP_SEL ${nb(5)}:</b> es T2 ${nb(2)} AND con la salida Y6 (JMP) de la DEC3 ${nb(3)}.</li>
          <li><b>A_SEL ${nb(6)}:</b> es la OR de Y3 (ADD) e Y4 (AND) de la DEC3 ${nb(3)}.</li>
          <li><b>A_LOAD ${nb(6)}:</b> es T2 ${nb(2)} AND con la OR de Y1 (LDA) y A_SEL ${nb(6)}.</li>
          <li><b>B_LOAD, OUT_LOAD y HALT_SET ${nb(7)}:</b> cada uno es T2 ${nb(2)} AND con Y2 (LDB), Y5 (OUT) e Y7 (HALT) de la DEC3 ${nb(3)}.</li>
          <li>Conectá cada señal a su Salida correspondiente del grupo ${nb(8)}.</li>
        </ol>
        <p><b>El experimento:</b> con solo T0=1, se enciende PC_LOAD. Con T2=1 y OP=001 (LDA), se enciende A_LOAD. Con T2 y OP=011 (ADD), se encienden A_LOAD y A_SEL. Con T2 y OP=111 (HALT), se enciende HALT_SET.</p>`,
        en: `
        <p>A computer does not activate every part at once: it needs an <b>orchestra conductor</b>. The <b>Control Unit</b> looks at the current step (T0, T1, T2) and the opcode (OP0-OP2), and turns on the right signals at each instant.</p>
        <p><b>The 7 control signals:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>PC_LOAD</b> — advances the PC in T0 and T1, or loads a jump in T2 when the instruction is JMP.</li>
          <li><b>JMP_SEL</b> — selects the jump target in T2 when the instruction is JMP.</li>
          <li><b>A_LOAD</b> — writes to accumulator A during T2 of LDA, ADD, or AND.</li>
          <li><b>A_SEL</b> — 0 takes ARG (LDA), 1 takes the ALU (ADD/AND).</li>
          <li><b>B_LOAD</b> — writes to B during T2 of LDB.</li>
          <li><b>OUT_LOAD</b> — copies A to OUT during T2 of OUT.</li>
          <li><b>HALT_SET</b> — stops the clock during T2 of HALT.</li>
        </ul>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× your <b>DEC3</b> box 🧩 (from lesson 25)</li>
          <li>3× <b>OR</b> (key 7)</li>
          <li>4× <b>AND</b> (key 6)</li>
          <li>6× <b>Input</b> (key 2): OP0, OP1, OP2, T0, T1, T2</li>
          <li>7× <b>Output</b> (key 3): PC_LOAD, JMP_SEL, A_LOAD, A_SEL, B_LOAD, OUT_LOAD, HALT_SET</li>
        </ul>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} OP0-OP2</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} DEC3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} PC_LOAD</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} A_LOAD / A_SEL</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(8)} 7× Outputs</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} T0-T2</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} JMP_SEL</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} B_LOAD / OUT_LOAD / HALT_SET</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Wire Inputs OP0-OP2 ${nb(1)} to pins A0-A2 of DEC3 ${nb(3)}.</li>
          <li><b>PC_LOAD ${nb(4)}:</b> OR of T0 ${nb(2)}, T1 ${nb(2)}, and JMP_SEL ${nb(5)}.</li>
          <li><b>JMP_SEL ${nb(5)}:</b> T2 ${nb(2)} ANDed with DEC3 output Y6 (JMP) ${nb(3)}.</li>
          <li><b>A_SEL ${nb(6)}:</b> OR of DEC3 outputs Y3 (ADD) and Y4 (AND) ${nb(3)}.</li>
          <li><b>A_LOAD ${nb(6)}:</b> T2 ${nb(2)} ANDed with the OR of Y1 (LDA) and A_SEL ${nb(6)}.</li>
          <li><b>B_LOAD, OUT_LOAD, and HALT_SET ${nb(7)}:</b> each is T2 ${nb(2)} ANDed with Y2 (LDB), Y5 (OUT), and Y7 (HALT) of DEC3 ${nb(3)}.</li>
          <li>Wire each signal to its corresponding Output in the group ${nb(8)}.</li>
        </ol>
        <p><b>The experiment:</b> with only T0=1, PC_LOAD turns on. With T2=1 and OP=001 (LDA), A_LOAD turns on. With T2 and OP=011 (ADD), A_LOAD and A_SEL turn on. With T2 and OP=111 (HALT), HALT_SET turns on.</p>`,
    },
    check() {
      const sws = state.components.filter(c => c.type === "switch");
      const outs = state.components.filter(c => c.type === "out");
      const dec = state.components.find(c => c.type === "DEC3");

      const nameComps = TXT(LL(
        "Circuito: DEC3, al menos 6 Entradas y 7 Salidas de control",
        "Circuit: DEC3, at least 6 Inputs and 7 control Outputs"
      ));

      if (!dec || sws.length < 6 || outs.length < 7) {
        return [
          { name: nameComps, ok: false },
          { name: TXT(LL("PC_LOAD y JMP_SEL: activos en Fetch (T0, T1) y en salto (T2 si OP=JMP)", "PC_LOAD and JMP_SEL: active during Fetch (T0, T1) and jump (T2 when OP=JMP)")), ok: false },
          { name: TXT(LL("A_LOAD y A_SEL: carga condicional en LDA, ADD, AND; selector en ADD y AND", "A_LOAD and A_SEL: conditional load on LDA, ADD, AND; select on ADD and AND")), ok: false },
          { name: TXT(LL("B_LOAD, OUT_LOAD y HALT_SET: activos en T2 según la instrucción", "B_LOAD, OUT_LOAD, and HALT_SET: active in T2 according to instruction")), ok: false },
        ];
      }

      const { netOf } = buildNets();

      const getPerms = arr => {
        if (arr.length <= 1) return [arr];
        const res = [];
        for (let i = 0; i < arr.length; i++) {
          const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
          for (const p of getPerms(rest)) res.push([arr[i], ...p]);
        }
        return res;
      };

      const getCombos = (arr, k, start = 0, cur = [], res = []) => {
        if (cur.length === k) { res.push([...cur]); return res; }
        for (let i = start; i < arr.length; i++) {
          cur.push(arr[i]);
          getCombos(arr, k, i + 1, cur, res);
          cur.pop();
        }
        return res;
      };

      const decSws = [0, 1, 2].map(pin =>
        sws.find(s => netOf.get(s.id + ":0") === netOf.get(dec.id + ":" + pin))
      );
      const decDirect = decSws[0] && decSws[1] && decSws[2] && (new Set(decSws)).size === 3;

      const rem = decDirect ? sws.filter(s => !decSws.includes(s)) : sws;
      const candidateTSets = getCombos(rem, 3);

      const testCases = [
        { t: [1, 0, 0], op: 0 },
        { t: [0, 1, 0], op: 0 },
        { t: [0, 0, 1], op: 0 },
        { t: [0, 0, 1], op: 1 },
        { t: [0, 0, 1], op: 2 },
        { t: [0, 0, 1], op: 3 },
        { t: [0, 0, 1], op: 4 },
        { t: [0, 0, 1], op: 5 },
        { t: [0, 0, 1], op: 6 },
        { t: [0, 0, 1], op: 7 },
      ];

      const EXPECTED = {
        PC_LOAD:  [1, 1, 0, 0, 0, 0, 0, 0, 1, 0],
        JMP_SEL:  [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        A_LOAD:   [0, 0, 0, 1, 0, 1, 1, 0, 0, 0],
        A_SEL:    [0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
        B_LOAD:   [0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        OUT_LOAD: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        HALT_SET: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      };
      const SIGNAL_NAMES = Object.keys(EXPECTED);

      const savedSw = sws.map(s => s.on);
      const savedGateOuts = new Map(gateOuts);

      let bestMatchedSignals = new Set();
      let bestScore = -1;

      try {
        const validTTriplets = [];
        for (const cSet of candidateTSets) {
          for (const tCand of getPerms(cSet)) {
            sws.forEach(s => s.on = false);
            tCand[0].on = true;
            let r0 = simulate();
            const act0 = outs.filter(o => r0.values[r0.netOf.get(o.id + ":0")] === 1);
            if (act0.length === 0) continue;

            tCand[0].on = false;
            tCand[1].on = true;
            let r1 = simulate();
            const act1 = outs.filter(o => r1.values[r1.netOf.get(o.id + ":0")] === 1);
            if (!act0.some(o => act1.includes(o))) continue;

            tCand[1].on = false;
            tCand[2].on = true;
            let r2 = simulate();
            const commonOuts = act0.filter(o => act1.includes(o));
            const stillActive = commonOuts.some(o => r2.values[r2.netOf.get(o.id + ":0")] === 1);
            if (stillActive) continue;

            validTTriplets.push(tCand);
          }
        }

        const candidatePairs = [];
        if (decDirect) {
          const opPerms = getPerms(decSws);
          for (const tArr of validTTriplets) {
            for (const opArr of opPerms) {
              candidatePairs.push({ opArr, tArr });
            }
          }
        } else {
          for (const tArr of validTTriplets) {
            const remForOp = sws.filter(s => !tArr.includes(s));
            const opTriplets = getCombos(remForOp, 3);
            for (const ot of opTriplets) {
              for (const opArr of getPerms(ot)) {
                candidatePairs.push({ opArr, tArr });
              }
            }
          }
        }

        for (const { opArr, tArr } of candidatePairs) {
          const outVectors = outs.map(() => []);
          for (let k = 0; k < testCases.length; k++) {
            const tc = testCases[k];
            sws.forEach(s => s.on = false);
            tArr[0].on = !!tc.t[0];
            tArr[1].on = !!tc.t[1];
            tArr[2].on = !!tc.t[2];
            opArr[0].on = !!(tc.op & 1);
            opArr[1].on = !!((tc.op >> 1) & 1);
            opArr[2].on = !!((tc.op >> 2) & 1);
            const simR = simulate();
            for (let oi = 0; oi < outs.length; oi++) {
              outVectors[oi].push(simR.values[simR.netOf.get(outs[oi].id + ":0")]);
            }
          }

          const matchedSignals = new Set();
          const claimedOuts = new Set();
          for (const sig of SIGNAL_NAMES) {
            const exp = EXPECTED[sig];
            for (let oi = 0; oi < outs.length; oi++) {
              if (claimedOuts.has(oi)) continue;
              const matches = exp.every((val, idx) => outVectors[oi][idx] === val);
              if (matches) {
                claimedOuts.add(oi);
                matchedSignals.add(sig);
                break;
              }
            }
          }

          if (matchedSignals.size > bestScore) {
            bestScore = matchedSignals.size;
            bestMatchedSignals = matchedSignals;
            if (bestScore === SIGNAL_NAMES.length) break;
          }
        }
      } finally {
        sws.forEach((s, i) => s.on = savedSw[i]);
        gateOuts.clear();
        for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
        simulate();
      }

      const okPcJmp = bestMatchedSignals.has("PC_LOAD") && bestMatchedSignals.has("JMP_SEL");
      const okAcc = bestMatchedSignals.has("A_LOAD") && bestMatchedSignals.has("A_SEL");
      const okRest = bestMatchedSignals.has("B_LOAD") && bestMatchedSignals.has("OUT_LOAD") && bestMatchedSignals.has("HALT_SET");

      return [
        { name: nameComps, ok: true },
        {
          name: TXT(LL(
            "PC_LOAD y JMP_SEL: activos en Fetch (T0, T1) y en salto (T2 si OP=JMP)",
            "PC_LOAD and JMP_SEL: active during Fetch (T0, T1) and jump (T2 when OP=JMP)"
          )),
          ok: okPcJmp,
        },
        {
          name: TXT(LL(
            "A_LOAD y A_SEL: carga condicional en LDA, ADD, AND; selector en ADD y AND",
            "A_LOAD and A_SEL: conditional load on LDA, ADD, AND; select on ADD and AND"
          )),
          ok: okAcc,
        },
        {
          name: TXT(LL(
            "B_LOAD, OUT_LOAD y HALT_SET: activos en T2 según la instrucción",
            "B_LOAD, OUT_LOAD, and HALT_SET: active in T2 according to instruction"
          )),
          ok: okRest,
        },
      ];
    },
  },
  {
        id: "s29",
    title: LL("29. Tu primer CPU", "29. Your First CPU"),
    desc: LL(
      "Uní todos los módulos construidos para ejecutar tu primer programa completo: Suma (5 + 3 = 8).",
      "Connect all built modules to execute your first complete program: Sum (5 + 3 = 8)."
    ),
    theory: {
        es: `
        <p>Es el momento en que el auto arranca y rueda solo: todos los módulos se unen para ejecutar un programa grabado en memoria, paso a paso, al ritmo del reloj.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>RAM16</b> 🧠 (CS=1, WE=0)</li>
          <li>1× tu caja <b>RING3</b> 🧩</li>
          <li>1× tu caja <b>DEC3</b> 🧩</li>
          <li>5× tu caja <b>REG4</b> 🧩: OP, ARG, A, B, OUT</li>
          <li>1× tu caja <b>ALU4</b> 🧩</li>
          <li>1× tu caja <b>ADD4</b> 🧩 — PC+1</li>
          <li>2× tu caja <b>SEL4</b> 🧩 — PC y entrada de A</li>
          <li>1× tu caja <b>DFF</b> 🧩 — bandera H</li>
          <li>Compuertas AND, OR y NOT para la Unidad de Control y el reloj</li>
          <li>Entradas RESET y CLK; 4× Salida conectadas a OUT</li>
        </ul>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} RESET / CLK</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} RAM16</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} RING3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} DEC3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} 5× REG4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} ADD4</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} ALU4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(8)} 2× SEL4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(9)} DFF H</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(10)} compuertas ctrl</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(11)} 4× Salida</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li><b>Reloj:</b> el DFF H ${nb(9)} recibe CLK directo. Su entrada D se enciende cuando la bandera H ya está activa o cuando la instrucción HALT lo pide, a menos que RESET esté forzando un reinicio. El reloj que alimenta al resto del CPU se detiene mientras H esté activa (salvo que RESET lo reinicie).</li>
          <li><b>PC:</b> el REG4 PC ${nb(5)} guarda la dirección. Su Q va a RAM16 ${nb(2)} y al ADD4 ${nb(6)} (B=0001, Cin=0). La SEL4 del PC ${nb(8)} elige PC+1 o ARG; su salida va a D del REG4 PC ${nb(5)}. LOAD del PC es PC_LOAD.</li>
          <li><b>Fetch:</b> RAM16 Q ${nb(2)} va en paralelo a OP.D y ARG.D ${nb(5)}. OP.LOAD=T0; ARG.LOAD=T1.</li>
          <li><b>Control:</b> OP.Q0-Q2 entran en DEC3 ${nb(4)}. Generá PC_LOAD, A_SEL, A_LOAD, B_LOAD, OUT_LOAD y HALT_SET según la matriz de la lección 28.</li>
          <li><b>Datos:</b> ARG va a B.D ${nb(5)}. La SEL4 de A ${nb(8)} recibe ARG en A y ALU4 en B; su salida va a A.D. A y B alimentan ALU4 ${nb(7)}; su selector OP recibe A_SEL. A va a OUT.D; OUT.Q va a las Salidas ${nb(11)}.</li>
        </ol>
        <p><b>El experimento:</b> cargá en RAM el programa Suma <code>1 5 2 3 3 0 5 0 7 0</code>. RESET=1, un pulso, RESET=0. A los 12 pulsos OUT ${nb(11)} muestra <b>8</b>; a los 15 HALT detiene el reloj.</p>`,
        en: `
        <p>This is the moment the car starts and drives on its own: all modules join to execute a stored program, step by step, to the beat of the clock.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>RAM16</b> 🧠 (CS=1, WE=0)</li>
          <li>1× your <b>RING3</b> box 🧩</li>
          <li>1× your <b>DEC3</b> box 🧩</li>
          <li>5× your <b>REG4</b> box 🧩: OP, ARG, A, B, OUT</li>
          <li>1× your <b>ALU4</b> box 🧩</li>
          <li>1× your <b>ADD4</b> box 🧩 — PC+1</li>
          <li>2× your <b>SEL4</b> box 🧩 — PC and A input</li>
          <li>1× your <b>DFF</b> box 🧩 — H halt flag</li>
          <li>AND, OR, and NOT gates for the Control Unit and clock gating</li>
          <li>RESET and CLK Inputs; 4 Outputs connected to OUT</li>
        </ul>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} RESET / CLK</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} RAM16</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} RING3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} DEC3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} 5× REG4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} ADD4</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} ALU4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(8)} 2× SEL4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(9)} DFF H</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(10)} control gates</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(11)} 4× Output</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li><b>Clock:</b> the H DFF ${nb(9)} gets CLK directly. Its D input turns on when the H flag is already active or when the HALT instruction requests it, unless RESET is forcing a restart. The clock that feeds the rest of the CPU stops while H is active (unless RESET restarts it).</li>
          <li><b>PC:</b> the PC REG4 ${nb(5)} stores the address. Its Q goes to RAM16 ${nb(2)} and to ADD4 ${nb(6)} (B=0001, Cin=0). The PC SEL4 ${nb(8)} chooses PC+1 or ARG; its output goes to the PC REG4's D ${nb(5)}. PC LOAD is PC_LOAD.</li>
          <li><b>Fetch:</b> RAM16 Q ${nb(2)} goes in parallel to OP.D and ARG.D ${nb(5)}. OP.LOAD=T0; ARG.LOAD=T1.</li>
          <li><b>Control:</b> OP.Q0-Q2 feed DEC3 ${nb(4)}. Generate PC_LOAD, A_SEL, A_LOAD, B_LOAD, OUT_LOAD, and HALT_SET per lesson 28's matrix.</li>
          <li><b>Datapath:</b> ARG goes to B.D ${nb(5)}. The A SEL4 ${nb(8)} receives ARG on A and ALU4 on B; its output goes to A.D. A and B feed ALU4 ${nb(7)}; its OP selector receives A_SEL. A goes to OUT.D; OUT.Q goes to the Outputs ${nb(11)}.</li>
        </ol>
        <p><b>The experiment:</b> load the Sum program <code>1 5 2 3 3 0 5 0 7 0</code> into RAM. RESET=1, one pulse, RESET=0. After 12 pulses OUT ${nb(11)} shows <b>8</b>; after 15 HALT stops the clock.</p>`,
    },
    
    check() {
      const ramComp = state.components.find(c => c.type === "ram");
      const outs = state.components.filter(c => c.type === "out");
      const ring = state.components.find(c => c.type === "RING3");
      const sws = state.components.filter(c => c.type === "switch");
      const clocks = state.components.filter(c => c.type === "clock");

      const nameComps = TXT(LL(
        "Circuito: RAM16, registros y ruta de datos completa",
        "Circuit: RAM16, registers and complete datapath"
      ));
      const nameSuma = TXT(LL(
        "Programa Suma: tras 15 pulsos OUT = 8 (5 + 3)",
        "Sum program: after 15 pulses OUT = 8 (5 + 3)"
      ));
      const nameHalt = TXT(LL(
        "HALT: la CPU se detiene y OUT se mantiene en 8",
        "HALT: CPU stops and OUT stays at 8"
      ));

      if (!ramComp || outs.length < 4 || sws.length < 2) {
        return [
          { name: nameComps, ok: false },
          { name: nameSuma, ok: false },
          { name: nameHalt, ok: false },
        ];
      }

      const getPerms = arr => {
        if (arr.length <= 1) return [arr];
        const res = [];
        for (let i = 0; i < arr.length; i++) {
          const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
          for (const p of getPerms(rest)) res.push([arr[i], ...p]);
        }
        return res;
      };
      const getCombos = (arr, k, start = 0, cur = [], res = []) => {
        if (cur.length === k) { res.push([...cur]); return res; }
        for (let i = start; i < arr.length; i++) {
          cur.push(arr[i]);
          getCombos(arr, k, i + 1, cur, res);
          cur.pop();
        }
        return res;
      };
      const candidatePerms = [];
      for (const set of getCombos(outs, 4)) {
        for (const p of getPerms(set)) candidatePerms.push(p);
      }

      const readNibble = (r, p) => {
        let v = 0;
        for (let i = 0; i < 4; i++) {
          const net = r.netOf.get(p[i].id + ":0");
          const b = net !== undefined ? r.values[net] : -1;
          if (b === 1) v |= (1 << i);
          else if (b !== 0) return -1;
        }
        return v;
      };

      const savedSw = sws.map(s => ({ s, on: s.on }));
      const savedClocks = clocks.map(ck => ({ ck, v: globalClockState.get(ck.id) ?? false }));
      const savedGateOuts = new Map(gateOuts);
      const origRam = new Uint8Array(ramData.get(ramComp.id) ?? 16);

      const clkCandidates = [...clocks, ...sws];
      const rstCandidates = sws;

      let okSuma = false;
      let okHalt = false;

      try {
        const sumaProg = new Uint8Array(16);
        [1, 5, 2, 3, 3, 0, 5, 0, 7, 0].forEach((b, i) => sumaProg[i] = b);
        ramData.set(ramComp.id, sumaProg);

        candidateLoop:
        for (const clkCand of clkCandidates) {
          for (const rstCand of rstCandidates) {
            if (clkCand === rstCand) continue;

            savedSw.forEach(({ s, on }) => s.on = on);
            savedClocks.forEach(({ ck, v }) => globalClockState.set(ck.id, v));
            gateOuts.clear();

            const setClk = v => {
              if (clkCand.type === "clock") globalClockState.set(clkCand.id, v);
              else clkCand.on = v;
            };
            const setRst = v => {
              rstCand.on = v;
            };
            const doPulse = () => {
              setClk(true); simulate();
              setClk(false); return simulate();
            };
            const doReset = () => {
              setRst(true); simulate();
              doPulse();
              setRst(false); return simulate();
            };

            const rReset = doReset();
            if (ring) {
              const t0Val = rReset.values[rReset.netOf.get(ring.id + ":2")];
              if (t0Val !== 1) continue;
              const rStep = doPulse();
              const t1Val = rStep.values[rStep.netOf.get(ring.id + ":3")];
              if (t1Val !== 1) continue;
              doReset();
            }

            let r15 = null;
            for (let k = 0; k < 15; k++) {
              r15 = doPulse();
            }

            let bestPerm = null;
            for (const p of candidatePerms) {
              if (readNibble(r15, p) === 8) {
                bestPerm = p;
                break;
              }
            }
            if (!bestPerm) continue;

            okSuma = true;

            let haltValid = true;
            for (let k = 0; k < 10; k++) {
              const rMore = doPulse();
              if (readNibble(rMore, bestPerm) !== 8) {
                haltValid = false;
                break;
              }
            }
            if (haltValid) {
              okHalt = true;
            }
            break candidateLoop;
          }
        }
      } catch (e) {
        okSuma = false;
        okHalt = false;
      } finally {
        ramData.set(ramComp.id, origRam);
        savedSw.forEach(({ s, on }) => s.on = on);
        savedClocks.forEach(({ ck, v }) => globalClockState.set(ck.id, v));
        gateOuts.clear();
        for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
        simulate();
      }

      return [
        { name: nameComps, ok: true },
        { name: nameSuma, ok: okSuma },
        { name: nameHalt, ok: okHalt },
      ];
    },
  },
  {
    id: "s30",
    title: LL("30. Salto y Parada (JMP y HALT)", "30. Jump and Halt (JMP and HALT)"),
    desc: LL(
      "Programá un bucle infinito (Contador) con JMP, verificá la detención limpia con HALT y celebrá tu computadora completa.",
      "Program an infinite loop (Counter) with JMP, verify clean stopping with HALT, and celebrate your complete computer."
    ),
    theory: {
        es: `
        <p>Es el pedal de freno (<b>HALT</b>) y la rotonda (<b>JMP</b>) de tu computadora. El procesador ya no está atrapado en un camino de ida: ahora puede decidir hacia dónde ir y cuándo parar.</p>
        <p><b>Componentes que necesitás:</b> los mismos de la lección 29: RAM16, RING3, DEC3, 5× REG4, ALU4, ADD4, 2× SEL4, DFF H, compuertas de control, RESET, CLK y 4× Salida.</p>
        <p><b>Colócalos en este orden (de izquierda a derecha, de arriba abajo):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} RESET / CLK</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} RAM16</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} RING3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} DEC3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} 5× REG4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} ADD4</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} ALU4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(8)} 2× SEL4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(9)} DFF H</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(10)} compuertas ctrl</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(11)} 4× Salida</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Conexión:</b> idéntica a la lección 29. Verificá especialmente que PC_LOAD se active en T2 cuando OP=JMP (salto) y que HALT_SET se active cuando OP=HALT.</p>
        <p><b>El experimento:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Cargá el programa Contador <code>1 0 2 1 3 0 5 0 6 4</code>. Con RESET=1, pulsá una vez; luego RESET=0. Encendé el reloj: OUT ${nb(11)} cuenta 1, 2, 3... cíclicamente gracias al JMP.</li>
          <li>Cargá el programa Suma <code>1 5 2 3 3 0 5 0 7 0</code>. Tras mostrar 8, HALT congela el reloj. RESET=1 reinicia la ejecución desde la dirección 0.</li>
        </ol>`,
        en: `
        <p>It is the brake pedal (<b>HALT</b>) and the roundabout (<b>JMP</b>) of your computer. The processor is no longer confined to a one-way trip: it can now choose where to go and when to stop.</p>
        <p><b>Components you need:</b> same as lesson 29: RAM16, RING3, DEC3, 5× REG4, ALU4, ADD4, 2× SEL4, DFF H, control gates, RESET, CLK, and 4 Outputs.</p>
        <p><b>Place them in this order (left to right, top to bottom):</b></p><table style="border-collapse:collapse;margin:6px 0;font-size:12px;"><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(1)} RESET / CLK</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(2)} RAM16</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(3)} RING3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(4)} DEC3</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(5)} 5× REG4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(6)} ADD4</td></tr><tr><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(7)} ALU4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(8)} 2× SEL4</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(9)} DFF H</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(10)} control gates</td><td style="border:1px solid var(--border);padding:4px 5px;line-height:1.3;">${nb(11)} 4× Output</td><td style="border:1px dashed #262b38;padding:4px 5px;"></td></tr></table>
        <p><b>Wiring:</b> identical to lesson 29. Verify especially that PC_LOAD activates in T2 when OP=JMP (jump) and that HALT_SET activates when OP=HALT.</p>
        <p><b>The experiment:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Load the Counter program <code>1 0 2 1 3 0 5 0 6 4</code>. With RESET=1, pulse once; then RESET=0. Turn on the clock: OUT ${nb(11)} counts 1, 2, 3... cyclically thanks to JMP.</li>
          <li>Load the Sum program <code>1 5 2 3 3 0 5 0 7 0</code>. After showing 8, HALT freezes the clock. RESET=1 restarts execution from address 0.</li>
        </ol>`,
    },
    check() {
      const ramComp = state.components.find(c => c.type === "ram");
      const outs = state.components.filter(c => c.type === "out");
      const ring = state.components.find(c => c.type === "RING3");
      const sws = state.components.filter(c => c.type === "switch");
      const clocks = state.components.filter(c => c.type === "clock");

      const nameComps = TXT(LL(
        "Circuito: CPU completa con control de salto (JMP) y parada (HALT)",
        "Circuit: complete CPU with jump control (JMP) and halt (HALT)"
      ));
      const nameContador = TXT(LL(
        "Programa Contador: cuenta 1, 2, 3 en OUT mediante saltos (JMP)",
        "Counter program: counts 1, 2, 3 on OUT via jumps (JMP)"
      ));
      const nameHalt = TXT(LL(
        "HALT: la señal H detiene el reloj y congela el procesador",
        "HALT: signal H stops the clock and freezes the processor"
      ));
      const nameReset = TXT(LL(
        "RESET: reinicia el contador de programa y la ejecución",
        "RESET: resets the program counter and execution"
      ));

      if (!ramComp || outs.length < 4 || sws.length < 2) {
        return [
          { name: nameComps, ok: false },
          { name: nameContador, ok: false },
          { name: nameHalt, ok: false },
          { name: nameReset, ok: false },
        ];
      }

      const getPerms = arr => {
        if (arr.length <= 1) return [arr];
        const res = [];
        for (let i = 0; i < arr.length; i++) {
          const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
          for (const p of getPerms(rest)) res.push([arr[i], ...p]);
        }
        return res;
      };
      const getCombos = (arr, k, start = 0, cur = [], res = []) => {
        if (cur.length === k) { res.push([...cur]); return res; }
        for (let i = start; i < arr.length; i++) {
          cur.push(arr[i]);
          getCombos(arr, k, i + 1, cur, res);
          cur.pop();
        }
        return res;
      };
      const candidatePerms = [];
      for (const set of getCombos(outs, 4)) {
        for (const p of getPerms(set)) candidatePerms.push(p);
      }

      const readNibble = (r, p) => {
        let v = 0;
        for (let i = 0; i < 4; i++) {
          const net = r.netOf.get(p[i].id + ":0");
          const b = net !== undefined ? r.values[net] : -1;
          if (b === 1) v |= (1 << i);
          else if (b !== 0) return -1;
        }
        return v;
      };

      const savedSw = sws.map(s => ({ s, on: s.on }));
      const savedClocks = clocks.map(ck => ({ ck, v: globalClockState.get(ck.id) ?? false }));
      const savedGateOuts = new Map(gateOuts);
      const origRam = new Uint8Array(ramData.get(ramComp.id) ?? 16);

      const clkCandidates = [...clocks, ...sws];
      const rstCandidates = sws;

      let okContador = false;
      let okHalt = false;
      let okReset = false;

      try {
        const countProg = new Uint8Array(16);
        [1, 0, 2, 1, 3, 0, 5, 0, 6, 4].forEach((b, i) => countProg[i] = b);
        ramData.set(ramComp.id, countProg);

        candidateLoop:
        for (const clkCand of clkCandidates) {
          for (const rstCand of rstCandidates) {
            if (clkCand === rstCand) continue;

            savedSw.forEach(({ s, on }) => s.on = on);
            savedClocks.forEach(({ ck, v }) => globalClockState.set(ck.id, v));
            gateOuts.clear();

            const setClk = v => {
              if (clkCand.type === "clock") globalClockState.set(clkCand.id, v);
              else clkCand.on = v;
            };
            const setRst = v => {
              rstCand.on = v;
            };
            const doPulse = () => {
              setClk(true); simulate();
              setClk(false); return simulate();
            };
            const doReset = () => {
              setRst(true); simulate();
              doPulse();
              setRst(false); return simulate();
            };

            const rReset = doReset();
            if (ring) {
              const t0Val = rReset.values[rReset.netOf.get(ring.id + ":2")];
              if (t0Val !== 1) continue;
              const rStep = doPulse();
              const t1Val = rStep.values[rStep.netOf.get(ring.id + ":3")];
              if (t1Val !== 1) continue;
              doReset();
            }

            let r12 = null, r21 = null, r30 = null;
            for (let p = 1; p <= 30; p++) {
              const r = doPulse();
              if (p === 12) r12 = r;
              else if (p === 21) r21 = r;
              else if (p === 30) r30 = r;
            }

            let bestPerm = null;
            for (const p of candidatePerms) {
              if (readNibble(r12, p) === 1 && readNibble(r21, p) === 2 && readNibble(r30, p) === 3) {
                bestPerm = p;
                break;
              }
            }
            if (!bestPerm) continue;

            okContador = true;

            // 2. HALT test with Suma program
            const sumaProg = new Uint8Array(16);
            [1, 5, 2, 3, 3, 0, 5, 0, 7, 0].forEach((b, i) => sumaProg[i] = b);
            ramData.set(ramComp.id, sumaProg);
            gateOuts.clear();
            doReset();

            let r15 = null;
            for (let k = 0; k < 15; k++) {
              r15 = doPulse();
            }
            const out15 = readNibble(r15, bestPerm);

            let ringFrozen = true;
            if (ring) {
              const tBefore = [2, 3, 4].map(pin => r15.values[r15.netOf.get(ring.id + ":" + pin)]);
              for (let k = 0; k < 5; k++) {
                const rPulse = doPulse();
                const tCur = [2, 3, 4].map(pin => rPulse.values[rPulse.netOf.get(ring.id + ":" + pin)]);
                if (tCur.some((v, i) => v !== tBefore[i])) {
                  ringFrozen = false;
                  break;
                }
              }
            } else {
              for (let k = 0; k < 5; k++) {
                const rPulse = doPulse();
                if (readNibble(rPulse, bestPerm) !== out15) {
                  ringFrozen = false;
                  break;
                }
              }
            }

            if (out15 === 8 && ringFrozen) {
              okHalt = true;
            }

            // 3. RESET test
            doReset();
            let rRst12 = null;
            for (let k = 0; k < 12; k++) {
              rRst12 = doPulse();
            }
            if (readNibble(rRst12, bestPerm) === 8) {
              okReset = true;
            }

            break candidateLoop;
          }
        }
      } catch (e) {
        okContador = false;
        okHalt = false;
        okReset = false;
      } finally {
        ramData.set(ramComp.id, origRam);
        savedSw.forEach(({ s, on }) => s.on = on);
        savedClocks.forEach(({ ck, v }) => globalClockState.set(ck.id, v));
        gateOuts.clear();
        for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
        simulate();
      }

      return [
        { name: nameComps, ok: true },
        { name: nameContador, ok: okContador },
        { name: nameHalt, ok: okHalt },
        { name: nameReset, ok: okReset },
      ];
    },
  },
];

// Check for lesson 6 (SR): defined separately because it verifies a SEQUENCE
// (set → hold → reset → hold) that doesn't fit the table pattern.
LESSONS[5].check = function() {
  const nor = state.components.filter(c => c.type === "nor");
  const sws = state.components.filter(c => c.type === "switch");
  const nameNeeds = TXT(LL("Hay 2 NOR (tecla 9), 2 Entradas y todo cableado en cruz", "There are 2 NORs (key 9), 2 Inputs, all cross-wired"));
  if (nor.length < 2 || sws.length < 2)
    return [{ name: nameNeeds, ok: false }];
  sws.forEach(s => s.on = false);
  // Q can be on either of the 2 NORs: test both outputs.
  // And Set/Reset can be in either switch order: test both
  // roles for each switch.
  const results = [{ name: nameNeeds, ok: true }];
  let canSet = false, canHold = false, canReset = false;
  for (const qn of nor) {
    const qv = () => { const r = simulate(); return r.values[r.netOf.get(qn.id + ":2")]; };
    // role A: sw0=Set, sw1=Reset
    sws.forEach(s => s.on = false);
    sws[0].on = true; const a1 = qv();       // Set → Q must go to 1
    sws[0].on = false; const a2 = qv();      // hold → Q stays 1
    sws[1].on = true; const a3 = qv();       // Reset → Q must go to 0
    sws[1].on = false; const a4 = qv();      // hold → Q stays 0
    if (a1 === 1 && a2 === 1) canSet = true;
    if (a1 === 1 && a2 === 1 && a3 === 0) canReset = true;
    if (a2 === 1 && a4 === 0) canHold = true;
    // role B: sw1=Set, sw0=Reset (the circuit may be wired the other way around)
    sws.forEach(s => s.on = false);
    sws[1].on = true; const b1 = qv();
    sws[1].on = false; const b2 = qv();
    sws[0].on = true; const b3 = qv();
    sws[0].on = false; const b4 = qv();
    if (b1 === 1 && b2 === 1) canSet = true;
    if (b1 === 1 && b2 === 1 && b3 === 0) canReset = true;
    if (b2 === 1 && b4 === 0) canHold = true;
  }
  sws.forEach(s => s.on = false);
  results.push({ name: TXT(LL("Se puede setear (alguna entrada en 1 → Q=1)", "Can be set (some input to 1 → Q=1)")), ok: canSet });
  results.push({ name: TXT(LL("Recuerda al soltar (todo en 0 mantiene el valor)", "Holds after releasing (all 0 keeps the value)")), ok: canHold });
  results.push({ name: TXT(LL("Se puede resetear (la otra entrada → Q=0)", "Can be reset (the other input → Q=0)")), ok: canReset });
  return results;
};

// ============================================================
// LESSON PANEL UI
// (navigation, verification, toggle button)
// ============================================================
// Restore the last opened lesson (persisted in localStorage)
let lessonViewing = 0;
try {
  const saved = localStorage.getItem("lessonCurrent");
  if (saved !== null) {
    const v = parseInt(saved, 10);
    if (!isNaN(v) && v >= 0 && v < LESSONS.length) lessonViewing = v;
  }
} catch {}
function saveLessonCurrent() {
  try { localStorage.setItem("lessonCurrent", String(lessonViewing)); } catch {}
}

function lessonCurrentIdx() {
  return Math.min(lessonViewing, LESSONS.length - 1);
}

function renderLesson() {
  const panel = document.getElementById("lessonPanel");
  const i = lessonCurrentIdx();
  const L = LESSONS[i];
  if (!L) return;

  const nav = document.getElementById("lessonNav");
  nav.innerHTML = "";
  if (i > 0) {
    const prev = document.createElement("button");
    prev.textContent = "←";
    prev.style.flex = "none";
    prev.title = TXT(LL("Lección anterior", "Previous lesson"));
    prev.addEventListener("click", () => { lessonViewing--; saveLessonCurrent(); renderLesson(); });
    nav.appendChild(prev);
  }
  const sel = document.createElement("select");
  for (let k = 0; k < LESSONS.length; k++) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = TXT(LESSONS[k].title);
    if (k === i) opt.selected = true;
    sel.appendChild(opt);
  }
  // fill the space between ← and → only; long titles end in "…" (the open list shows them whole)
  Object.assign(sel.style, { flex: "1", minWidth: "0", width: "0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
  sel.addEventListener("change", () => {
    lessonViewing = +sel.value;
    saveLessonCurrent();
    renderLesson();
  });
  nav.appendChild(sel);
  if (lessonViewing < LESSONS.length - 1) {
    const next = document.createElement("button");
    next.textContent = "→";
    next.style.flex = "none";
    next.title = TXT(LL("Lección siguiente", "Next lesson"));
    next.addEventListener("click", () => { lessonViewing++; saveLessonCurrent(); renderLesson(); });
    nav.appendChild(next);
  }

  document.getElementById("lessonTitle").textContent = TXT(L.title);
  document.getElementById("lessonProgress").textContent =
    TXT(LL("Lección", "Lesson")) + " " + (i + 1) + " / " + LESSONS.length;
  document.getElementById("lessonBody").innerHTML = TXT(L.theory);
  document.getElementById("lessonChecks").innerHTML =
    '<div style="font-size:12px; color:var(--dim)">' +
    TXT(LL('Apretá "Verificar" cuando creas que lo tenés.', 'Press "Verify" when you think you have it.')) +
    '</div>';
  document.getElementById("lessonVerify").textContent = t("lessonVerifyLabel");
  panel.style.display = "flex";
  document.getElementById("lessonBtn").style.display = "none";  // the ✕ in the panel closes it
}

function lessonVerify() {
  const i = lessonCurrentIdx();
  const L = LESSONS[i];
  const results = L.check();
  const box = document.getElementById("lessonChecks");
  let html = "";
  let allOk = true;
  for (const r of results) {
    if (!r.ok) allOk = false;
    html += '<div class="checkItem ' + (r.ok ? "ok" : "bad") + '">' + (r.ok ? "✓" : "✗") + " " + r.name + "</div>";
  }
  if (allOk && i < LESSONS.length - 1) {
    html += '<div style="margin-top:10px; font-weight:700; color:#9ade3f">🎉 ' +
      TXT(LL("¡Lección superada!", "Lesson passed!")) + "</div>" +
      '<button id="lessonNext" style="margin-top:8px; width:100%; border-color:var(--accent); color:var(--accent);">' +
      TXT(LL("Siguiente lección →", "Next lesson →")) + "</button>";
  } else if (allOk) {
    html += '<div style="margin-top:10px; font-weight:700; color:#9ade3f">🎉 ' +
      TXT(LL("¡Curso completado!", "Course completed!")) + "</div>";
  }
  box.innerHTML = html;
  const b = document.getElementById("lessonNext");
  if (b) b.addEventListener("click", () => {
    lessonViewing = Math.min(lessonViewing + 1, LESSONS.length - 1);
    saveLessonCurrent();
    renderLesson();
  });
}

document.getElementById("lessonBtn").addEventListener("click", renderLesson);
document.getElementById("lessonClose").addEventListener("click", () => {
  document.getElementById("lessonPanel").style.display = "none";
  document.getElementById("lessonBtn").style.display = "flex";
});
document.getElementById("lessonVerify").addEventListener("click", lessonVerify);
