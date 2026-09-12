/* ============================================================
   BOOTSTRAP
   ============================================================ */
resize();
if (!load()) {
  // clean start: a sample inverter so it isn't empty
  const a  = addComp("switch", -200, 0);
  const no = addComp("not",     -80, 0);
  const q  = addComp("out",      40, 0);
  state.wires.push({ id: state.nextId++, a: { c: a.id, t: 0 }, b: { c: no.id, t: 0 } });
  state.wires.push({ id: state.nextId++, a: { c: no.id, t: 1 }, b: { c: q.id, t: 0 } });
  state.powerOn = true;
  save();
}
// Sync the power button with the loaded state
function syncPowerBtn() {
  const b = document.getElementById("powerBtn");
  b.textContent = state.powerOn ? t("powerOn") : t("powerOff");
  b.className = state.powerOn ? "on" : "off";
}
initI18nSelector();
applyI18nStatic(); // populate buttons with the saved language
syncPowerBtn();
requestAnimationFrame(draw);
