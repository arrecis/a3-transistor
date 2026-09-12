/* ============================================================
   PERSISTENCIA
   ============================================================ */
function save() {
  localStorage.setItem("gateLab", JSON.stringify({
    components: state.components, wires: state.wires,
    powerOn: state.powerOn, nextId: state.nextId,
    lib,
    clockFreqs: Object.fromEntries(globalClockFreq),
    ramContents: Object.fromEntries([...ramData].map(([id, arr]) => [id, Array.from(arr)])),
  }));
}
function load() {
  const raw = localStorage.getItem("gateLab");
  if (raw) {
    try {
      const d = JSON.parse(raw);
      Object.assign(state, d);
      // restore the library and register the types
      if (d.lib) {
        Object.assign(lib, d.lib);
        for (const name in lib) registerPackedType(lib[name]);
        for (const name in lib) addLibBtnToToolbar(name);
      }
      // restore clock frequencies
      if (d.clockFreqs) {
        for (const id in d.clockFreqs) {
          globalClockFreq.set(+id, d.clockFreqs[id]);
          globalClockState.set(+id, false);
          clockAcc.set(+id, 0);
        }
      }
      // restore RAM contents
      if (d.ramContents) {
        for (const id in d.ramContents) {
          const arr = d.ramContents[id];
          const data = new Uint8Array(16);
          for (let i = 0; i < 16; i++) data[i] = arr[i] ?? 0;
          ramData.set(+id, data);
        }
      }
      ensureClockTimer();
      return true;
    } catch { /* corrupt → sample */ }
  }
  return false;
}

