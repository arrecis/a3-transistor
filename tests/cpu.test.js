/* ============================================================
   CPU 4 BITS — PROTOTIPO EN SIMULACIÓN (fuente de verdad:
   docs/cpu-brief.md).  run: node tests/cpu.test.js [--trace]
   Reutiliza el sandbox de tests/lessons.test.js (engine.js +
   pack.js + lessons.js con stubs, makePackage para las cajas).

   Cajas (makePackage, orden de pines del brief):
     DFF: D, CLK | Q · MUX2: A, B, S | OUT (S=0→A) ·
     FULLADDER: A, B, Cin | S, Cout · ADD4: A0-3, B0-3, Cin | S0-3, Cout ·
     ALU4: A0-3, B0-3, OP | R0-3 (OP=0 suma, OP=1 AND) ·
     DEC2: A0, A1 | Y0-Y3 · DEC3: A0, A1, A2 | Y0-Y7 ·
     REG4: D0-3, LOAD, CLK | Q0-3 · RING3: RESET, CLK | T0, T1, T2

   Ciclo (3 pulsos CPU_CLK): T0 fetch OP / T1 fetch ARG / T2 execute.
   CPU_CLK = CLK·(¬H + RESET); H: D = ¬RESET·(H + T2·HALT), reloj CLK.
   RESET: pulsar con RESET=1 → PC=0, T0=1, H=0.

   PROTOCOLO DE RELOJ (descubierto midiendo el motor): la red asíncrona
   de latches resuelve a través de VARIAS simulate(); el protocolo que
   captura de forma fiable es EXACTAMENTE 2 sims por pulso (CLK=1→sim,
   CLK=0→sim, capturando el snapshot del resultado del propio pulso).
   Un simulate() extra con los switches en estado inicial corrompe el
   encendido de gateOuts (ver casos F/I/O de la depuración). En la app
   ocurre lo equivalente entre frames, con la fase del reloj fija entre
   flancos del clock global (mismo número de sims por fase).
   El programa se escribe en ramData ANTES del primer simulate() (sin
   sim de arranque): el propio test siembra el Uint8Array.
   ============================================================ */
const fs = require("fs"), vm = require("vm"), path = require("path");
const dir = path.resolve(process.argv[2] ?? path.join(__dirname, ".."));
const TRACE = process.argv.includes("--trace");

/* ---------- sandbox (copiado de tests/lessons.test.js) ---------- */
const deep = () => new Proxy(function () {}, {
  get: (t, k) => k === Symbol.toPrimitive ? () => "" : (k === "length" ? 0 : deep()),
  apply: () => deep(), construct: () => deep(), set: () => true,
});
function makeCtx() {
  const ctx = {
    console, Math, JSON, Map, Set, Array, Uint8Array, Int8Array, String, Number, Object, Boolean, Symbol, Error,
    document: deep(), window: deep(), localStorage: deep(), cv: deep(),
    requestAnimationFrame() {}, setInterval() { return 1; }, clearInterval() {},
    save() {}, i18nLang: () => "es", t: k => k,
  };
  vm.createContext(ctx);
  const run = f => vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8")
    .replace(/^const (\w+)\s*=/gm, "var $1 =").replace(/^let (\w+)\s*=/gm, "var $1 ="),
    ctx, { filename: f });
  run("js/engine.js");
  try { run("js/pack.js"); } catch (e) { /* cableado de UI al final necesita DOM */ }
  run("js/lessons.js");
  return vm.runInContext(`({
    resetAll() { state.components = []; state.wires = []; state.nextId = 1; state.powerOn = true;
      gateOuts.clear(); globalClockState.clear(); globalClockFreq.clear();
      for (const k of Object.keys(lib)) delete lib[k]; },
    clearCanvas() { state.components.length = 0; state.wires.length = 0;
      state.powerOn = true; gateOuts.clear(); globalClockState.clear(); },
    add(type) { const c = { id: state.nextId++, type, x: state.nextId * 10, y: 0, rot: 0, on: false };
      state.components.push(c); return c; },
    w(a, ta, b, tb) { state.wires.push({ id: state.nextId++,
      a: { c: (a.id ?? a), t: ta }, b: { c: (b.id ?? b), t: tb } }); },
    pack(name, ins, outs) { return makePackage([...state.components], name,
      ins.map(c => c.id), outs.map(c => c.id)); },
    sim: () => simulate(),
    pinVal(r, c, t) { const n = r.netOf.get(c.id + ":" + t); return n === undefined ? -2 : r.values[n]; },
    nGates: () => flattenCircuit().comps.length,
    ramMap: () => ramData,
    osc: () => simulate().oscillating,
  })`, ctx);
}
const T = makeCtx();

/* ---------- medición ---------- */
const hr = () => process.hrtime.bigint();
function median50(fn) {
  for (let i = 0; i < 5; i++) fn();
  const t = [];
  for (let i = 0; i < 50; i++) { const a = hr(); fn(); t.push(Number(hr() - a) / 1e6); }
  t.sort((x, y) => x - y);
  return t[25];
}

/* ============================================================
   CAJAS (makePackage, orden de pines EXACTO del brief)
   ============================================================ */
function dLatch(src, st, clk, ct) {        // firma de lessons.test.js: (fuente, término, reloj, término)
  const n = T.add("not"), a1 = T.add("and"), a2 = T.add("and"), q = T.add("nor"), qn = T.add("nor");
  T.w(src, st, n, 0);
  T.w(src, st, a1, 0); T.w(clk, ct, a1, 1);
  T.w(n, 1, a2, 0); T.w(clk, ct, a2, 1);
  T.w(a2, 2, q, 0); T.w(qn, 2, q, 1);
  T.w(a1, 2, qn, 0); T.w(q, 2, qn, 1);
  return q;
}
function packDFF() {                       // DFF: D, CLK | Q (lección 9)
  const d = T.add("switch"), c = T.add("switch");
  const qm = dLatch(d, 0, c, 0);
  const nc = T.add("not"); T.w(c, 0, nc, 0);
  const q = dLatch(qm, 2, nc, 1);          // el esclavo recibe LA SALIDA del maestro (término 2)
  const o = T.add("out"); T.w(q, 2, o, 0);
  T.pack("DFF", [d, c], [o]); T.clearCanvas();
}
function packMUX2() {                      // MUX2: A, B, S | OUT (S=0→A, lección 12)
  const a = T.add("switch"), b = T.add("switch"), s = T.add("switch");
  const n = T.add("not"), a1 = T.add("and"), a2 = T.add("and"), o = T.add("or"), out = T.add("out");
  T.w(s, 0, n, 0); T.w(a, 0, a1, 0); T.w(n, 1, a1, 1);
  T.w(b, 0, a2, 0); T.w(s, 0, a2, 1);
  T.w(a1, 2, o, 0); T.w(a2, 2, o, 1); T.w(o, 2, out, 0);
  T.pack("MUX2", [a, b, s], [out]); T.clearCanvas();
}
function packFULLADDER() {                 // FULLADDER: A, B, Cin | S, Cout (lección 15)
  const A = T.add("switch"), B = T.add("switch"), Ci = T.add("switch");
  const x1 = T.add("xor"), x2 = T.add("xor"), a1 = T.add("and"), a2 = T.add("and"), o = T.add("or");
  const S = T.add("out"), Co = T.add("out");
  T.w(A, 0, x1, 0); T.w(B, 0, x1, 1); T.w(A, 0, a1, 0); T.w(B, 0, a1, 1);
  T.w(x1, 2, x2, 0); T.w(Ci, 0, x2, 1); T.w(x1, 2, a2, 0); T.w(Ci, 0, a2, 1);
  T.w(x2, 2, S, 0); T.w(a1, 2, o, 0); T.w(a2, 2, o, 1); T.w(o, 2, Co, 0);
  T.pack("FULLADDER", [A, B, Ci], [S, Co]); T.clearCanvas();
}
function packADD4() {                      // ADD4: A0-3, B0-3, Cin | S0-3, Cout (lección 17)
  const A = [0, 1, 2, 3].map(() => T.add("switch"));
  const B = [0, 1, 2, 3].map(() => T.add("switch"));
  const Cin = T.add("switch");
  const S = [], coOut = T.add("out");
  let ci = { c: Cin.id, t: 0 };
  for (let i = 0; i < 4; i++) {
    const fa = T.add("FULLADDER");
    T.w(A[i], 0, fa, 0); T.w(B[i], 0, fa, 1); T.w(ci.c, ci.t, fa, 2);
    const s = T.add("out"); T.w(fa, 3, s, 0); S.push(s);
    ci = { c: fa.id, t: i < 3 ? 4 : 0 };
    if (i === 3) T.w(fa, 4, coOut, 0);
  }
  T.pack("ADD4", [...A, ...B, Cin], [...S, coOut]); T.clearCanvas();
}
function packALU4() {                      // ALU4: A0-3, B0-3, OP | R0-3 — OP=0 suma, OP=1 AND
  const A = [0, 1, 2, 3].map(() => T.add("switch"));
  const B = [0, 1, 2, 3].map(() => T.add("switch"));
  const OP = T.add("switch");
  const add = T.add("ADD4");
  const cin0 = T.add("switch"); cin0.on = false;      // interna, no expuesta → constante 0
  T.w(cin0, 0, add, 8);
  const outs = [];
  for (let i = 0; i < 4; i++) {
    T.w(A[i], 0, add, i); T.w(B[i], 0, add, 4 + i);
    const an = T.add("and"); T.w(A[i], 0, an, 0); T.w(B[i], 0, an, 1);
    const m = T.add("MUX2");
    T.w(add, 9 + i, m, 0); T.w(an, 2, m, 1); T.w(OP, 0, m, 2);
    const o = T.add("out"); T.w(m, 3, o, 0); outs.push(o);
  }
  T.pack("ALU4", [...A, ...B, OP], outs); T.clearCanvas();
}
function packDEC2() {                      // DEC2: A0, A1 | Y0-Y3 (lección 23)
  const A0 = T.add("switch"), A1 = T.add("switch");
  const n0 = T.add("not"), n1 = T.add("not");
  T.w(A0, 0, n0, 0); T.w(A1, 0, n1, 0);
  const outs = [];
  for (let k = 0; k < 4; k++) {
    const a = T.add("and");
    // fuente en su terminal de SALIDA: switch→término 0; NOT→término 1
    T.w((k & 1) ? A0 : n0, (k & 1) ? 0 : 1, a, 0);
    T.w((k & 2) ? A1 : n1, (k & 2) ? 0 : 1, a, 1);
    const o = T.add("out"); T.w(a, 2, o, 0); outs.push(o);
  }
  T.pack("DEC2", [A0, A1], outs); T.clearCanvas();
}
function packDEC3() {                      // DEC3: A0, A1, A2 | Y0-Y7 — DEC2 + AND (lección 23)
  const A = [0, 1, 2].map(() => T.add("switch"));
  const dec = T.add("DEC2");
  T.w(A[0], 0, dec, 0); T.w(A[1], 0, dec, 1);
  const n2 = T.add("not"); T.w(A[2], 0, n2, 0);
  const outs = [];
  for (let m = 0; m < 4; m++) {
    const lo = T.add("and"); T.w(dec, 2 + m, lo, 0); T.w(n2, 1, lo, 1);   // A2=0 → Y_m
    const hi = T.add("and"); T.w(dec, 2 + m, hi, 0); T.w(A[2], 0, hi, 1); // A2=1 → Y_{m+4}
    const oLo = T.add("out"), oHi = T.add("out");
    T.w(lo, 2, oLo, 0); T.w(hi, 2, oHi, 0);
    outs[m] = oLo; outs[m + 4] = oHi;
  }
  T.pack("DEC3", A, outs); T.clearCanvas();
}
function packREG4() {                      // REG4: D0-3, LOAD, CLK | Q0-3 (lección 10)
  const load = T.add("switch"), clk = T.add("switch");
  const D = [], outs = [];
  for (let i = 0; i < 4; i++) {
    const d = T.add("switch"), ff = T.add("DFF"), m = T.add("MUX2");
    T.w(ff, 2, m, 0);                     // A = Q (mantener)
    T.w(d, 0, m, 1);                      // B = D
    T.w(load, 0, m, 2);                   // S = LOAD
    T.w(m, 3, ff, 0); T.w(clk, 0, ff, 1);
    const o = T.add("out"); T.w(ff, 2, o, 0);
    D.push(d); outs.push(o);
  }
  T.pack("REG4", [...D, load, clk], outs); T.clearCanvas();
}
function packRING3() {                     // RING3: RESET, CLK | T0, T1, T2 (lección 24)
  const r = T.add("switch"), c = T.add("switch");
  const nR = T.add("not"); T.w(r, 0, nR, 0);
  const f = [0, 1, 2].map(() => T.add("DFF"));
  // D_T0 = RESET + T2 · D_T1 = ¬RESET·T0 · D_T2 = ¬RESET·T1
  const d0 = T.add("or");  T.w(r, 0, d0, 0); T.w(f[2], 2, d0, 1); T.w(d0, 2, f[0], 0);
  const d1 = T.add("and"); T.w(nR, 1, d1, 0); T.w(f[0], 2, d1, 1); T.w(d1, 2, f[1], 0);
  const d2 = T.add("and"); T.w(nR, 1, d2, 0); T.w(f[1], 2, d2, 1); T.w(d2, 2, f[2], 0);
  const outs = [];
  for (let i = 0; i < 3; i++) {
    T.w(c, 0, f[i], 1);
    const o = T.add("out"); T.w(f[i], 2, o, 0); outs.push(o);
  }
  T.pack("RING3", [r, c], outs); T.clearCanvas();
}
function packAllBoxes() {
  packDFF(); packMUX2(); packFULLADDER(); packADD4();
  packALU4(); packDEC2(); packDEC3(); packREG4(); packRING3();
}

/* ============================================================
   LECTORES (leen del ÚLTIMO result de simulate(), no lanzan sims)
   ============================================================ */
function nib(r, c, base) {
  let v = 0;
  for (let i = 0; i < 4; i++) {
    const b = T.pinVal(r, c, base + i);
    if (b === 1) v |= 1 << i; else if (b !== 0) return -1;
  }
  return v;
}
function bits(r, c, base, n) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(T.pinVal(r, c, base + i));
  return a;
}
function rdPC(r, cpu) { return nib(r, { id: -1 }, 0) ?? nibOfFf(r, cpu); } // placeholder, redefinido abajo
function nibOfFf(r, cpu) {
  let v = 0;
  for (let i = 0; i < 4; i++) {
    const b = T.pinVal(r, cpu.pcFf[i], 2);
    if (b === 1) v |= 1 << i; else if (b !== 0) return -1;
  }
  return v;
}
function rdT(r, cpu) {
  for (let i = 0; i < 3; i++) if (T.pinVal(r, cpu.ring, 2 + i) === 1) return i;
  return -1;
}
function snapshot(cpu, r) {
  r = r ?? cpu.lastR;
  return {
    T: rdT(r, cpu), PC: nibOfFf(r, cpu),
    OP: nib(r, cpu.opReg, 6), ARG: nib(r, cpu.argReg, 6),
    A: nib(r, cpu.aReg, 6), B: nib(r, cpu.bReg, 6),
    OUT: nib(r, cpu.outReg, 6), H: T.pinVal(r, cpu.hFf, 2),
  };
}

/* ============================================================
   CPU SEGÚN EL BRIEF
   ============================================================ */
function newCpu(program) {
  T.resetAll();
  packAllBoxes();
  T.clearCanvas();

  // Entradas, RAM (CS=1 fija, WE=0: solo lectura) y H (compuertas sueltas)
  const clkSw = T.add("switch");                       // Entrada CLK
  const rstSw = T.add("switch");                       // Entrada RESET
  const ram = T.add("ram");
  const cs = T.add("switch"); cs.on = true;
  const we = T.add("switch"); we.on = false;
  T.w(cs, 0, ram, 9); T.w(we, 0, ram, 8);

  // H y CPU_CLK = CLK·(¬H + RESET)
  const hFf = T.add("DFF");
  const nH = T.add("not"); T.w(hFf, 2, nH, 0);
  const oCk = T.add("or"); T.w(nH, 1, oCk, 0); T.w(rstSw, 0, oCk, 1);
  const cpuClk = T.add("and"); T.w(clkSw, 0, cpuClk, 0); T.w(oCk, 2, cpuClk, 1);

  // anillo, registros y sumador PC+1
  const ring = T.add("RING3");
  T.w(rstSw, 0, ring, 0); T.w(cpuClk, 2, ring, 1);
  const pcFf = [0, 1, 2, 3].map(() => T.add("DFF"));   // PC: 4 DFF con D por muxes
  const opReg = T.add("REG4"), argReg = T.add("REG4");
  const aReg = T.add("REG4"), bReg = T.add("REG4"), outReg = T.add("REG4");
  const alu = T.add("ALU4");
  const inc = T.add("ADD4");                            // PC+1 (B=0001, Cin=0)

  // muxes: PC_NEXT / PC_LOAD / reset / D-de-A
  const mNext = [0, 1, 2, 3].map(() => T.add("MUX2"));  // (T2·JMP)?ARG:PC+1
  const mLoad = [0, 1, 2, 3].map(() => T.add("MUX2"));  // PC_LOAD?next:PC
  const mRst  = [0, 1, 2, 3].map(() => T.add("MUX2"));  // RESET?0:loaded  (= ¬RESET·)
  const mAlu  = [0, 1, 2, 3].map(() => T.add("MUX2"));  // (ADD+AND)?ALU:ARG

  const dec = T.add("DEC3");                            // OP0-2 → Y0-Y7

  // constantes (Inputs)
  const one = T.add("switch"); one.on = true;           // B0 del PC+1
  const z1 = T.add("switch"), z2 = T.add("switch"), z3 = T.add("switch");
  const zC = T.add("switch");                           // Cin del PC+1 (todo 0)
  const zero = T.add("switch");                         // B del mux de reset

  // unidad de control (compuertas sueltas, ecuaciones del brief)
  const aTJ   = T.add("and");  // T2·JMP
  const oL0   = T.add("or");   // T0 + 1º término de PC_LOAD
  const oL1   = T.add("or");   // T1 + T2·JMP
  const pcLoad= T.add("or");   // T0+T1+T2·JMP
  const oAA   = T.add("or");   // ADD+AND
  const oLD   = T.add("or");   // LDA + (ADD+AND)
  const aLd   = T.add("and");  // T2·(LDA+ADD+AND)
  const bLd   = T.add("and");  // T2·LDB
  const oLd   = T.add("and");  // T2·OUT
  const aTH   = T.add("and");  // T2·HALT
  const nR    = T.add("not");  // ¬RESET
  const oH    = T.add("or");   // H + T2·HALT
  const dH    = T.add("and");  // ¬RESET·(H + T2·HALT)
  const outPins = [0, 1, 2, 3].map(() => T.add("out")); // 4 Salidas

  /* ---- cableado ---- */
  T.w(z1, 0, inc, 5); T.w(z2, 0, inc, 6); T.w(z3, 0, inc, 7); T.w(zC, 0, inc, 8);
  T.w(one, 0, inc, 4);
  for (let i = 0; i < 4; i++) {
    T.w(pcFf[i], 2, inc, i);                             // PC → A del +1
    T.w(inc, 9 + i, mNext[i], 0); T.w(argReg, 6 + i, mNext[i], 1); T.w(aTJ, 2, mNext[i], 2);
    T.w(pcFf[i], 2, mLoad[i], 0); T.w(mNext[i], 3, mLoad[i], 1); T.w(pcLoad, 2, mLoad[i], 2);
    T.w(mLoad[i], 3, mRst[i], 0); T.w(zero, 0, mRst[i], 1); T.w(rstSw, 0, mRst[i], 2);
    T.w(mRst[i], 3, pcFf[i], 0); T.w(cpuClk, 2, pcFf[i], 1);
    T.w(pcFf[i], 2, ram, i);                             // PC → dirección de la RAM
    T.w(ram, 10 + i, opReg, i);                          // RAM Q → OP
    T.w(ram, 10 + i, argReg, i);                         // RAM Q → ARG
    T.w(argReg, 6 + i, mAlu[i], 0); T.w(alu, 9 + i, mAlu[i], 1); T.w(oAA, 2, mAlu[i], 2);
    T.w(mAlu[i], 3, aReg, i);
    T.w(argReg, 6 + i, bReg, i);                         // B ← ARG
    T.w(aReg, 6 + i, alu, i); T.w(bReg, 6 + i, alu, 4 + i);
    T.w(aReg, 6 + i, outReg, i);                         // OUT ← A
    T.w(outReg, 6 + i, outPins[i], 0);
  }
  for (let i = 0; i < 3; i++) T.w(opReg, 6 + i, dec, i); // OP0-2 → DEC3
  T.w(ring, 2, opReg, 4);                                // OP  LOAD = T0
  T.w(ring, 3, argReg, 4);                               // ARG LOAD = T1
  T.w(aLd, 2, aReg, 4); T.w(bLd, 2, bReg, 4); T.w(oLd, 2, outReg, 4);
  for (const reg of [opReg, argReg, aReg, bReg, outReg]) T.w(cpuClk, 2, reg, 5);

  // control: Y_k en terminal 3+k del DEC3 — Y0=NOP Y1=LDA Y2=LDB Y3=ADD Y4=AND Y5=OUT Y6=JMP Y7=HALT
  T.w(ring, 4, aTJ, 0); T.w(dec, 9, aTJ, 1);             // T2·JMP (Y6)
  T.w(ring, 2, oL0, 0); T.w(ring, 3, oL1, 0); T.w(aTJ, 2, oL1, 1);
  T.w(ring, 2, pcLoad, 0); T.w(oL1, 2, pcLoad, 1);   // PC_LOAD = T0 + (T1 + T2·JMP)
  T.w(dec, 6, oAA, 0); T.w(dec, 7, oAA, 1);              // ADD+AND (Y3, Y4)
  T.w(dec, 4, oLD, 0); T.w(oAA, 2, oLD, 1);              // LDA + (ADD+AND) (Y1)
  T.w(ring, 4, aLd, 0); T.w(oLD, 2, aLd, 1);
  T.w(ring, 4, bLd, 0); T.w(dec, 5, bLd, 1);             // T2·LDB (Y2)
  T.w(ring, 4, oLd, 0); T.w(dec, 8, oLd, 1);             // T2·OUT (Y5)
  T.w(dec, 7, alu, 8);                                   // selector ALU = AND (Y4)
  T.w(ring, 4, aTH, 0); T.w(dec, 10, aTH, 1);            // T2·HALT (Y7)
  T.w(rstSw, 0, nR, 0);
  T.w(hFf, 2, oH, 0); T.w(aTH, 2, oH, 1);
  T.w(nR, 1, dH, 0); T.w(oH, 2, dH, 1);
  T.w(dH, 2, hFf, 0); T.w(clkSw, 0, hFf, 1);             // H con CLK directo (sin compuerta)

  // programa: sembrar ramData SIN simulate() previo (protocolo sin sims sueltos)
  const data = new Uint8Array(16);
  program.forEach((b, i) => { data[i] = b & 0xF; });
  T.ramMap().set(ram.id, data);

  return { clkSw, rstSw, ram, pcFf, ring, opReg, argReg, aReg, bReg, outReg, alu, hFf, outPins, cpuClk, dec, lastR: null };
}
/* pulso = EXACTAMENTE 2 sims: CLK=1 (abre masters) y CLK=0 (flanco de
   captura). Devuelve el result del flanco: el estado ya está asentado. */
function pulse(cpu) {
  cpu.clkSw.on = true;  T.sim();
  cpu.clkSw.on = false; cpu.lastR = T.sim();
  return cpu.lastR;
}
/* RESET del brief: RESET=1, un pulso, RESET=0. La captura ocurre en el
   flanco de bajada de CLK con RESET=1 (PC←0, T0←1, H←0); al soltar
   RESET con CLK ya bajo no hay flanco y nada recaptura. */
function reset(cpu) {
  cpu.rstSw.on = true; T.sim();
  pulse(cpu);
  cpu.rstSw.on = false; cpu.lastR = T.sim();
}
const PULSES = cpu => { pulse(cpu); }; // legibilidad en bucles

/* ============================================================
   PRUEBAS
   ============================================================ */
const results = [];
const L = [];
const out = (...a) => L.push(a.join(" "));
const expect = (label, ok, info) => { results.push([label, ok]); out((ok ? "PASS " : "FAIL ") + label + (ok ? "" : "\n      " + info)); };
const fmt = n => (n === -1 ? "  ·" : String(n).padStart(2));
const fmtT = n => (n === -1 ? "·" : String(n));

/* --- [B] sanity de cajas (sin sims sueltos: 2 sims por pulso) --- */
const boxSanity = () => [
  () => { // MUX2: S=0 → A ; S=1 → B
    T.resetAll(); packDFF(); packMUX2(); T.clearCanvas();
    const a = T.add("switch"); a.on = true;
    const b = T.add("switch"); b.on = false;
    const s = T.add("switch"); s.on = false;
    const m = T.add("MUX2"); T.w(a, 0, m, 0); T.w(b, 0, m, 1); T.w(s, 0, m, 2);
    const o = T.add("out"); T.w(m, 3, o, 0);
    const v0 = T.pinVal(T.sim(), o, 0);
    s.on = true;
    T.sim();
    const v1 = T.pinVal(T.sim(), o, 0);
    expect("cajas: MUX2 S=0→A / S=1→B", v0 === 1 && v1 === 0, `S=0→${v0} S=1→${v1}`);
  },
  () => { // ALU4: OP=0 suma / OP=1 AND
    T.resetAll(); packAllBoxes(); T.clearCanvas();
    const A = [0, 1, 2, 3].map((_, i) => { const s = T.add("switch"); s.on = !!(6 >> i & 1); return s; });
    const B = [0, 1, 2, 3].map((_, i) => { const s = T.add("switch"); s.on = !!(3 >> i & 1); return s; });
    const op = T.add("switch"); op.on = false;
    const alu = T.add("ALU4");
    const os = [0, 1, 2, 3].map(() => T.add("out"));
    for (let i = 0; i < 4; i++) { T.w(A[i], 0, alu, i); T.w(B[i], 0, alu, 4 + i); T.w(alu, 9 + i, os[i], 0); }
    T.w(op, 0, alu, 8);
    const nibOf = r => { let v = 0, bad = false; os.forEach((oo, i) => { const b = T.pinVal(r, oo, 0); if (b === 1) v |= 1 << i; else if (b !== 0) bad = true; }); return bad ? -1 : v; };
    const vSum = nibOf(T.sim());
    op.on = true;
    const vAnd = nibOf(T.sim());
    expect("cajas: ALU4 OP=0 suma 6+3=9 / OP=1 AND 6&3=2", vSum === 9 && vAnd === 2, `suma=${vSum} and=${vAnd}`);
  },
  () => { // DEC3: A=5 (101) → solo Y5
    T.resetAll(); packDFF(); packMUX2(); packFULLADDER(); packADD4(); packALU4(); packDEC2(); packDEC3(); T.clearCanvas();
    const A = [0, 1, 2].map((_, i) => { const s = T.add("switch"); s.on = !!(5 >> i & 1); return s; });
    const dec = T.add("DEC3");
    const os = [0, 1, 2, 3, 4, 5, 6, 7].map(() => T.add("out"));
    for (let i = 0; i < 8; i++) T.w(dec, 3 + i, os[i], 0);
    for (let i = 0; i < 3; i++) T.w(A[i], 0, dec, i);
    const ys = os.map(o => T.pinVal(T.sim(), o, 0));
    expect("cajas: DEC3 5 → Y5=1 (uno-hot)", ys[5] === 1 && ys.filter(v => v === 1).length === 1, "Y=" + ys.join(""));
  },
  () => { // REG4: LOAD=1 captura 5; LOAD=0 retiene
    T.resetAll(); packDFF(); packMUX2(); packREG4(); T.clearCanvas();
    const D = [0, 1, 2, 3].map((_, i) => { const s = T.add("switch"); s.on = !!(5 >> i & 1); return s; });
    const ld = T.add("switch"); ld.on = true;
    const ck = T.add("switch");
    const reg = T.add("REG4");
    const oq = [0, 1, 2, 3].map(() => T.add("out"));
    for (let i = 0; i < 4; i++) T.w(D[i], 0, reg, i);
    T.w(ld, 0, reg, 4); T.w(ck, 0, reg, 5);
    for (let i = 0; i < 4; i++) T.w(reg, 6 + i, oq[i], 0);
    ck.on = true; T.sim(); ck.on = false;
    const rLoad = T.sim();
    const load5 = nib(rLoad, { id: -2 }, 0); // placeholder, leído abajo
    const nibOq = r => { let v = 0, bad = false; oq.forEach((oo, i) => { const b = T.pinVal(r, oo, 0); if (b === 1) v |= 1 << i; else if (b !== 0) bad = true; }); return bad ? -1 : v; };
    const vLoad = nibOq(rLoad);
    D.forEach((d, i) => d.on = !!(9 >> i & 1)); ld.on = false;   // D cambia pero LOAD=0
    ck.on = true; T.sim(); ck.on = false;
    const vHold = nibOq(T.sim());
    expect("cajas: REG4 LOAD=1 captura 5, LOAD=0 retiene", vLoad === 5 && vHold === 5, `load=${vLoad} hold=${vHold}`);
  },
  () => { // RING3: reset → T0; cicla 1, 2, 0
    T.resetAll(); packDFF(); packREG4(); packRING3(); T.clearCanvas();
    const rs = T.add("switch"); rs.on = false;
    const ck = T.add("switch");
    const ring = T.add("RING3");
    T.w(rs, 0, ring, 0); T.w(ck, 0, ring, 1);
    const ot = [0, 1, 2].map(() => T.add("out"));
    for (let i = 0; i < 3; i++) T.w(ring, 2 + i, ot[i], 0);
    const idx = r => { for (let i = 0; i < 3; i++) if (T.pinVal(r, ot[i], 0) === 1) return i; return -1; };
    rs.on = true; ck.on = true; T.sim(); ck.on = false;
    const rReset = T.sim(); rs.on = false;
    const afterReset = idx(rReset);
    const seq = [];
    for (let k = 0; k < 3; k++) { ck.on = true; T.sim(); ck.on = false; seq.push(idx(T.sim())); }
    expect("cajas: RING3 reset→T0 y cicla 1,2,0", afterReset === 0 &&
           seq[0] === 1 && seq[1] === 2 && seq[2] === 0, `reset→${afterReset} seq=${seq.join(",")}`);
  },
];
for (const fn of boxSanity()) fn();

/* --- [1] Suma: 1 5 2 3 3 0 5 0 7 0 → OUT=8, luego HALT --- */
{
  const cpu = newCpu([1, 5, 2, 3, 3, 0, 5, 0, 7, 0]);
  reset(cpu);
  for (let k = 0; k < 15; k++) pulse(cpu);
  const s1 = snapshot(cpu);
  expect("Suma: tras reset y 15 pulsos OUT = 8", s1.OUT === 8, JSON.stringify(s1));
  for (let k = 0; k < 10; k++) pulse(cpu);
  const s2 = snapshot(cpu);
  expect("Suma: HALT — 10 pulsos más no cambian OUT ni PC (H=1)", s2.OUT === 8 && s2.PC === s1.PC && s2.H === 1, JSON.stringify(s2));

  if (TRACE) {
    out("");
    out("TRAZA Suma (1 5 2 3 3 0 5 0 7 0): 15 pulsos desde el reset");
    out("  pulso  T  PC  OP ARG   A   B OUT  H   (T = paso EJECUTADO por ese pulso; estado leído tras el pulso)");
    const cpu2 = newCpu([1, 5, 2, 3, 3, 0, 5, 0, 7, 0]);
    reset(cpu2);
    for (let k = 1; k <= 15; k++) {
      const tBefore = snapshot(cpu2).T;
      pulse(cpu2);
      const s = snapshot(cpu2);
      out(`  ${String(k).padStart(5)}  ${fmtT(tBefore)} ${fmt(s.PC)} ${fmt(s.OP)} ${fmt(s.ARG)} ${fmt(s.A)} ${fmt(s.B)} ${fmt(s.OUT)}  ${fmtT(s.H)}`);
    }
  }
}

/* --- [2] AND: 1 6 2 3 4 0 5 0 7 0 → OUT=2 --- */
{
  const cpu = newCpu([1, 6, 2, 3, 4, 0, 5, 0, 7, 0]);
  reset(cpu);
  for (let k = 0; k < 15; k++) pulse(cpu);
  const s = snapshot(cpu);
  expect("AND: tras 15 pulsos OUT = 2", s.OUT === 2, JSON.stringify(s));
}

/* --- [3] Desborde: 1 F 2 1 3 0 5 0 7 0 → OUT=0 --- */
{
  const cpu = newCpu([0x1, 0xF, 0x2, 0x1, 0x3, 0, 0x5, 0, 0x7, 0]);
  reset(cpu);
  for (let k = 0; k < 15; k++) pulse(cpu);
  const s = snapshot(cpu);
  expect("Desborde: 15+1 mod 16 → OUT = 0", s.OUT === 0, JSON.stringify(s));
}

/* --- [4] Contador: 1 0 2 1 3 0 5 0 6 4 → OUT = 1,2,...,15,0,1 --- */
{
  const cpu = newCpu([1, 0, 2, 1, 3, 0, 5, 0, 6, 4]);
  reset(cpu);
  const recs = [];
  for (let step = 0; step < 100 && recs.length < 17; step++) {
    pulse(cpu); pulse(cpu); pulse(cpu);                 // 1 instrucción = 3 pulsos
    const s = snapshot(cpu);
    if (s.OP === 5) recs.push(s.OUT);                   // instrucción OUT
  }
  const want = Array.from({ length: 17 }, (_, i) => (i + 1) % 16);   // 1..15, 0, 1
  const ok = recs.length === 17 && want.every((v, i) => recs[i] === v);
  expect("Contador: OUT tras cada OUT = 1,2,...,15,0,1", ok,
    `recs(${recs.length})=${recs.join(",")}`);
}

/* --- [5] RESET tras HALT → re-ejecuta Suma --- */
{
  const cpu = newCpu([1, 5, 2, 3, 3, 0, 5, 0, 7, 0]);
  reset(cpu);
  for (let k = 0; k < 15; k++) pulse(cpu);
  const halted = snapshot(cpu);
  reset(cpu);
  const afterRes = snapshot(cpu);
  for (let k = 0; k < 15; k++) pulse(cpu);
  const again = snapshot(cpu);
  expect("RESET tras HALT: PC=0, T0=1, H=0 y Suma vuelve a dar OUT=8",
    halted.H === 1 && afterRes.PC === 0 && afterRes.T === 0 && afterRes.H === 0 && again.OUT === 8,
    `halt=${JSON.stringify(halted)} reset=${JSON.stringify(afterRes)} rerun=${JSON.stringify(again)}`);
}

/* --- [6] Encendido SIN RESET (documentación, no es FAIL) --- */
{
  const cpu = newCpu([1, 5, 2, 3, 3, 0, 5, 0, 7, 0]);
  for (let k = 0; k < 15; k++) pulse(cpu);
  const s = snapshot(cpu);
  out("INFO Encendido sin RESET (el brief lo espera indeterminado; no es FAIL):");
  out("     " + JSON.stringify(s) + "  · oscilando=" + T.osc());
  out("     Los · (-1) no ejecutan nada: el brief exige RESET como primer paso del encendido.");
  results.push(["INFO encendido sin RESET documentado (siempre pasa)", true]);
}

/* --- [7] tamaño y coste --- */
let perfMs = 0, gates = 0;
{
  const cpu = newCpu([1, 5, 2, 3, 3, 0, 5, 0, 7, 0]);
  reset(cpu);
  gates = T.nGates();
  perfMs = median50(() => T.sim());
  const ok = perfMs < 16;
  expect(`coste: ${gates} compuertas primitivas, simulate() = ${perfMs.toFixed(2)} ms (mediana 50) < 16 ms`, ok,
    "ms=" + perfMs.toFixed(2));
}

/* ---------- reporte ---------- */
out("CPU 4 BITS — prototipo en simulación (docs/cpu-brief.md)" + (TRACE ? " · --trace" : ""));
out("node " + process.version + " · protocolo de reloj: 2 sims por pulso (CLK 1→0)");
out("");
for (const [label, ok] of results)
  out((ok ? "PASS " : "FAIL ") + label);
const failed = results.filter(r => !r[1]).length;
out("");
out(`${results.length - failed}/${results.length} passed` + (failed ? ` · ${failed} FAILED` : " ✓"));

const text = L.join("\n") + "\n";
console.log(text);
fs.writeFileSync(path.join(dir, "tests", "cpu.out.latest.txt"), text);
process.exit(failed ? 1 : 0);