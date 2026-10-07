/* ============================================================
   RENDER
   ============================================================ */
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
let mouse = { x: 0, y: 0 };
let dragComp = null, dragOff = { x: 0, y: 0 };
let wireDrag = null;  // { from: {c,t}, moved, downP } — wire dragged from a terminal
let hoverTerm = null, hoverComp = null, hoverWire = null;

/* Camera: world offset relative to the screen + zoom.
   Pan with middle mouse button · zoom with the wheel (centered on the cursor). */
const cam = { x: 0, y: 0, zoom: 1 };
const ZOOM_MIN = 0.15, ZOOM_MAX = 2.5;
let panning = false, panStart = { x: 0, y: 0 };
let dragSel = null; // drag of a marked selection: [{c, dx, dy}]

function resize() {
  const wrap = document.getElementById("canvasWrap");
  const dpr = window.devicePixelRatio || 1;
  cv.width = wrap.clientWidth * dpr;
  cv.height = wrap.clientHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);

function termPos(comp, tIdx) {
  const [tx, ty] = TYPE_DEFS[comp.type].terms[tIdx];
  const r = comp.rot * Math.PI / 2;
  return {
    x: comp.x + tx * Math.cos(r) - ty * Math.sin(r),
    y: comp.y + tx * Math.sin(r) + ty * Math.cos(r),
  };
}

function drawGrid() {
  const w = cv.clientWidth, h = cv.clientHeight, step = 20 * cam.zoom;
  ctx.fillStyle = "#12141a";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#1c2130";
  const ox = ((cam.x % step) + step) % step;
  const oy = ((cam.y % step) + step) % step;
  for (let x = -ox + step; x < w; x += step)
    for (let y = -oy + step; y < h; y += step)
      ctx.fillRect(x, y, 1.2, 1.2);
}

/* Zoom with the wheel, centered on the cursor.
   The world point under the cursor must stay fixed on screen. */
function zoomAt(px, py, factor) {
  const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.zoom * factor));
  const k = newZoom / cam.zoom;
  // world under the cursor: wx = px - cam.x  →  preserved: px - camNewX = (px - camOldX)·k
  cam.x = px - (px - cam.x) * k;
  cam.y = py - (py - cam.y) * k;
  cam.zoom = newZoom;
}

/* Fit view: zoom and center so every component is on screen
   (close up for a few parts, far out for many). The open lesson
   panel covers the left side, so only the space to its right counts. */
function fitView() {
  const w = cv.clientWidth, h = cv.clientHeight;
  const panel = document.getElementById("lessonPanel");
  const left = panel && panel.style.display !== "none" ? panel.offsetWidth : 0;
  if (!state.components.length) { cam.zoom = 1; cam.x = left + (w - left) / 2; cam.y = h / 2; return; }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of state.components) {
    const pts = [{ x: c.x, y: c.y }, ...TYPE_DEFS[c.type].terms.map((_, i) => termPos(c, i))];
    for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  }
  const pad = 60;  // world units around the parts (labels, terminals)
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  cam.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min((w - left) / (x1 - x0), h / (y1 - y0))));
  cam.x = left + (w - left - (x1 - x0) * cam.zoom) / 2 - x0 * cam.zoom;
  cam.y = (h - (y1 - y0) * cam.zoom) / 2 - y0 * cam.zoom;
}

const NET_COLORS = { high: "#ffd75e", low: "#55617a", unknown: "#39425a", short: "#ff5d5d" };

/* Wires as straight lines: directly from terminal to terminal (crossed). */
function drawOrthoWire(pa, pb) {
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.stroke();
}
const WIRE_ON = "#ffd75e", WIRE_OFF = "#4a5568", WIRE_NONE = "#39425a", WIRE_ERR = "#ff5d5d";

function netColor(v) {
  if (v === 1) return WIRE_ON;
  if (v === 0) return WIRE_OFF;
  if (v === 2) return WIRE_ERR;
  return WIRE_NONE;
}

function drawComp(comp, values, netOf) {
  const activeWire = (netV, on) =>
    netV === 1 ? WIRE_ON : netV === 2 ? WIRE_ERR : on ? WIRE_ON : "#8a93a8";

  ctx.save();
  ctx.translate(comp.x, comp.y);
  ctx.rotate(comp.rot * Math.PI / 2);
  ctx.font = "10px system-ui";
  ctx.textAlign = "center";
  ctx.lineWidth = 1.8;

  if (isGate(comp.type)) {
    const outV = values[netOf.get(comp.id + ":" + OUT_IDX[comp.type])];
    const color = outV === 2 ? WIRE_ERR : outV === 1 ? WIRE_ON : outV === 0 ? "#9aa6ba" : "#8a93a8";
    ctx.strokeStyle = color;

    const body = () => {
      if (comp.type === "and" || comp.type === "nand") {
        ctx.beginPath();
        ctx.moveTo(-16, -16);
        ctx.lineTo(2, -16);
        ctx.arc(2, 0, 16, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(-16, 16);
        ctx.closePath();
        ctx.stroke();
      } else if (comp.type === "or" || comp.type === "nor" || comp.type === "xor") {
        ctx.beginPath();
        ctx.moveTo(-18, -16);
        ctx.quadraticCurveTo(4, -16, 16, 0);
        ctx.quadraticCurveTo(4, 16, -18, 16);
        ctx.quadraticCurveTo(-10, 0, -18, -16);
        ctx.closePath();
        ctx.stroke();
        if (comp.type === "xor") {
          ctx.beginPath();
          ctx.moveTo(-24, -16);
          ctx.quadraticCurveTo(-16, 0, -24, 16);
          ctx.stroke();
        }
      } else if (comp.type === "not") {
        ctx.beginPath();
        ctx.moveTo(-14, -13);
        ctx.lineTo(-14, 13);
        ctx.lineTo(12, 0);
        ctx.closePath();
        ctx.stroke();
      }
      // inversion bubble
      if (comp.type === "nand" || comp.type === "nor" || comp.type === "not") {
        ctx.beginPath();
        ctx.arc(19, 0, 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    body();

    ctx.fillStyle = "#5f6a7f";
    ctx.fillText(TYPE_DEFS[comp.type].label, 0, comp.type === "not" ? 26 : 30);

    // soft glow when the output is 1
    if (outV === 1) {
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = WIRE_ON;
      ctx.beginPath();
      ctx.arc(2, 0, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  else if (comp.type === "switch") {
    ctx.fillStyle = comp.on ? "#9ade3f" : "#4a5568";
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a93a8";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = comp.on ? "#0e1a08" : "#c8d0dd";
    ctx.font = "bold 13px system-ui";
    ctx.fillText(comp.on ? "1" : "0", 0, 4.5);
    // custom name below (if it has one)
    if (comp.label) {
      ctx.fillStyle = "#7a86a0";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(comp.label, 0, 30);
    }
  }
  else if (comp.type === "clock") {
    // clock square: oscillates with the current value
    const on = globalClockState.get(comp.id);
    ctx.fillStyle = "#1e2433";
    ctx.strokeStyle = on ? WIRE_ON : "#8a93a8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-14, -14, 28, 28, 5);
    ctx.fill();
    ctx.stroke();
    // square wave inside
    ctx.strokeStyle = on ? WIRE_ON : "#5f6a7f";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (on) { ctx.moveTo(-9, 5); ctx.lineTo(-9, -5); ctx.lineTo(0, -5); ctx.lineTo(0, 5); }
    else    { ctx.moveTo(-9, 5); ctx.lineTo(-2, 5); ctx.lineTo(-2, -5); ctx.lineTo(9, -5); }
    ctx.stroke();
    ctx.fillStyle = "#5f6a7f";
    ctx.font = "8.5px system-ui";
    ctx.textAlign = "center";
    const freq = globalClockFreq.get(comp.id) ?? 2;
    ctx.fillText(freq + " Hz", 0, 26);
  }
  else if (comp.type === "ram") {
    // RAM box with the current address and viewed cell content
    const data = ramData.get(comp.id);
    const addr = ramAddrView.get(comp.id) ?? 0;
    const cs = values[netOf.get(comp.id + ":9")] === 1;
    const we = values[netOf.get(comp.id + ":8")] === 1;
    const w = 80, h = 140;
    ctx.fillStyle = "#1e2433";
    ctx.strokeStyle = cs ? WIRE_ON : "#7a86a0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = cs ? WIRE_ON : "#aeb8cc";
    ctx.font = "bold 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("RAM16", 0, -h / 2 + 16);
    ctx.font = "10px Consolas, monospace";
    ctx.fillStyle = "#aeb8cc";
    // address in hex and cell content
    const cell = data ? (data[addr] ?? 0) : 0;
    ctx.fillText("addr: " + addr.toString(16).toUpperCase().padStart(1, "0"), 0, 0 - 14);
    ctx.fillText("[" + addr + "] = " + cell.toString(16).toUpperCase().padStart(2, "0"), 0, 2);
    // mode: R (read) or W (write)
    ctx.fillStyle = we && cs ? "#9ade3f" : "#5f6a7f";
    ctx.fillText(cs && we ? "✎ WRITE" : "READ", 0, h / 2 - 12);
  }
  else if (lib[comp.type]) {
    // Packed component: black box with name and labeled pins
    const td = TYPE_DEFS[comp.type];
    const w = 56, h = Math.max(60, td.terms.length * 24);
    const anyHigh = td.terms.some((_, i) => {
      const v = values[netOf.get(comp.id + ":" + i)];
      return v === 1;
    });
    ctx.fillStyle = "#1e2433";
    ctx.strokeStyle = anyHigh ? WIRE_ON : "#7a86a0";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 8);
    ctx.fill();
    ctx.stroke();
    // name
    ctx.fillStyle = anyHigh ? WIRE_ON : "#aeb8cc";
    ctx.font = "bold 9px system-ui";
    ctx.fillText(comp.type, 0, h / 2 + 12);
    // pin labels
    ctx.font = "8.5px system-ui";
    ctx.fillStyle = "#5f6a7f";
    td.termNames.forEach((nm, i) => {
      const [tx, ty] = td.terms[i];
      ctx.fillText(nm, tx < 0 ? -14 : 14, ty + 3);
    });
  }
  else if (comp.type === "out") {
    const v = values[netOf.get(comp.id + ":0")];
    let fill = "#1c2130", stroke = "#8a93a8";
    if (v === 1) { fill = "#ffd75e"; stroke = "#ffd75e"; }
    if (v === 0) { fill = "#1c2130"; stroke = "#55617a"; }
    if (v === 2) { fill = "#5a1f1f"; stroke = WIRE_ERR; }
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(6, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = stroke;
    ctx.font = "10px system-ui";
    ctx.fillText(v === 1 ? "1" : v === 0 ? "0" : v === 2 ? "✕" : "?", 6, 4);
    // custom name below (if it has one)
    if (comp.label) {
      ctx.fillStyle = "#7a86a0";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(comp.label, 6, 30);
    }
  }
  ctx.restore();

  // selection or hover box
  if (comp.sel) {
    ctx.strokeStyle = "#9ade3f";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(comp.x - 32, comp.y - 46, 64, 92);
    ctx.setLineDash([]);
  } else if (comp === hoverComp && state.tool === "select") {
    ctx.strokeStyle = "rgba(255, 215, 94, .5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(comp.x - 30, comp.y - 44, 60, 88);
    ctx.setLineDash([]);
  }
  // NOTE: no X button on the canvas — right click deletes directly
}

function draw() {
  resize();
  drawGrid();

  const sim = simulate();
  const { values, netOf } = sim;

  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.scale(cam.zoom, cam.zoom); // camera: pan + zoom

  // wires: straight lines from terminal to terminal
  for (const w of state.wires) {
    const pa = termPos(byId(w.a.c), w.a.t);
    const pb = termPos(byId(w.b.c), w.b.t);
    const v = values[netOf.get(w.a.c + ":" + w.a.t)];
    ctx.strokeStyle = netColor(v);
    ctx.lineWidth = (v === 1) ? 2.5 : 2;
    if (w === hoverWire) ctx.lineWidth += 1.5;
    drawOrthoWire(pa, pb);
  }

  // preview of the wire dragged from a terminal
  if (wireDrag && wireDrag.moved) {
    const fromComp = byId(wireDrag.from.c);
    const p = termPos(fromComp, wireDrag.from.t);
    ctx.strokeStyle = "rgba(255, 215, 94, .6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    drawOrthoWire(p, mouse);
    ctx.setLineDash([]);
  }

  // components and terminals
  for (const comp of state.components) drawComp(comp, values, netOf);

  for (const comp of state.components) {
    const defs = TYPE_DEFS[comp.type];
    for (let t = 0; t < defs.terms.length; t++) {
      const p = termPos(comp, t);
      const isHover = hoverTerm && hoverTerm.c === comp.id && hoverTerm.t === t;
      const netV = values[netOf.get(comp.id + ":" + t)];
      ctx.beginPath();
      ctx.arc(p.x, p.y, (isHover || (wireDrag && wireDrag.moved)) ? 6 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = isHover ? "#fff" : netColor(netV);
      ctx.fill();
    }
  }

  // selection rectangle in progress
  if (dragBox) {
    ctx.strokeStyle = "rgba(154, 222, 63, .8)";
    ctx.fillStyle = "rgba(154, 222, 63, .08)";
    ctx.lineWidth = 1.5;
    const x = Math.min(dragBox.x1, dragBox.x2), y = Math.min(dragBox.y1, dragBox.y2);
    const w = Math.abs(dragBox.x2 - dragBox.x1), h = Math.abs(dragBox.y2 - dragBox.y1);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  }

  ctx.restore(); // end of the camera

  drawStatus(sim);
  requestAnimationFrame(draw);
}

function drawStatus(sim) {
  const el = document.getElementById("status");
  let html = "";
  if (!state.powerOn) {
    html = t("statusOff");
  } else if (sim.oscillating) {
    html = t("statusOsc");
  } else if (sim.values.includes(2)) {
    html = t("statusShort");
  } else {
    html = t("statusOk", sim.nets.length, state.components.length);
  }
  el.innerHTML = html;
}

