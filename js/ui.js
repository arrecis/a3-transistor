/* ============================================================
   UI
   ============================================================ */
function setTool(t) {
  state.tool = t;
  wireDrag = null;
  document.querySelectorAll("#tools button, #libTools button").forEach(b =>
    b.classList.toggle("active", b.dataset.tool === t));
  updatePackBar();
}
document.getElementById("tools").addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  setTool(btn.dataset.tool);
});
// Packed components live in their own tool row
document.getElementById("libTools").addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  setTool(btn.dataset.tool);
});

const powerBtn = document.getElementById("powerBtn");
powerBtn.addEventListener("click", () => {
  state.powerOn = !state.powerOn;
  syncPowerBtn();
  save();
});

/* Floating bar for pack mode */
function updatePackBar() {
  const bar = document.getElementById("packBar");
  if (state.tool === "pack") {
    bar.style.display = "flex";
    document.getElementById("packCountLabel").innerHTML = t("packCount",
      state.components.filter(c => c.sel).length);
  } else {
    bar.style.display = "none";
  }
}

document.getElementById("packBarOk").addEventListener("click", () => {
  const sel = state.components.filter(c => c.sel);
  if (!sel.length) { alert(t("packBarNone")); return; }
  openPackModal(sel);
});
document.getElementById("packBarCancel").addEventListener("click", () => {
  for (const c of state.components) delete c.sel;
  setTool("select");
  save();
});

document.getElementById("clearBtn").addEventListener("click", () => {
  if (confirm("¿Borrar todo el circuito?")) {
    state.components = [];
    state.wires = [];
    gateOuts.clear();
    save();
  }
});

/* ============================================================
   PACKING MODAL
   ============================================================ */
let packState = null; // { sel, inputs: [], outputs: [] }

function openPackModal(sel) {
  packState = {
    sel,
    inputs: [],   // "switch" components chosen as input pins
    outputs: [],  // "out" components chosen as output pins
    inOrder: [],  // ids in click order
    outOrder: [],
  };
  const sws = sel.filter(c => c.type === "switch");
  const outs = sel.filter(c => c.type === "out");

  const divIn = document.getElementById("packInputs");
  const divOut = document.getElementById("packOutputs");
  divIn.innerHTML = sws.length ? "" : `<span style="color:var(--dim);font-size:12px">${t("packNoInputs")}</span>`;
  divOut.innerHTML = outs.length ? "" : `<span style="color:var(--dim);font-size:12px">${t("packNoOutputs")}</span>`;

  const mkBtn = (host, comp, list, orderKey) => {
    const b = document.createElement("button");
    b.textContent = (comp.type === "switch" ? "ENTRADA" : "SALIDA") + " #" + comp.id;
    b.style.fontSize = "11px";
    b.style.padding = "3px 8px";
    const refresh = () => {
      const idx = packState[orderKey].indexOf(comp.id);
      b.style.borderColor = idx >= 0 ? "var(--accent)" : "var(--border)";
      b.style.color = idx >= 0 ? "var(--accent)" : "var(--text)";
      b.textContent = b.textContent.replace(/ → \d+$/, "") + (idx >= 0 ? " → " + (idx + 1) : "");
    };
    b.addEventListener("click", () => {
      const i = packState[orderKey].indexOf(comp.id);
      if (i >= 0) packState[orderKey].splice(i, 1);
      else packState[orderKey].push(comp.id);
      refresh();
    });
    refresh();
    host.appendChild(b);
  };
  for (const c of sws) mkBtn(divIn, c, null, "inOrder");
  for (const c of outs) mkBtn(divOut, c, null, "outOrder");

  document.getElementById("packCountLabel").innerHTML = t("packSelected", sel.length);
  document.getElementById("packModal").style.display = "flex";
}

document.getElementById("packCancel").addEventListener("click", () => {
  document.getElementById("packModal").style.display = "none";
  packState = null;
});

document.getElementById("packOk").addEventListener("click", () => {
  const name = document.getElementById("packName").value.trim().toUpperCase().replace(/\s+/g, "_");
  if (!name) { alert(t("packErrNoName")); return; }
  if (TYPE_DEFS[name]) { alert(t("packErrDup")); return; }
  if (!packState.inOrder.length || !packState.outOrder.length) {
    alert(t("packErrNoPins"));
    return;
  }
  const sel = state.components.filter(c => packState.sel.includes(c));
  makePackage(sel, name, packState.inOrder, packState.outOrder);
  document.getElementById("packModal").style.display = "none";
  packState = null;
  // add button to the components row
  addLibBtnToToolbar(name);
  save();
});

function addLibBtnToToolbar(name) {
  const tools = document.getElementById("libTools");
  if (tools.querySelector(`[data-tool="${name}"]`)) return;
  tools.style.display = "flex";
  const b = document.createElement("button");
  b.dataset.tool = name;
  b.innerHTML = "🧩 " + name;
  b.style.paddingRight = "4px";
  // X to delete the component from the library
  const x = document.createElement("span");
  x.textContent = " ✕";
  x.style.cssText = "color:#ff7a7a; margin-left:5px; font-weight:700;";
  x.title = "Eliminar componente de la biblioteca";
  x.addEventListener("click", ev => {
    ev.stopPropagation();  // don't activate the tool
    removeLibComponent(name, b);
  });
  b.appendChild(x);
  tools.appendChild(b);
}

/* Delete a component from the library (with its instances) */
function removeLibComponent(name, btnEl) {
  const n = state.components.filter(c => c.type === name).length;
  const msg = n > 0
    ? `¿Eliminar "${name}" de la biblioteca? También se borrarán ${n} instancia(s) colocada(s) en el canvas.`
    : `¿Eliminar "${name}" de la biblioteca?`;
  if (!confirm(msg)) return;
  // delete placed instances
  const ids = state.components.filter(c => c.type === name).map(c => c.id);
  state.components = state.components.filter(c => c.type !== name);
  state.wires = state.wires.filter(w => !ids.includes(w.a.c) && !ids.includes(w.b.c));
  // delete definition and button
  delete lib[name];
  delete TYPE_DEFS[name];
  delete OUT_IDX[name];
  delete IN_COUNT[name];
  if (btnEl) btnEl.remove();
  else document.querySelector(`#libTools button[data-tool="${name}"]`)?.remove();
  const tools = document.getElementById("libTools");
  if (!tools.querySelector("button")) tools.style.display = "none";
  if (pinPanelFor === name) closePinPanel();
  save();
}

