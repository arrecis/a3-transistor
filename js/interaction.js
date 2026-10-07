/* ============================================================
   INTERACTION
   ============================================================ */
function byId(id) { return state.components.find(c => c.id === id); }
function snap(v) { return Math.round(v / 20) * 20; }

function pos(e) {
  const r = cv.getBoundingClientRect();
  // screen → world: subtract camera and divide by zoom
  return { x: (e.clientX - r.left - cam.x) / cam.zoom, y: (e.clientY - r.top - cam.y) / cam.zoom };
}
function screenPos(e) {
  const r = cv.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function hitTerm(p) {
  for (const comp of state.components) {
    const defs = TYPE_DEFS[comp.type];
    for (let t = 0; t < defs.terms.length; t++) {
      const tp = termPos(comp, t);
      if (Math.hypot(tp.x - p.x, tp.y - p.y) < 10) return { c: comp.id, t };
    }
  }
  return null;
}
function hitComp(p) {
  for (let i = state.components.length - 1; i >= 0; i--) {
    const c = state.components[i];
    if (Math.abs(p.x - c.x) <= 32 && Math.abs(p.y - c.y) <= 46) return c;
  }
  return null;
}
function distToSeg(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
function hitWire(p) {
  for (let i = state.wires.length - 1; i >= 0; i--) {
    const w = state.wires[i];
    if (distToSeg(p, termPos(byId(w.a.c), w.a.t), termPos(byId(w.b.c), w.b.t)) < 6) return w;
  }
  return null;
}
function wireExists(a, b) {
  return state.wires.some(w =>
    (w.a.c === a.c && w.a.t === a.t && w.b.c === b.c && w.b.t === b.t) ||
    (w.a.c === b.c && w.a.t === b.t && w.b.c === a.c && w.b.t === a.t));
}

function addComp(type, x, y) {
  const comp = { id: state.nextId++, type, x: snap(x), y: snap(y), rot: 0, on: false };
  if (type === "clock") {
    globalClockFreq.set(comp.id, 2);
    globalClockState.set(comp.id, false);
    clockAcc.set(comp.id, 0);
    ensureClockTimer();
  }
  state.components.push(comp);
  save();
  // after placing, automatically go back to Select mode
  setTool("select");
  return comp;
}

/* Undo for deletions only (Ctrl+Z): before each delete we keep a copy of
   the circuit; the last 5 copies are enough to recover a slip. */
const undoStack = [];
const UNDO_MAX = 5;
function rememberForUndo() {
  undoStack.push(JSON.stringify({
    components: state.components, wires: state.wires,
    clockFreqs: Object.fromEntries(globalClockFreq),
    ram: Object.fromEntries([...ramData].map(([id, arr]) => [id, Array.from(arr)])),
  }));
  if (undoStack.length > UNDO_MAX) undoStack.shift();
}
function undoDelete() {
  const raw = undoStack.pop();
  if (!raw) return;
  const d = JSON.parse(raw);
  // a box deleted from the library meanwhile can't come back
  state.components = d.components.filter(c => TYPE_DEFS[c.type]);
  state.components.forEach(c => c.sel = false);
  const ids = new Set(state.components.map(c => c.id));
  state.wires = d.wires.filter(w => ids.has(w.a.c) && ids.has(w.b.c));
  for (const id in d.clockFreqs) {
    if (globalClockFreq.has(+id)) continue;
    globalClockFreq.set(+id, d.clockFreqs[id]);
    globalClockState.set(+id, false);
    clockAcc.set(+id, 0);
  }
  for (const id in d.ram) if (!ramData.has(+id)) ramData.set(+id, Uint8Array.from(d.ram[id]));
  ensureClockTimer();
  save();
}

function deleteComp(comp) {
  state.components = state.components.filter(c => c !== comp);
  state.wires = state.wires.filter(w => w.a.c !== comp.id && w.b.c !== comp.id);
  gateOuts.delete(comp.id);
  globalClockState.delete(comp.id);
  globalClockFreq.delete(comp.id);
  clockAcc.delete(comp.id);
  ensureClockTimer();
  save();
}

