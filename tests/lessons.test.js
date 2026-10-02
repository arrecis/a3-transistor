/* ============================================================
   LESSON CHECK TESTS — run with: node tests/lessons.test.js
   Loads engine.js + pack.js + lessons.js in a sandbox with DOM
   stubs, builds real circuits and runs each lesson's check().
   Correct circuits must pass; known-wrong circuits must fail.
   Exit code 1 if any test fails.
   ============================================================ */
const fs = require("fs"), vm = require("vm"), path = require("path");
const dir = path.resolve(process.argv[2] ?? path.join(__dirname, ".."));

// A do-nothing object: any property or call returns another stub
const deep = () => new Proxy(function () {}, {
  get: (t, k) => k === Symbol.toPrimitive ? () => "" : (k === "length" ? 0 : deep()),
  apply: () => deep(), construct: () => deep(), set: () => true,
});
const ctx = {
  console, Math, JSON, Map, Set, Array, Uint8Array, Int8Array, String, Number, Object, Boolean, Symbol, Error,
  document: deep(), window: deep(), localStorage: deep(), cv: deep(),
  requestAnimationFrame() {}, setInterval() { return 1; }, clearInterval() {},
  save() {}, i18nLang: () => "es", t: k => k,
};
vm.createContext(ctx);
// top-level const/let don't leak into the context: turn them into var
const run = f => vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8")
  .replace(/^const (\w+)\s*=/gm, "var $1 =").replace(/^let (\w+)\s*=/gm, "var $1 ="), ctx, { filename: f });
run("js/engine.js");
try { run("js/pack.js"); } catch (e) { /* UI wiring at the bottom needs a real DOM */ }
run("js/lessons.js");

const T = vm.runInContext(`({
  reset() { state.components = []; state.wires = []; state.nextId = 1; state.powerOn = true; gateOuts.clear();
            for (const k of Object.keys(lib)) delete lib[k]; },
  clearCanvas() { state.components.length = 0; state.wires.length = 0; },
  add(type) { const c = { id: state.nextId++, type, x: state.nextId * 10, y: 0, rot: 0, on: false }; state.components.push(c); return c; },
  w(a, ta, b, tb) { state.wires.push({ id: state.nextId++, a: { c: a.id, t: ta }, b: { c: b.id, t: tb } }); },
  check(i) { return LESSONS[i].check(); },
  // ins/outs in click order
  pack(name, ins, outs) { return makePackage([...state.components], name, ins.map(c => c.id), outs.map(c => c.id)); },
  val(c, t) { const r = simulate(); return r.values[r.netOf.get(c.id + ":" + t)]; },
  lib() { return lib; }, ramData() { return ramData; },
})`, ctx);

const results = [];
// run a lesson check and compare "all items ok" with the expectation
const expectCheck = (label, lessonIdx, expectOk) => {
  let checks;
  try { checks = T.check(lessonIdx); }
  catch (e) { results.push([label, false, "THROW " + e.message]); return; }
  const allOk = checks.every(c => c.ok);
  results.push([label, allOk === expectOk, checks.map(c => (c.ok ? "✓ " : "✗ ") + c.name).join(" | ")]);
};
const expect = (label, ok, info) => results.push([label, ok, info]);

/* ---------- circuit builders ---------- */
// D latch (lesson 7): data comes from terminal (src, st), clock from (clk, ct)
function dLatch(src, st, clk, ct) {
  const n = T.add("not"), a1 = T.add("and"), a2 = T.add("and"), q = T.add("nor"), qn = T.add("nor");
  T.w(src, st, n, 0);
  T.w(src, st, a1, 0); T.w(clk, ct, a1, 1);
  T.w(n, 1, a2, 0); T.w(clk, ct, a2, 1);
  T.w(a2, 2, q, 0); T.w(qn, 2, q, 1);   // Q  = NOR(R, Qn)
  T.w(a1, 2, qn, 0); T.w(q, 2, qn, 1);  // Qn = NOR(S, Q)
  return q;
}
// master-slave flip-flop (lesson 8). edge=false builds the classic
// mistake: both latches clocked by CLK (no ¬CLK on the slave)
function flipFlop({ edge = true, clkFirst = false } = {}) {
  let D, C;
  if (clkFirst) { C = T.add("switch"); D = T.add("switch"); } else { D = T.add("switch"); C = T.add("switch"); }
  const qm = dLatch(D, 0, C, 0);
  const nclk = T.add("not"); T.w(C, 0, nclk, 0);
  const q = edge ? dLatch(qm, 2, nclk, 1) : dLatch(qm, 2, C, 0);
  const out = T.add("out"); T.w(q, 2, out, 0);
  return { D, C, out };
}
// full adder (lesson 14)
function fullAdder({ xor2First = false } = {}) {
  const A = T.add("switch"), B = T.add("switch"), Ci = T.add("switch");
  let x1, x2;
  if (xor2First) { x2 = T.add("xor"); x1 = T.add("xor"); } else { x1 = T.add("xor"); x2 = T.add("xor"); }
  const a1 = T.add("and"), a2 = T.add("and"), o = T.add("or"), S = T.add("out"), Co = T.add("out");
  T.w(A, 0, x1, 0); T.w(B, 0, x1, 1); T.w(x1, 2, x2, 0); T.w(Ci, 0, x2, 1); T.w(x2, 2, S, 0);
  T.w(A, 0, a1, 0); T.w(B, 0, a1, 1); T.w(x1, 2, a2, 0); T.w(Ci, 0, a2, 1);
  T.w(a1, 2, o, 0); T.w(a2, 2, o, 1); T.w(o, 2, Co, 0);
  return { A, B, Ci, S, Co };
}
// FULLADDER pins: A=0, B=1, Cin=2, S=3, Cout=4
function packFullAdder() { T.reset(); const f = fullAdder(); T.pack("FULLADDER", [f.A, f.B, f.Ci], [f.S, f.Co]); T.clearCanvas(); }
// 4-bit ripple adder (lesson 16)
function adder4({ cinSwitch = true } = {}) {
  const fa = [0, 1, 2, 3].map(() => T.add("FULLADDER"));
  const A = [0, 1, 2, 3].map(() => T.add("switch"));
  const B = [0, 1, 2, 3].map(() => T.add("switch"));
  const Cin = cinSwitch ? T.add("switch") : null;
  const S = [];
  for (let i = 0; i < 4; i++) {
    T.w(A[i], 0, fa[i], 0); T.w(B[i], 0, fa[i], 1);
    const s = T.add("out"); T.w(fa[i], 3, s, 0); S.push(s);
    if (i < 3) T.w(fa[i], 4, fa[i + 1], 2);
  }
  if (Cin) T.w(Cin, 0, fa[0], 2);
  const Co = T.add("out"); T.w(fa[3], 4, Co, 0);
  return { A, B, Cin, S, Co };
}
function dec2({ miswire = false, reverseOuts = false, multiActive = false } = {}) {
  const A0 = T.add("switch"), A1 = T.add("switch");
  const n0 = T.add("not"), n1 = T.add("not");
  T.w(A0, 0, n0, 0); T.w(A1, 0, n1, 0);
  const a0 = T.add("and"), a1 = T.add("and"), a2 = T.add("and"), a3 = T.add("and");

  let y0, y1, y2, y3;
  if (reverseOuts) {
    y3 = T.add("out"); y2 = T.add("out"); y1 = T.add("out"); y0 = T.add("out");
  } else {
    y0 = T.add("out"); y1 = T.add("out"); y2 = T.add("out"); y3 = T.add("out");
  }

  T.w(n1, 1, a0, 0); T.w(n0, 1, a0, 1); T.w(a0, 2, y0, 0);
  if (miswire) {
    T.w(n1, 1, a1, 0); T.w(n0, 1, a1, 1); T.w(a1, 2, y1, 0);
  } else {
    T.w(n1, 1, a1, 0); T.w(A0, 0, a1, 1); T.w(a1, 2, y1, 0);
  }
  T.w(A1, 0, a2, 0); T.w(n0, 1, a2, 1); T.w(a2, 2, y2, 0);

  if (multiActive) {
    T.w(A1, 0, a3, 0); T.w(A0, 0, a3, 1);
    T.w(a3, 2, y3, 0);
    T.w(a3, 2, y2, 0);
  } else {
    T.w(A1, 0, a3, 0); T.w(A0, 0, a3, 1);
    T.w(a3, 2, y3, 0);
  }

  return { A0, A1, y0, y1, y2, y3 };
}
function dec3() {
  const A0 = T.add("switch"), A1 = T.add("switch"), A2 = T.add("switch");
  const n0 = T.add("not"), n1 = T.add("not"), n2 = T.add("not");
  T.w(A0, 0, n0, 0); T.w(A1, 0, n1, 0); T.w(A2, 0, n2, 0);
  const a01 = [T.add("and"), T.add("and"), T.add("and"), T.add("and")];
  T.w(n1, 1, a01[0], 0); T.w(n0, 1, a01[0], 1);
  T.w(n1, 1, a01[1], 0); T.w(A0, 0, a01[1], 1);
  T.w(A1, 0, a01[2], 0); T.w(n0, 1, a01[2], 1);
  T.w(A1, 0, a01[3], 0); T.w(A0, 0, a01[3], 1);
  const yOuts = [];
  for (let i = 0; i < 8; i++) {
    const a2_val = !!((i >> 2) & 1);
    const lowAnd = a01[i & 3];
    const finalAnd = T.add("and");
    T.w(lowAnd, 2, finalAnd, 0);
    T.w(a2_val ? A2 : n2, a2_val ? 0 : 1, finalAnd, 1);
    const y = T.add("out");
    T.w(finalAnd, 2, y, 0);
    yOuts.push(y);
  }
  return { A0, A1, A2, yOuts };
}
function ring3({ withReset = true } = {}) {
  const dff = [T.add("DFF"), T.add("DFF"), T.add("DFF")];
  const CLK = T.add("switch");
  dff.forEach(d => T.w(CLK, 0, d, 1));
  if (withReset) {
    const RESET = T.add("switch");
    const nR = T.add("not");
    T.w(RESET, 0, nR, 0);
    const o0 = T.add("or"), a1 = T.add("and"), a2 = T.add("and");
    T.w(RESET, 0, o0, 0); T.w(dff[2], 2, o0, 1); T.w(o0, 2, dff[0], 0);
    T.w(nR, 1, a1, 0); T.w(dff[0], 2, a1, 1); T.w(a1, 2, dff[1], 0);
    T.w(nR, 1, a2, 0); T.w(dff[1], 2, a2, 1); T.w(a2, 2, dff[2], 0);
    return { dff, CLK, RESET };
  } else {
    T.w(dff[2], 2, dff[0], 0);
    T.w(dff[0], 2, dff[1], 0);
    T.w(dff[1], 2, dff[2], 0);
    return { dff, CLK };
  }
}
const setNum = (sws, n) => sws.forEach((s, i) => s.on = !!(n >> i & 1));
const readNum = outs => outs.map((o, i) => { const v = T.val(o, 0); return v === -1 ? NaN : v << i; }).reduce((a, b) => a + b, 0);

/* ---------- tests ---------- */
// s8 — flip-flop
T.reset(); flipFlop();                 expectCheck("s8 correct FF (D created first)", 7, true);
T.reset(); flipFlop({ clkFirst: true }); expectCheck("s8 correct FF (CLK created first)", 7, true);
T.reset(); flipFlop({ edge: false });  expectCheck("s8 fake FF (both latches on CLK) fails", 7, false);

// s9 — packed DFF, both click orders
for (const clkFirst of [false, true]) {
  T.reset(); const f = flipFlop();
  const inst = T.pack("DFF", clkFirst ? [f.C, f.D] : [f.D, f.C], [f.out]);
  const d = T.add("switch"), c = T.add("switch");
  T.w(d, 0, inst, 0); T.w(c, 0, inst, 1);
  expectCheck(`s9 packed DFF (clicked ${clkFirst ? "CLK, D" : "D, CLK"})`, 8, true);
}

// s10 — 2-bit register with LOAD mux
{
  T.reset(); const f = flipFlop(); T.pack("DFF", [f.D, f.C], [f.out]); T.clearCanvas();
  const LOAD = T.add("switch"), CLK = T.add("switch"), nL = T.add("not"); T.w(LOAD, 0, nL, 0);
  for (let i = 0; i < 2; i++) {
    const d = T.add("switch"), a1 = T.add("and"), a2 = T.add("and"), o = T.add("or"), ff = T.add("DFF"), q = T.add("out");
    T.w(d, 0, a1, 0); T.w(LOAD, 0, a1, 1);
    T.w(ff, 2, a2, 0); T.w(nL, 1, a2, 1);
    T.w(a1, 2, o, 0); T.w(a2, 2, o, 1);
    T.w(o, 2, ff, 0); T.w(CLK, 0, ff, 1); T.w(ff, 2, q, 0);
  }
  expectCheck("s10 correct 2-bit register", 9, true);
}

// s11 — MUX with Inputs created in S, B, A order
{
  T.reset(); const S = T.add("switch"), B = T.add("switch"), A = T.add("switch");
  const n = T.add("not"), a1 = T.add("and"), a2 = T.add("and"), o = T.add("or"), out = T.add("out");
  T.w(S, 0, n, 0); T.w(A, 0, a1, 0); T.w(n, 1, a1, 1); T.w(B, 0, a2, 0); T.w(S, 0, a2, 1);
  T.w(a1, 2, o, 0); T.w(a2, 2, o, 1); T.w(o, 2, out, 0);
  expectCheck("s11 correct MUX (Inputs created S, B, A)", 10, true);
}

// s13 — half adder
{
  T.reset(); const A = T.add("switch"), B = T.add("switch"), x = T.add("xor"), a = T.add("and");
  T.w(A, 0, x, 0); T.w(B, 0, x, 1); T.w(A, 0, a, 0); T.w(B, 0, a, 1);
  expectCheck("s13 correct half adder", 12, true);
  T.reset(); const A1 = T.add("switch"), B1 = T.add("switch"), A2 = T.add("switch"), B2 = T.add("switch");
  const x2 = T.add("xor"), a2 = T.add("and");
  T.w(A1, 0, x2, 0); T.w(B1, 0, x2, 1); T.w(A2, 0, a2, 0); T.w(B2, 0, a2, 1);
  expectCheck("s13 XOR and AND on separate Inputs fails", 12, false);
}

// s14 / s15 — full adder and its package
T.reset(); fullAdder();                    expectCheck("s14 correct full adder", 13, true);
T.reset(); fullAdder({ xor2First: true }); expectCheck("s14 correct full adder (XOR2 created first)", 13, true);
T.reset(); { const f = fullAdder(); T.pack("FULLADDER", [f.A, f.B, f.Ci], [f.S, f.Co]); }
expectCheck("s15 packed FULLADDER", 14, true);

// s16 / s17 — 4-bit adder, its experiments and its package
{
  packFullAdder();
  const a = adder4();
  expectCheck("s16 correct 4-bit adder (9 Inputs)", 15, true);
  setNum(a.A, 5); setNum(a.B, 3);
  expect("s16 experiment 5+3 = 8", readNum(a.S) === 8, "S=" + readNum(a.S));
  setNum(a.A, 15); setNum(a.B, 1);
  const s = readNum(a.S), co = T.val(a.Co, 0);
  expect("s16 experiment 15+1 = 0 with Cout=1 (overflow)", s === 0 && co === 1, `S=${s} Cout=${co}`);
  setNum(a.A, 0); setNum(a.B, 0);
  T.pack("ADD4", [...a.A, ...a.B, a.Cin], [...a.S, a.Co]);
  expectCheck("s17 ADD4 packed as the lesson says", 16, true);
}
// regression: a package CONTAINING another package (ADD4 ⊃ FULLADDER)
// must stay connected after flattening (pin pseudo-wires use the
// prefixed id, not the bare one)
{
  packFullAdder();
  const a = adder4();
  T.pack("ADD4", [...a.A, ...a.B, a.Cin], [...a.S, a.Co]);  // pins: A0-A3, B0-B3, Cin | S0-S3, Cout
  T.clearCanvas();
  const inst = T.add("ADD4");
  const A = [0, 1, 2, 3].map(() => T.add("switch"));
  const B = [0, 1, 2, 3].map(() => T.add("switch"));
  const Cin = T.add("switch");
  const S = [0, 1, 2, 3].map(() => T.add("out"));
  const Co = T.add("out");
  for (let i = 0; i < 4; i++) {
    T.w(A[i], 0, inst, i);        // A pin
    T.w(B[i], 0, inst, 4 + i);    // B pin
    T.w(inst, 9 + i, S[i], 0);    // S pin
  }
  T.w(Cin, 0, inst, 8);
  T.w(inst, 13, Co, 0);
  setNum(A, 5); setNum(B, 3);
  const s = readNum(S), co = T.val(Co, 0);
  expect("ADD4 instance (nested boxes) computes 5+3 = 8", s === 8 && co === 0, `S=${s} Cout=${co}`);
}
// why s16 needs a Cin Input: an unconnected pin stays indeterminate (-1)
{
  packFullAdder();
  const a = adder4({ cinSwitch: false });
  setNum(a.A, 5); setNum(a.B, 3);
  const s0 = T.val(a.S[0], 0);
  expect("engine: unconnected Cin leaves S0 indeterminate", s0 === -1, "S0=" + s0);
}
// s19 — Program Counter (PC)
{
  // 1. Correct PC: 4 DFF + incrementer XOR/AND with Cin=1 + MUX per bit with JUMP and 4 destination Inputs
  T.reset();
  const f1 = flipFlop();
  T.pack("DFF", [f1.D, f1.C], [f1.out]);
  T.clearCanvas();

  const dffs = [0, 1, 2, 3].map(() => T.add("DFF"));
  const dest = [0, 1, 2, 3].map(() => T.add("switch"));
  const JUMP = T.add("switch");
  const CLK = T.add("switch");
  const nJump = T.add("not");
  T.w(JUMP, 0, nJump, 0);

  dffs.forEach(d => T.w(CLK, 0, d, 1));

  const xors = [0, 1, 2, 3].map(() => T.add("xor"));
  const ands = [0, 1, 2, 3].map(() => T.add("and"));

  // Incrementer (+1): Cin=1 from nJump (1 during counting when JUMP=0)
  T.w(dffs[0], 2, xors[0], 0);
  T.w(nJump, 1, xors[0], 1);
  T.w(dffs[0], 2, ands[0], 0);
  T.w(nJump, 1, ands[0], 1);

  for (let i = 1; i < 4; i++) {
    T.w(dffs[i], 2, xors[i], 0);
    T.w(ands[i - 1], 2, xors[i], 1);
    T.w(dffs[i], 2, ands[i], 0);
    T.w(ands[i - 1], 2, ands[i], 1);
  }

  // MUX per bit: JUMP*dest + ¬JUMP*inc -> D
  for (let i = 0; i < 4; i++) {
    const aJ = T.add("and"), aI = T.add("and"), o = T.add("or");
    T.w(dest[i], 0, aJ, 0);
    T.w(JUMP, 0, aJ, 1);
    T.w(xors[i], 2, aI, 0);
    T.w(nJump, 1, aI, 1);
    T.w(aJ, 2, o, 0);
    T.w(aI, 2, o, 1);
    T.w(o, 2, dffs[i], 0);
  }

  expectCheck("s19 correct PC", 18, true);

  // 2. PC without MUX/JUMP (only DFF + incrementer): fails because startup indeterminate (-1) stays stuck
  T.reset();
  const f2 = flipFlop();
  T.pack("DFF", [f2.D, f2.C], [f2.out]);
  T.clearCanvas();

  const badDffs = [0, 1, 2, 3].map(() => T.add("DFF"));
  const badClk = T.add("switch");
  const badCin = T.add("switch"); badCin.on = true;
  badDffs.forEach(d => T.w(badClk, 0, d, 1));

  const badXors = [0, 1, 2, 3].map(() => T.add("xor"));
  const badAnds = [0, 1, 2, 3].map(() => T.add("and"));

  T.w(badDffs[0], 2, badXors[0], 0);
  T.w(badCin, 0, badXors[0], 1);
  T.w(badDffs[0], 2, badAnds[0], 0);
  T.w(badCin, 0, badAnds[0], 1);
  T.w(badXors[0], 2, badDffs[0], 0);

  for (let i = 1; i < 4; i++) {
    T.w(badDffs[i], 2, badXors[i], 0);
    T.w(badAnds[i - 1], 2, badXors[i], 1);
    T.w(badDffs[i], 2, badAnds[i], 0);
    T.w(badAnds[i - 1], 2, badAnds[i], 1);
    T.w(badXors[i], 2, badDffs[i], 0);
  }

  expectCheck("s19 PC without MUX/JUMP fails", 18, false);

  // 3. PC with Cin=1 from a constant Input: passes because check tries other inputs during count
  T.reset();
  const f3 = flipFlop();
  T.pack("DFF", [f3.D, f3.C], [f3.out]);
  T.clearCanvas();

  const dffs3 = [0, 1, 2, 3].map(() => T.add("DFF"));
  const dest3 = [0, 1, 2, 3].map(() => T.add("switch"));
  const JUMP3 = T.add("switch");
  const CLK3 = T.add("switch");
  const Cin3 = T.add("switch"); Cin3.on = true;
  const nJump3 = T.add("not");
  T.w(JUMP3, 0, nJump3, 0);

  dffs3.forEach(d => T.w(CLK3, 0, d, 1));

  const xors3 = [0, 1, 2, 3].map(() => T.add("xor"));
  const ands3 = [0, 1, 2, 3].map(() => T.add("and"));

  // Incrementer (+1): Cin from constant Cin3 Input
  T.w(dffs3[0], 2, xors3[0], 0);
  T.w(Cin3, 0, xors3[0], 1);
  T.w(dffs3[0], 2, ands3[0], 0);
  T.w(Cin3, 0, ands3[0], 1);

  for (let i = 1; i < 4; i++) {
    T.w(dffs3[i], 2, xors3[i], 0);
    T.w(ands3[i - 1], 2, xors3[i], 1);
    T.w(dffs3[i], 2, ands3[i], 0);
    T.w(ands3[i - 1], 2, ands3[i], 1);
  }

  // MUX per bit: JUMP*dest + ¬JUMP*inc -> D
  for (let i = 0; i < 4; i++) {
    const aJ = T.add("and"), aI = T.add("and"), o = T.add("or");
    T.w(dest3[i], 0, aJ, 0);
    T.w(JUMP3, 0, aJ, 1);
    T.w(xors3[i], 2, aI, 0);
    T.w(nJump3, 1, aI, 1);
    T.w(aJ, 2, o, 0);
    T.w(aI, 2, o, 1);
    T.w(o, 2, dffs3[i], 0);
  }

  expectCheck("s19 correct PC (Cin=1 from a constant Input)", 18, true);
}

// s22 — RAM16 with data
{
  T.reset(); const ram = T.add("ram"); T.val(ram, 0); T.ramData().get(ram.id)[3] = 7;
  expectCheck("s22 RAM16 with data written", 21, true);
}

// s23 — decoders (DEC2 and DEC3)
{
  T.reset(); dec2();
  expectCheck("DEC2 correcto pasa", 22, true);
}
{
  T.reset(); dec2({ miswire: true });
  expectCheck("DEC2 con una salida mal cableada falla", 22, false);
}
{
  T.reset(); dec2({ reverseOuts: true });
  expectCheck("DEC2 correcto con Salidas creadas en orden inverso PASA", 22, true);
}
{
  T.reset(); dec2({ multiActive: true });
  expectCheck("un decodificador donde un valor enciende 2 salidas FALLA", 22, false);
}
{
  T.reset();
  const d = dec2();
  T.pack("DEC2", [d.A0, d.A1], [d.y1, d.y0, d.y2, d.y3]); // Y1 before Y0
  const checks = T.check(22);
  const boxItem = checks.find(c => c.name.includes("Caja DEC2"));
  expect("DEC2 empaquetada con pines de salida en orden incorrecto (Y1 antes que Y0) hace FALLAR el ítem de la caja",
    boxItem && !boxItem.ok, checks.map(c => (c.ok ? "✓ " : "✗ ") + c.name).join(" | "));
}
{
  T.reset(); dec3();
  expectCheck("DEC3 correcto pasa", 22, true);
}

// s24 — step counter (RING3)
{
  T.reset();
  const f = flipFlop(); T.pack("DFF", [f.D, f.C], [f.out]); T.clearCanvas();
  ring3({ withReset: true });
  expectCheck("RING3 correcto pasa", 23, true);
}
{
  T.reset();
  const f = flipFlop(); T.pack("DFF", [f.D, f.C], [f.out]); T.clearCanvas();
  ring3({ withReset: false });
  expectCheck("RING3 sin RESET (D_T0 = T2 solamente) falla", 23, false);
}

// s18 — ALU4 packed with brief pin order: A0-A3, B0-B3, OP | R0-R3
{
  packFullAdder();
  const a = adder4();
  T.pack("ADD4", [...a.A, ...a.B, a.Cin], [...a.S, a.Co]);
  T.clearCanvas();

  const mA = T.add("switch"), mB = T.add("switch"), mS = T.add("switch");
  const mn = T.add("not"), ma1 = T.add("and"), ma2 = T.add("and"), mo = T.add("or"), mout = T.add("out");
  T.w(mS, 0, mn, 0);
  T.w(mA, 0, ma1, 0); T.w(mn, 1, ma1, 1);
  T.w(mB, 0, ma2, 0); T.w(mS, 0, ma2, 1);
  T.w(ma1, 2, mo, 0); T.w(ma2, 2, mo, 1);
  T.w(mo, 2, mout, 0);
  T.pack("MUX2", [mA, mB, mS], [mout]);
  T.clearCanvas();

  const add4 = T.add("ADD4");
  const A = [0, 1, 2, 3].map(() => T.add("switch"));
  const B = [0, 1, 2, 3].map(() => T.add("switch"));
  const Cin = T.add("switch"); Cin.on = false;
  const OP = T.add("switch");
  const ands = [0, 1, 2, 3].map(() => T.add("and"));
  const muxs = [0, 1, 2, 3].map(() => T.add("MUX2"));
  const R = [0, 1, 2, 3].map(() => T.add("out"));

  for (let i = 0; i < 4; i++) {
    T.w(A[i], 0, add4, i);
    T.w(A[i], 0, ands[i], 0);
    T.w(B[i], 0, add4, 4 + i);
    T.w(B[i], 0, ands[i], 1);
    T.w(add4, 9 + i, muxs[i], 0);
    T.w(ands[i], 2, muxs[i], 1);
    T.w(OP, 0, muxs[i], 2);
    T.w(muxs[i], 3, R[i], 0);
  }
  T.w(Cin, 0, add4, 8);

  T.pack("ALU4", [...A, ...B, OP], R);
  T.clearCanvas();

  const alu = T.add("ALU4");
  const inA = [0, 1, 2, 3].map(() => T.add("switch"));
  const inB = [0, 1, 2, 3].map(() => T.add("switch"));
  const inOP = T.add("switch");
  const outR = [0, 1, 2, 3].map(() => T.add("out"));

  for (let i = 0; i < 4; i++) {
    T.w(inA[i], 0, alu, i);
    T.w(inB[i], 0, alu, 4 + i);
    T.w(alu, 9 + i, outR[i], 0);
  }
  T.w(inOP, 0, alu, 8);

  setNum(inA, 6); setNum(inB, 3);
  inOP.on = false; // OP=0: sum
  const sumVal = readNum(outR);
  inOP.on = true;  // OP=1: AND
  const andVal = readNum(outR);

  expect("ALU4 empaquetada con el orden del brief suma y hace AND correctamente (A=6,B=3: OP=0 → 9, OP=1 → 2)",
    sumVal === 9 && andVal === 2, `sum=${sumVal} and=${andVal}`);
}

// pack — click order defines pin order
{
  T.reset(); const f = flipFlop();       // D gets id 1, CLK id 2
  T.pack("DFF", [f.C, f.D], [f.out]);    // click CLK first
  const def = T.lib().DFF;
  expect("pack: click order defines pin order", def.inStubs[0] === f.C.id, "inStubs=" + def.inStubs.join(","));
}

// s25 — REG4 & Fetch
function packDFFBox() {
  const f = flipFlop();
  T.pack("DFF", [f.D, f.C], [f.out]);
  T.clearCanvas();
}
function packMUX2Box() {
  const a = T.add("switch"), b = T.add("switch"), s = T.add("switch");
  const n = T.add("not"), a1 = T.add("and"), a2 = T.add("and"), o = T.add("or"), out = T.add("out");
  T.w(s, 0, n, 0); T.w(a, 0, a1, 0); T.w(n, 1, a1, 1);
  T.w(b, 0, a2, 0); T.w(s, 0, a2, 1);
  T.w(a1, 2, o, 0); T.w(a2, 2, o, 1); T.w(o, 2, out, 0);
  T.pack("MUX2", [a, b, s], [out]);
  T.clearCanvas();
}
function packREG4Box({ swapPins = false } = {}) {
  const load = T.add("switch"), clk = T.add("switch");
  const D = [], outs = [];
  for (let i = 0; i < 4; i++) {
    const d = T.add("switch"), ff = T.add("DFF"), m = T.add("MUX2");
    T.w(ff, 2, m, 0);
    T.w(d, 0, m, 1);
    T.w(load, 0, m, 2);
    T.w(m, 3, ff, 0); T.w(clk, 0, ff, 1);
    const o = T.add("out"); T.w(ff, 2, o, 0);
    D.push(d); outs.push(o);
  }
  if (swapPins) {
    T.pack("REG4", [...D, clk, load], outs);
  } else {
    T.pack("REG4", [...D, load, clk], outs);
  }
  T.clearCanvas();
}

{
  T.reset(); packDFFBox(); packMUX2Box(); packREG4Box();
  expectCheck("s25 REG4 empaquetado correctamente PASA", 24, true);
}
{
  T.reset(); packDFFBox(); packMUX2Box(); packREG4Box({ swapPins: true });
  expectCheck("s25 REG4 con pines LOAD/CLK invertidos FALLA", 24, false);
}
function packFullAdderBox() {
  const f = fullAdder();
  T.pack("FULLADDER", [f.A, f.B, f.Ci], [f.S, f.Co]);
  T.clearCanvas();
}
function packADD4Box() {
  packFullAdderBox();
  const a = adder4();
  T.pack("ADD4", [...a.A, ...a.B, a.Cin], [...a.S, a.Co]);
  T.clearCanvas();
}
function packRING3Box() {
  const r = T.add("switch"), c = T.add("switch");
  const nR = T.add("not"); T.w(r, 0, nR, 0);
  const f = [0, 1, 2].map(() => T.add("DFF"));
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
function buildFetchStage({ miswire = false } = {}) {
  const clkSw = T.add("switch");
  const rstSw = T.add("switch");
  const ram = T.add("ram");
  const cs = T.add("switch"); cs.on = true;
  const we = T.add("switch"); we.on = false;
  T.w(cs, 0, ram, 9); T.w(we, 0, ram, 8);

  const ring = T.add("RING3");
  T.w(rstSw, 0, ring, 0); T.w(clkSw, 0, ring, 1);

  const pcFf = [0, 1, 2, 3].map(() => T.add("DFF"));
  const inc = T.add("ADD4");
  const one = T.add("switch"); one.on = true;
  const zero = T.add("switch"); zero.on = false;
  T.w(one, 0, inc, 4);
  T.w(zero, 0, inc, 5); T.w(zero, 0, inc, 6); T.w(zero, 0, inc, 7); T.w(zero, 0, inc, 8);

  const mNext = [0, 1, 2, 3].map(() => T.add("MUX2"));
  const mLoad = [0, 1, 2, 3].map(() => T.add("MUX2"));
  const mRst  = [0, 1, 2, 3].map(() => T.add("MUX2"));

  const pcLoad = T.add("or");
  T.w(ring, 2, pcLoad, 0); T.w(ring, 3, pcLoad, 1);

  for (let i = 0; i < 4; i++) {
    T.w(pcFf[i], 2, inc, i);
    T.w(pcFf[i], 2, mLoad[i], 0); T.w(inc, 9 + i, mLoad[i], 1); T.w(pcLoad, 2, mLoad[i], 2);
    T.w(mLoad[i], 3, mRst[i], 0); T.w(zero, 0, mRst[i], 1); T.w(rstSw, 0, mRst[i], 2);
    T.w(mRst[i], 3, pcFf[i], 0); T.w(clkSw, 0, pcFf[i], 1);
    if (!miswire) {
      T.w(pcFf[i], 2, ram, i);
    }
  }

  const opReg = T.add("REG4");
  const argReg = T.add("REG4");
  for (let i = 0; i < 4; i++) {
    T.w(ram, 10 + i, opReg, i);
    T.w(ram, 10 + i, argReg, i);
  }
  T.w(ring, 2, opReg, 4);
  T.w(ring, 3, argReg, 4);
  T.w(clkSw, 0, opReg, 5);
  T.w(clkSw, 0, argReg, 5);
}
{
  T.reset(); packDFFBox(); packMUX2Box(); packREG4Box(); packADD4Box(); packRING3Box();
  buildFetchStage({ miswire: false });
  expectCheck("s25 circuito de Fetch correcto PASA", 24, true);
}
{
  T.reset(); packDFFBox(); packMUX2Box(); packREG4Box(); packADD4Box(); packRING3Box();
  buildFetchStage({ miswire: true });
  expectCheck("s25 circuito de Fetch sin conectar PC a RAM FALLA", 24, false);
}

// s26 — Unidad de control
function packDEC3Box() {
  const d = dec3();
  T.pack("DEC3", [d.A0, d.A1, d.A2], d.yOuts);
  T.clearCanvas();
}

function buildControlUnit({ invertASel = false } = {}) {
  const dec = T.add("DEC3");
  const op0 = T.add("switch"), op1 = T.add("switch"), op2 = T.add("switch");
  T.w(op0, 0, dec, 0);
  T.w(op1, 0, dec, 1);
  T.w(op2, 0, dec, 2);

  const t0 = T.add("switch"), t1 = T.add("switch"), t2 = T.add("switch");

  // T2·JMP (Y6)
  const aTJ = T.add("and");
  T.w(t2, 0, aTJ, 0);
  T.w(dec, 9, aTJ, 1);

  // PC_LOAD = T0 + T1 + T2·JMP
  const oL1 = T.add("or");
  T.w(t1, 0, oL1, 0);
  T.w(aTJ, 2, oL1, 1);
  const pcLoad = T.add("or");
  T.w(t0, 0, pcLoad, 0);
  T.w(oL1, 2, pcLoad, 1);

  // A_SEL = ADD + AND (Y3, Y4)
  const oAA = T.add("or");
  T.w(dec, 6, oAA, 0);
  T.w(dec, 7, oAA, 1);

  // A_LOAD = T2 · (LDA + ADD + AND) (Y1)
  const oLD = T.add("or");
  T.w(dec, 4, oLD, 0);
  T.w(oAA, 2, oLD, 1);
  const aLd = T.add("and");
  T.w(t2, 0, aLd, 0);
  T.w(oLD, 2, aLd, 1);

  // B_LOAD = T2 · LDB (Y2)
  const bLd = T.add("and");
  T.w(t2, 0, bLd, 0);
  T.w(dec, 5, bLd, 1);

  // OUT_LOAD = T2 · OUT (Y5)
  const oLd = T.add("and");
  T.w(t2, 0, oLd, 0);
  T.w(dec, 8, oLd, 1);

  // HALT_SET = T2 · HALT (Y7)
  const aTH = T.add("and");
  T.w(t2, 0, aTH, 0);
  T.w(dec, 10, aTH, 1);

  // 7 Salidas
  const outPcLoad = T.add("out");
  T.w(pcLoad, 2, outPcLoad, 0);

  const outJmpSel = T.add("out");
  T.w(aTJ, 2, outJmpSel, 0);

  const outALoad = T.add("out");
  T.w(aLd, 2, outALoad, 0);

  const outASel = T.add("out");
  if (invertASel) {
    const notASel = T.add("not");
    T.w(oAA, 2, notASel, 0);
    T.w(notASel, 1, outASel, 0);
  } else {
    T.w(oAA, 2, outASel, 0);
  }

  const outBLoad = T.add("out");
  T.w(bLd, 2, outBLoad, 0);

  const outOutLoad = T.add("out");
  T.w(oLd, 2, outOutLoad, 0);

  const outHaltSet = T.add("out");
  T.w(aTH, 2, outHaltSet, 0);
}

{
  T.reset(); packDEC3Box();
  buildControlUnit({ invertASel: false });
  expectCheck("s26 Unidad de control correcta PASA", 25, true);
}
{
  T.reset(); packDEC3Box();
  buildControlUnit({ invertASel: true });
  expectCheck("s26 Unidad de control con A_SEL invertido FALLA", 25, false);
}

// Test de contenido para TODAS las lecciones
{
  const lessons = vm.runInContext("LESSONS", ctx);
  let contentOk = true;
  let reason = "";
  const latexRegex = /\$[A-Za-z\\]/;

  for (let i = 0; i < lessons.length; i++) {
    const L = lessons[i];
    if (!L.theory) {
      contentOk = false;
      reason = `Lección ${L.id || i} (${i}) no tiene 'theory'`;
      break;
    }
    if (!L.theory.es || typeof L.theory.es !== "string" || L.theory.es.trim().length === 0) {
      contentOk = false;
      reason = `Lección ${L.id || i} (${i}) tiene theory.es vacío o ausente`;
      break;
    }
    if (!L.theory.en || typeof L.theory.en !== "string" || L.theory.en.trim().length === 0) {
      contentOk = false;
      reason = `Lección ${L.id || i} (${i}) tiene theory.en vacío o ausente`;
      break;
    }
    if (latexRegex.test(L.theory.es)) {
      contentOk = false;
      reason = `Lección ${L.id || i} (${i}) theory.es contiene LaTeX`;
      break;
    }
    if (latexRegex.test(L.theory.en)) {
      contentOk = false;
      reason = `Lección ${L.id || i} (${i}) theory.en contiene LaTeX`;
      break;
    }
  }

  expect("todas las lecciones tienen theory.es y theory.en válidos y sin LaTeX", contentOk, reason);
}

/* ---------- report ---------- */
let failed = 0;
for (const [label, ok, info] of results) {
  if (!ok) failed++;
  console.log((ok ? "PASS " : "FAIL ") + label + (ok ? "" : "\n     " + info));
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
