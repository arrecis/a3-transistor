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

// s22 — RAM16 with data
{
  T.reset(); const ram = T.add("ram"); T.val(ram, 0); T.ramData().get(ram.id)[3] = 7;
  expectCheck("s22 RAM16 with data written", 21, true);
}

// pack — click order defines pin order
{
  T.reset(); const f = flipFlop();       // D gets id 1, CLK id 2
  T.pack("DFF", [f.C, f.D], [f.out]);    // click CLK first
  const def = T.lib().DFF;
  expect("pack: click order defines pin order", def.inStubs[0] === f.C.id, "inStubs=" + def.inStubs.join(","));
}

/* ---------- report ---------- */
let failed = 0;
for (const [label, ok, info] of results) {
  if (!ok) failed++;
  console.log((ok ? "PASS " : "FAIL ") + label + (ok ? "" : "\n     " + info));
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
