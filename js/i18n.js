// ============================================================
// I18N — language dictionary and translation utilities
// Spanish by default; full English. Dynamic switching.
// ============================================================
const I18N = {
  es: {
    // Toolbar
    toolSelect: "<span class='key'>1</span>Seleccionar",
    toolSwitch: "<span class='key'>2</span>Entrada",
    toolOut: "<span class='key'>3</span>Salida",
    toolClock: "<span class='key'>4</span>⏱ Reloj",
    toolRam: "🧠 RAM16",
    toolNot: "<span class='key'>5</span>NOT",
    toolAnd: "<span class='key'>6</span>AND",
    toolOr: "<span class='key'>7</span>OR",
    toolNand: "<span class='key'>8</span>NAND",
    toolNor: "<span class='key'>9</span>NOR",
    toolXor: "<span class='key'>0</span>XOR",
    toolUnpack: "<span class='key'>U</span>↩ Desempaquetar",
    toolPack: "<span class='key'>P</span>📦 Empaquetar",
    // Buttons
    clear: "Limpiar",
    fitView: "<span class='key'>F</span>🔍 Ajustar vista",
    powerOn: "⏻ FUENTE ON",
    powerOff: "⏻ FUENTE OFF",
    // Status
    statusOff: "Fuente <b>apagada</b> — enciéndela para ver las señales.",
    statusOsc: "<span class='warn'>⚠ Oscilación detectada</span> — el circuito nunca se estabiliza.",
    statusShort: "<span class='warn'>⚠ ¡Conflicto!</span> — dos salidas manejan el mismo nodo con valores distintos.",
    statusOk: (n, c) => `<span class="ok">● Estable</span> — ${n} nodos, ${c} componentes.`,
    // Packing
    packCount: (n) => `📦 Marcados: <b>${n}</b>`,
    packTitle: "📦 Empaquetar componente",
    packSelected: (n) => `Selección: <b>${n}</b> componentes.`,
    packNameLabel: "Nombre del componente",
    packNamePh: "ej: FLIPFLOP_D",
    packInLabel: "Pines de entrada <span style='opacity:.7'>(click para elegir, en orden; click de nuevo para quitar)</span>",
    packOutLabel: "Pines de salida",
    packCreate: "Crear componente",
    packCancel: "Cancelar",
    packErrNoName: "Poné un nombre al componente.",
    packErrDup: "Ya existe un componente con ese nombre.",
    packErrNoPins: "Elegí al menos una Entrada y una Salida como pines.",
    packNoInputs: "No hay Entradas en la selección.",
    packNoOutputs: "No hay Salidas en la selección.",
    packBarCreate: "Crear componente",
    packBarCancel: "Cancelar",
    packBarNone: "No marcaste ningún componente todavía.",
    pinSwitch: "ENTRADA",
    pinOut: "SALIDA",
    // Library
    libRow: "🧩 Componentes:",
    libDel: (name, n) => n > 0
      ? `¿Eliminar "${name}" de la biblioteca? También se borrarán ${n} instancia(s) colocada(s) en el canvas.`
      : `¿Eliminar "${name}" de la biblioteca?`,
    libDelTitle: "Eliminar componente de la biblioteca",
    // Pin panel
    pinPanelNote: "Renombrá los pines. Los cambios aplican a <b>todas</b> las instancias de este componente.",
    pinInLabel: "Entradas",
    pinOutLabel: "Salidas",
    pinNameLabel: "Nombre del componente",
    // Clock
    clockTitle: "⏱ Reloj",
    clockNote: "Frecuencia del reloj en Hz (ciclos por segundo).",
    ramHexNote: "Las 16 celdas de tu RAM16, en hexadecimal (cada una guarda un nibble de 4 bits). Editá cualquier celda y queda escrita. El <b>[binario]</b> de ayuda se actualiza mientras escribís.",
    ramDemoBtn: "Cargar programa de ejemplo",
    labelNote: "Poné un nombre para identificar esta pieza (ej: \"S\", \"CLK\", \"resultado\"). Se muestra debajo en el canvas. Si lo dejás en blanco, no se muestra nada.",
    labelPh: "ej: S, CLK, RESULTADO…",
    // Unpack
    unpackNonPacked: "Ese componente no es un empaquetado (es primitivo).",
    helpTitle: "?",
    lessonVerifyLabel: "✓ Verificar",
  },
  en: {
    // Toolbar
    toolSelect: "<span class='key'>1</span>Select",
    toolSwitch: "<span class='key'>2</span>Input",
    toolOut: "<span class='key'>3</span>Output",
    toolClock: "<span class='key'>4</span>⏱ Clock",
    toolRam: "🧠 RAM16",
    toolNot: "<span class='key'>5</span>NOT",
    toolAnd: "<span class='key'>6</span>AND",
    toolOr: "<span class='key'>7</span>OR",
    toolNand: "<span class='key'>8</span>NAND",
    toolNor: "<span class='key'>9</span>NOR",
    toolXor: "<span class='key'>0</span>XOR",
    toolUnpack: "<span class='key'>U</span>↩ Unpack",
    toolPack: "<span class='key'>P</span>📦 Pack",
    // Botones
    clear: "Clear",
    fitView: "<span class='key'>F</span>🔍 Fit view",
    powerOn: "⏻ POWER ON",
    powerOff: "⏻ POWER OFF",
    // Estado
    statusOff: "Power is <b>off</b> — turn it on to see signals.",
    statusOsc: "<span class='warn'>⚠ Oscillation detected</span> — the circuit never settles.",
    statusShort: "<span class='warn'>⚠ Conflict!</span> — two outputs drive the same node with different values.",
    statusOk: (n, c) => `<span class="ok">● Stable</span> — ${n} nets, ${c} components.`,
    // Empaquetado
    packCount: (n) => `📦 Marked: <b>${n}</b>`,
    packTitle: "📦 Pack component",
    packSelected: (n) => `Selection: <b>${n}</b> components.`,
    packNameLabel: "Component name",
    packNamePh: "e.g.: FLIPFLOP_D",
    packInLabel: "Input pins <span style='opacity:.7'>(click to choose, in order; click again to remove)</span>",
    packOutLabel: "Output pins",
    packCreate: "Create component",
    packCancel: "Cancel",
    packErrNoName: "Give the component a name.",
    packErrDup: "A component with that name already exists.",
    packErrNoPins: "Choose at least one Input and one Output as pins.",
    packNoInputs: "No Inputs in the selection.",
    packNoOutputs: "No Outputs in the selection.",
    packBarCreate: "Create component",
    packBarCancel: "Cancel",
    packBarNone: "You haven't marked any component yet.",
    pinSwitch: "INPUT",
    pinOut: "OUTPUT",
    // Biblioteca
    libRow: "🧩 Components:",
    libDel: (name, n) => n > 0
      ? `Delete "${name}" from the library? ${n} placed instance(s) will also be removed.`
      : `Delete "${name}" from the library?`,
    libDelTitle: "Delete component from library",
    // Panel de pines
    pinPanelNote: "Rename the pins. Changes apply to <b>every</b> instance of this component.",
    pinInLabel: "Inputs",
    pinOutLabel: "Outputs",
    pinNameLabel: "Component name",
    // Reloj
    clockTitle: "⏱ Clock",
    clockNote: "Clock frequency in Hz (cycles per second).",
    ramHexNote: "The 16 cells of your RAM16, in hexadecimal (each holds a 4-bit nibble). Edit any cell and it is written. The <b>[binary]</b> hint updates as you type.",
    ramDemoBtn: "Load demo program",
    labelNote: "Give this part a name to identify it (e.g. \"S\", \"CLK\", \"result\"). It shows below on the canvas. Leave it blank and nothing is shown.",
    labelPh: "e.g. S, CLK, RESULT…",
    // Desempaquetar
    unpackNonPacked: "That component is not a packed one (it is primitive).",
    helpTitle: "?",
    lessonVerifyLabel: "✓ Verify",
  },
};

function i18nLang() {
  return localStorage.getItem("lang") || "es";
}

function t(key, ...args) {
  const lang = i18nLang();
  const v = (I18N[lang] && I18N[lang][key]) ?? I18N.es[key] ?? key;
  return typeof v === "function" ? v(...args) : v;
}

/* Apply static translations (data-i18n in the HTML) */
function applyI18nStatic() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.innerHTML = t(el.dataset.i18n);
  });
}

/* Language selector in the toolbar */
function initI18nSelector() {
  const host = document.querySelector("header .spacer");
  if (!host) return;
  const sel = document.createElement("select");
  sel.id = "langSel";
  sel.title = "Language / Idioma";
  sel.innerHTML = `<option value="es">🇪🇸 Español</option><option value="en">🇬🇧 English</option>`;
  sel.value = i18nLang();
  sel.addEventListener("change", () => {
    localStorage.setItem("lang", sel.value);
    applyI18nAll();
  });
  host.appendChild(sel);
}

function applyI18nAll() {
  applyI18nStatic();
  if (document.getElementById("lessonPanel").style.display === "flex" && typeof renderLesson === "function") renderLesson();
  if (typeof syncPowerBtn === "function") syncPowerBtn();
  if (document.getElementById("lessonPanel").style.display === "flex") renderLesson();
}