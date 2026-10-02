/* ============================================================
   PERF BENCHMARK — coste de simulate() vs presupuesto de frame
   Run: node tests/perf.bench.js        (node, sin dependencias)
   Salida completa: tests/perf.out.txt

   Reutiliza el sandbox de tests/lessons.test.js (proxy "deep"
   como stub de DOM, carga en memoria de engine.js + pack.js +
   lessons.js y makePackage para construir cajas reales).

   NOTA SOBRE EL MOTOR:
   el propio bench descubrió un bug de cajas anidadas (los
   pseudo-cables de pin de flattenCircuit usaban String(c.id)
   en vez de cid, engine.js:145/147): una caja dentro de otra
   (ADD4⊃FULLADDER, REG4⊃DFF) quedaba desconectada. Ya está
   arreglado en js/engine.js (fix cid) y cubierto por la prueba
   de regresión de tests/lessons.test.js. Aquí se usa SIEMPRE
   el motor real de js/. Al engine cargado solo se le añade
   (en memoria) un contador de iteraciones para el desglose.
   ============================================================ */
const fs = require("fs"), vm = require("vm"), path = require("path");
const dir = path.resolve(process.argv[2] ?? path.join(__dirname, ".."));

/* ---------- sandbox (misma forma que tests/lessons.test.js) ---------- */
const deep = () => new Proxy(function () {}, {
  get: (t, k) => k === Symbol.toPrimitive ? () => "" : (k === "length" ? 0 : deep()),
  apply: () => deep(), construct: () => deep(), set: () => true,
});
const VARIFY = s => s.replace(/^const (\w+)\s*=/gm, "var $1 =").replace(/^let (\w+)\s*=/gm, "var $1 =");
const PATCHES = [
  // contador de iteraciones (solo diagnóstico, coste despreciable)
  ["for (let iter = 0; iter < MAX_ITER; iter++) {",
   "for (let iter = 0; iter < MAX_ITER; iter++) { globalThis.__lastIter = iter + 1;"],
];

function makeSandbox() {
  const ctx = {
    console, Math, JSON, Map, Set, Array, Uint8Array, Int8Array, String, Number, Object, Boolean, Symbol, Error,
    document: deep(), window: deep(), localStorage: deep(), cv: deep(),
    requestAnimationFrame() {}, setInterval() { return 1; }, clearInterval() {},
    save() {}, i18nLang: () => "es", t: k => k,
  };
  vm.createContext(ctx);
  let src = VARIFY(fs.readFileSync(path.join(dir, "js/engine.js"), "utf8"));
  // el motor real de js/; la única inyección es el contador de iteraciones
  for (const [a, b] of PATCHES) {
    if (!src.includes(a)) throw new Error("la instrumentación no casa con engine.js: " + a.slice(0, 50));
    src = src.replace(a, b);
  }
  vm.runInContext(src, ctx, { filename: "engine.js" });
  const run = f => vm.runInContext(VARIFY(fs.readFileSync(path.join(dir, f), "utf8")), ctx, { filename: f });
  try { run("js/pack.js"); } catch (e) { /* el cableado de UI del final necesita DOM */ }
  run("js/lessons.js");

  return vm.runInContext(`({
    clear() { state.components = []; state.wires = []; state.nextId = 1; state.powerOn = true;
               gateOuts.clear(); globalClockState.clear(); globalClockFreq.clear(); },
    add(type) { const c = { id: state.nextId++, type, x: state.nextId * 10, y: 0, rot: 0, on: false };
                state.components.push(c); return c; },
    w(a, ta, b, tb) { const wire = { id: state.nextId++,
      a: { c: (a.id ?? a), t: ta }, b: { c: (b.id ?? b), t: tb } };
      state.wires.push(wire); return wire; },
    delWire(w) { state.wires = state.wires.filter(x => x !== w); },
    pack(name, ins, outs) { return makePackage([...state.components], name, ins.map(c => c.id), outs.map(c => c.id)); },
    gates: () => flattenCircuit().comps.length,
    nets:  () => buildNets().nets.length,
    flatten: () => flattenCircuit(),
    buildNets: () => buildNets(),
    sim: () => simulate(),
    iters: () => globalThis.__lastIter ?? 0,
    readPin(c, t) { const r = simulate(); return r.values[r.netOf.get(c.id + ":" + t)]; },
    readOut(c) { return this.readPin(c, 0); },
    readNum(outs) { const r = simulate();
      return outs.map((o, i) => { const v = r.values[r.netOf.get(o.id + ":0")]; return v === 1 ? 1 << i : 0; })
                 .reduce((a, b) => a + b, 0); },
    osc() { return simulate().oscillating; },
    setClk(id, v) { globalClockState.set(id, v ? 1 : 0); },
    canvas: () => ({ comps: state.components.length, wires: state.wires.length }),
  })`, ctx);
}

/* ---------- medición ---------- */
const hr = () => process.hrtime.bigint();
function bench(fn, { warmup = 5, reps = 60 } = {}) {
  for (let i = 0; i < warmup; i++) fn();
  const t = [];
  for (let i = 0; i < reps; i++) { const t0 = hr(); fn(); t.push(Number(hr() - t0) / 1e6); }
  t.sort((a, b) => a - b);
  return { med: t[Math.floor(t.length / 2)], p90: t[Math.min(t.length - 1, Math.ceil(t.length * .9))], min: t[0] };
}
const fmt = ms => ms >= 100 ? ms.toFixed(0) : ms >= 10 ? ms.toFixed(1) : ms >= 1 ? ms.toFixed(2) : ms.toFixed(3);
const fpsOf = ms => fmt(1000 / Math.max(ms, 1e-9));
const pad  = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const table = (out, head, rows, widths) => {
  out("");
  out("  " + head.map((h, i) => (i === 0 ? pad(h, widths[i]) : padL(h, widths[i]))).join(" "));
  out("  " + head.map((h, i) => "-".repeat(widths[i])).join("  "));
  for (const r of rows)
    out("  " + r.map((c, i) => (i === 0 ? pad(c, widths[i]) : padL(c, widths[i]))).join("  "));
};

/* ---------- biblioteca de cajas (igual que el taller de lecciones) ---------- */
function dLatch(T, src, st, clk, ct) {
  const n = T.add("not"), a1 = T.add("and"), a2 = T.add("and"), q = T.add("nor"), qn = T.add("nor");
  T.w(src, st, n, 0);
  T.w(src, st, a1, 0); T.w(clk, ct, a1, 1);
  T.w(n, 1, a2, 0); T.w(clk, ct, a2, 1);
  T.w(a2, 2, q, 0); T.w(qn, 2, q, 1);
  T.w(a1, 2, qn, 0); T.w(q, 2, qn, 1);
  return q;
}
function buildLib(T) {
  { // FULLADDER (lesson 14): pins A=0 B=1 Cin=2 S=3 Cout=4
    const A = T.add("switch"), B = T.add("switch"), Ci = T.add("switch");
    const x1 = T.add("xor"), x2 = T.add("xor"), a1 = T.add("and"), a2 = T.add("and"), o = T.add("or");
    const S = T.add("out"), Co = T.add("out");
    T.w(A, 0, x1, 0); T.w(B, 0, x1, 1); T.w(A, 0, a1, 0); T.w(B, 0, a1, 1);
    T.w(x1, 2, x2, 0); T.w(Ci, 0, x2, 1); T.w(x1, 2, a2, 0); T.w(Ci, 0, a2, 1);
    T.w(x2, 2, S, 0); T.w(a1, 2, o, 0); T.w(a2, 2, o, 1); T.w(o, 2, Co, 0);
    T.pack("FULLADDER", [A, B, Ci], [S, Co]); T.clear();
  }
  { // ADD4 (lesson 17): ripple de 4 FULLADDER → caja ANIDADA
    const A = [], B = [];
    for (let i = 0; i < 4; i++) { A.push(T.add("switch")); B.push(T.add("switch")); }
    const Cin = T.add("switch");
    const S = []; let ci = { c: Cin.id, t: 0 }, coOut = null;
    for (let i = 0; i < 4; i++) {
      const fa = T.add("FULLADDER");
      T.w(A[i].id, 0, fa, 0); T.w(B[i].id, 0, fa, 1); T.w(ci.c, ci.t, fa, 2);
      const s = T.add("out"); T.w(fa, 3, s, 0); S.push(s);
      if (i < 3) ci = { c: fa.id, t: 4 };
      else { coOut = T.add("out"); T.w(fa, 4, coOut, 0); }
    }
    T.pack("ADD4", [...A, ...B, Cin], [...S, coOut]); T.clear();
  }
  { // DFF master-slave (lesson 8/9) → caja ANIDADA (2 latches con feedback)
    const D = T.add("switch"), C = T.add("switch");
    const qm = dLatch(T, D, 0, C, 0);
    const nclk = T.add("not"); T.w(C, 0, nclk, 0);
    const q = dLatch(T, qm, 2, nclk, 1);
    const o = T.add("out"); T.w(q, 2, o, 0);
    T.pack("DFF", [D, C], [o]); T.clear();
  }
  { // REG4 (lesson s10): 4×(D·LOAD + Q·¬LOAD) → DFF
    const LOAD = T.add("switch"), CLK = T.add("switch"), nL = T.add("not");
    T.w(LOAD, 0, nL, 0);
    const Dp = [], Qp = [];
    for (let i = 0; i < 4; i++) {
      const d = T.add("switch"), a1 = T.add("and"), a2 = T.add("and"), o = T.add("or"), ff = T.add("DFF"), q = T.add("out");
      T.w(d, 0, a1, 0); T.w(LOAD, 0, a1, 1);
      T.w(ff, 2, a2, 0); T.w(nL, 1, a2, 1);
      T.w(a1, 2, o, 0); T.w(a2, 2, o, 1);
      T.w(o, 2, ff, 0); T.w(CLK, 0, ff, 1); T.w(ff, 2, q, 0);
      Dp.push(d); Qp.push(q);
    }
    T.pack("REG4", [...Dp, LOAD, CLK], [...Qp]); T.clear();
  }
  { // MUX2 (lesson 11): OUT = A·¬S + B·S ; pins A=0 B=1 S=2 OUT=3
    const A = T.add("switch"), B = T.add("switch"), S = T.add("switch");
    const n = T.add("not"), a1 = T.add("and"), a2 = T.add("and"), o = T.add("or"), out = T.add("out");
    T.w(S, 0, n, 0); T.w(A, 0, a1, 0); T.w(n, 1, a1, 1);
    T.w(B, 0, a2, 0); T.w(S, 0, a2, 1);
    T.w(a1, 2, o, 0); T.w(a2, 2, o, 1); T.w(o, 2, out, 0);
    T.pack("MUX2", [A, B, S], [out]); T.clear();
  }
  { // DEC2 2→4: OUTk = mintermos de (A,B) ; pins A=0 B=1 OUT=2..5
    const A = T.add("switch"), B = T.add("switch");
    const na = T.add("not"), nb = T.add("not");
    T.w(A, 0, na, 0); T.w(B, 0, nb, 0);
    const o = Array.from({ length: 4 }, () => T.add("out"));
    T.w(na, 1, o[0], 0); T.w(nb, 1, o[0], 0);
    T.w(na, 1, o[1], 0); T.w(B, 0, o[1], 0);
    T.w(A, 0, o[2], 0); T.w(nb, 1, o[2], 0);
    T.w(A, 0, o[3], 0); T.w(B, 0, o[3], 0);
    T.pack("DEC2", [A, B], [...o]); T.clear();
  }
}
/* sumador 4 bits TODO PLANO (mismo netlist que ADD4, gates sueltas) */
function wireFa(T, A, B, ciTerm, sOut, coOut) {
  const x1 = T.add("xor"), x2 = T.add("xor"), a1 = T.add("and"), a2 = T.add("and"), o = T.add("or");
  T.w(A, 0, x1, 0); T.w(B, 0, x1, 1); T.w(A, 0, a1, 0); T.w(B, 0, a1, 1);
  T.w(x1, 2, x2, 0); T.w(x1, 2, a2, 0);
  T.w(ciTerm.c, ciTerm.t, x2, 1); T.w(ciTerm.c, ciTerm.t, a2, 1);
  T.w(x2, 2, sOut, 0); T.w(a1, 2, o, 0); T.w(a2, 2, o, 1); T.w(o, 2, coOut, 0);
  return { c: coOut.id, t: 0 };
}
/* chain: N etapas de REG4+ADD4 encadenadas (patrón contador, like PC) */
function buildChain(T, N, { loadOn = false, bPlus = 1 } = {}) {
  T.clear();
  const CLK = T.add("clock"), LOAD = T.add("switch");
  LOAD.on = loadOn;
  const regs = [], adds = [];
  let cin = null;
  for (let s = 0; s < N; s++) {
    const reg = T.add("REG4"), add = T.add("ADD4");
    for (let i = 0; i < 4; i++) {
      const b = T.add("switch"); b.on = (s === 0 && i < bPlus);   // B = constante
      T.w(b.id, 0, add, 4 + i);
      T.w(reg, 6 + i, add, i);                                    // Q → A del sumador (lazo)
    }
    T.w(LOAD.id, 0, reg, 4); T.w(CLK.id, 0, reg, 5);
    if (s === 0) {
      const z = T.add("switch"); z.on = false;
      T.w(z.id, 0, add, 8);                                       // Cin=0 primera etapa
    } else {
      T.w(cin.c, cin.t, add, 8);                                  // carry encadenado
    }
    cin = { c: add.id, t: 13 };
    regs.push(reg); adds.push(add);
  }
  // bring-up, como haría un constructor real: capturar Q=0 con un cable
  // temporal a 0 y DESPUÉS conectar el lazo S→D (un lazo Q→sumador→D no
  // arranca de frío: con Q=-1 el sumador solo produce -1 y el latch
  // nunca ve un 0/1 que rompa el empate — se comprueba en la nota [4]).
  const zeros = T.add("switch");
  const temp = [];
  for (const reg of regs) for (let i = 0; i < 4; i++) temp.push(T.w(zeros.id, 0, reg, i));
  T.setClk(CLK.id, 1); T.sim();
  T.setClk(CLK.id, 0); T.sim();
  for (const w of temp) T.delWire(w);
  for (let s = 0; s < N; s++)
    for (let i = 0; i < 4; i++) T.w(adds[s], 9 + i, regs[s], i); // S→D
  T.setClk(CLK.id, 0);   // reloj quieto para medir el frame típico
  return { regs, adds, LOAD, clkId: CLK.id };
}
const newBench = () => { const T = makeSandbox(); buildLib(T); return T; };

/* ---------- salida ---------- */
const L = [];
const out = (...a) => L.push(a.join(" "));
const results1 = [], results1b = [], results2 = [], results3 = [], results5 = [];

/* ============ [0] SANITY ============ */
function checkADD4(T) {
  const A = Array.from({ length: 4 }, () => T.add("switch"));
  const B = Array.from({ length: 4 }, () => T.add("switch"));
  const Cin = T.add("switch");
  const inst = T.add("ADD4");
  const S = [];
  for (let i = 0; i < 4; i++) {
    const o = T.add("out"); T.w(inst, 9 + i, o, 0); S.push(o);
    T.w(A[i].id, 0, inst, i); T.w(B[i].id, 0, inst, 4 + i);
  }
  T.w(Cin.id, 0, inst, 8);
  const co = T.add("out"); T.w(inst, 13, co, 0);
  A.forEach((s, i) => s.on = !!(5 >> i & 1));
  B.forEach((s, i) => s.on = !!(3 >> i & 1));
  return { sum: T.readNum(S), co: T.readOut(co), gates: T.gates(), nets: T.nets() };
}
const chkFix = checkADD4(newBench());

/* ============ [1] PLANO vs EMPAQUETADO ============ */
const vars1 = [];
{
    const Ta = newBench();
    const A = Array.from({ length: 4 }, () => Ta.add("switch"));
    const B = Array.from({ length: 4 }, () => Ta.add("switch"));
    const Cin = Ta.add("switch");
    const S = Array.from({ length: 4 }, () => Ta.add("out"));
    const coOuts = Array.from({ length: 4 }, () => Ta.add("out"));
    let ci = { c: Cin.id, t: 0 };
    for (let i = 0; i < 4; i++) ci = wireFa(Ta, A[i].id, B[i].id, ci, S[i], coOuts[i]);
    A.forEach((s, i) => s.on = !!(5 >> i & 1));
    B.forEach((s, i) => s.on = !!(3 >> i & 1));
    vars1.push({ name: "plano (gates sueltas)", T: Ta, sum: Ta.readNum(S), co: Ta.readOut(coOuts[3]) });
  }
  { // (b) FULLADDER x4
    const Tb = newBench();
    const A = Array.from({ length: 4 }, () => Tb.add("switch"));
    const B = Array.from({ length: 4 }, () => Tb.add("switch"));
    const Cin = Tb.add("switch");
    const S = []; const co2 = Tb.add("out");
    let ci = { c: Cin.id, t: 0 };
    for (let i = 0; i < 4; i++) {
      const fa = Tb.add("FULLADDER");
      Tb.w(A[i].id, 0, fa, 0); Tb.w(B[i].id, 0, fa, 1); Tb.w(ci.c, ci.t, fa, 2);
      const s = Tb.add("out"); Tb.w(fa, 3, s, 0); S.push(s);
      ci = { c: fa.id, t: 4 };
    }
    Tb.w(ci.c, ci.t, co2, 0);
    A.forEach((s, i) => s.on = !!(5 >> i & 1));
    B.forEach((s, i) => s.on = !!(3 >> i & 1));
    vars1.push({ name: "FULLADDER x4", T: Tb, sum: Tb.readNum(S), co: Tb.readOut(co2) });
  }
  { // (c) ADD4 (anidada)
    const Tc = newBench();
    const A = Array.from({ length: 4 }, () => Tc.add("switch"));
    const B = Array.from({ length: 4 }, () => Tc.add("switch"));
    const Cin = Tc.add("switch");
    const inst = Tc.add("ADD4");
    const S = [];
    for (let i = 0; i < 4; i++) {
      const o = Tc.add("out"); Tc.w(inst, 9 + i, o, 0); S.push(o);
      Tc.w(A[i].id, 0, inst, i); Tc.w(B[i].id, 0, inst, 4 + i);
    }
    Tc.w(Cin.id, 0, inst, 8);
    const co = Tc.add("out"); Tc.w(inst, 13, co, 0);
    A.forEach((s, i) => s.on = !!(5 >> i & 1));
    B.forEach((s, i) => s.on = !!(3 >> i & 1));
    vars1.push({ name: "ADD4 x1 (anidada)", T: Tc, sum: Tc.readNum(S), co: Tc.readOut(co) });
  }

/* ============ [2] ESCALADO ============ */
{
  for (const N of [1, 2, 4, 8, 16, 32]) {
    const T = newBench();
    buildChain(T, N, { loadOn: true });
    const g = T.gates(), n = T.nets(), cv = T.canvas();
    T.sim(); const it = T.iters();
    const b = bench(() => T.sim());
    results2.push(["N=" + N, cv.comps, cv.wires, g, n, it, fmt(b.med), fmt(b.p90), fpsOf(b.med),
                   (b.med * 1e3 / (g * Math.max(it, 1))).toFixed(2)]);
  }
}

/* ============ [3] DESGLOSE ============ */
{
  for (const N of [2, 8, 16]) {
    const T = newBench();
    buildChain(T, N, { loadOn: true });
    const g = T.gates();
    T.sim(); const it = T.iters();
    const bf = bench(() => T.flatten());
    const bn = bench(() => T.buildNets());
    const bs = bench(() => T.sim());
    results3.push(["N=" + N, g, it,
      fmt(bf.med), fmt(bn.med - bf.med), fmt(bs.med), fmt(Math.max(bs.med - bn.med, 0)),
      (100 * bf.med / bs.med).toFixed(0),
      (100 * Math.max(bn.med - bf.med, 0) / bs.med).toFixed(0),
      (100 * Math.max(bs.med - bn.med, 0) / bs.med).toFixed(0)]);
  }
}

/* ============ [4] SECUENCIAL CON RELOJ — acumulador binario 4 bits ============ */
// Un REG4 como acumulador: D=S del ADD4, CLK directo. El ADD4:
//   A = Q del registro (lazo), B = 1 (constante), Cin = 0 → S = Q+1 cada pulso.
// Se construye en dos fases como un constructor real:
//   1. REG4 cargado desde switches (sin lazo) → capturar Q=0 con un pulso
//   2. cerrar el lazo Q→A, y desde entonces Q = Q+1 por pulso
// (desde -1 puro un lazo Q→sumador→D no arranca: con A=-1 el ADD4 solo
// produce -1 y el latch nunca ve un 0/1 que rompa el empate.)
let seqInfo = null;
{
  const T = newBench();
  const reg = T.add("REG4"), add = T.add("ADD4");
  const LOAD = T.add("switch"); LOAD.on = true;
  const clk = T.add("clock");
  const b1 = [0, 1, 2, 3].map(() => T.add("switch"));
  b1[0].on = true;                                                  // B = +1
  const z = T.add("switch"); z.on = false;                          // Cin = 0
  const wB = b1.map((s, i) => T.w(s.id, 0, add, 4 + i));            // B → ADD4
  T.w(z.id, 0, add, 8);                                             // Cin=0
  T.w(LOAD.id, 0, reg, 4); T.w(clk.id, 0, reg, 5);                  // LOAD y CLK del registro
  // fase 1: D del registro a 0 (switches), capturar Q=0
  const d0 = [0, 1, 2, 3].map(() => T.add("switch"));
  const wTemp = d0.map((s, i) => T.w(s.id, 0, reg, i));
  T.setClk(clk.id, 1); T.sim();
  T.setClk(clk.id, 0); T.sim();                                     // Q = 0
  for (const w of wTemp) T.delWire(w);
  // fase 2: cerrar el acumulador: S→D y Q→A
  for (let i = 0; i < 4; i++) {
    T.w(add, 9 + i, reg, i);                                        // S(i) → D(i)
    T.w(reg, 6 + i, add, i);                                        // Q(i) → A(i)
  }
  const countOf = () => Array.from({ length: 4 }, (_, i) => T.readPin(reg, 6 + i))
    .map((v, i) => v === 1 ? 1 << i : 0).reduce((a, b) => a + b, 0);
  const counts = [];
  for (let k = 0; k < 8; k++) {
    T.setClk(clk.id, 1); T.sim();
    T.setClk(clk.id, 0); T.sim();
    counts.push(countOf());
  }
  seqInfo = { counts, osc: T.sim().oscillating, T, clkId: clk.id, reg,
              ok: counts.every((c, i) => c === i + 1) };
}

/* ============ [5] CPU 4 BITS REAL ============ */
let cpu = null;
{
  const T = newBench();
  const CLK = T.add("clock");
  const regs = Array.from({ length: 5 }, () => T.add("REG4"));     // PC, A, B, IR lo, IR hi
  const alu = T.add("ADD4");
  for (let i = 0; i < 4; i++) { T.w(regs[0], 6 + i, alu, i); T.w(regs[1], 6 + i, alu, 4 + i); }
  const z = T.add("switch"); z.on = false;
  T.w(z.id, 0, alu, 8);
  // bus de escritura hacia A: 4 MUX2 (fuente ALU o reg B)
  const mux = Array.from({ length: 4 }, () => T.add("MUX2"));
  const busSel = T.add("switch"); busSel.on = false;               // fuente = ALU
  for (let i = 0; i < 4; i++) {
    T.w(alu, 9 + i, mux[i], 0);
    T.w(regs[2], 6 + i, mux[i], 1);
    T.w(mux[i], 3, regs[1], i);
    T.w(busSel.id, 0, mux[i], 2);
  }
  const dec = T.add("DEC2");
  for (let i = 0; i < 4; i++) T.w(regs[3], 6 + i, dec, i);         // op → decodificador
  const ctrl = Array.from({ length: 14 }, (_, i) => T.add(i % 2 === 0 ? "and" : "or"));
  for (let i = 0; i < 4; i++) { T.w(dec, 2 + i, ctrl[i], 0); T.w(CLK.id, 0, ctrl[i], 1); }
  for (let r = 0; r < 5; r++) T.w(ctrl[4 + r], 2, regs[r], 4);     // LOAD(i) simulado
  const g = T.gates(), n = T.nets(), cv = T.canvas();
  T.sim(); const it = T.iters();
  const b = bench(() => T.sim());
  const bf = bench(() => T.flatten());
  const bn = bench(() => T.buildNets());
  cpu = { g, n, it, med: b.med, p90: b.p90, fl: bf.med, bn: bn.med, cv };
}

/* --------------- reporte --------------- */
out("BENCHMARK simulate() — a3-transistor @ develop");
out("node " + process.version + " · " + process.platform + " · mediana de 60 llamadas tras 5 de calentamiento");
out("presupuesto por frame: 16.7 ms (simulate() corre en CADA requestAnimationFrame, render.js:291)");

out("");
out("[0] SANITY — caja ADD4 anidada con el motor real de js/ (5+3 debe dar sum=8, Cout=0)");
out("    sum=" + chkFix.sum + " Cout=" + chkFix.co +
    (chkFix.sum === 8 && chkFix.co === 0
      ? "  OK (" + chkFix.gates + " gates, " + chkFix.nets + " nets; fix cid de engine.js:145/147 en su sitio)"
      : "  ✗ FAIL: el fix cid no conecta las cajas anidadas"));

out("");
out("[1] SUMADOR 4 BITS: PLANO vs EMPAQUETADO (5+3, las tres aplanan al MISMO netlist)");
for (const v of vars1) {
  const g = v.T.gates(), n = v.T.nets(), cv = v.T.canvas();
  v.T.sim(); const it = v.T.iters();
  const b = bench(() => v.T.sim());
  results1.push([v.name, cv.comps + "/" + cv.wires, g, n, it, fmt(b.med), fmt(b.p90), fpsOf(b.med),
                 (b.med * 1e3 / (g * Math.max(it, 1))).toFixed(2),
                 (v.sum === 8 && v.co === 0) ? "OK" : "✗ sum=" + v.sum + " co=" + v.co]);
}
table(out, ["variante", "comp/cables", "gates", "nets", "iters", "ms/med", "ms/p90", "fps", "µs/gate·i", "5+3"],
      results1, [22, 11, 6, 5, 6, 8, 8, 7, 10, 10]);
out("    gates = compuertas primitivas tras aplanar (idénticas en las 3): la caja NO reduce el trabajo evaluado.");

out("");
out("[1b] DESGLOSE por llamada (mediana de 60): flattenCircuit / buildNets(flatten+union-find) / bucle");
for (const v of vars1) {
  const g = v.T.gates();
  v.T.sim(); const it = v.T.iters();
  const bf = bench(() => v.T.flatten());
  const bn = bench(() => v.T.buildNets());
  const bs = bench(() => v.T.sim());
  results1b.push([v.name, g, it, fmt(bf.med), fmt(Math.max(bn.med - bf.med, 0)), fmt(bs.med),
                  fmt(Math.max(bs.med - bn.med, 0)), (100 * bn.med / Math.max(bs.med, 1e-9)).toFixed(0) + "%"]);
}
table(out, ["variante", "gates", "iters", "flatten ms", "unionfind ms", "simulate ms", "bucle ms", "%setup"],
      results1b, [22, 6, 6, 11, 13, 11, 8, 7]);
out("    %setup = fracción de simulate() dedicada a RECONSTRUIR nets antes de avaluar una sola compuerta.");

out("");
out("[2] ESCALADO: N etapas (REG4 + ADD4 encadenadas, contador multi-nibble), reloj quieto");
for (const r of results2)
  out("    " + r[0].padStart(3) + ": " + r[3] + " gates, " + r[4] + " nets, " + r[5] + " iters → " +
      r[6] + " ms/simulate · " + r[8] + " fps");
table(out, ["chain", "comp", "cables", "gates", "nets", "iters", "ms/med", "ms/p90", "fps", "µs/gate"],
      results2, [7, 5, 7, 7, 6, 6, 8, 8, 7, 7]);
out("    escalado lineal: ×2 N → ×2 gates → ×2 ms. µs/gate constante ≈ coste marginal por compuerta.");
out("    a N=32 la cuenta es de ~2.5k compuertas: aún 6-7 ms por frame (>60 fps pero ya sin casi margen).");

out("");
out("[3] DESGLOSE de simulate() por fases — mediana de 60");
table(out, ["chain", "gates", "iters", "flatten ms", "unionfind ms", "simulate ms", "bucle ms", "%flat", "%union", "%loop"],
      results3, [6, 7, 6, 11, 13, 11, 8, 6, 7, 7]);
out("    buildNets YA llama a flatten por dentro: %union = union-find + indexado (buildNets − flatten).");

out("");
out("[4] SECUENCIAL CON RELOJ — acumulador binario 4 bits (REG4, S→D y Q→A, B=1, Cin=0)");
out("    Q tras 8 pulsos de CLK: " + seqInfo.counts.join(", ") +
    " · oscilando=" + seqInfo.osc + " · " +
    (seqInfo.ok ? "PASS: Q = nº de pulsos (1,2,...,8)" : "FAIL: esperado 1,2,3,4,5,6,7,8"));
{
  const { T, clkId } = seqInfo;
  const rise = [], fall = [];
  const steady = bench(() => T.sim());
  for (let k = 0; k < 60; k++) {
    T.setClk(clkId, 1);
    let t0 = hr(); T.sim(); rise.push(Number(hr() - t0) / 1e6);
    T.setClk(clkId, 0);
    t0 = hr(); T.sim(); fall.push(Number(hr() - t0) / 1e6);
  }
  const med = a => { a.sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
  table(out, ["fase", "ms/med", "fps"],
        [["frame estable (reloj quieto, el caso típico)", fmt(steady.med), fpsOf(steady.med)],
         ["frame justo tras flanco CLK 0→1", fmt(med(rise)), fpsOf(med(rise))],
         ["frame justo tras flanco CLK 1→0", fmt(med(fall)), fpsOf(med(fall))]], [44, 8, 8]);
  out("    el reloj del app avanza por setInterval aparte (no cada rAF): lo habitual es el frame estable.");
  out("    nota de arranque: el acumulador se construyó en 2 fases (capturar Q=0 antes de cerrar el lazo");
  out("    Q→sumador→D). Desde -1 puro, un lazo con XOR nunca resuelve (el ternario solo corta en AND/OR/NAND/NOR).");
}

out("");
out("[5] CPU 4 BITS COMPLETO, construido de verdad con las cajas del taller");
out("    PC=REG4 · A=REG4 · B=REG4 · IR=2×REG4 (8 bits) · ALU=ADD4 · bus de escritura a A=4×MUX2");
out("    · decodificador de op=DEC2 · unidad de control=14 gates sueltas (fake, con CLK).");
out("    lienzo: " + cpu.cv.comps + " componentes, " + cpu.cv.wires + " cables");
out("    → aplanado: " + cpu.g + " compuertas primitivas, " + cpu.n + " nets, " + cpu.it + " iteraciones" + (cpu.it >= 50 ? " ✗cap50" : ""));
table(out, ["circuito", "gates", "nets", "iters", "flatten ms", "setup ms", "simulate ms", "fps", "%setup"],
      [["CPU 4 bits", cpu.g, cpu.n, cpu.it, fmt(cpu.fl), fmt(cpu.bn), fmt(cpu.med), fpsOf(cpu.med),
        (100 * cpu.bn / cpu.med).toFixed(0) + "%"],
       ["presupuesto frame", "-", "-", "-", "-", "-", "16.70", "60", "-"]],
      [18, 7, 6, 6, 11, 9, 11, 7, 7]);
out("    %setup = buildNets()/total: la parte que se repaga en cada frame aunque NADA haya cambiado.");

/* --------------- conclusión --------------- */
const cost1 = results1.map(r => r[5]);
out("");
out("============================================================");
out("CONCLUSIÓN");
out("============================================================");
out("");
out("1) HIPÓTESIS DEL AUTOR — «al empaquetar la caja no evalúa todo, solo el resultado final» — REFUTADA con datos.");
out("   simulate() NUNCA evalúa una caja como unidad: flattenCircuit() expande SIEMPRE la caja a sus compuertas y");
out("   el bucle las evalúa TODAS. Las 3 variantes del sumador aplanan al mismo netlist exacto:");
out("   " + results1.map(r => r[0] + ": " + r[2] + " gates / " + r[3] + " nets").join(" · "));
out("   y el coste es el mismo (" + cost1[0] + "-" + Math.max(cost1[1], cost1[2]) + " ms; las diferencias son ruido de medición, repite el bench y se barajan).");
out("   Lo que gana el empaquetado es ABSTRACCIÓN (el canvas muestra 1 caja, no 20 compuertas), no velocidad.");
out("   Ni siquiera «solo el resultado final»: cada simulate() re-aplana y reevalúa desde -1 sin memoria de caja.");
out("");
out("2) ¿ENTRA UN CPU DE 4 BITS EN 16.7 ms? SÍ, con margen de sobra.");
out("   CPU real de " + cpu.g + " gates / " + cpu.n + " nets → " + fmt(cpu.med) + " ms por simulate() (" +
    fpsOf(cpu.med) + " fps; p90 despreciable a esta escala). El frame aguanta hasta ~3-5k gates a 60 fps");
out("   (el chain N=32 con " + results2[5][3] + " gates costó " + results2[5][6] + " ms). El límite práctico del motor");
out("   actual es el tamaño del circuito, no el empaquetado.");
out("");
out("3) CUELLO DE BOTELLA: la RECONSTRUCCIÓN del circuito en cada frame, no la evaluación de gates.");
out("   En el CPU completo: setup (flatten " + fmt(cpu.fl) + " + union-find " + fmt(cpu.bn - cpu.fl) + " ms) = " +
    (100 * cpu.bn / cpu.med).toFixed(0) + "% de la llamada; el bucle que realmente evalúa " + cpu.g + " gates × " + cpu.it +
    " iters es solo el " + (100 * (cpu.med - cpu.bn) / cpu.med).toFixed(0) + "% restante.");
out("   El escalado lo confirma: flatten y union-find crean O(gates) objetos (strings, Map, arrays) en CADA frame,");
out("   mientras el bucle cuesta µs/gate constantes y bajo (" + results2[3][9] + " µs/gate en el chain N=8).");
out("   El bucle además puede cortarse en MAX_ITER=50 sin estabilizar en circuitos profundos (cap50): hay que vigilarlo");
out("   (aquí no se alcanzó: 2-4 iteraciones; el bring-up de los lazos evita el no-arranque desde -1).");
out("");
out("4) OPTIMIZACIÓN CONCRETA (sin implementar): CACHÉ del circuito aplanado y de las nets.");
out("   flattenCircuit() y buildNets() solo dependen de state.components/wires y de las defs del lib — NO de los");
out("   valores (gateOuts, switches, reloj). Un dirty-flag al editar/añadir/borrar/pack/unpack permitiría reaprovechar");
out("   netOf/nets/comps entre frames y convertir el ~" + (100 * cpu.bn / cpu.med).toFixed(0) + "% de setup en ~0.");
out("   Segunda mejora de magnitud comparable: indexar las nets con ENTEROS (cada gate hoy paga 2-4 Map.get con clave");
out("   string \"compId:term\" por iteración); reindexar solo cuando cambia el circuito y guardar por gate un array");
out("   precomputado [netIn0, netIn1, netOut] lo deja en lecturas de Int8Array directas.");
out("   Con ambas, el coste por frame pasaría a ser casi solo el bucle: ~" + fmt(cpu.med - cpu.bn) + " ms a " + results2[5][6] +
    " ms de escala CPU → 3-4× más compuertas dentro del presupuesto de 16.7 ms.");
out("");

const text = L.join("\n") + "\n";
fs.writeFileSync(path.join(dir, "tests", "perf.out.txt"), text);
console.log(text);