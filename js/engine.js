/* ============================================================
   SIMULATION ENGINE — independent from rendering.
   Abstraction level: primitive LOGIC GATES
   (NOT, AND, OR, NAND, NOR, XOR). Each one is a boolean
   function of its inputs; the Inputs (switches) impose
   values on their nodes.

   Iterative evaluation in discrete steps: on each pass, each
   gate computes its output from the values of the previous
   pass. This resolves feedback (latches) and allows detecting
   oscillation (inverter rings) and short circuits (two
   outputs driving the same node).

   This level replaces the transistor one: those remain as an
   optional internal view for the future. The spec's recursive
   composition architecture does not change: in the next
   phase, a group of gates gets packed as a Component.
   ============================================================ */

const TYPE_DEFS = {
  not:    { label: "NOT",        terms: [[-30, 0], [30, 0]],           termNames: ["A", "Y"] },
  and:    { label: "AND",        terms: [[-30, -16], [-30, 16], [30, 0]], termNames: ["A", "B", "Y"] },
  or:     { label: "OR",         terms: [[-30, -16], [-30, 16], [30, 0]], termNames: ["A", "B", "Y"] },
  nand:   { label: "NAND",       terms: [[-30, -16], [-30, 16], [30, 0]], termNames: ["A", "B", "Y"] },
  nor:    { label: "NOR",        terms: [[-30, -16], [-30, 16], [30, 0]], termNames: ["A", "B", "Y"] },
  xor:    { label: "XOR",        terms: [[-30, -16], [-30, 16], [30, 0]], termNames: ["A", "B", "Y"] },
  switch: { label: "Entrada",    terms: [[24, 0]],                     termNames: ["OUT"] },
  out:    { label: "Salida",     terms: [[-24, 0]],                    termNames: ["IN"] },
  clock:  { label: "RELOJ",      terms: [[26, 0]],                     termNames: ["CLK"] },
  // RAM16: 16 cells × 4 bits. Input pins (left): A0-A3, D0-D3, WE, CS
  // Outputs (right): Q0-Q3 (the data of the addressed cell)
  ram:    { label: "RAM16",
    terms: [[-34, -70], [-34, -50], [-34, -30], [-34, -10], [-34, 10], [-34, 30], [-34, 50], [-34, 70], [-26, 88], [10, 88], [34, -24], [34, -8], [34, 8], [34, 24]],
    termNames: ["A0","A1","A2","A3","D0","D1","D2","D3","WE","CS","Q0","Q1","Q2","Q3"] },
};

/* Global state of RAM16 instances: contents and view */
const ramData = new Map();    // compId -> Uint8Array(16)
const ramPrevWE = new Map();  // compId -> bool (WE edge)
const ramAddrView = new Map(); // compId -> shown addr
let ramDirty = false;
let addrvr = 0;

const GATE_FN = {
  not:  a => a ? 0 : 1,
  and:  (a, b) => (a && b) ? 1 : 0,
  or:   (a, b) => (a || b) ? 1 : 0,
  nand: (a, b) => (a && b) ? 0 : 1,
  nor:  (a, b) => (a || b) ? 0 : 1,
  xor:  (a, b) => (a !== b) ? 1 : 0,
};
const isGate = type => type in GATE_FN;
// index of the output terminal inside TYPE_DEFS.terms
const OUT_IDX = { not: 1, and: 2, or: 2, nand: 2, nor: 2, xor: 2 };
// number of inputs of the gate
const IN_COUNT = { not: 1, and: 2, or: 2, nand: 2, nor: 2, xor: 2 };

const state = {
  components: [],   // { id, type, x, y, rot, on (input), sel (selection) }
  wires: [],        // { id, a: {c, t}, b: {c, t} }
  powerOn: false,
  tool: "select",
  nextId: 1,
};

/* Clocks: current value of each clock (compId -> bool) and speed
   (compId -> Hz). The global tick advances with a 100ms setInterval
   that evaluates how many edges correspond according to the frequency. */
const globalClockState = new Map();  // compId -> bool
const globalClockFreq = new Map();   // compId -> Hz
const clockAcc = new Map();          // compId -> fractional time accumulator
let clockTimer = null;
const CLOCK_TICK_MS = 40;
const CLOCK_TIMER_DT = 40; // ms per tick (for phase calculation)

function clockTick() {
  const dt = CLOCK_TIMER_DT / 1000;
  for (const comp of state.components) {
    if (comp.type !== "clock") continue;
    const freq = globalClockFreq.get(comp.id) ?? 2;
    // freq = cycles per second (2 toggles per cycle). One toggle per
    // tick max: the 12 Hz panel cap keeps the phase under 1 toggle per
    // 40 ms tick (0.96), the remainder stays in acc.
    let acc = (clockAcc.get(comp.id) ?? 0) + dt * freq * 2;
    if (acc >= 1) {
      globalClockState.set(comp.id, !globalClockState.get(comp.id));
      acc -= 1;
    }
    clockAcc.set(comp.id, acc);
  }
}

function ensureClockTimer() {
  const needs = state.components.some(c => c.type === "clock");
  if (needs && !clockTimer) {
    clockTimer = setInterval(clockTick, CLOCK_TICK_MS);
  } else if (!needs && clockTimer) {
    clearInterval(clockTimer);
    clockTimer = null;
  }
}

/* Library of packed components.
   defs[name] = {
     name, inputs: [name...], outputs: [name...],
     components: [...], wires: [...]   (internal circuit, own ids)
   }
   Packed types get registered in TYPE_DEFS and GATE_FN
   dynamically (evaluated as sub-circuits by the engine). */
const lib = {};

// State memory of the gates (for latches across simulations)
const gateOuts = new Map(); // cid -> last output value

/* ------------------------------------------------------------
   RECURSIVE FLATTENING (the heart of packing):
   an instance of a packed component expands into its
   internal circuit, with unique ids per instance
   ("instId:innerComp"). The external pins are joined with the
   internal terminals through pseudo-wires. No depth limit
   (except an anti-cycle guard).
   ------------------------------------------------------------ */
const MAX_DEPTH = 32;

function flattenCircuit() {
  const comps = [];  // { id: string, type }  (only primitive gates)
  const consts = []; // { id: string, value }  internal constants (unexposed inputs)
  const wires = state.wires.map(w => ({
    a: { c: String(w.a.c), t: w.a.t },
    b: { c: String(w.b.c), t: w.b.t },
  }));

  const walk = (compsIn, prefix, depth) => {
    for (const c of compsIn) {
      const cid = prefix === null ? String(c.id) : prefix + ":" + c.id;
      if (depth < MAX_DEPTH && lib[c.type]) {
        const def = lib[c.type];
        walk(def.components, cid, depth + 1);
        for (const w of def.wires)
          wires.push({
            a: { c: cid + ":" + w.a.c, t: w.a.t },
            b: { c: cid + ":" + w.b.c, t: w.b.t },
          });
        // join the i-th external pin with its corresponding internal stub
        def.inStubs.forEach((sid, i) =>
          wires.push({ a: { c: cid, t: i }, b: { c: cid + ":" + sid, t: 0 } }));
        def.outStubs.forEach((oid, j) =>
          wires.push({ a: { c: cid, t: def.inputs.length + j }, b: { c: cid + ":" + oid, t: 0 } }));
      } else if (c.type === "switch" && prefix !== null) {
        // Internal Input NOT exposed as a pin → constant with the frozen
        // value it had at packing time (e.g.: fixed Cin=0)
        consts.push({ id: cid, value: !!c.on });
      } else if (isGate(c.type)) {
        comps.push({ id: cid, type: c.type });
      }
    }
  };
  walk(state.components, null, 0);
  return { comps, consts, wires };
}

/* Flattened ids are strings ("3", "5:12", "5:2:7"...).
   This function returns the complete list of logic components. */
function flattenedGates() {
  return flattenCircuit().comps;
}

// --- Union-find to build nets from wires ---
function buildNets() {
  const parent = new Map();
  const find = k => {
    let root = k;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(k) !== root) { const next = parent.get(k); parent.set(k, root); k = next; }
    return root;
  };
  const union = (a, b) => parent.set(find(a), find(b));
  const touch = k => { if (!parent.has(k)) parent.set(k, k); };

  const { comps, consts, wires } = flattenCircuit();

  // terminals of flattened gates, and of instance pins
  for (const c of comps) {
    const n = TYPE_DEFS[c.type].terms.length;
    for (let t = 0; t < n; t++) touch(c.id + ":" + t);
  }
  // terminals of the internal constants
  for (const c of consts) touch(c.id + ":0");
  for (const c of state.components) {
    const td = TYPE_DEFS[c.type];
    if (!td) continue;
    for (let t = 0; t < (td.terms?.length ?? 0); t++) touch(c.id + ":" + t);
  }
  // touch also the ends of ALL wires (the internal stubs of packed
  // components don't correspond to any visible component)
  for (const w of wires) {
    touch(w.a.c + ":" + w.a.t);
    touch(w.b.c + ":" + w.b.t);
    union(w.a.c + ":" + w.a.t, w.b.c + ":" + w.b.t);
  }

  const netOf = new Map();    // terminal -> numeric net index
  const nets = [];            // net index -> [terminals]
  const netIndex = new Map();
  for (const k of parent.keys()) {
    const r = find(k);
    if (!netIndex.has(r)) {
      netIndex.set(r, nets.length);
      nets.push([]);
    }
    const idx = netIndex.get(r);
    nets[idx].push(k);
    netOf.set(k, idx);
  }
  return { nets, netOf, comps, consts };
}

/* values[node] = -1 unknown | 0 | 1 | 2 short circuit */
function simulate() {
  const { nets, netOf, comps, consts } = buildNets();
  const N = nets.length;
  const values = new Int8Array(N).fill(-1);
  const driver = new Array(N).fill(null);

  const gates = comps.filter(c => isGate(c.type));

  if (state.powerOn) {
    // Seed internal constants (unexposed inputs of packed components)
    for (const c of consts) {
      const net = netOf.get(c.id + ":0");
      if (net === undefined) continue;
      const id = "const" + c.id;
      if (!driver[net]) { driver[net] = id; values[net] = c.value ? 1 : 0; }
      else if (driver[net] !== id) values[net] = 2;
    }
    // Seed switches (the switch is a driver on its external pin)
    for (const comp of state.components) {
      if (comp.type !== "switch") continue;
      const net = netOf.get(comp.id + ":0");
      if (net === undefined) continue;
      const id = "sw" + comp.id;
      if (!driver[net]) { driver[net] = id; values[net] = comp.on ? 1 : 0; }
      else if (driver[net] !== id) values[net] = 2;
    }
    // Seed clocks (driver whose value toggles according to globalClockState)
    for (const comp of state.components) {
      if (comp.type !== "clock") continue;
      const net = netOf.get(comp.id + ":0");
      if (net === undefined) continue;
      const id = "clk" + comp.id;
      const v = globalClockState.get(comp.id) ? 1 : 0;
      if (!driver[net]) { driver[net] = id; values[net] = v; }
      else if (driver[net] !== id) values[net] = 2;
    }
    // Seed remembered gate outputs (sequential state)
    for (const g of gates) {
      const prev = gateOuts.get(g.id);
      if (prev === undefined) continue;
      const net = netOf.get(g.id + ":" + OUT_IDX[g.type]);
      if (net === undefined) continue;
      if (!driver[net]) { driver[net] = g.id; values[net] = prev; }
      else if (driver[net] !== g.id) values[net] = 2;
    }
  }

  // RAM16: with the nets already seeded, process writing (WE edge)
  // and prepare the view address.
  function ramReadTerm(c, t) {
    const net = netOf.get(c.id + ":" + t);
    return net === undefined ? -1 : values[net];
  }
  for (const comp of state.components) {
    if (comp.type !== "ram") continue;
    let data = ramData.get(comp.id);
    if (!data) { data = new Uint8Array(16); ramData.set(comp.id, data); }

    let addr = 0;
    for (let b = 0; b < 4; b++)
      addr |= (ramReadTerm(comp, b) === 1 ? 1 : 0) << b;

    const cs = ramReadTerm(comp, 9) === 1;
    const we = ramReadTerm(comp, 8) === 1;
    const prevWE = ramPrevWE.get(comp.id);
    if (cs && we && !prevWE) {
      let val = 0;
      for (let b = 0; b < 4; b++)
        val |= (ramReadTerm(comp, 4 + b) === 1 ? 1 : 0) << b;
      data[addr] = val & 0xF;
      ramDirty = true;
    }
    ramPrevWE.set(comp.id, we);
    ramAddrView.set(comp.id, addr);

    // Q0-3 (terminals 10-13) expose the addressed cell
    const cell = data[addr] ?? 0;
    for (let b = 0; b < 4; b++) {
      const net = netOf.get(comp.id + ":" + (10 + b));
      if (net === undefined) continue;
      if (!driver[net] || driver[net] === "ram" + comp.id) {
        values[net] = (cell >> b) & 1 ? 1 : 0;
        driver[net] = "ram" + comp.id;
      } else if (values[net] === -1) {
        values[net] = (cell >> b) & 1 ? 1 : 0;
      }
    }
  }

  const seen = new Set();
  let oscillating = false;
  let prevSnap = null;

  const MAX_ITER = 50;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    const old = Int8Array.from(values);
    let changed = false;

    // Each gate computes its output reading the previous pass's state
    // Ternary logic: if an input is unknown (-1) but the result can already
    // be determined (e.g. AND with a 0 → 0), it is computed anyway.
    for (const g of gates) {
      const nIn = IN_COUNT[g.type];
      const ins = [];
      for (let i = 0; i < nIn; i++) ins.push(old[netOf.get(g.id + ":" + i)]);
      let v;
      if (ins.includes(2)) v = 2;
      else if (!ins.includes(-1)) v = GATE_FN[g.type](...ins);
      else {
        // ternary: partial result when there are unknown inputs
        const t = g.type;
        if (t === "and" && ins.includes(0)) v = 0;
        else if (t === "or" && ins.includes(1)) v = 1;
        else if (t === "nand" && ins.includes(0)) v = 1;
        else if (t === "nor" && ins.includes(1)) v = 0;
        else continue; // truly indeterminate
      }
      const net = netOf.get(g.id + ":" + OUT_IDX[g.type]);
      if (!driver[net] || driver[net] === g.id) {
        // it's its own node (or it was free): update without conflict
        if (values[net] !== v) changed = true;
        values[net] = v;
        driver[net] = g.id;
      } else {
        // another driver handles the same node with a different value
        if (values[net] !== v) { values[net] = 2; changed = true; }
        else if (values[net] === -1) { values[net] = v; changed = true; }
      }
    }

    // Stable (pass without changes) or oscillating (non-consecutive repeated state)?
    const snap = String.fromCharCode(...values);
    if (!changed && prevSnap === null) break;            // estable desde el inicio
    if (!changed) break;                                  // estable
    if (snap === prevSnap) break;                         // estable
    if (seen.has(snap)) { oscillating = true; break; }    // oscillation
    seen.add(snap);
    prevSnap = snap;
  }

  // Remember gate outputs for the next cycle (sequential memory)
  for (const g of gates) {
    const net = netOf.get(g.id + ":" + OUT_IDX[g.type]);
    if (net === undefined) continue;
    const v = values[net];
    if (v === 0 || v === 1) gateOuts.set(g.id, v);
  }

  return { values, netOf, nets, oscillating };
}
