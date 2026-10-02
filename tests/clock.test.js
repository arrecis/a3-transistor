/* ============================================================
   CLOCK TEST — freq must be REAL Hz (full cycles per second)
   run with: node tests/clock.test.js   (node, sin dependencias)
   Loads only js/engine.js in a vm sandbox (same loading pattern
   as tests/lessons.test.js: DOM stubs + const/let → var).
   For each frequency it calls clockTick() for exactly 1 second
   worth of ticks (1000 / CLOCK_TIMER_DT) and counts RISING edges
   per second; expected = freq (tolerance ±1).
   Exit code 1 if any frequency fails.
   ============================================================ */
const fs = require("fs"), vm = require("vm"), path = require("path");
const dir = path.resolve(process.argv[2] ?? path.join(__dirname, ".."));

/* minimal sandbox (copied from tests/lessons.test.js) */
const deep = () => new Proxy(function () {}, {
  get: (t, k) => k === Symbol.toPrimitive ? () => "" : (k === "length" ? 0 : deep()),
  apply: () => deep(), construct: () => deep(), set: () => true,
});

function makeSandbox() {
  const ctx = {
    console, Math, JSON, Map, Set, Array, Uint8Array, Int8Array, String, Number, Object, Boolean, Symbol, Error,
    document: deep(), window: deep(), localStorage: deep(), cv: deep(),
    requestAnimationFrame() {}, setInterval() { return 1; }, clearInterval() {},
    save() {}, i18nLang: () => "es", t: k => k,
  };
  vm.createContext(ctx);
  const src = fs.readFileSync(path.join(dir, "js/engine.js"), "utf8")
    .replace(/^const (\w+)\s*=/gm, "var $1 =").replace(/^let (\w+)\s*=/gm, "var $1 =");
  vm.runInContext(src, ctx, { filename: "js/engine.js" });
  return vm.runInContext(`({
    CLOCK_TIMER_DT,
    addClock(freqHz) {
      state.components = []; state.wires = []; state.nextId = 1;
      const c = { id: state.nextId++, type: "clock", x: 0, y: 0, rot: 0, on: false };
      state.components.push(c);
      globalClockFreq.set(c.id, freqHz);
      globalClockState.set(c.id, false);
      clockAcc.clear();
      return c.id;
    },
    tick() { clockTick(); },
    level(id) { return globalClockState.get(id) ? 1 : 0; },
  })`, ctx);
}

/* run 1 simulated second (25 ticks of 40 ms) and count rising edges */
function risingEdgesPerSecond(freqHz) {
  const S = makeSandbox();
  const id = S.addClock(freqHz);
  const ticks = Math.round(1000 / S.CLOCK_TIMER_DT);   // = 25
  const edges = [];
  for (let k = 0; k < ticks; k++) {
    const before = S.level(id);
    S.tick();
    const after = S.level(id);
    if (before === 0 && after === 1) edges.push(k);
  }
  return edges.length;
}

let failed = 0;
const results = [];
for (const freq of [1, 2, 4, 8, 12]) {
  const got = risingEdgesPerSecond(freq);
  const ok = Math.abs(got - freq) <= 1;               // tolerance ±1
  if (!ok) failed++;
  results.push({ freq, got, ok });
  console.log(`${ok ? "PASS" : "FAIL"} ${freq} Hz → ${got} rising edges/s (esperado ${freq} ±1)`);
}
console.log("");
console.log(failed ? `${results.length - failed}/${results.length} passed` : `${results.length}/${results.length} passed — freq Hz = ciclos completos (2 toggles/Hz) ✓`);
process.exit(failed ? 1 : 0);