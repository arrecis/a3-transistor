// ============================================================
// TUTORIAL LESSONS (bilingual: theory and check names
// are {es, en}; the active language is given by i18n.js)
//
// Writing guide for this file:
// - Don't assume prior electronics knowledge.
// - Each lesson: WHAT it is (with an analogy), WHY it matters
//   (its role in the final CPU), list of components with keys,
//   step-by-step wiring, experiment to observe.
// - Define each new term at the moment it appears.
// ============================================================ */

/* Shared verification helpers */
function lessonFind(type, n = 0) {
  const all = state.components.filter(c => c.type === type);
  return all[n] ?? null;
}
function lessonCount(type) {
  return state.components.filter(c => c.type === type).length;
}
/* Evaluates a gate over all combinations of its switches.
   Returns { switches, combos } or null if the wiring isn't there. */
function lessonTruthOf(gate, nIn, outTerm) {
  const switches = [];
  for (let i = 0; i < nIn; i++) {
    const w = state.wires.find(w =>
      (w.a.c === gate.id && w.a.t === i) || (w.b.c === gate.id && w.b.t === i));
    if (!w) return null;
    const otherC = w.a.c === gate.id ? w.b.c : w.a.c;
    const sw = state.components.find(c => c.id === otherC && c.type === "switch");
    if (!sw) return null;
    switches.push(sw);
  }
  const ids = new Set(switches.map(s => s.id));
  if (ids.size !== nIn) return null;
  const combos = [];
  for (let mask = 0; mask < (1 << nIn); mask++) {
    switches.forEach((sw, i) => sw.on = !!(mask & (1 << i)));
    const r = simulate();
    const net = r.netOf.get(gate.id + ":" + outTerm);
    combos.push(r.values[net]);
  }
  switches.forEach(sw => sw.on = false);
  return { switches, combos };
}
/* HTML truth table: last column with 1 highlighted in green. */
function lt(cols, rows) {
  let h = `<table style="border-collapse:collapse;margin:6px 0;font-family:monospace;font-size:12px;">`;
  h += "<tr>" + cols.map(c => `<td style="border:1px solid var(--border);padding:1px 8px;font-weight:600">${c}</td>`).join("") + "</tr>";
  for (const r of rows) {
    h += "<tr>" + r.map((v, i) => {
      const last = i === r.length - 1;
      const style = last && v === 1 ? "color:#9ade3f;font-weight:bold" : "color:var(--dim)";
      return `<td style="border:1px solid var(--border);padding:1px 8px;${last ? style : ""}">${v}</td>`;
    }).join("") + "</tr>";
  }
  return h + "</table>";
}
const LL = (es, en) => ({ es, en });  // bilingual pair
const TXT = (o) => o[i18nLang()] ?? o.es;

const LESSONS = [
  {
    id: "s1",
    title: LL("1. Señales: 0 y 1", "1. Signals: 0 and 1"),
    theory: {
      es: `
        <p>Antes de construir una computadora, entendamos <b>qué es una señal</b>.</p>
        <p>Dentro de un circuito solo hay dos estados posibles: <b>1</b> significa "hay
        señal" (imaginate un cable con energía) y <b>0</b> significa "no hay". Nada más:
        como un interruptor encendido o apagado.</p>
        <p>Lo sorprendente: con solo estos dos valores, organizados en grandes cantidades,
        se representa <i>todo</i> — números, letras, colores de un píxel, esta misma
        lección. Una computadora es una máquina que manipula 0s y 1s a una velocidad
        absurda, usando millones de interruptores diminutos llamados <b>transistores</b>.</p>
        <p>En esta herramienta, cada cable tiene uno de esos dos estados, y lo <b>ves con
        colores</b>: amarillo brillante = 1, gris oscuro = 0.</p>
        <p><b>Componentes que vas a usar (con sus teclas rápidas):</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Entrada</b> (tecla 2) — un interruptor que <i>vos</i> controlás: click sobre él para ponerlo en 1 o en 0</li>
          <li>1× <b>Salida</b> (tecla 3) — un indicador que muestra qué valor llegó hasta él</li>
        </ul>
        <p><b>Misión: tu primer circuito (el más simple posible)</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Colocá la Entrada y la Salida (cada una: apretar la tecla, click en el lienzo)</li>
          <li>Pasá el mouse sobre el círculo (el <i>terminal</i>) de la Entrada hasta que se agrande, apretá y <b>arrastrá</b> hasta el terminal de la Salida: soltás y queda el cable</li>
          <li>Encendé la <b>fuente</b> (botón "⏻ FUENTE" arriba a la derecha): sin ella, nada funciona</li>
          <li>Hacé <b>click sobre la Entrada</b> para alternarla entre 0 y 1, y mirá la Salida</li>
        </ol>
        <p><b>¿Qué acabás de hacer?</b> Conectar un interruptor a una lamparita: la señal
        viaja sin cambios. Parece trivial —y lo es—, pero <i>todo</i> lo que sigue son
        combinaciones de esta idea.</p>`,
      en: `
        <p>Before building a computer, let's understand <b>what a signal is</b>.</p>
        <p>Inside a circuit there are only two possible states: <b>1</b> means "signal
        present" (imagine a wire with energy) and <b>0</b> means "none". Nothing more:
        like a switch that is on or off.</p>
        <p>The surprising part: with just these two values, arranged in huge quantities,
        you can represent <i>everything</i> — numbers, letters, pixel colors, this very
        lesson. A computer is a machine that manipulates 0s and 1s at absurd speed, using
        millions of tiny switches called <b>transistors</b>.</p>
        <p>In this tool, every wire holds one of those states, and you <b>see it with
        colors</b>: bright yellow = 1, dark gray = 0.</p>
        <p><b>Components you'll use (with keyboard shortcuts):</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Input</b> (key 2) — a switch <i>you</i> control: click it to set 1 or 0</li>
          <li>1× <b>Output</b> (key 3) — an indicator showing what value arrived</li>
        </ul>
        <p><b>Mission: your first circuit (the simplest possible)</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Place the Input and the Output (each: press the key, click the canvas)</li>
          <li>Hover over the Input's circle (its <i>terminal</i>) until it grows, press and <b>drag</b> to the Output's terminal: release and the wire stays</li>
          <li>Turn on the <b>power</b> ("⏻ POWER" button top right): without it, nothing works</li>
          <li><b>Click the Input</b> to toggle it between 0 and 1, and watch the Output</li>
        </ol>
        <p><b>What you just did:</b> wired a switch to a light bulb: the signal travels
        unchanged. Trivial — but <i>everything</i> that follows is combinations of this idea.</p>`,
    },
    check() {
      const sw = lessonFind("switch");
      const out = lessonFind("out");
      if (!sw || !out) return [{ name: TXT(LL("Hay una Entrada y una Salida", "There is an Input and an Output")), ok: !!(sw && out) }];
      const wired = state.wires.some(w =>
        (w.a.c === sw.id && w.b.c === out.id) || (w.b.c === sw.id && w.a.c === out.id));
      const results = [
        { name: TXT(LL("Hay una Entrada y una Salida", "There is an Input and an Output")), ok: true },
        { name: TXT(LL("Cable entre ellas", "Wire between them")), ok: wired },
      ];
      if (wired && state.powerOn) {
        sw.on = true;  const hi = simulate().values[simulate().netOf.get(out.id + ":0")];
        sw.on = false; const lo = simulate().values[simulate().netOf.get(out.id + ":0")];
        results.push({ name: TXT(LL("La salida copia la entrada (0→0, 1→1)", "Output copies input (0→0, 1→1)")), ok: hi === 1 && lo === 0 });
      }
      return results;
    },
  },
  {
    id: "s2",
    title: LL("2. NOT: el inversor", "2. NOT: the inverter"),
    theory: {
      es: `
        <p>Una <b>compuerta lógica</b> es una pieza pequeña que lee señales en sus entradas
        y produce una señal en su salida, siguiendo una regla fija. Son los ladrillos con
        los que se construye toda la lógica de una computadora.</p>
        <p>El más simple es el <b>NOT</b>: una entrada, una salida, y la salida es
        <i>siempre lo contrario</i> de la entrada. Entra 1 → sale 0. Entra 0 → sale 1.
        Por eso también se lo llama <b>inversor</b>.</p>
        <p>¿Para qué sirve negar? Para tomar decisiones. "Si <i>no</i> está presionada la
        tecla, seguí" — ese "<i>no</i>" es un NOT. Sin esta pieza, un circuito no puede
        expresar la palabra "no".</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Entrada</b> (tecla 2) — para darle valores al NOT</li>
          <li>1× <b>NOT</b> (tecla 5) — el protagonista</li>
          <li>1× <b>Salida</b> (tecla 3) — para ver el resultado</li>
        </ul>
        <p><b>Conexión:</b> cableá los tres en fila: Entrada → NOT → Salida. Fijate que el
        NOT tiene dos círculos: el de la izquierda es la entrada (A), el de la derecha la
        salida (Y).</p>
        <p><b>El experimento:</b> alterná la Entrada. La Salida siempre muestra el valor
        contrario. Es la primera pieza que <i>transforma</i> señales en vez de solo
        transportarlas.</p>`,
      en: `
        <p>A <b>logic gate</b> is a small part that reads signals on its inputs and produces
        a signal on its output, following a fixed rule. Gates are the bricks all computer
        logic is built from.</p>
        <p>The simplest is the <b>NOT</b>: one input, one output, and the output is
        <i>always the opposite</i> of the input. 1 in → 0 out. 0 in → 1 out.
        It is also called an <b>inverter</b> for that reason.</p>
        <p>Why is negating useful? Decisions. "If the key is <i>not</i> pressed, continue" —
        that "<i>not</i>" is a NOT. Without it, circuits couldn't express the word "no".</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Input</b> (key 2) — to feed values to the NOT</li>
          <li>1× <b>NOT</b> (key 5) — the star</li>
          <li>1× <b>Output</b> (key 3) — to see the result</li>
        </ul>
        <p><b>Wiring:</b> wire the three in a row: Input → NOT → Output. Notice the NOT has
        two circles: left one is the input (A), right one the output (Y).</p>
        <p><b>The experiment:</b> toggle the Input. The Output always shows the opposite
        value. This is the first part that <i>transforms</i> signals instead of just
        carrying them.</p>`,
    },
    check() {
      const not = lessonFind("not");
      const noName = TXT(LL("Hay un NOT en el circuito", "There is a NOT in the circuit"));
      if (!not) return [{ name: noName, ok: false }];
      const t = lessonTruthOf(not, 1, 1);
      if (!t) return [{ name: TXT(LL("Entrada→NOT→Salida conectados", "Input→NOT→Output wired")), ok: false }];
      return [
        { name: noName, ok: true },
        { name: TXT(LL("Entrada 0 → salida 1", "Input 0 → output 1")), ok: t.combos[0] === 1 },
        { name: TXT(LL("Entrada 1 → salida 0", "Input 1 → output 0")), ok: t.combos[1] === 0 },
      ];
    },
  },
  {
    id: "s3",
    title: LL("3. AND y OR: decidir", "3. AND and OR: deciding"),
    theory: {
      es: `
        <p>Las siguientes compuertas tienen <b>2 entradas</b>: comparan dos señales y deciden
        qué salida producir. Son el mecanismo con el que una computadora toma decisiones.</p>
        <p><b>AND</b> — la salida vale 1 <i>solo si ambas entradas</i> valen 1. Es el
        "<b>y</b>" estricto del lenguaje:</p>
        ${lt(["A", "B", "AND"], [[0,0,0],[0,1,0],[1,0,0],[1,1,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>"Tengo llave <b>Y</b> la puerta está abierta" →
        paso solo si las dos cosas son verdad. Si falta una, no paso.</i></p>
        <p><b>OR</b> — la salida vale 1 si <i>al menos una</i> entrada vale 1. Es el
        "<b>o</b>" inclusivo:</p>
        ${lt(["A", "B", "OR"], [[0,0,0],[0,1,1],[1,0,1],[1,1,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>"Llueve <b>O</b> hace frío" → me llevo el abrigo
        si pasa cualquiera de las dos, o las dos a la vez.</i></p>
        <p>Estas tablas se llaman <b>tablas de verdad</b>: muestran la salida para cada
        combinación posible de entradas. Las vas a ver en toda la serie.</p>
        <p><b>Misión — armá estos DOS circuitos separados:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li><b>Circuito AND:</b> 2 Entradas (tecla 2) → una a cada entrada del AND (tecla 6) → la salida del AND a una Salida (tecla 3)</li>
          <li><b>Circuito OR:</b> otras 2 Entradas → una a cada entrada del OR (tecla 7) → a otra Salida</li>
        </ol>
        <p><b>El experimento:</b> en el AND, probá las 4 combinaciones de tus dos Entradas:
        la salida solo se enciende con 1 y 1. En el OR, se apaga solo con 0 y 0. Notá la
        diferencia de personalidad: el AND es exigente, el OR es conformista.</p>`,
      en: `
        <p>The next gates have <b>2 inputs</b>: they compare two signals and decide what to
        output. They are the mechanism by which a computer makes decisions.</p>
        <p><b>AND</b> — output is 1 <i>only if both inputs</i> are 1. The strict
        "<b>and</b>":</p>
        ${lt(["A", "B", "AND"], [[0,0,0],[0,1,0],[1,0,0],[1,1,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>"I have the key <b>AND</b> the door is open" →
        I pass only if both are true. Missing one? No pass.</i></p>
        <p><b>OR</b> — output is 1 if <i>at least one</i> input is 1. The inclusive
        "<b>or</b>":</p>
        ${lt(["A", "B", "OR"], [[0,0,0],[0,1,1],[1,0,1],[1,1,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>"It's raining <b>OR</b> it's cold" →
        I take a coat if either happens, or both.</i></p>
        <p>These tables are called <b>truth tables</b>: they show the output for every
        possible input combination. You'll see them throughout the series.</p>
        <p><b>Mission — build these TWO separate circuits:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li><b>AND circuit:</b> 2 Inputs (key 2) → one into each AND input (key 6) → the AND's output to an Output (key 3)</li>
          <li><b>OR circuit:</b> 2 other Inputs → one into each OR input (key 7) → another Output</li>
        </ol>
        <p><b>The experiment:</b> on the AND, try all 4 combinations: the output only lights
        with 1 and 1. On the OR, it only goes dark with 0 and 0. Notice the personality:
        AND is demanding, OR is easygoing.</p>`,
    },
    check() {
      const results = [];
      const and = lessonFind("and");
      const or = lessonFind("or");
      if (and) {
        const t = lessonTruthOf(and, 2, 2);
        if (t) {
          results.push({ name: TXT(LL("AND: 00→0, 01→0, 10→0, 11→1", "AND: 00→0, 01→0, 10→0, 11→1")),
            ok: t.combos[0]===0 && t.combos[1]===0 && t.combos[2]===0 && t.combos[3]===1 });
        } else results.push({ name: TXT(LL("AND cableada a 2 Entradas y Salida", "AND wired to 2 Inputs and an Output")), ok: false });
      } else results.push({ name: TXT(LL("Hay un AND", "There is an AND")), ok: false });
      if (or) {
        const t = lessonTruthOf(or, 2, 2);
        if (t) {
          results.push({ name: TXT(LL("OR: 00→0, 01→1, 10→1, 11→1", "OR: 00→0, 01→1, 10→1, 11→1")),
            ok: t.combos[0]===0 && t.combos[1]===1 && t.combos[2]===1 && t.combos[3]===1 });
        } else results.push({ name: TXT(LL("OR cableada a 2 Entradas y Salida", "OR wired to 2 Inputs and an Output")), ok: false });
      } else results.push({ name: TXT(LL("Hay un OR", "There is an OR")), ok: false });
      return results;
    },
  },
  {
    id: "s4",
    title: LL("4. NAND y XOR", "4. NAND and XOR"),
    theory: {
      es: `
        <p>Dos compuertas más, y con estas cerrás el set básico. Cada una se lee como una
        compuerta conocida <i>más un giro</i>.</p>
        <p><b>NAND</b> = NOT + AND. Primero hace el AND y luego niega el resultado: la salida
        vale 0 <i>solo</i> cuando ambas entradas valen 1 — lo contrario del AND en cada fila:</p>
        ${lt(["A", "B", "NAND"], [[0,0,1],[0,1,1],[1,0,1],[1,1,0]])}
        <p>¿Por qué importa tanto? Porque los chips se fabrican, en esencia, a base de NAND:
        es más fácil de fabricar, y <b>con NAND sola se construye cualquier otro circuito</b> —
        un NOT es un NAND con las dos entradas unidas; un AND es un NAND seguido de un
        NOT... y así hasta una CPU completa. Por eso se la llama la compuerta
        <b>universal</b>.</p>
        <p><b>XOR</b> ("eXclusive OR" — O exclusivo) — la salida vale 1 cuando las entradas
        son <b>diferentes</b> entre sí:</p>
        ${lt(["A", "B", "XOR"], [[0,0,0],[0,1,1],[1,0,1],[1,1,0]])}
        <p style="color:var(--dim); font-size:12px;"><i>"Uno u otro, pero <b>no ambos</b>" — como un pasillo
        con dos puertas: entrás por una o por la otra, nunca por las dos a la vez.</i></p>
        <p>Guardá bien la XOR: es la compuerta que <b>suma bits</b> (1+0=1, 1+1=0 con acarreo),
        y la suma es el corazón de las próximas lecciones.</p>
        <p><b>Misión — armá estos DOS circuitos separados:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li><b>NAND:</b> 2 Entradas (tecla 2) → una a cada entrada del NAND (tecla 8) → su salida a una Salida (tecla 3)</li>
          <li><b>XOR:</b> otras 2 Entradas → XOR (tecla 0) → otra Salida</li>
        </ol>
        <p><b>El experimento:</b> en el NAND, buscá la única combinación que lo apaga (1 y 1).
        En la XOR, cambiá una sola Entrada y mirá cómo la salida "salta" cada vez que las
        señales pasan a ser distintas.</p>`,
      en: `
        <p>Two more gates and you complete the basic set. Each one reads as a familiar gate
        <i>plus a twist</i>.</p>
        <p><b>NAND</b> = NOT + AND. It does the AND first, then negates the result: the output
        is 0 <i>only</i> when both inputs are 1 — the opposite of AND on every row:</p>
        ${lt(["A", "B", "NAND"], [[0,0,1],[0,1,1],[1,0,1],[1,1,0]])}
        <p>Why does it matter so much? Because chips are, at their core, manufactured out of
        NAND: it is easier to fabricate, and <b>every other circuit can be built from NAND
        alone</b> — a NOT is a NAND with both inputs tied; an AND is a NAND followed by a
        NOT... all the way up to a whole CPU. That's why it is called the <b>universal</b>
        gate.</p>
        <p><b>XOR</b> ("eXclusive OR") — the output is 1 when the inputs are <b>different</b>
        from each other:</p>
        ${lt(["A", "B", "XOR"], [[0,0,0],[0,1,1],[1,0,1],[1,1,0]])}
        <p style="color:var(--dim); font-size:12px;"><i>"One or the other, but <b>not both</b>" — like a hallway with
        two doors: you come in through one or the other, never both at once.</i></p>
        <p>Keep XOR in mind: it is the gate that <b>adds bits</b> (1+0=1, 1+1=0 with a
        carry), and addition is the heart of the next lessons.</p>
        <p><b>Mission — build these TWO separate circuits:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li><b>NAND:</b> 2 Inputs (key 2) → one into each NAND input (key 8) → its output to an Output (key 3)</li>
          <li><b>XOR:</b> 2 other Inputs → XOR (key 0) → another Output</li>
        </ol>
        <p><b>The experiment:</b> on the NAND, find the single combination that turns it off
        (1 and 1). On the XOR, change just one Input and watch the output "jump" whenever
        the signals become different.</p>`,
    },
    check() {
      const results = [];
      const nand = lessonFind("nand");
      const xor = lessonFind("xor");
      if (nand) {
        const t = lessonTruthOf(nand, 2, 2);
        if (t) results.push({ name: TXT(LL("NAND: solo 11→0", "NAND: only 11→0")),
          ok: t.combos[0]===1 && t.combos[1]===1 && t.combos[2]===1 && t.combos[3]===0 });
        else results.push({ name: TXT(LL("NAND cableada a 2 Entradas y Salida", "NAND wired to 2 Inputs and an Output")), ok: false });
      } else results.push({ name: TXT(LL("Hay un NAND", "There is a NAND")), ok: false });
      if (xor) {
        const t = lessonTruthOf(xor, 2, 2);
        if (t) results.push({ name: TXT(LL("XOR: 1 solo si son distintas", "XOR: 1 only when different")),
          ok: t.combos[0]===0 && t.combos[1]===1 && t.combos[2]===1 && t.combos[3]===0 });
        else results.push({ name: TXT(LL("XOR cableada a 2 Entradas y Salida", "XOR wired to 2 Inputs and an Output")), ok: false });
      } else results.push({ name: TXT(LL("Hay un XOR", "There is an XOR")), ok: false });
      return results;
    },
  },
  {
    id: "s5",
    title: LL("5. Empaquetar: tu primera caja", "5. Packing: your first box"),
    theory: {
      es: `
        <p>Hasta acá armaste compuertas sueltas. Si siguieras así, una computadora real
        necesitaría <i>miles</i> de compuertas visibles a la vez: inmanejable. La solución es
        uno de los conceptos más importantes de la ingeniería: la <b>abstracción</b>.</p>
        <p>Abstraer es: agrupar piezas en una caja con patas (pines), ponerle un nombre, y de
        ahí en más usar la caja <i>sin pensar en lo de adentro</i>. Los ingenieros reales no
        piensan en los transistores de cada compuerta — piensan en compuertas. De acá en
        más, vos vas a pensar en cajas.</p>
        <p><b>Componentes que necesitás (los de la lección 2):</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Entrada</b> (tecla 2)</li>
          <li>1× <b>NOT</b> (tecla 5)</li>
          <li>1× <b>Salida</b> (tecla 3)</li>
        </ul>
        <p><b>Misión — empaquetar tu NOT como componente reutilizable:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Armá el circuito cableado: Entrada → NOT → Salida</li>
          <li>Presioná <b>📦 Empaquetar</b> (tecla P): entrás al modo de selección</li>
          <li><b>Arrastrá un rectángulo</b> que cubra las 3 piezas: quedan marcadas en verde y abajo aparece una barra con un contador</li>
          <li>Apretá <b>Crear componente</b> (en esa barra)</li>
          <li>Nombralo exactamente <b>MI_NOT</b> (sin espacios, con guion bajo)</li>
          <li>En el diálogo, hacé click sobre la <b>Entrada</b> para marcarla como pin de entrada, y sobre la <b>Salida</b> como pin de salida — el orden de click define el orden de los pines</li>
          <li>Apretá <b>Crear componente</b> para confirmar</li>
        </ol>
        <p><b>¿Qué acaba de pasar?</b> Las 3 piezas colapsaron en una sola caja. Tu
        <b>MI_NOT</b> aparece abajo, en la fila 🧩 de componentes. Colocala, conectale una
        Entrada y una Salida, y probá: funciona como un NOT — pero ahora es
        <i>hardware tuyo, reutilizable</i>.</p>`,
      en: `
        <p>So far you built loose gates. If you kept going that way, a real computer would
        need <i>thousands</i> of visible gates at once: unmanageable. The fix is one of the
        most important ideas in engineering: <b>abstraction</b>.</p>
        <p>Abstracting means: group parts into a box with legs (pins), give it a name, and
        from then on use the box <i>without thinking about the inside</i>. Real engineers
        don't think about the transistors inside each gate — they think in gates. From now
        on, you'll think in boxes.</p>
        <p><b>Components you need (from lesson 2):</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Input</b> (key 2)</li>
          <li>1× <b>NOT</b> (key 5)</li>
          <li>1× <b>Output</b> (key 3)</li>
        </ul>
        <p><b>Mission — pack your NOT as a reusable component:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Build the wired circuit: Input → NOT → Output</li>
          <li>Press <b>📦 Pack</b> (key P): you enter selection mode</li>
          <li><b>Drag a rectangle</b> covering the 3 pieces: they get marked green and a bar with a counter appears at the bottom</li>
          <li>Press <b>Create component</b> (on that bar)</li>
          <li>Name it exactly <b>MI_NOT</b> (no spaces, with underscore)</li>
          <li>In the dialog, click the <b>Input</b> to mark it as an input pin, and the <b>Output</b> as output pin — the click order defines the pin order</li>
          <li>Press <b>Create component</b> to confirm</li>
        </ol>
        <p><b>What just happened?</b> The 3 pieces collapsed into a single box. Your
        <b>MI_NOT</b> appears below, in the 🧩 components row. Place it, wire an Input and an
        Output to it, and check: it works like a NOT — but now it's <i>your own reusable
        hardware</i>.</p>`,
    },
    check() {
      const results = [];
      const def = lib["MI_NOT"];
      results.push({
        name: TXT(LL('Existe un componente llamado "MI_NOT"', 'A component named "MI_NOT" exists')),
        ok: !!def,
      });
      if (def) {
        results.push({ name: TXT(LL("Tiene 1 pin de entrada", "It has 1 input pin")), ok: def.inputs.length === 1 });
        results.push({ name: TXT(LL("Tiene 1 pin de salida", "It has 1 output pin")), ok: def.outputs.length === 1 });
        const inner = def.components ?? [];
        results.push({
          name: TXT(LL("Dentro tiene un NOT (y solo compuertas)", "Inside it has a NOT (and only gates)")),
          ok: inner.some(c => c.type === "not") && inner.every(c => isGate(c.type)),
        });
        const inst = state.components.find(c => c.type === "MI_NOT");
        if (inst) {
          const wIn = state.wires.find(w => w.a.c === inst.id && w.a.t === 0 || w.b.c === inst.id && w.b.t === 0);
          if (wIn) {
            const otherC = wIn.a.c === inst.id ? wIn.b.c : wIn.a.c;
            const sw = state.components.find(c => c.type === "switch" && c.id === otherC);
            if (sw) {
              sw.on = false; let r = simulate();
              const lo = r.values[r.netOf.get(inst.id + ":1")];
              sw.on = true; r = simulate();
              const hi = r.values[r.netOf.get(inst.id + ":1")];
              sw.on = false;
              results.push({ name: TXT(LL("Tu MI_NOT colocado invierte como debe", "Your placed MI_NOT inverts as it should")), ok: lo === 1 && hi === 0 });
            }
          }
        }
      }
      return results;
    },
  },
  {
    id: "s6",
    title: LL("6. Latch SR: la memoria", "6. SR Latch: memory"),
    theory: {
      es: `
        <p>Todo lo que armaste hasta acá era <b>combinatorio</b> — término que solo significa:
        la salida depende <i>únicamente</i> de la entrada actual. Cambiás la entrada, cambia la
        salida. Soltás todo, y el circuito "se olvida" de todo. No hay forma de <i>guardar</i>
        nada. Y una máquina sin memoria no puede hacer mucho: ni recordar un cálculo, ni
        saber dónde está en un programa.</p>
        <p>El salto conceptual más importante del curso es la <b>realimentación</b>
        (feedback): conectar la salida de un circuito a su propia entrada. Suena raro — y es
        exactamente eso lo que lo hace especial: el circuito empieza a influirse a sí mismo.</p>
        <p><b>El latch SR</b> (Set = "poner en 1", Reset = "poner en 0") son dos compuertas NOR
        con las salidas cruzadas hacia las entradas de la otra. Ese cruce hace que el circuito
        <i>recuerde</i> el último comando que recibió:</p>
        ${lt(["S (Set)", "R (Reset)", "Q (resultado)"], [["0","0","se mantiene el valor anterior"],["0","1","0 (reset)"],["1","0","1 (set)"],["1","1","✕ prohibido"]])}
        <p>Leé la primera fila despacio: cuando S y R valen 0, la salida queda como estaba —
        <i>aunque ya nadie la esté empujando</i>. Eso es <b>1 bit de memoria</b>: el bloque
        fundamental de toda la memoria de una computadora.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Entrada</b> (tecla 2) — una será S (Set) y otra R (Reset)</li>
          <li>2× <b>NOR</b> (tecla 9)</li>
          <li>2× <b>Salida</b> (tecla 3) — para ver Q y su inverso Q̄</li>
        </ul>
        <p><b>Conexión — el cruce es la clave:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Entrada R → a una entrada de la NOR de arriba</li>
          <li>Entrada S → a una entrada de la NOR de abajo</li>
          <li>Salida de la NOR de arriba (llamala Q) → a la entrada <i>libre</i> de la NOR de abajo</li>
          <li>Salida de la NOR de abajo (Q̄) → a la entrada <i>libre</i> de la NOR de arriba</li>
          <li>Ambas salidas también a sus Salidas (indicadores) para poder mirarlas</li>
        </ol>
        <p><b>El experimento (hacelo de verdad: es EL momento del curso):</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Poné S=1: Q se enciende (el latch "guarda" el 1)</li>
          <li>Volvé S a 0: <b>Q sigue encendida</b>, aunque nadie la sostenga</li>
          <li>Poné R=1: Q se apaga. Volvé R a 0: <b>Q sigue apagada</b></li>
        </ol>
        <p>El circuito recuerda cuál fue el último comando. Acabás de crear memoria.</p>`,
      en: `
        <p>Everything you built so far was <b>combinational</b> — a term that only means: the
        output depends <i>only</i> on the current input. Change the input, the output changes.
        Release everything, and the circuit "forgets" it all. There is no way to <i>store</i>
        anything. A machine without memory can't do much: it can't remember a calculation,
        nor where it is in a program.</p>
        <p>The most important conceptual leap of the course is <b>feedback</b>: wiring a
        circuit's output back into its own input. It sounds odd — and that's exactly what
        makes it special: the circuit starts influencing itself.</p>
        <p><b>The SR latch</b> (Set = "make it 1", Reset = "make it 0") is two NOR gates with
        outputs cross-wired into each other's inputs. That crossing makes the circuit
        <i>remember</i> the last command it received:</p>
        ${lt(["S (Set)", "R (Reset)", "Q (result)"], [["0","0","previous value is kept"],["0","1","0 (reset)"],["1","0","1 (set)"],["1","1","✕ forbidden"]])}
        <p>Read the first row slowly: when S and R are both 0, the output stays as it was —
        <i>even though nothing is driving it</i>. That is <b>1 bit of memory</b>: the building
        block of all computer memory.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Input</b> (key 2) — one will be S (Set), the other R (Reset)</li>
          <li>2× <b>NOR</b> (key 9)</li>
          <li>2× <b>Output</b> (key 3) — to watch Q and its inverse Q̄</li>
        </ul>
        <p><b>Wiring — the crossing is the key:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Input R → into the top NOR</li>
          <li>Input S → into the bottom NOR</li>
          <li>Top NOR's output (call it Q) → the <i>free</i> input of the bottom NOR</li>
          <li>Bottom NOR's output (Q̄) → the <i>free</i> input of the top NOR</li>
          <li>Both outputs also to Outputs (indicators) so you can watch them</li>
        </ol>
        <p><b>The experiment (really do it: it's THE moment of the course):</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Set S=1: Q lights up (the latch "stores" the 1)</li>
          <li>Set S back to 0: <b>Q stays lit</b>, although nothing holds it</li>
          <li>Set R=1: Q goes off. Set R back to 0: <b>Q stays off</b></li>
        </ol>
        <p>The circuit remembers the last command. You just created memory.</p>`,
    },
  },
  {
    id: "s7",
    title: LL("7. Latch D: memoria con permiso", "7. D Latch: gated memory"),
    theory: {
      es: `
        <p>El latch SR recuerda, pero tiene un problema de diseño: <b>no hay forma de
        coordinar cuándo</b> acepta datos. Imaginá una CPU con cientos de latches: si cada uno
        reacciona apenas cambia su entrada, los cambios se propagan en cualquier momento y en
        desorden. Todo el circuito sería una fiesta sin horarios.</p>
        <p>La solución: un <b>portero</b>. Antes de que el dato llegue al latch, que pase por
        una compuerta que solo se abre cuando una señal de permiso lo autoriza. Esa señal de
        permiso se llama <b>reloj</b> (CLK, de clock) — y es la idea más importante de esta
        lección: <i>toda</i> la CPU va a marchar al ritmo de esa señal común.</p>
        <p><b>El latch D</b> ("D" de <i>Data</i>, dato) hace eso con 5 compuertas: cuando
        CLK=1, la salida Q copia en vivo lo que pongas en D (está "transparente"); cuando
        CLK=0, Q se congela con el último valor que pasó.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Entrada</b> (tecla 2) — D (el dato) y CLK (el permiso)</li>
          <li>1× <b>NOT</b> (tecla 5) — genera ¬D (la negación de D, que se usa para "resetear")</li>
          <li>2× <b>AND</b> (tecla 6) — los "porteros": uno deja pasar D cuando CLK=1, el otro ¬D</li>
          <li>2× <b>NOR</b> (tecla 9) — el latch de memoria del fondo (el que recuerda)</li>
          <li>1-2× <b>Salida</b> (tecla 3)</li>
        </ul>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>D → NOT → a una entrada del AND de abajo (ese AND recibe ¬D)</li>
          <li>D (directo, sin NOT) → a una entrada del AND de arriba</li>
          <li>CLK → a la entrada libre de <b>ambos</b> AND</li>
          <li>Salida del AND de arriba → a una entrada de la NOR de abajo; salida del AND de abajo → a una entrada de la NOR de arriba</li>
          <li>Realimentación cruzada entre las NOR (como en la lección 6): la salida de cada NOR a la entrada libre de la otra</li>
        </ol>
        <p><b>El experimento:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>CLK=1: cambiá D y mirá Q — lo copia en vivo (el latch está "transparente")</li>
          <li>CLK=0: cambiá D — <b>Q no se mueve</b>. La memoria queda congelada con lo último que pasó por el portero</li>
        </ol>
        <p>Es el mismo latch de la lección anterior, pero disciplinado: solo acepta datos
        cuando el reloj se lo permite.</p>`,
      en: `
        <p>The SR latch remembers, but has a design flaw: <b>there's no way to coordinate
        when</b> it accepts data. Imagine a CPU with hundreds of latches: if each one reacts
        the instant its input changes, changes propagate at random times. The whole circuit
        would be a party with no schedule.</p>
        <p>The fix: a <b>gatekeeper</b>. Before data reaches the latch, it passes through a
        gate that only opens when a permission signal says so. That permission signal is the
        <b>clock</b> (CLK) — the most important idea of this lesson: <i>all</i> of the CPU
        will march to that one common signal's rhythm.</p>
        <p><b>The D latch</b> ("D" for <i>Data</i>) does this with 5 gates: when CLK=1, the
        output Q copies live whatever you put on D (it is "transparent"); when CLK=0, Q
        freezes with the last value that passed.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Input</b> (key 2) — D (the data) and CLK (the permission)</li>
          <li>1× <b>NOT</b> (key 5) — generates ¬D (D's negation, used to reset)</li>
          <li>2× <b>AND</b> (key 6) — the gatekeepers: one passes D when CLK=1, the other ¬D</li>
          <li>2× <b>NOR</b> (key 9) — the memory latch at the back (the one that remembers)</li>
          <li>1-2× <b>Output</b> (key 3)</li>
        </ul>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>D → NOT → into one input of the bottom AND (so that AND gets ¬D)</li>
          <li>D (direct, no NOT) → into one input of the top AND</li>
          <li>CLK → the free input of <b>both</b> ANDs</li>
          <li>Top AND's output → into a bottom NOR input; bottom AND's output → into a top NOR input</li>
          <li>Cross feedback between the NORs (like lesson 6): each NOR's output into the other's free input</li>
        </ol>
        <p><b>The experiment:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>CLK=1: change D and watch Q — it copies live (the latch is "transparent")</li>
          <li>CLK=0: change D — <b>Q doesn't move</b>. Memory is frozen with whatever last passed through the gatekeeper</li>
        </ol>
        <p>Same latch as before, but disciplined: it only accepts data when the clock
        allows it.</p>`,
    },
    check() {
      const sws = state.components.filter(c => c.type === "switch");
      const ands = state.components.filter(c => c.type === "and");
      const nors = state.components.filter(c => c.type === "nor");
      const nameNeeds = TXT(LL(
        "Circuito: 2 Entradas (D y CLK), 2 AND, 2 NOR y 1 NOT, conectados",
        "Circuit: 2 Inputs (D and CLK), 2 ANDs, 2 NORs and 1 NOT, wired up"));
      if (sws.length < 2 || ands.length < 2 || nors.length < 2 || !state.components.some(c => c.type === "not"))
        return [{ name: nameNeeds, ok: false }];
      sws.forEach(s => s.on = false);
      function tryLatch() {
        // The lesson doesn't fix a creation order for D/CLK: try both
        // role assignments (like the s6 check does).
        const roles = [[sws[0], sws[1]], [sws[1], sws[0]]];
        for (const [data, g] of roles) {
          for (const qn of nors) {
            for (const [dState, res] of [[false, 0], [true, 1]]) {
              g.on = true; data.on = dState;
              let r = simulate();
              const transp = r.values[r.netOf.get(qn.id + ":2")];
              g.on = false; data.on = !dState;
              r = simulate();
              const held = r.values[r.netOf.get(qn.id + ":2")];
              if (transp === res && held === res) return true;
            }
          }
        }
        return false;
      }
      const works = tryLatch();
      sws.forEach(s => s.on = false);
      return [
        { name: nameNeeds, ok: true },
        { name: TXT(LL("CLK=1: Q sigue a D (transparente); CLK=0: Q se congela (memoria)", "CLK=1: Q follows D (transparent); CLK=0: Q freezes (memory)")), ok: works },
      ];
    },
  },
  {
    id: "s8",
    title: LL("8. Flip-Flop D: memoria por flanco", "8. D Flip-Flop: edge-triggered memory"),
    theory: {
      es: `
        <p>El latch D mejoró las cosas, pero todavía tiene un problema que tiene nombre:
        <b>transparencia</b>. Mientras CLK=1, la salida Q es una "ventana abierta": cualquier
        cambio en D se arrastra a Q al instante.</p>
        <p>¿Por qué es malo? Imaginá conectar la salida de un latch a la entrada de otro, y
        ese a otro más: mientras el reloj esté en 1, un solo cambio se arrastra por <i>toda
        la cadena</i> en el mismo instante. Sin control. Para construir una CPU necesitamos
        que cada pieza registre <b>un solo instante</b> por ciclo de reloj — ni antes, ni
        después.</p>
        <p><b>La solución es elegantísima: dos latches D en cascada</b>, el famoso arreglo
        <b>master-slave</b> (maestro-esclavo):</p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>Maestro</b>: escucha a D mientras CLK=1 (en ese momento el esclavo está congelado)</li>
          <li><b>Esclavo</b>: copia lo que el maestro guardó cuando CLK vuelve a 0 (justo entonces el maestro se congela)</li>
        </ul>
        <p>Los dos nunca están abiertos a la vez. Resultado: la salida Q solo cambia en el
        <b>flanco</b> — el instante exacto en que el reloj pasa de 1 a 0. Una "fotografía" del
        dato por ciclo. Esa pieza se llama <b>flip-flop D</b>, y es con la que se construyen
        todos los registros de una CPU.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Entrada</b> (tecla 2) — D y CLK</li>
          <li>4× <b>NOR</b> (tecla 9) — 2 para el maestro, 2 para el esclavo</li>
          <li>4× <b>AND</b> (tecla 6) — 2 por etapa</li>
          <li>2× <b>NOT</b> (tecla 5) — uno para ¬D, y uno para <b>¬CLK del esclavo</b> (¡este es el truco!)</li>
          <li>1× <b>Salida</b> (tecla 3)</li>
        </ul>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li><b>Maestro:</b> exactamente el latch D de la lección 7. Su salida es QM (la Q del maestro)</li>
          <li><b>Esclavo:</b> otro latch D idéntico, con dos diferencias: su "dato" es QM, y sus AND reciben <b>¬CLK</b> — el reloj pasado por el segundo NOT</li>
        </ol>
        <p><b>El experimento:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Poné D=1 y subí CLK a 1: <i>no pasa nada</i> — el maestro escucha, pero el esclavo está congelado</li>
          <li>Bajá CLK a 0: <b>ahora Q=1</b> — copió el dato en el flanco</li>
          <li>Cambiá D (con CLK=0): Q no se inmuta. Una sola foto por ciclo.</li>
        </ol>
        <p>La diferencia entre latch y flip-flop es exactamente esta: el latch mira durante
        todo el nivel del reloj; el flip-flop, solo en el instante del flanco.</p>`,
      en: `
        <p>The D latch improved things, but still has a named problem: <b>transparency</b>.
        While CLK=1, the output Q is an "open window": any change on D drags to Q instantly.</p>
        <p>Why is that bad? Imagine chaining latches: one's output into the next's input, and
        so on. While the clock is 1, a single change ripples through the <i>whole chain</i> in
        the same instant. No control. To build a CPU we need each part to register <b>one
        single instant</b> per clock cycle — not before, not after.</p>
        <p><b>The solution is elegant: two D latches in cascade</b>, the famous
        <b>master-slave</b> arrangement:</p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>Master</b>: listens to D while CLK=1 (the slave is frozen then)</li>
          <li><b>Slave</b>: copies what the master stored when CLK returns to 0 (the master freezes exactly then)</li>
        </ul>
        <p>They are never open at the same time. Result: the output Q only changes on the
        <b>edge</b> — the exact instant the clock goes 1→0. One "photo" of the data per
        cycle. That piece is called a <b>D flip-flop</b>, and every CPU register is built
        from it.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Input</b> (key 2) — D and CLK</li>
          <li>4× <b>NOR</b> (key 9) — 2 for the master, 2 for the slave</li>
          <li>4× <b>AND</b> (key 6) — 2 per stage</li>
          <li>2× <b>NOT</b> (key 5) — one for ¬D, one for the <b>slave's ¬CLK</b> (this is the trick!)</li>
          <li>1× <b>Output</b> (key 3)</li>
        </ul>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li><b>Master:</b> exactly the D latch from lesson 7. Its output is QM (the master's Q)</li>
          <li><b>Slave:</b> another identical D latch, with two differences: its "data" is QM, and its ANDs receive <b>¬CLK</b> — the clock passed through the second NOT</li>
        </ol>
        <p><b>The experiment:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Set D=1 and raise CLK to 1: <i>nothing happens</i> — the master listens, but the slave is frozen</li>
          <li>Lower CLK to 0: <b>now Q=1</b> — it copied the data on the edge</li>
          <li>Change D (with CLK=0): Q doesn't budge. One photo per cycle.</li>
        </ol>
        <p>The difference between latch and flip-flop is exactly this: the latch watches
        during the whole clock level; the flip-flop, only at the edge instant.</p>`,
    },
    check() {
      const sws = state.components.filter(c => c.type === "switch");
      const nors = state.components.filter(c => c.type === "nor");
      const ands = state.components.filter(c => c.type === "and");
      const nots = state.components.filter(c => c.type === "not");
      const nameNeeds = TXT(LL(
        "Circuito: 4 NOR (2 por etapa), 4 AND, 2 NOT, 2 Entradas",
        "Circuit: 4 NORs (2 per stage), 4 ANDs, 2 NOTs, 2 Inputs"));
      if (nors.length < 4 || ands.length < 4 || nots.length < 2 || sws.length < 2)
        return [{ name: nameNeeds, ok: false }];
      const forQ = TXT(LL("Q copia D solo en el flanco de bajada de CLK", "Q copies D only on CLK's falling edge"));
      const forHold = TXT(LL("Con CLK=0, Q queda congelado aunque D cambie", "With CLK=0, Q stays frozen even if D changes"));
      const forHoldH = TXT(LL("Con CLK=1, Q no sigue a D (sin transparencia)", "With CLK=1, Q doesn't follow D (not transparent)"));
      // Edge behavior: with both latches clocked by CLK (no slave ¬CLK),
      // Q follows D live while CLK=1 — so while the clock is high, flip D
      // and check that Q does NOT move; on the falling edge Q takes the
      // value; with CLK=0 a further D change must not move Q either.
      // The lesson doesn't fix a creation order for D/CLK: test both
      // role assignments (like the s6 check does).
      const roles = [[sws[0], sws[1]], [sws[1], sws[0]]];
      // A single (role, NOR) combination must pass ALL tests for BOTH
      // dState values; the 3 report items all come from that combination
      // (or stay false if none does). No partial credit.
      const ok = { q: false, hold: false, holdH: false };
      for (const [data, g] of roles) {
        for (const qn of nors) {
          if (ok.q && ok.hold && ok.holdH) break;
          let passedTrue = false, passedFalse = false;
          for (const dState of [true, false]) {
            const qv = r => r.values[r.netOf.get(qn.id + ":2")];
            sws.forEach(s => s.on = false);
            g.on = true; data.on = !dState; // CLK=1, D opposite
            simulate();
            data.on = dState; // flip D with CLK=1: for a real FF, Q must NOT move
            let r = simulate();
            const notTransp = qv(r) === (dState ? 0 : 1); // Q still holds the old value
            g.on = false; // falling edge: Q captures the last D
            r = simulate();
            const onEdge = qv(r) === (dState ? 1 : 0);
            data.on = !dState; // CLK=0: change D, Q must hold
            r = simulate();
            const holdLo = qv(r) === (dState ? 1 : 0);
            // reset both roles before the next attempt
            sws.forEach(s => s.on = false);
            if (notTransp && onEdge && holdLo) {
              if (dState) passedTrue = true; else passedFalse = true;
            }
          }
          // the whole combination must pass for BOTH dStates
          if (passedTrue && passedFalse) {
            // the 3 items come from this same combination
            ok.q = ok.hold = ok.holdH = true;
            break;
          }
        }
      }
      return [
        { name: nameNeeds, ok: true },
        { name: forQ, ok: ok.q },
        { name: forHold, ok: ok.hold },
        { name: forHoldH, ok: ok.holdH },
      ];
    },
  },

  {
    id: "s9",
    title: LL("9. Empaquetar el Flip-Flop", "9. Packing the Flip-Flop"),
    theory: {
      es: `
        <p>El flip-flop que armaste tiene 10 compuertas (4 NOR + 4 AND + 2 NOT). Ahora usá
        el superpoder del curso:
        <b>empaquetarlo</b> para que se convierta en una caja con 2 entradas y una salida.
        A partir de ahora, un flip-flop es una pieza más — igual que las compuertas, pero
        más poderosa: <i>recuerda un bit en cada flanco de reloj</i>.</p>
        <p><b>Misión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Con tu flip-flop D en el canvas (el de la lección 8, funcionando)</li>
          <li>Presioná <b>📦 Empaquetar</b> (tecla P) y arrastrá el rectángulo sobre todo el circuito</li>
          <li><b>Crear componente</b> → nombralo <b>DFF</b></li>
          <li>Pines de entrada: la Entrada de <b>D</b> y la de <b>CLK</b> (click en ambos)</li>
          <li>Pines de salida: la <b>Salida</b> del flip-flop</li>
          <li><b>Crear componente</b></li>
        </ol>
        <p>Después colocalo desde la fila 🧩 DFF, conectale una Entrada y un Reloj (⏱, tecla 4)
        y verificá que sigue funcionando por flanco.</p>
        <p style="color:var(--dim); font-size:12px;">💡 Consejo: las Entradas que NO marques como pines quedan como constantes internas (congeladas al valor que tenían). Para el DFF, marcá D y CLK — son las únicas que deben cambiar.</p>`,
      en: `
        <p>The flip-flop you built has 10 gates (4 NORs + 4 ANDs + 2 NOTs). Now for the
        course's superpower:
        <b>pack it</b>. It becomes a box with 2 inputs and 1 output — from now on,
        a flip-flop is just a part — like gates, but more powerful: <i>it remembers one
        bit on every clock edge</i>.</p>
        <p><b>Mission:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>With your D flip-flop on the canvas (from lesson 8, working)</li>
          <li>Press <b>📦 Pack</b> (key P) and drag the rectangle over the whole circuit</li>
          <li><b>Create component</b> → name it <b>DFF</b></li>
          <li>Input pins: the <b>D</b> Input and the <b>CLK</b> Input (click both)</li>
          <li>Output pins: the flip-flop's Output</li>
          <li><b>Create component</b></li>
        </ol>
        <p>Your box <b>DFF</b> appears below, in the 🧩 row. Place it, wire an Input and a
        Clock (⏱, key 4) to it and check it still works edge-triggered.</p>
        <p style="color:var(--dim); font-size:12px;">💡 Tip: Inputs you do NOT mark as pins stay as internal constants (frozen at the value they had). For the DFF, mark D and CLK — they're the only ones that must change.</p>`,
    },
    check() {
      const results = [];
      const def = lib["DFF"];
      results.push({ name: TXT(LL('Existe un componente "DFF"', 'A "DFF" component exists')), ok: !!def });
      if (def) {
        results.push({ name: TXT(LL("Tiene 2 pines de entrada", "It has 2 input pins")), ok: def.inputs.length === 2 });
        results.push({ name: TXT(LL("Tiene al menos 1 pin de salida", "It has at least 1 output pin")), ok: def.outputs.length >= 1 });
        const inner = def.components ?? [];
        results.push({
          name: TXT(LL("El interior tiene las compuertas del flip-flop (4 NOR)", "The inside has the flip-flop gates (4 NORs)")),
          ok: inner.filter(c => c.type === "nor").length >= 4,
        });
        const inst = state.components.find(c => c.type === "DFF");
        if (inst) {
          // makePackage assigns terminals by click order: the lesson never
          // fixes which of D/CLK gets t:0, so try both pin assignments.
          const wireTo = t => {
            const w = state.wires.find(w =>
              (w.a.c === inst.id && w.a.t === t) || (w.b.c === inst.id && w.b.t === t));
            if (!w) return null;
            const otherC = w.a.c === inst.id ? w.b.c : w.a.c;
            return state.components.find(c => c.type === "switch" && c.id === otherC) ?? null;
          };
          const swT0 = wireTo(0), swT1 = wireTo(1);
          if (swT0 && swT1) {
            // pin 0 = D / pin 1 = CLK, and the swapped assignment
            const roles = [[swT0, swT1], [swT1, swT0]];
            let okEdge = false;
            for (const [swD, swC] of roles) {
              swC.on = false; swD.on = true; simulate();
              swC.on = true; simulate();
              swC.on = false; // falling edge captures D=1
              const r = simulate();
              if (r.values[r.netOf.get(inst.id + ":2")] === 1) okEdge = true;
              swD.on = false;
            }
            results.push({
              name: TXT(LL("La instancia DFF copia D en el flanco", "The DFF instance copies D on the edge")),
              ok: okEdge,
            });
          }
        }
      }
      return results;
    },
  },
  {
    id: "s10",
    title: LL("10. Registro de 4 bits", "10. 4-bit register"),
    theory: {
      es: `
        <p>Una CPU necesita guardar <i>palabras</i> completas — varios bits que viajan juntos,
        como los 4 dígitos de un número. Eso es un <b>registro</b>, y la receta es sorprendentemente
        simple: <b>N flip-flops en paralelo, todos compartiendo el mismo reloj</b>. Cada
        flip-flop guarda un bit; juntos, guardan la palabra.</p>
        <p>Pero falta un detalle: así como está, el registro cargaría el dato en <i>todos</i>
        los flancos, sin control. Necesitamos decidir <b>cuándo cargar</b> y cuándo mantener.
        La solución es un <b>MUX de LOAD</b> delante de cada flip-flop, que elige entre dos
        opciones:</p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>LOAD=1</b>: pasa el dato nuevo (se carga en el próximo flanco)</li>
          <li><b>LOAD=0</b>: pasa la propia salida Q del flip-flop — se "reescribe a sí mismo" y por eso queda congelado</li>
        </ul>
        <p style="font-family:monospace; font-size:12px; color:var(--dim)">
        La celda (lo que se repite por cada bit):<br>
        D' = (D y LOAD) o (Q y ¬LOAD) &nbsp;→&nbsp; D' entra al DFF → Q</p>
        <p><b>Componentes que necesitás (por cada bit):</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× <b>Entrada</b> de dato (tecla 2)</li>
          <li>2× <b>AND</b>, 1× <b>OR</b> (teclas 6 y 7) — el mux de LOAD</li>
          <li>1× tu caja <b>DFF</b> 🧩 (de la lección 9)</li>
          <li>1× <b>Salida</b> (tecla 3)</li>
        </ul>
        <p>Y compartidos entre todos los bits: 1× <b>NOT</b> (tecla 5) para ¬LOAD,
        1× <b>Entrada</b> de CLK, 1× <b>Entrada</b> de LOAD
        (o un ⏱ reloj, tecla 4, si preferís que avance solo).</p>
        <p><b>Misión (mínimo 2 bits — podés hacer 4):</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Poné una Entrada LOAD y una Entrada CLK</li>
          <li>Por cada bit: (dato y LOAD) → un AND; (Q y ¬LOAD) → otro AND; ambos → un OR; el OR → el pin D del DFF</li>
        </ol>
        <p><b>El experimento:</b> cargá un valor (LOAD=1 + flanco de CLK), luego LOAD=0 y
        cambiá las Entradas de dato: el registro <b>no cambia</b>. Acabás de construir la
        memoria de trabajo del CPU.</p>`,
      en: `
        <p>A CPU needs to store <i>words</i> — several bits travelling together, like the 4
        digits of a number. That is a <b>register</b>: N flip-flops in parallel, all sharing
        the same clock. Each flip-flop holds one bit; together they hold the word.</p>
        <p>One more detail: as is, the register would load data on <i>every</i> edge. We need
        to decide <b>when to load</b> and when to hold. The fix is a <b>LOAD mux</b> in front
        of each flip-flop, choosing between:</p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>LOAD=1</b>: passes the new data (loads on the next edge)</li>
          <li><b>LOAD=0</b>: passes the flip-flop's own Q output — it "rewrites itself", so it stays frozen</li>
        </ul>
        <p style="font-family:monospace; font-size:12px; color:var(--dim)">
        The cell (repeated per bit):<br>
        D' = (D and LOAD) or (Q and ¬LOAD) &nbsp;→&nbsp; D' feeds the DFF → Q</p>
        <p><b>Components you need (per bit):</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× data <b>Input</b> (key 2)</li>
          <li>2× <b>AND</b>, 1× <b>OR</b> (keys 6, 7) — the LOAD mux</li>
          <li>1× your <b>DFF</b> box 🧩 (from lesson 9)</li>
          <li>1× <b>Output</b> (key 3)</li>
        </ul>
        <p>Shared by all bits: 1× <b>NOT</b> (key 5) for ¬LOAD,
        1× CLK <b>Input</b>, 1× LOAD <b>Input</b> (or a ⏱ clock, key 4).</p>
        <p><b>Mission (2 bits is enough — do 4 if you like):</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Add one LOAD Input and one CLK Input</li>
          <li>Each bit: (data and LOAD) → an AND; (Q and ¬LOAD) → another AND; both → an OR; the OR → the DFF's D pin</li>
        </ol>
        <p><b>The experiment:</b> load a value (LOAD=1 + clock edge), then LOAD=0 and change
        the data Inputs: the register <b>doesn't move</b>. You just built the CPU's working
        memory.</p>`,
    },
    check() {
      const results = [];
      const dff = state.components.filter(c => c.type === "DFF");
      const ors = state.components.filter(c => c.type === "or");
      const sws = state.components.filter(c => c.type === "switch");
      const nameNeeds = TXT(LL(
        "Registro: al menos 2 cajas DFF en paralelo, sus mux de LOAD (OR) y Entradas de LOAD/CLK",
        "At least 2 DFF boxes in parallel, their LOAD muxes (ORs) and LOAD/CLK Inputs"));
      results.push({ name: nameNeeds, ok: dff.length >= 2 && ors.length >= 2 && sws.length >= 3 });
      if (dff.length >= 2) {
        // Functional test on a DFF wired as: mux OR → pin D, switch
        // (or clock) → pin CLK. The lesson doesn't fix a creation order
        // for the inputs, so discover what feeds each mux input from the
        // wiring instead of assuming indexes.
        const wired = dff.filter(d =>
          state.wires.some(w => (w.a.c === d.id && w.a.t === 0) || (w.b.c === d.id && w.b.t === 0)) &&
          state.wires.some(w => (w.a.c === d.id && w.a.t === 1) || (w.b.c === d.id && w.b.t === 1)));
        results.push({
          name: TXT(LL("Cada DFF tiene cable en sus pines D y CLK", "Each DFF has wires on its D and CLK pins")),
          ok: wired.length === dff.length,
        });
        const d = wired[0];
        if (d) {
          // what drives pin CLK: a switch or a clock component
          const wC = state.wires.find(w => (w.a.c === d.id && w.a.t === 1) || (w.b.c === d.id && w.b.t === 1));
          const clkC = state.components.find(c => c.id === (wC.a.c === d.id ? wC.b.c : wC.a.c));
          const swClk = clkC && clkC.type === "switch" ? clkC : null;
          const clock = clkC && clkC.type === "clock" ? clkC : null;
          results.push({
            name: TXT(LL("Hay un NOT para ¬LOAD (tecla 5)", "There is a NOT for ¬LOAD (key 5)")),
            ok: lessonCount("not") >= 1,
          });
          // Gather the switches feeding the cell: walk one level back
          // from the OR that drives pin D — through its ANDs (data,
          // LOAD) — plus any switches wired straight into the OR. The
          // AND fed by the DFF's own Q (feedback) contributes no switch,
          // so it can't pollute the set.
          if (swClk || clock) {
            const qv = r => r.values[r.netOf.get(d.id + ":2")];
            const feeders = new Set();   // switch ids feeding the cell
            const andsAll = state.components.filter(c => c.type === "and");
            const wD2 = state.wires.find(w => (w.a.c === d.id && w.a.t === 0) || (w.b.c === d.id && w.b.t === 0));
            const orC = state.components.find(c => c.id === (wD2.a.c === d.id ? wD2.b.c : wD2.a.c) && c.type === "or");
            if (orC) {
              for (const and of andsAll) {
                // ANDs whose OUTPUT reaches that OR
                const toOr = state.wires.some(w =>
                  (w.a.c === orC.id || w.b.c === orC.id) &&
                  ((w.a.c === and.id && w.a.t === 2) || (w.b.c === and.id && w.b.t === 2)));
                if (!toOr) continue;
                for (const t of [0, 1]) {
                  const w = state.wires.find(w => (w.a.c === and.id && w.a.t === t) || (w.b.c === and.id && w.b.t === t));
                  if (!w) continue;
                  const otherC = w.a.c === and.id ? w.b.c : w.a.c;
                  const sw = state.components.find(c => c.id === otherC && c.type === "switch");
                  if (sw) feeders.add(sw.id);
                }
              }
              // also switches wired straight into the OR (simpler variants)
              for (const t of [0, 1]) {
                const w = state.wires.find(w => (w.a.c === orC.id && w.a.t === t) || (w.b.c === orC.id && w.b.t === t));
                if (!w) continue;
                const otherC = w.a.c === orC.id ? w.b.c : w.a.c;
                const sw = state.components.find(c => c.id === otherC && c.type === "switch");
                if (sw) feeders.add(sw.id);
              }
            }
            const cellSws = sws.filter(s => feeders.has(s.id));
            if (cellSws.length >= 2) {
              // Simulate the cell with REAL edges: raise CLK then lower it
              // (falling edge → DFF must load). Test 1 (load): LOAD=1 + D=1,
              // edge → Q must be 1. Test 2 (hold): all switches off
              // (LOAD=0, D=0), raise and lower CLK again → Q must STILL be
              // 1 (it rewrites itself, not a new value). cellSws[0]/[1] can
              // be (LOAD, D) or (D, LOAD) in either order: with both at 1
              // the edge loads 1 either way, and with both at 0 the hold
              // test works either way.
              const clockPrev = clock ? (globalClockState.get(clock.id) ?? false) : false;
              const clkSet = v => {
                if (swClk) swClk.on = v;
                else globalClockState.set(clock.id, v);
              };
              let okLoadHold = false;
              for (const [sA, sB] of [[cellSws[0], cellSws[1]], [cellSws[1], cellSws[0]]]) {
                sws.forEach(s => s.on = false);
                clkSet(false);
                sA.on = true; sB.on = true; // LOAD=1, D=1 (either order)
                simulate();
                clkSet(true);  // raise CLK
                simulate();
                clkSet(false); // falling edge: must load Q=1
                const qLoad = qv(simulate());
                sws.forEach(s => s.on = false); // LOAD=0, D=0
                clkSet(true);  // raise CLK (LOAD=0: Q feeds back, no change)
                simulate();
                clkSet(false); // falling edge
                const qHold = qv(simulate());
                sws.forEach(s => s.on = false);
                if (qLoad === 1 && qHold === 1) { okLoadHold = true; break; }
              }
              if (clock) { globalClockState.set(clock.id, clockPrev); clockAcc.set(clock.id, 0); }
              results.push({
                name: TXT(LL("LOAD=1 + flanco carga D; LOAD=0 lo mantiene", "LOAD=1 + edge loads D; LOAD=0 holds it")),
                ok: okLoadHold,
              });
            }
          }
        }
      }
      return results;
    },
  },
  {
    id: "s11",
    title: LL("11. MUX: el selector", "11. MUX: the selector"),
    theory: {
      es: `
        <p>Un <b>multiplexor (MUX)</b> es el "desvío ferroviario" de las señales: tiene 2
        entradas de datos (A y B), 1 entrada de <b>selección</b> (S), y 1 salida. Si S=0,
        la salida copia a A; si S=1, copia a B. Un solo bit decide por qué camino va la señal.</p>
        ${lt(["A", "B", "S", "OUT"], [[0,0,0,0],[0,0,1,0],[0,1,0,0],[0,1,1,1],[1,0,0,1],[1,0,1,0],[1,1,0,1],[1,1,1,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>La fórmula es OUT = A·¬S + B·S, pero no hace falta
        memorizarla: bastan 2 AND, 1 NOT y 1 OR. Es la pieza que "elige", y la CPU la usa
        constantemente: qué registro entra a la ALU, qué operación hacer, qué memoria leer.</i></p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>3× <b>Entrada</b> (tecla 2) — A, B y S</li>
          <li>2× <b>AND</b> (tecla 6)</li>
          <li>1× <b>NOT</b> (tecla 5) — para ¬S (la negación de la selección)</li>
          <li>1× <b>OR</b> (tecla 7)</li>
          <li>1× <b>Salida</b> (tecla 3)</li>
        </ul>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>S → NOT (su salida es ¬S)</li>
          <li>A y ¬S → las dos entradas del AND1; B y S → las del AND2</li>
          <li>Salidas de AND1 y AND2 → el OR → la Salida</li>
        </ol>
        <p><b>El experimento:</b> con S=0, la salida copia a A y <i>ignora</i> a B (cambiá B:
        no pasa nada). Con S=1, copia a B e ignora a A. El selector manda.</p>`,
      en: `
        <p>A <b>multiplexer (MUX)</b> is a railway switch for signals: 2 data inputs (A and
        B), 1 <b>select</b> input (S), 1 output. If S=0 the output copies A; if S=1, B.
        One single bit decides which way the signal goes.</p>
        ${lt(["A", "B", "S", "OUT"], [[0,0,0,0],[0,0,1,0],[0,1,0,0],[0,1,1,1],[1,0,0,1],[1,0,1,0],[1,1,0,1],[1,1,1,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>The formula is OUT = A·¬S + B·S, but you don't need to
        memorize it: it takes 2 ANDs, 1 NOT and 1 OR. It is the "chooser" piece, and the CPU
        uses it constantly: which register enters the ALU, which operation to perform, which
        memory to read.</i></p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>3× <b>Input</b> (key 2) — A, B and S</li>
          <li>2× <b>AND</b> (key 6)</li>
          <li>1× <b>NOT</b> (key 5) — for ¬S</li>
          <li>1× <b>OR</b> (key 7)</li>
          <li>1× <b>Output</b> (key 3)</li>
        </ul>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>S → NOT (its output is ¬S)</li>
          <li>A and ¬S → the two AND1 inputs; B and S → the two AND2 inputs</li>
          <li>AND1 and AND2 outputs → the OR → the Output</li>
        </ol>
        <p><b>The experiment:</b> with S=0, the output copies A and <i>ignores</i> B (change
        B: nothing happens). With S=1, it copies B. The selector rules.</p>`,
    },
    check() {
      const ands = state.components.filter(c => c.type === "and");
      const ors = state.components.filter(c => c.type === "or");
      const sws = state.components.filter(c => c.type === "switch");
      const nameNeeds = TXT(LL(
        "Circuito: 3 Entradas, 2 AND, 1 OR, 1 NOT (el mux)",
        "Circuit: 3 Inputs, 2 ANDs, 1 OR, 1 NOT (the mux)"));
      if (sws.length < 3 || ands.length < 2 || ors.length < 1 || !state.components.some(c => c.type === "not"))
        return [{ name: nameNeeds, ok: false }];
      const out = ors[0];
      const qv = () => { const r = simulate(); return r.values[r.netOf.get(out.id + ":2")]; };
      // The lesson doesn't fix a creation order for A/B/S: try every
      // permutation of switch roles (like the s6 check does). Both items
      // must come from the SAME role permutation: a real mux passes both
      // tests under any fixed assignment. No carry-over between
      // permutations; if none passes both, both items report false.
      const perms = [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
      const ok = { sel0: false, sel1: false };
      for (const p of perms) {
        const a = sws[p[0]], b = sws[p[1]], s = sws[p[2]];
        sws.forEach(x => x.on = false);
        s.on = false;
        a.on = false; b.on = true;  const r1 = qv();
        a.on = true;  b.on = false; const r2 = qv();
        s.on = true;
        a.on = false; b.on = false; const r3 = qv();
        a.on = false; b.on = true;  const r4 = qv();
        sws.forEach(x => x.on = false);
        // per permutation: both must hold in THIS permutation
        const sel0 = r1 === 0 && r2 === 1;
        const sel1 = r3 === 0 && r4 === 1;
        if (sel0 && sel1) { ok.sel0 = ok.sel1 = true; break; }
      }
      return [
        { name: nameNeeds, ok: true },
        { name: TXT(LL("S=0 → la salida copia A", "S=0 → output copies A")), ok: ok.sel0 },
        { name: TXT(LL("S=1 → la salida copia B", "S=1 → output copies B")), ok: ok.sel1 },
      ];
    },
  },
  {
    id: "s12",
    title: LL("12. Empaquetá el MUX2", "12. Pack the MUX2"),
    theory: {
      es: `
        <p>El MUX se va a usar a montones en la CPU — <i>decenas</i>: para elegir qué registro
        entra a la ALU, qué operación se ejecuta, qué memoria se lee. Empaquetá el de la
        lección anterior para nunca más volver a dibujar sus 4 compuertas.</p>
        <p><b>Misión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Con el MUX de la lección 11 en el canvas</li>
          <li>📦 Empaquetar (P) → rectángulo sobre todo → <b>Crear componente</b></li>
          <li>Nombralo <b>MUX2</b></li>
          <li>Pines de entrada: las 3 Entradas, <b>en este orden</b>: A, B, S (el orden de click define el orden de los pines)</li>
          <li>Pin de salida: la Salida. <b>Crear componente</b></li>
        </ol>
        <p>Probalo: colocalo desde la fila 🧩, cableale 3 Entradas y una Salida, y alterná S
        mientras movés A y B.</p>
        <p style="color:var(--dim); font-size:12px;">💡 Con tu caja MUX2 + tu caja DFF ya podés armar registros y buses de datos — las próximas lecciones.</p>`,
      en: `
        <p>The MUX will be used everywhere in the CPU — <i>dozens</i> of them: to choose which
        register enters the ALU, which operation runs, which memory to read. Pack the one
        from the previous lesson so you never draw its 4 gates again.</p>
        <p><b>Mission:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>With the MUX from lesson 11 on the canvas</li>
          <li>📦 Pack (P) → rectangle over everything → <b>Create component</b></li>
          <li>Name it <b>MUX2</b></li>
          <li>Input pins: the 3 Inputs, <b>in this order</b>: A, B, S (click order = pin order)</li>
          <li>Output pin: the Output. <b>Create component</b></li>
        </ol>
        <p>Then place it from the 🧩 row, wire 3 Inputs and an Output, and toggle S while
        changing A and B.</p>
        <p style="color:var(--dim); font-size:12px;">💡 With your MUX2 + DFF boxes you can already build registers and data buses — the next lessons.</p>`,
    },
    check() {
      const results = [];
      const def = lib["MUX2"];
      results.push({ name: TXT(LL('Existe un componente "MUX2"', 'A "MUX2" component exists')), ok: !!def });
      if (def) {
        results.push({ name: TXT(LL("Tiene 3 pines de entrada", "It has 3 input pins")), ok: def.inputs.length === 3 });
        results.push({ name: TXT(LL("Tiene 1 pin de salida", "It has 1 output pin")), ok: def.outputs.length === 1 });
        results.push({
          name: TXT(LL("El interior tiene 2 AND y 1 OR", "The inside has 2 ANDs and 1 OR")),
          ok: (def.components ?? []).filter(c => c.type === "and").length === 2
            && (def.components ?? []).filter(c => c.type === "or").length === 1,
        });
        const inst = state.components.find(c => c.type === "MUX2");
        if (inst) {
          const wA = state.wires.find(w => (w.a.c === inst.id && w.a.t === 0) || (w.b.c === inst.id && w.b.t === 0));
          const wB = state.wires.find(w => (w.a.c === inst.id && w.a.t === 1) || (w.b.c === inst.id && w.b.t === 1));
          const wS = state.wires.find(w => (w.a.c === inst.id && w.a.t === 2) || (w.b.c === inst.id && w.b.t === 2));
          if (wA && wB && wS) {
            const swA = state.components.find(c => c.type === "switch" && c.id === (wA.a.c === inst.id ? wA.b.c : wA.a.c));
            const swB = state.components.find(c => c.type === "switch" && c.id === (wB.a.c === inst.id ? wB.b.c : wB.a.c));
            const swS = state.components.find(c => c.type === "switch" && c.id === (wS.a.c === inst.id ? wS.b.c : wS.a.c));
            if (swA && swB && swS) {
              let okMux = true;
              swS.on = false; swA.on = true;  let r = simulate();
              okMux = okMux && r.values[r.netOf.get(inst.id + ":3")] === 1;
              swA.on = false; swB.on = true;  r = simulate();
              okMux = okMux && r.values[r.netOf.get(inst.id + ":3")] === 0;
              swS.on = true;
              swB.on = false; r = simulate();
              okMux = okMux && r.values[r.netOf.get(inst.id + ":3")] === 0;
              swB.on = true;  r = simulate();
              okMux = okMux && r.values[r.netOf.get(inst.id + ":3")] === 1;
              swA.on = false; swB.on = false; swS.on = false;
              results.push({ name: TXT(LL("Tu MUX2 colocado selecciona bien", "Your placed MUX2 selects correctly")), ok: okMux });
            }
          }
        }
      }
      return results;
    },
  },
  {
    id: "s13",
    title: LL("13. Half adder: sumar bits", "13. Half adder: adding bits"),
    theory: {
      es: `
        <p>Llegó la hora de que tu circuito <b>calcule</b>. Primero, un repaso rápido de
        <b>números binarios</b> (si ya los conocés, saltá este párrafo): en binario solo hay
        0s y 1s, y los números se forman con potencias de 2. Ejemplo con 4 bits:
        0101 = 0·8 + 1·4 + 0·2 + 1·1 = 5. Sumar binario funciona igual que sumar en columnas:
        vas columna por columna, y si el resultado de una columna "se pasa", <b>llevás
        uno</b> (carry) a la siguiente.</p>
        <p>El <b>half adder</b> (sumador medio) suma los bits de <i>una sola columna</i>:
        2 entradas (A y B), 2 salidas: <b>S</b> (la suma, el dígito de abajo) y <b>C</b>
        (el acarreo, el que "lleva" a la columna siguiente):</p>
        ${lt(["A", "B", "S", "C"], [[0,0,0,0],[0,1,1,0],[1,0,1,0],[1,1,0,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>Mirá la tabla: S vale 1 cuando A y B son diferentes
        (¡eso es XOR!) y C vale 1 solo cuando ambos son 1 (¡eso es AND!). Ya sabés hacer ambas.</i></p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Entrada</b> (tecla 2) — los bits a sumar</li>
          <li>1× <b>XOR</b> (tecla 0) — da la suma S</li>
          <li>1× <b>AND</b> (tecla 6) — da el acarreo C</li>
          <li>2× <b>Salida</b> (tecla 3) — S y C</li>
        </ul>
        <p><b>Conexión:</b> las 2 Entradas van <i>a la vez</i> al XOR y al AND. Salida del
        XOR = S; salida del AND = C.</p>
        <p><b>El experimento:</b> probá las 4 combinaciones. En 1+1, la suma da 0 y el acarreo
        1 — la primera vez que tu circuito "lleva uno", igual que cuando sumás a mano.</p>`,
      en: `
        <p>Time for your circuit to <b>compute</b>. Quick refresher on <b>binary numbers</b>
        (skip this paragraph if you know them): in binary there are only 0s and 1s, and
        numbers are built from powers of 2. Example with 4 bits:
        0101 = 0·8 + 1·4 + 0·2 + 1·1 = 5. Binary addition works just like column addition:
        you go column by column, and if a column's result "overflows", you <b>carry one</b>
        to the next.</p>
        <p>The <b>half adder</b> adds the bits of <i>a single column</i>: 2 inputs (A and B),
        2 outputs: <b>S</b> (the sum, the bottom digit) and <b>C</b> (the carry, the one
        that "travels" to the next column):</p>
        ${lt(["A", "B", "S", "C"], [[0,0,0,0],[0,1,1,0],[1,0,1,0],[1,1,0,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>Look at the table: S is 1 when A and B differ
        (that's XOR!) and C is 1 only when both are 1 (that's AND!). You can build both.</i></p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Input</b> (key 2) — the bits to add</li>
          <li>1× <b>XOR</b> (key 0) — gives the sum S</li>
          <li>1× <b>AND</b> (key 6) — gives the carry C</li>
          <li>2× <b>Output</b> (key 3) — S and C</li>
        </ul>
        <p><b>Wiring:</b> both Inputs feed the XOR and the AND <i>at once</i>. XOR's output = S; AND's output = C.</p>
        <p><b>The experiment:</b> try all 4 combinations. At 1+1, the sum is 0 and the carry
        is 1 — the first time your circuit "carries a one", just like hand addition.</p>`,
    },
    check() {
      const xo = lessonFind("xor");
      const an = lessonFind("and");
      if (!xo || !an) return [{ name: TXT(LL("Hay un XOR y un AND en el circuito", "There is an XOR and an AND in the circuit")), ok: false }];
      const tX = lessonTruthOf(xo, 2, 2);
      const tA = lessonTruthOf(an, 2, 2);
      if (!tX || !tA) return [{ name: TXT(LL("Ambos cableados a 2 Entradas", "Both wired to 2 Inputs")), ok: false }];
      const sameInputs = new Set([...tX.switches, ...tA.switches].map(s => s.id)).size === 2;
      const okS = sameInputs && tX.combos[0]===0 && tX.combos[1]===1 && tX.combos[2]===1 && tX.combos[3]===0;
      const okC = sameInputs && tA.combos[0]===0 && tA.combos[1]===0 && tA.combos[2]===0 && tA.combos[3]===1;
      return [
        { name: TXT(LL("XOR y AND comparten las mismas 2 Entradas", "XOR and AND share the same 2 Inputs")), ok: sameInputs },
        { name: TXT(LL("S = XOR(A,B) — la suma", "S = XOR(A,B) — the sum")), ok: okS },
        { name: TXT(LL("C = AND(A,B) — el acarreo", "C = AND(A,B) — the carry")), ok: okC },
      ];
    },
  },
  {
    id: "s14",
    title: LL("14. Sumador completo (full adder)", "14. Full adder"),
    theory: {
      es: `
        <p>El half adder tiene una limitación: solo suma <i>una columna</i>. Pero cuando sumás
        números de varias columnas, el acarreo de la columna anterior <b>llega</b> a la
        siguiente — hay que sumar <b>3 bits</b>: A + B + el acarreo que viene de la columna
        anterior (lo llamamos <b>Cin</b>, carry-in, "acarreo entrante"). Ese circuito es el
        <b>full adder</b> (sumador completo): 3 entradas, 2 salidas.</p>
        ${lt(["A", "B", "Cin", "S", "Cout"], [
          [0,0,0,0,0],[0,0,1,1,0],[0,1,0,1,0],[0,1,1,0,1],
          [1,0,0,1,0],[1,0,1,0,1],[1,1,0,0,1],[1,1,1,1,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>S = A ⊕ B ⊕ Cin (la XOR en cascada calcula la "paridad" de los 3 bits).
        Cout = 1 cuando al menos 2 de las 3 entradas valen 1.</i></p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>3× <b>Entrada</b> (tecla 2) — A, B, Cin</li>
          <li>2× <b>XOR</b> (tecla 0) — en cascada</li>
          <li>2× <b>AND</b> (tecla 6) + 1× <b>OR</b> (tecla 7) — para Cout</li>
          <li>2× <b>Salida</b> (tecla 3)</li>
        </ul>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>A y B → XOR1. La salida de XOR1 y Cin → XOR2. La salida de XOR2 es <b>S</b></li>
          <li>AND1: A y B. AND2: la salida de XOR1 y Cin</li>
          <li>AND1 y AND2 → OR. Su salida es <b>Cout</b></li>
        </ol>
        <p><b>El experimento:</b> probá 1+1+0 (S=0, Cout=1 — "llevo uno") y 1+1+1 (S=1, Cout=1).</p>
        <p style="color:var(--dim); font-size:12px;">💡 Al terminar, empaquetalo como <b>FULLADDER</b>: en la próxima lección vas a encadenar 4 de estos.</p>`,
      en: `
        <p>The half adder has a limitation: it only adds <i>one column</i>. But when adding
        multi-column numbers, the carry from the previous column <b>arrives</b> — so you need
        to add <b>3 bits</b>: A + B + the incoming carry (we call it <b>Cin</b>, carry-in).
        That circuit is the <b>full adder</b>: 3 inputs, 2 outputs.</p>
        ${lt(["A", "B", "Cin", "S", "Cout"], [
          [0,0,0,0,0],[0,0,1,1,0],[0,1,0,1,0],[0,1,1,0,1],
          [1,0,0,1,0],[1,0,1,0,1],[1,1,0,0,1],[1,1,1,1,1]])}
        <p style="color:var(--dim); font-size:12px;"><i>S = A ⊕ B ⊕ Cin (the cascaded XOR computes the "parity" of the 3 bits).
        Cout = 1 when at least 2 of the 3 inputs are 1.</i></p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>3× <b>Input</b> (key 2) — A, B, Cin</li>
          <li>2× <b>XOR</b> (key 0) — in cascade</li>
          <li>2× <b>AND</b> (key 6) + 1× <b>OR</b> (key 7) — for Cout</li>
          <li>2× <b>Output</b> (key 3)</li>
        </ul>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>A and B → XOR1. XOR1's output and Cin → XOR2. XOR2's output is <b>S</b></li>
          <li>AND1: A and B. AND2: XOR1's output and Cin</li>
          <li>AND1 and AND2 → OR. Its output is <b>Cout</b></li>
        </ol>
        <p><b>The experiment:</b> try 1+1+0 (S=0, Cout=1 — "carry one") and 1+1+1 (S=1, Cout=1).</p>
        <p style="color:var(--dim); font-size:12px;">💡 When done, pack it as <b>FULLADDER</b>: next lesson chains 4 of these.</p>`,
    },
    check() {
      const xors = state.components.filter(c => c.type === "xor");
      const ands = state.components.filter(c => c.type === "and");
      const ors = state.components.filter(c => c.type === "or");
      const sws = state.components.filter(c => c.type === "switch");
      const nameNeeds = TXT(LL(
        "Circuito: 3 Entradas, 2 XOR, 2 AND, 1 OR",
        "Circuit: 3 Inputs, 2 XORs, 2 ANDs, 1 OR"));
      if (sws.length < 3 || xors.length < 2 || ands.length < 2 || ors.length < 1)
        return [{ name: nameNeeds, ok: false }];
      // full adder: S = parity of 3 inputs (we test all 8 combinations of
      // the 3 Inputs across all XORs and all ORs to find S and Cout)
      const results = [{ name: nameNeeds, ok: true }];
      const wiredSwitches = sws.filter(s => state.wires.some(w => w.a.c === s.id || w.b.c === s.id));
      const swX = (wiredSwitches.length >= 3 ? wiredSwitches : sws).slice(0, 3);
      const expectS = [0, 1, 1, 0, 1, 0, 0, 1];
      const expectC = [0, 0, 0, 1, 0, 1, 1, 1];
      const xorCombos = new Map(xors.map(x => [x.id, []]));
      const orCombos = new Map(ors.map(o => [o.id, []]));
      for (let mask = 0; mask < 8; mask++) {
        swX.forEach((s, i) => s.on = !!(mask & (1 << i)));
        const r = simulate();
        for (const x of xors) {
          const net = r.netOf.get(x.id + ":2");
          xorCombos.get(x.id).push(r.values[net]);
        }
        for (const o of ors) {
          const net = r.netOf.get(o.id + ":2");
          orCombos.get(o.id).push(r.values[net]);
        }
      }
      sws.forEach(s => s.on = false);
      const okParity = Array.from(xorCombos.values()).some(combos =>
        expectS.every((v, i) => combos[i] === v)
      );
      const okCarry = Array.from(orCombos.values()).some(combos =>
        expectC.every((v, i) => combos[i] === v)
      );
      results.push({ name: TXT(LL("La suma S = A ⊕ B ⊕ Cin (paridad de 3)", "Sum S = A ⊕ B ⊕ Cin (3-input parity)")), ok: okParity });
      results.push({ name: TXT(LL("El acarreo Cout (ANDs + OR)", "Carry Cout (ANDs + OR)")), ok: okCarry });
      return results;
    },
  },
  {
    id: "s15",
    title: LL("15. Empaquetá el FULLADDER", "15. Pack the FULLADDER"),
    theory: {
      es: `
        <p>Para sumar números de 4 bits vas a encadenar 4 full adders, donde el acarreo de
        salida de cada uno (<b>Cout</b>) entra como acarreo de entrada (<b>Cin</b>) del
        siguiente. Primero, empaquetá el de la lección anterior.</p>
        <p><b>Misión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Con el full adder de la lección 14 en el canvas</li>
          <li>📦 Empaquetar (P) → rectángulo → <b>Crear componente</b></li>
          <li>Nombralo <b>FULLADDER</b></li>
          <li>Pines de entrada, <b>en este orden de click</b>: A, B, Cin</li>
          <li>Pines de salida, <b>en este orden</b>: S, Cout</li>
          <li><b>Crear componente</b></li>
        </ol>
        <p>En la próxima lección vas a colocar 4 FULLADDER y conectar el Cout de cada uno al
        Cin del siguiente. Esa conexión en cadena se llama <b>ripple carry</b> ("acarreo
        ondulante"): el acarreo "viaja" de la columna menos significativa a la más
        significativa, igual que cuando sumás a mano.</p>`,
      en: `
        <p>To add 4-bit numbers you'll chain 4 full adders, where each one's output carry
        (<b>Cout</b>) enters as the next one's input carry (<b>Cin</b>). First, pack the one
        from the previous lesson.</p>
        <p><b>Mission:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>With the full adder from lesson 14 on the canvas</li>
          <li>📦 Pack (P) → rectangle → <b>Create component</b></li>
          <li>Name it <b>FULLADDER</b></li>
          <li>Input pins, <b>in this click order</b>: A, B, Cin</li>
          <li>Output pins, <b>in this order</b>: S, Cout</li>
          <li><b>Create component</b></li>
        </ol>
        <p>Next lesson you'll place 4 FULLADDERs and wire each Cout into the next Cin. That
        chain is called <b>ripple carry</b>: the carry "travels" from the least significant
        column up, exactly like hand addition.</p>`,
    },
    check() {
      const results = [];
      const def = lib["FULLADDER"];
      results.push({ name: TXT(LL('Existe un componente "FULLADDER"', 'A "FULLADDER" component exists')), ok: !!def });
      if (def) {
        results.push({ name: TXT(LL("3 pines de entrada, 2 de salida", "3 input pins, 2 output pins")),
          ok: def.inputs.length === 3 && def.outputs.length === 2 });
        results.push({
          name: TXT(LL("El interior tiene 2 XOR, 2 AND y 1 OR", "The inside has 2 XORs, 2 ANDs and 1 OR")),
          ok: (def.components ?? []).filter(c => c.type === "xor").length >= 2
            && (def.components ?? []).filter(c => c.type === "and").length >= 2
            && (def.components ?? []).filter(c => c.type === "or").length >= 1,
        });
      }
      return results;
    },
  },
  {
    id: "s16",
    title: LL("16. Sumador de 4 bits", "16. 4-bit adder"),
    theory: {
      es: `
        <p>Ahora la gran pieza: <b>4 FULLADDER en cascada</b>. Cada uno suma una columna
        binaria, igual que cuando sumás números a mano: bit 0 (el de más a la derecha, que
        vale 1), bit 1 (vale 2), bit 2 (vale 4), bit 3 (vale 8) — y el acarreo viaja de
        derecha a izquierda.</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× tu caja <b>FULLADDER</b> 🧩 (de la lección 15)</li>
          <li>9× <b>Entrada</b> (tecla 2) — A0-A3, B0-B3 y Cin (dejala en 0)</li>
          <li>4-5× <b>Salida</b> (tecla 3) — S0-S3 (y opcionalmente el Cout final)</li>
        </ul>
        <p><b>Conexión (la cascada):</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Bit 0: A0 y B0 a las entradas A/B del primer FULLADDER; su Cin va a una Entrada en 0 (un pin sin conectar queda indeterminado en este simulador) → su S0 a una Salida</li>
          <li>El <b>Cout del bit 0 → Cin del bit 1</b>. El Cout del 1 → Cin del 2. El del 2 → Cin del 3</li>
          <li>Cada S de cada FULLADDER a su propia Salida</li>
        </ol>
        <p><b>El experimento:</b> cargá 5 en A y 3 en B (en binario: A=0101, B=0011): las
        salidas deben mostrar 8 (1000). Probá 15+1: todas las salidas en 0 y Cout=1 — el
        resultado no entra en 4 bits (<b>overflow</b>, desbordamiento).</p>
        <p style="color:var(--dim); font-size:12px;">💡 Esto es literalmente el corazón del circuito
        aritmético de una ALU real de 4 bits.</p>`,
      en: `
        <p>Now the big piece: <b>4 FULLADDERs in cascade</b>. Each one adds one binary column,
        just like hand addition: bit 0 (rightmost, worth 1), bit 1 (worth 2), bit 2 (worth
        4), bit 3 (worth 8) — and the carry travels right to left.</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× your <b>FULLADDER</b> box 🧩 (from lesson 15)</li>
          <li>9× <b>Input</b> (key 2) — A0-A3, B0-B3, and Cin (leave it at 0)</li>
          <li>4-5× <b>Output</b> (key 3) — S0-S3 (and optionally the final Cout)</li>
        </ul>
        <p><b>Wiring (the cascade):</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Bit 0: A0 and B0 into the first FULLADDER's A/B inputs; its Cin connects to an Input at 0 (an unconnected pin stays indeterminate in this simulator) → its S0 to an Output</li>
          <li>Bit 0's <b>Cout → bit 1's Cin</b>. Bit 1's Cout → bit 2's Cin. Bit 2's → bit 3's</li>
          <li>Each S to its own Output</li>
        </ol>
        <p><b>The experiment:</b> load 5 on A and 3 on B (binary: A=0101, B=0011): the outputs
        show 8 (1000). Try 15+1: all outputs 0 and Cout=1 — the result doesn't fit in 4 bits
        (<b>overflow</b>).</p>
        <p style="color:var(--dim); font-size:12px;">💡 This is literally the heart of a real 4-bit ALU's
        arithmetic circuit.</p>`,
    },
    check() {
      const fa = state.components.filter(c => c.type === "FULLADDER");
      const results = [];
      results.push({
        name: TXT(LL("4 cajas FULLADDER colocadas en el canvas", "4 FULLADDER boxes placed on the canvas")),
        ok: fa.length >= 4,
      });
      if (fa.length >= 4) {
        results.push({
          name: TXT(LL("Las 4 están cableadas", "All 4 are wired")),
          ok: fa.every(c => state.wires.some(w => w.a.c === c.id || w.b.c === c.id)),
        });
        // cascade: at least 3 Cout (pin 4) connected to another's Cin (pin 2)
        const r = simulate();
        let cascadeCount = 0;
        for (const a of fa) {
          for (const b of fa) {
            if (a !== b) {
              const directWire = state.wires.some(w =>
                (w.a.c === a.id && w.a.t === 4 && w.b.c === b.id && w.b.t === 2) ||
                (w.b.c === a.id && w.b.t === 4 && w.a.c === b.id && w.a.t === 2));
              const sameNet = r.netOf.get(a.id + ":4") !== undefined &&
                r.netOf.get(a.id + ":4") === r.netOf.get(b.id + ":2");
              if (directWire || sameNet) cascadeCount++;
            }
          }
        }
        results.push({ name: TXT(LL("Cascada: al menos 3 conexiones Cout→Cin entre cajas", "Cascade: at least 3 Cout→Cin connections between boxes")), ok: cascadeCount >= 3 });
      }
      return results;
    },
  },
  {
    id: "s17",
    title: LL("17. Empaquetá el ADD4", "17. Pack the ADD4"),
    theory: {
      es: `
        <p>El sumador de 4 bits es la pieza aritmética central de tu futura ALU. Empaquetalo
        para usarlo como una única pieza.</p>
        <p><b>Misión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Con el sumador de la lección 16 en el canvas</li>
          <li>📦 Empaquetar (P) → rectángulo → <b>Crear componente</b></li>
          <li>Nombralo <b>ADD4</b></li>
          <li>Pines de entrada, <b>en este orden de click</b>: A0, A1, A2, A3, B0, B1, B2, B3, Cin</li>
          <li>Pines de salida, <b>en este orden</b>: S0, S1, S2, S3, Cout</li>
          <li><b>Crear componente</b></li>
        </ol>
        <p style="color:var(--dim); font-size:12px;">💡 El orden de los pines lo define el orden en que hacés click
        sobre las piezas en el diálogo. Hacé click primero en las Entradas de A (A0→A3), luego las de B, luego Cin.</p>
        <p>Con tu caja ADD4, sumar 4 bits es usar 1 solo componente. Ya tenés todas las piezas
        aritméticas para la ALU — que armamos en la lección 18.</p>`,
      en: `
        <p>The 4-bit adder is the arithmetic core of your future ALU. Pack it to use it as a
        single part.</p>
        <p><b>Mission:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>With the adder from lesson 16 on the canvas</li>
          <li>📦 Pack (P) → rectangle → <b>Create component</b></li>
          <li>Name it <b>ADD4</b></li>
          <li>Input pins, <b>in this click order</b>: A0, A1, A2, A3, B0, B1, B2, B3, Cin</li>
          <li>Output pins, <b>in this order</b>: S0, S1, S2, S3, Cout</li>
          <li><b>Create component</b></li>
        </ol>
        <p style="color:var(--dim); font-size:12px;">💡 Pin order = click order in the dialog. Click the A Inputs
        first (A0→A3), then B's, then Cin.</p>
        <p>With your ADD4 box, adding 4 bits takes one component. You have all the arithmetic
        pieces for the ALU — built in lesson 18.</p>`,
    },
    check() {
      const results = [];
      const def = lib["ADD4"];
      results.push({ name: TXT(LL('Existe un componente "ADD4"', 'An "ADD4" component exists')), ok: !!def });
      if (def) {
        results.push({ name: TXT(LL("9 pines de entrada (A×4, B×4, Cin)", "9 input pins (A×4, B×4, Cin)")), ok: def.inputs.length === 9 });
        results.push({ name: TXT(LL("5 pines de salida (S×4, Cout)", "5 output pins (S×4, Cout)")), ok: def.outputs.length === 5 });
        const inst = state.components.find(c => c.type === "ADD4");
        if (inst && state.wires.some(w => w.a.c === inst.id || w.b.c === inst.id)) {
          results.push({
            name: TXT(LL("Hay una instancia ADD4 colocada y cableada", "A placed ADD4 instance is wired")),
            ok: true,
          });
        }
      }
      return results;
    },
  },
  {
    id: "s18",
    title: LL("18. ALU de 4 bits", "18. 4-bit ALU"),
    theory: {
      es: `
        <p>La <b>ALU</b> (Unidad Aritmético-Lógica) es donde la CPU "piensa": recibe dos
        números de 4 bits, un <b>código de operación</b> — u <b>opcode</b>: un número que
        indica <i>qué hacer</i> — y produce el resultado. Con 1 bit de opcode elegís entre
        2 operaciones: con OP=0 suma, con OP=1 hace AND.</p>
        <p><b>La idea central:</b> en lugar de decidir <i>qué circuito usar</i>, hacemos que
        A y B pasen por <i>todos</i> los circuitos a la vez (en paralelo) y usamos MUXes para
        elegir cuál resultado se muestra. Acá, la versión con 2 operaciones:
        <b>suma (tu ADD4)</b> y <b>AND bit a bit</b> (cada par de bits A·B por separado).</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× tu caja <b>ADD4</b> 🧩 (de la lección 17)</li>
          <li>4× tu caja <b>MUX2</b> 🧩 (de la lección 12) — una por bit de resultado</li>
          <li>4× <b>AND</b> (tecla 6) — la operación AND bit a bit</li>
          <li>1× <b>Entrada</b> para el opcode (tecla 2): <b>OP</b></li>
          <li>8× <b>Entrada</b> de datos: A0-A3 y B0-B3</li>
          <li>1× <b>Entrada</b> fija en 0 para Cin del ADD4 (¡no se marca como pin al empaquetar!)</li>
          <li>4× <b>Salida</b> (tecla 3): R0-R3</li>
        </ul>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Todas las Entradas de A y B van <i>a la vez</i> al ADD4 <i>y</i> a los AND (cada AND recibe un par Ax, Bx)</li>
          <li>La entrada Cin del ADD4 se conecta a la Entrada fija en 0</li>
          <li>La salida Sx del ADD4 → entrada A del MUX del bit x; la salida del AND de ese bit → entrada B del MUX</li>
          <li>El selector S de <i>todos</i> los MUX = OP (con OP=0 sale la suma, con OP=1 sale el AND)</li>
          <li>Las salidas de los 4 MUX van a las 4 Salidas (R0-R3)</li>
        </ol>
        <p><b>El experimento:</b> cargá valores en A y B, y cambiá OP: la salida alterna
        entre la <b>suma</b> y el <b>AND lógico</b>. Acabás de ver el núcleo de ejecución de
        una CPU real: los mismos datos, varias operaciones en paralelo, y un selector.</p>
        <p style="color:var(--dim); font-size:12px;">💡 Cuando funcione, empaquetala como <b>ALU4</b>:<br>
        📦 Empaquetar (P) → Nombrala <b>ALU4</b>.<br>
        Pines de entrada, <b>en este orden de click</b>: A0, A1, A2, A3, B0, B1, B2, B3, OP (la Entrada Cin fija en 0 no la selecciones como pin; queda adentro).<br>
        Pines de salida, <b>en este orden</b>: R0, R1, R2, R3.<br>
        Es el corazón del bloque de ejecución de tu CPU.</p>`,
      en: `
        <p>The <b>ALU</b> (Arithmetic Logic Unit) is where the CPU "thinks": it takes two
        4-bit numbers, an <b>operation code</b> — <b>opcode</b>: a number saying <i>what to
        do</i> — and produces the result. With 1 opcode bit you choose between 2 operations:
        OP=0 adds, OP=1 performs bitwise AND.</p>
        <p><b>The core idea:</b> instead of deciding <i>which circuit to use</i>, let A and B
        pass through <i>all</i> circuits at once (in parallel), and use MUXes to pick which
        result leaves. Here, the version with 2 operations: <b>sum (your ADD4)</b> and
        <b>bitwise AND</b> (each A·B bit pair separately).</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>1× your <b>ADD4</b> box (from lesson 17)</li>
          <li>4× your <b>MUX2</b> boxes (from lesson 12) — one per result bit</li>
          <li>4× <b>AND</b> (key 6) — the bitwise AND operation</li>
          <li>1× <b>Input</b> for the opcode (key 2): <b>OP</b></li>
          <li>8× <b>Input</b> for data: A0-A3 and B0-B3</li>
          <li>1× <b>Input</b> fixed at 0 for ADD4's Cin (do not select it as a pin when packing!)</li>
          <li>4× <b>Output</b> (key 3): R0-R3</li>
        </ul>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>All A and B Inputs go <i>at once</i> into the ADD4 <i>and</i> into the ANDs (each AND gets one Ax, Bx pair)</li>
          <li>ADD4's Cin input connects to the constant 0 Input</li>
          <li>ADD4's Sx output → MUX x's A input; that bit's AND output → MUX x's B input</li>
          <li>Every MUX's S selector = OP (OP=0 outputs the sum, OP=1 outputs the AND)</li>
          <li>The 4 MUX outputs go to the 4 Outputs (R0-R3)</li>
        </ol>
        <p><b>The experiment:</b> load A and B values and toggle OP: the output alternates
        between <b>sum</b> and <b>bitwise AND</b>. You just watched a real CPU's execution
        core: same data, several operations in parallel, one selector.</p>
        <p style="color:var(--dim); font-size:12px;">💡 When it works, pack it as <b>ALU4</b>:<br>
        📦 Pack (P) → Name it <b>ALU4</b>.<br>
        Input pins, <b>in this click order</b>: A0, A1, A2, A3, B0, B1, B2, B3, OP (leave the constant Cin=0 Input inside without clicking it).<br>
        Output pins, <b>in this order</b>: R0, R1, R2, R3.<br>
        This is the heart of your CPU's execution stage.</p>`,
    },
    check() {
      const results = [];
      const add4 = state.components.filter(c => c.type === "ADD4");
      const mux2 = state.components.filter(c => c.type === "MUX2");
      const ands = state.components.filter(c => c.type === "and");
      results.push({
        name: TXT(LL("1 caja ADD4 + 4 cajas MUX2 + 4 AND", "1 ADD4 + 4 MUX2 + 4 ANDs")),
        ok: add4.length === 1 && mux2.length >= 4 && ands.length >= 4,
      });
      if (add4.length && mux2.length >= 4) {
        const keyComps = [add4[0], ...mux2.slice(0, 4), ...(ands.length >= 4 ? ands.slice(0, 4) : ands)];
        results.push({
          name: TXT(LL("Todo cableado", "Everything wired")),
          ok: ands.length >= 4 && keyComps.every(c => state.wires.some(w => w.a.c === c.id || w.b.c === c.id)),
        });
      }
      const def = lib["ALU4"];
      if (def) {
        results.push({
          name: TXT(LL("Caja ALU4: 9 entradas (A×4, B×4, OP) y 4 salidas (R×4)", "ALU4 box: 9 inputs (A×4, B×4, OP) and 4 outputs (R×4)")),
          ok: def.inputs.length === 9 && def.outputs.length === 4,
        });
      }
      return results;
    },
  },
  {
    id: "s19",
    title: LL("19. Program Counter: el dedo del CPU", "19. Program Counter: the CPU's finger"),
    theory: {
      es: `
        <p>Ya sabés calcular (ALU) y recordar (registros). Falta la pieza que organiza
        <i>el orden</i>: el <b>PC</b> (Program Counter, "contador de programa").</p>
        <p>Un programa es una lista de instrucciones guardadas en memoria, una por dirección:
        la 0, la 1, la 2... El PC es un registro especial que guarda <b>la dirección de la
        próxima instrucción</b> a ejecutar. Como un dedo que recorre una lista de tareas: en cada ciclo
        avanza uno — <i>salvo que haya un salto</i>, que lo manda a otra dirección.</p>
        <p style="font-family:monospace; font-size:12px; color:var(--dim)">
        El PC decide el próximo valor así:<br>
        D' = JUMP·destino + ¬JUMP·(PC+1)<br>
        (si JUMP=1: va al destino; si JUMP=0: avanza +1)<br>
        En cada flanco de CLK: PC ← D'</p>
        <p><b>El problema del arranque y el RESET:</b></p>
        <p>Imaginate un pizarrón al entrar a un aula: antes de escribir, no sabés qué quedó anotado
        del día anterior; tenés que borrarlo para empezar limpio. En electrónica pasa exactamente
        lo mismo: al encender la energía, cualquier memoria arranca en un <b>estado desconocido</b>
        (en este simulador lo ves en los cables grises, que no tienen ni 0 ni 1 definido).
        El incrementador (+1) usa compuertas XOR, y una compuerta XOR no puede calcular su salida
        si no sabe qué valor tiene la entrada. Por eso el lazo Q → +1 → D se quedaría trabado en gris
        para siempre: ¡el contador jamás arrancaría!</p>
        <p>En cualquier CPU real esto se resuelve con una línea de <b>RESET</b> que fuerza el circuito
        a cero al inicio. En nuestro circuito no necesitamos piezas extras: <b>¡el salto nos sirve de RESET!</b>
        Si ponés <b>JUMP=1 con destino 0000</b> y das un pulso de reloj, el MUX fuerza un 0 limpio en cada
        DFF (porque 0 AND cualquier cosa siempre da 0, resolviendo la incertidumbre). A partir de ese 0000 bien
        definido, el PC ya puede contar sin problemas: 0001, 0010, 0011...</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× tu caja <b>DFF</b> 🧩 — el registro de 4 bits del PC (uno por bit)</li>
          <li>Un <b>sumador +1</b>: 4× <b>XOR</b> (tecla 0) y 3-4× <b>AND</b> (tecla 6) en cascada (medio sumador por bit; el primer bit suma Cin=1, que podés tomar de la salida del NOT de ¬JUMP)</li>
          <li>4× <b>MUX de LOAD</b> (uno por bit): podés usar 4× tu caja <b>MUX2</b> 🧩 o compuertas discretas (8× <b>AND</b>, 4× <b>OR</b>)</li>
          <li>1× <b>NOT</b> (tecla 5) para generar ¬JUMP (compartido por los 4 bits del MUX)</li>
          <li>5× <b>Entrada</b> (tecla 2): 1× JUMP (¿saltar?) y 4× dirección de destino (D0-D3, una por bit)</li>
          <li>1× <b>Entrada</b> de CLK (tecla 2) o un <b>Reloj</b> (⏱, tecla 4)</li>
          <li>4× <b>Salida</b> (tecla 3) para ver los 4 bits del PC en vivo</li>
        </ul>
        <p><b>El experimento:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li><b>RESET</b>: poné JUMP=1 y las 4 Entradas de destino en 0. Dale un pulso de CLK (1 y luego 0): las 4 salidas Q se limpian y quedan en 0000.</li>
          <li><b>Contar</b>: cambiá JUMP=0. En cada pulso de CLK, mirá el PC avanzar: 0001 → 0010 → 0011 → 0100...</li>
          <li><b>Salto</b>: poné una dirección en el destino (por ejemplo 0101 = 5) y poné JUMP=1. Con un pulso de CLK el PC salta directo a 5. Volvé a JUMP=0 y continuará contando: 6, 7...</li>
        </ol>
        <p>Ese mecanismo de salto es lo que permitirá a los programas tomar decisiones (loops, condiciones).
        Con PC + ALU + RAM tenés los tres órganos principales de una CPU.</p>`,
      en: `
        <p>You can compute (ALU) and remember (registers). Missing: the piece that keeps
        <i>the order</i>: the <b>PC</b> (Program Counter).</p>
        <p>A program is a list of instructions stored in memory, one per address: address 0,
        1, 2... The PC is a special register holding <b>the address of the next
        instruction</b>. Like a finger walking a to-do list: each cycle it advances one —
        <i>unless there is a jump</i>, which sends it to another address.</p>
        <p style="font-family:monospace; font-size:12px; color:var(--dim)">
        The PC decides its next value like this:<br>
        D' = JUMP·target + ¬JUMP·(PC+1)<br>
        (if JUMP=1: go to the target; if JUMP=0: advance +1)<br>
        On each CLK edge: PC ← D'</p>
        <p><b>Startup and the RESET line:</b></p>
        <p>Think of a classroom whiteboard: before you begin writing, you don't know what scribbles
        were left from the previous class; you must erase it to start fresh. In electronics, the exact
        same thing happens: upon power-up, any memory starts in an <b>unknown state</b> (in this
        simulator you see it as gray wires, carrying neither 0 nor 1). The +1 incrementer uses XOR
        gates, and an XOR gate cannot calculate an output if its input is unknown. Without help,
        the Q → +1 → D loop would stay stuck in gray forever: the counter would never start!</p>
        <p>In every real CPU, this is solved by a <b>RESET</b> line that forces all circuits to zero
        at startup. In our PC, we don't need extra components: <b>our jump acts as RESET!</b>
        Setting <b>JUMP=1 with target 0000</b> and giving one clock pulse forces a clean 0 into each
        DFF (because 0 AND anything is always 0, resolving the uncertainty). Once established at a clean
        0000, the PC can freely count without issue: 0001, 0010, 0011...</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>4× your <b>DFF</b> box 🧩 — the PC's 4-bit register (one per bit)</li>
          <li>A <b>+1 adder</b>: 4× <b>XOR</b> (key 0) and 3-4× <b>AND</b> (key 6) in cascade (half adder per bit; the first bit adds Cin=1, which you can take from the ¬JUMP NOT gate output)</li>
          <li>4× <b>LOAD MUXes</b> (one per bit): you can use 4× your <b>MUX2</b> box 🧩 or discrete gates (8× <b>AND</b>, 4× <b>OR</b>)</li>
          <li>1× <b>NOT</b> (key 5) to generate ¬JUMP (shared across all 4 MUX bits)</li>
          <li>5× <b>Inputs</b> (key 2): 1× JUMP (jump or not?) and 4× target address (D0-D3, one per bit)</li>
          <li>1× CLK <b>Input</b> (key 2) or a <b>Clock</b> (⏱, key 4)</li>
          <li>4× <b>Outputs</b> (key 3) to watch the PC's 4 bits live</li>
        </ul>
        <p><b>The experiment:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li><b>RESET</b>: set JUMP=1 and the 4 target Inputs to 0. Give one CLK pulse (1 then 0): all 4 Q outputs clear to 0000.</li>
          <li><b>Counting</b>: switch to JUMP=0. On each CLK pulse, watch the PC advance: 0001 → 0010 → 0011 → 0100...</li>
          <li><b>Jump</b>: set a target address (for example 0101 = 5) and set JUMP=1. On a CLK pulse the PC jumps straight to 5. Switch back to JUMP=0 and it keeps counting: 6, 7...</li>
        </ol>
        <p>That jump mechanism is what will let programs make decisions (loops, conditions).
        With PC + ALU + RAM you have the three main organs of a CPU.</p>`,
    },
    check() {
      const results = [];
      const dff = state.components.filter(c => c.type === "DFF");
      results.push({
        name: TXT(LL("4 DFF en paralelo (el registro del PC)", "4 DFFs in parallel (the PC register)")),
        ok: dff.length >= 4,
      });
      if (dff.length < 4) {
        results.push({
          name: TXT(LL("RESET: JUMP=1 a 0000 deja el PC en 0", "RESET: JUMP=1 to 0000 leaves PC at 0")),
          ok: false,
        });
        results.push({
          name: TXT(LL("Con JUMP=0 el PC cuenta 1, 2, 3", "With JUMP=0 the PC counts 1, 2, 3")),
          ok: false,
        });
        return results;
      }

      const { netOf } = buildNets();
      let clkComp = null;
      for (const d of dff) {
        const netClk = netOf.get(d.id + ":1");
        if (netClk === undefined) continue;
        clkComp = state.components.find(c =>
          (c.type === "switch" || c.type === "clock") &&
          netOf.get(c.id + ":0") === netClk
        );
        if (clkComp) break;
      }
      if (!clkComp) {
        for (const d of dff) {
          const w = state.wires.find(w => (w.a.c === d.id && w.a.t === 1) || (w.b.c === d.id && w.b.t === 1));
          if (!w) continue;
          const otherId = w.a.c === d.id ? w.b.c : w.a.c;
          clkComp = state.components.find(c => c.id === otherId && (c.type === "switch" || c.type === "clock"));
          if (clkComp) break;
        }
      }

      const swClk = clkComp && clkComp.type === "switch" ? clkComp : null;
      const clock = clkComp && clkComp.type === "clock" ? clkComp : null;

      const clkNet = clkComp ? netOf.get(clkComp.id + ":0") : null;
      const targetDffs = clkNet !== null
        ? dff.filter(d => netOf.get(d.id + ":1") === clkNet)
        : dff;
      const fourDff = targetDffs.length >= 4 ? targetDffs.slice(0, 4) : dff.slice(0, 4);

      const allSwitches = state.components.filter(c => c.type === "switch");
      const candidateJumps = allSwitches.filter(s => s !== swClk);

      const clockPrev = clock ? (globalClockState.get(clock.id) ?? false) : false;
      const clkSet = v => {
        if (swClk) swClk.on = v;
        else if (clock) globalClockState.set(clock.id, v);
      };
      const pulse = () => {
        clkSet(true);
        simulate();
        clkSet(false);
        return simulate();
      };

      const getQ = (r, d) => r.values[r.netOf.get(d.id + ":2")];
      const read4Q = r => fourDff.map(d => getQ(r, d));

      const perms = [];
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 4; j++) {
          if (j === i) continue;
          for (let k = 0; k < 4; k++) {
            if (k === i || k === j) continue;
            for (let l = 0; l < 4; l++) {
              if (l === i || l === j || l === k) continue;
              perms.push([i, j, k, l]);
            }
          }
        }
      const valAt = (snap, p) => snap[p[0]] + 2 * snap[p[1]] + 4 * snap[p[2]] + 8 * snap[p[3]];

      let okReset = false;
      let okCount = false;
      const savedGateOuts = new Map(gateOuts);

      if (swClk || clock) {
        for (const swJump of candidateJumps) {
          gateOuts.clear();
          for (const [k, v] of savedGateOuts) gateOuts.set(k, v);

          allSwitches.forEach(s => s.on = false);
          clkSet(false);
          swJump.on = true;
          simulate();

          const simAfterReset = pulse();
          const qReset = read4Q(simAfterReset);
          if (qReset.every(v => v === 0)) {
            okReset = true;
            const postResetGateOuts = new Map(gateOuts);
            const otherSwitches = candidateJumps.filter(s => s !== swJump);
            const countCandidates = [null, ...otherSwitches];

            for (const extraSw of countCandidates) {
              gateOuts.clear();
              for (const [k, v] of postResetGateOuts) gateOuts.set(k, v);

              allSwitches.forEach(s => s.on = false);
              if (extraSw) extraSw.on = true;
              swJump.on = false;
              clkSet(false);
              simulate();

              pulse();
              const s1 = read4Q(simulate());
              pulse();
              const s2 = read4Q(simulate());
              pulse();
              const s3 = read4Q(simulate());

              const validBits = [...s1, ...s2, ...s3].every(v => v === 0 || v === 1);
              if (validBits) {
                const counts123 = perms.some(p => valAt(s1, p) === 1 && valAt(s2, p) === 2 && valAt(s3, p) === 3);
                if (counts123) {
                  okCount = true;
                  break;
                }
              }
            }
            if (okCount) break;
          }
        }
      }

      allSwitches.forEach(s => s.on = false);
      if (clock) {
        globalClockState.set(clock.id, clockPrev);
        clockAcc.set(clock.id, 0);
      }
      gateOuts.clear();
      for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
      simulate();

      results.push({
        name: TXT(LL("RESET: JUMP=1 a 0000 deja el PC en 0", "RESET: JUMP=1 to 0000 leaves PC at 0")),
        ok: okReset,
      });
      results.push({
        name: TXT(LL("Con JUMP=0 el PC cuenta 1, 2, 3", "With JUMP=0 the PC counts 1, 2, 3")),
        ok: okCount,
      });
      return results;
    },
  },
  {
    id: "s20",
    title: LL("20. Repaso: los órganos de tu CPU", "20. Review: your CPU's organs"),
    theory: {
      es: `
        <p>Cierre del segundo bloque. Mirá lo que construiste — cada uno es un <b>órgano</b>
        de la computadora, empaquetado en tu biblioteca 🧩:</p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>Compuertas</b> — los ladrillos de toda decisión binaria (lecciones 1-4)</li>
          <li><b>Latches y flip-flops</b> — memoria sincronizada por reloj (6-8)</li>
          <li><b>DFF</b> — tu primer componente empaquetado (9)</li>
          <li><b>Registros</b> — palabras de N bits que se cargan bajo comando (10)</li>
          <li><b>MUX2</b> — el mecanismo universal de "elegir" (11-12)</li>
          <li><b>FULLADDER y ADD4</b> — el poder de calcular (13-17)</li>
          <li><b>ALU4</b> — la unidad aritmético-lógica (18)</li>
          <li><b>PC</b> — el dedo que recorre el programa (19)</li>
        </ul>
        <p>Te recomiendo tener en tu biblioteca las cajas <b>DFF</b>, <b>MUX2</b> y <b>ADD4</b>
        (y si querés, una <b>ALU4</b>): son las que se usan en las próximas lecciones.</p>
        <p>Mientras tanto, tenés un laboratorio completo para explorar. Un buen ejercicio:
        conectá un <b>reloj</b> (⏱, tecla 4, doble click para cambiar su velocidad) a tu
        registro o a tu PC y miralos avanzar solos a 4-8 Hz.</p>
        <p><b>La próxima lección introduce la RAM</b> — la memoria donde van a vivir tus programas.</p>`,
      en: `
        <p>Second block complete. Look at what you built — each one is a CPU <b>organ</b>,
        packed in your 🧩 library:</p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>Gates</b> — the bricks of every decision (lessons 1-4)</li>
          <li><b>Latches and flip-flops</b> — clocked memory (6-8)</li>
          <li><b>DFF</b> — your first packed component (9)</li>
          <li><b>Registers</b> — N-bit words loaded on command (10)</li>
          <li><b>MUX2</b> — the universal "chooser" (11-12)</li>
          <li><b>FULLADDER and ADD4</b> — the power to compute (13-17)</li>
          <li><b>ALU4</b> — the arithmetic logic unit (18)</li>
          <li><b>PC</b> — the finger that walks the program (19)</li>
        </ul>
        <p>We recommend having the <b>DFF</b>, <b>MUX2</b> and <b>ADD4</b> boxes in your
        library (and optionally an <b>ALU4</b>): the upcoming lessons use them.</p>
        <p>Meanwhile, you have a full lab to explore. A good exercise: connect a <b>clock</b>
        (⏱, key 4, double-click to change its speed) to your register or PC and watch them
        advance on their own at 4-8 Hz.</p>
        <p><b>Next lesson introduces RAM</b> — the memory where your programs will live.</p>`,
    },
    check() {
      return [
        { name: TXT(LL("Tenés DFF empaquetado", "You have a DFF packed")), ok: !!lib["DFF"] },
        { name: TXT(LL("Tenés MUX2 empaquetado", "You have a MUX2 packaged")), ok: !!lib["MUX2"] },
        { name: TXT(LL("Tenés ADD4 empaquetado", "You have an ADD4 packaged")), ok: !!lib["ADD4"] },
      ];
    },
  },
  {
    id: "s21",
    title: LL("21. RAM: memoria con dirección", "21. RAM: addressed memory"),
    theory: {
      es: `
        <p>Todos tus circuitos con memoria (latches, registros) guardan valores "sin nombre":
        cada caja tiene su valor fijo y su propia salida. La <b>RAM</b> cambia el paradigma:
        es un <b>arreglo de celdas numeradas</b>. Le das un número — la <b>dirección</b> — y
        ella te da (o recibe) el dato de esa posición. Es como un edificio con habitaciones
        numeradas: la dirección dice <i>cuál habitación</i>, no qué hay adentro.</p>
        <p>¿Por qué es tan importante? Porque así guarda la CPU sus programas: cada
        instrucción vive en una dirección, y el PC (lección 19) recorre esas direcciones
        una a una.</p>
        <p><b>Cómo funciona una RAM por dentro (versión mini de 4 palabras × 2 bits):</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>Las líneas de dirección A0, A1 entran a un <b>decodificador 2→4</b>: un circuito que, de las 4 celdas, activa exactamente la que corresponde a la dirección</li>
          <li>Cada celda = tu DFF + su mux de escritura (solo escribe si el decodificador la eligió y WE=1)</li>
          <li>Las salidas de todas las celdas pasan por un mux de lectura, controlado también por la dirección, hacia una salida común</li>
        </ul>
        <p><b>Misión de exploración:</b> armá el decodificador y al menos 2 celdas
        direccionadas. Necesitás: 1 Entrada de dirección (A0) y su NOT (que genera A0-negado),
        2 AND (que deciden cuál celda se activa), y 2 DFF como celdas. Conectá la salida de
        cada celda a un indicador y probá: solo la celda direccionada responde.</p>
        <p style="color:var(--dim); font-size:12px;">💡 Hacer RAM celda por celda no escala: una RAM de
        16 palabras × 4 bits tendría 64 DFF y decodificador de 4 líneas. Por eso en la próxima
        lección aparece el <b>chip RAM16</b>: una caja del motor con todo adentro y su vista en hexadecimal.</p>`,
      en: `
        <p>All your memory circuits (latches, registers) store "unnamed" values: each box
        holds its value with its own output. <b>RAM</b> changes the paradigm: it is an
        <b>array of numbered cells</b>. You give it a number — the <b>address</b> — and it
        gives (or receives) the data at that position. Like a building with numbered rooms:
        the address says <i>which room</i>, not what's inside.</p>
        <p>Why does it matter so much? Because that's how the CPU stores programs: each
        instruction lives at an address, and the PC (lesson 19) walks those addresses one
        by one.</p>
        <p><b>Inside a RAM (mini version, 4 words × 2 bits):</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>Address lines A0, A1 feed a <b>2→4 decoder</b>: a circuit that, out of 4 cells, activates exactly the one matching the address</li>
          <li>Each cell = your DFF + its write mux (only writes if the decoder picked it and WE=1)</li>
          <li>All cells' outputs pass through a read mux, also controlled by the address, into a common output</li>
        </ul>
        <p><b>Exploration mission:</b> build the decoder and at least 2 addressed cells.
        You need: 1 address Input (A0) and its NOT (generating negated-A0), 2 ANDs (deciding
        which cell activates), and 2 DFFs as cells. Wire each cell's output to an indicator:
        only the addressed cell responds.</p>
        <p style="color:var(--dim); font-size:12px;">💡 Hand-building RAM doesn't scale: a 16-word × 4-bit RAM
        would need 64 DFFs and a 4-line decoder. That's why next lesson brings the <b>RAM16
        chip</b>: an engine box with everything inside and a hex view.</p>`,
    },
    check() {
      const dff = state.components.filter(c => c.type === "DFF");
      return [
        { name: TXT(LL("Al menos 2 DFF (las celdas de memoria)", "At least 2 DFFs (the memory cells)")), ok: dff.length >= 2 },
        { name: TXT(LL("Cableados", "Wired")), ok: dff.every(d => state.wires.some(w => w.a.c === d.id || w.b.c === d.id)) },
      ];
    },
  },
  {
    id: "s22",
    title: LL("22. RAM16: la memoria del programa", "22. RAM16: program memory"),
    theory: {
      es: `
        <p>Para ejecutar programas necesitamos memoria <i>direccionable</i> y fácil de usar.
        El motor te entrega ahora un componente especial: <b>🧠 RAM16</b> — 16 celdas × 4 bits
        empaquetadas en una sola caja, con una <b>vista de memoria en hexadecimal</b> en el
        panel derecho.</p>
        <p><b>Sus pines, uno por uno:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>A0-A3</b>: la dirección — qué celda quiero leer o escribir (0 a 15, en binario de 4 bits)</li>
          <li><b>D0-D3</b>: el dato a escribir (4 bits)</li>
          <li><b>WE</b> (write enable, "permiso de escritura") y <b>CS</b> (chip select, "chip activado"): la escritura ocurre cuando ambos valen 1, exactamente en el flanco de subida de WE — igual que un flip-flop, escribe en el instante, no mientras</li>
          <li><b>Q0-Q3</b>: la salida — siempre muestra el contenido de la celda que dice la dirección (modo lectura)</li>
        </ul>
        <p><b>Misión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Colocá una <b>RAM16</b> (botón 🧠 RAM de la toolbar, junto al Reloj)</li>
          <li>Hacé <b>doble click</b> sobre ella → en el panel derecho se abre la <b>vista hex</b> con las 16 celdas</li>
          <li>Escribí valores en las celdas (o apretá "Cargar programa de ejemplo") — cada celda acepta un valor de 0 a 15 (un "nibble": medio byte, 4 bits)</li>
          <li>Cableá A0-A3 a Entradas y cambiá la dirección: la caja RAM muestra en vivo la <b>addr</b> y el <b>contenido</b> de esa celda, y el Q0-Q3 lo expone a sus salidas</li>
        </ol>
        <p style="color:var(--dim); font-size:12px;"><i>Ese panel hex es literalmente cómo se ve la memoria
        de una computadora real mientras ejecuta — y en el bloque 4, cuando construyas el CPU,
        tus programas van a vivir ahí dentro.</i></p>`,
      en: `
        <p>To run programs we need <i>addressable</i>, easy-to-use memory. The engine now
        gives you a special component: <b>🧠 RAM16</b> — 16 cells × 4 bits packed into one
        box, with a <b>hex memory view</b> on the right panel.</p>
        <p><b>Its pins, one by one:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>A0-A3</b>: the address — which cell I want to read or write (0-15, in 4-bit binary)</li>
          <li><b>D0-D3</b>: the data to write (4 bits)</li>
          <li><b>WE</b> (write enable) and <b>CS</b> (chip select): writing happens when both are 1, exactly on WE's rising edge — like a flip-flop, it writes at the instant, not while</li>
          <li><b>Q0-Q3</b>: the output — always shows the addressed cell's content (read mode)</li>
        </ul>
        <p><b>Mission:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Place a <b>RAM16</b> (🧠 RAM toolbar button, next to Clock)</li>
          <li><b>Double click</b> it → the <b>hex view</b> opens on the right panel, 16 cells</li>
          <li>Type values into the cells (or press "Load demo program") — each cell takes 0-15 (a "nibble": half a byte, 4 bits)</li>
          <li>Wire A0-A3 to Inputs and change the address: the RAM box live-shows <b>addr</b> + <b>content</b>, and Q0-Q3 expose it</li>
        </ol>
        <p style="color:var(--dim); font-size:12px;"><i>That hex panel is literally how a real computer's memory looks
        while running — and in block 4, when you build the CPU, your programs will live in there.</i></p>`,
    },
    check() {
      const ram = state.components.filter(c => c.type === "ram");
      const results = [];
      results.push({ name: TXT(LL("Hay una RAM16 colocada", "There is a placed RAM16")), ok: ram.length >= 1 });
      if (ram.length >= 1) {
        const data = ramData.get(ram[0].id);
        results.push({ name: TXT(LL("Con datos escritos (escribí en la vista hex)", "With data written (type in the hex view)")),
          ok: data ? data.some(v => v !== 0) : false });
      }
      return results;
    },
  },
  {
    id: "s23",
    title: LL("23. Decodificador 2→4 y 3→8", "23. 2→4 and 3→8 Decoders"),
    theory: {
      es: `
        <p>En una computadora las instrucciones y direcciones se guardan como números binarios
        compactos. Pero para ejecutar una acción necesitás que un solo cable específico se encienda.
        El <b>decodificador</b> es ese traductor: toma $N$ bits de entrada y enciende
        <b>exactamente una</b> de sus $2^N$ salidas.</p>
        <p><b>Analogía:</b> es como el conserje de un hotel con un casillero de llaves numeradas:
        si le pedís el número 2, enciende únicamente la luz de la habitación 2 y deja las demás apagadas.</p>
        <p><b>La idea lógica (para 2 bits: A0 y A1):</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>Y0</b> = ¬A1 · ¬A0 (código 00 = 0)</li>
          <li><b>Y1</b> = ¬A1 · A0 (código 01 = 1)</li>
          <li><b>Y2</b> = A1 · ¬A0 (código 10 = 2)</li>
          <li><b>Y3</b> = A1 · A0 (código 11 = 3)</li>
        </ul>
        <p><b>Componentes que necesitás para DEC2:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Entrada</b> (tecla 2): A0 y A1</li>
          <li>2× <b>NOT</b> (tecla 5): para obtener ¬A0 y ¬A1</li>
          <li>4× <b>AND</b> (tecla 6): una por salida</li>
          <li>4× <b>Salida</b> (tecla 3): Y0 a Y3</li>
        </ul>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Conectá cada Entrada a un NOT para disponer de A0, ¬A0, A1 y ¬A1</li>
          <li>Cableá cada compuerta AND con el par correspondiente (ejemplo: AND0 recibe ¬A1 y ¬A0)</li>
          <li>Conectá la salida de cada AND a su Salida visual (Y0 a Y3)</li>
        </ol>
        <p><b>El experimento:</b> cambiá A0 y A1 probando las 4 combinaciones (00, 01, 10, 11).
        Vas a ver cómo la luz activa viaja limpiamente de Y0 a Y3: nunca hay más de una encendida.</p>
        <p style="color:var(--dim); font-size:12px;">💡 Empaquetala como <b>DEC2</b>:<br>
        📦 Empaquetar (P) → Nombrala <b>DEC2</b>.<br>
        Pines de entrada: A0, A1 (en orden de click).<br>
        Pines de salida: Y0, Y1, Y2, Y3.<br>
        (Para 3 bits a 8 salidas, agregás A2 y compuertas AND adicionales para empaquetar <b>DEC3</b> con entradas A0, A1, A2 y salidas Y0-Y7).</p>`,
      en: `
        <p>In a computer, instructions and addresses are stored as compact binary numbers.
        Yet to perform an action, you need one specific control line to activate.
        A <b>decoder</b> is this translator: it takes $N$ input bits and activates
        <b>exactly one</b> of its $2^N$ outputs.</p>
        <p><b>Analogy:</b> like a hotel concierge at a numbered key rack: ask for room 2,
        and only the light for key 2 turns on while all others stay dark.</p>
        <p><b>The logic (for 2 bits: A0 and A1):</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>Y0</b> = ¬A1 · ¬A0 (code 00 = 0)</li>
          <li><b>Y1</b> = ¬A1 · A0 (code 01 = 1)</li>
          <li><b>Y2</b> = A1 · ¬A0 (code 10 = 2)</li>
          <li><b>Y3</b> = A1 · A0 (code 11 = 3)</li>
        </ul>
        <p><b>Components you need for DEC2:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>2× <b>Input</b> (key 2): A0 and A1</li>
          <li>2× <b>NOT</b> (key 5): for ¬A0 and ¬A1</li>
          <li>4× <b>AND</b> (key 6): one per output</li>
          <li>4× <b>Output</b> (key 3): Y0 through Y3</li>
        </ul>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Connect each Input to a NOT to obtain A0, ¬A0, A1, and ¬A1</li>
          <li>Wire each AND gate with its corresponding pair (e.g. AND0 receives ¬A1 and ¬A0)</li>
          <li>Connect each AND output to its visual Output (Y0 to Y3)</li>
        </ol>
        <p><b>The experiment:</b> test all 4 combinations on A0 and A1 (00, 01, 10, 11).
        Watch the active light shift cleanly from Y0 to Y3: there is never more than one active.</p>
        <p style="color:var(--dim); font-size:12px;">💡 Pack it as <b>DEC2</b>:<br>
        📦 Pack (P) → Name it <b>DEC2</b>.<br>
        Input pins: A0, A1 (in click order).<br>
        Output pins: Y0, Y1, Y2, Y3.<br>
        (For 3 bits to 8 outputs, add A2 and extra ANDs to pack <b>DEC3</b> with inputs A0, A1, A2 and outputs Y0-Y7).</p>`,
    },
    check() {
      const sws = state.components.filter(c => c.type === "switch");
      const outs = state.components.filter(c => c.type === "out");
      const ands = state.components.filter(c => c.type === "and");

      const is3 = (outs.length >= 8 || ands.length >= 8) && sws.length >= 3;
      const is2 = !is3 && (outs.length >= 4 || ands.length >= 4) && sws.length >= 2;

      const nameCircuit = TXT(LL("Circuito: 2 o 3 Entradas y 4 u 8 Salidas/AND", "Circuit: 2 or 3 Inputs and 4 or 8 Outputs/ANDs"));
      if (!is3 && !is2 && !lib["DEC2"] && !lib["DEC3"]) {
        return [{ name: nameCircuit, ok: false }];
      }

      function testDecoderBox(pkgName, nIn, nOut) {
        const def = lib[pkgName];
        if (!def) return false;
        if (def.inputs.length !== nIn || def.outputs.length !== nOut) return false;
        if (typeof registerPackedType === "function" && !TYPE_DEFS[pkgName]) {
          registerPackedType(def);
        }

        const savedComponents = state.components;
        const savedWires = state.wires;
        const savedNextId = state.nextId;
        const savedGateOuts = new Map(gateOuts);

        let ok = true;
        try {
          state.components = [];
          state.wires = [];
          state.nextId = 1;
          gateOuts.clear();

          const box = { id: state.nextId++, type: pkgName, x: 0, y: 0, rot: 0, on: false };
          state.components.push(box);

          const bSws = [];
          for (let i = 0; i < nIn; i++) {
            const sw = { id: state.nextId++, type: "switch", x: 0, y: 0, rot: 0, on: false };
            state.components.push(sw);
            state.wires.push({ id: state.nextId++, a: { c: sw.id, t: 0 }, b: { c: box.id, t: i } });
            bSws.push(sw);
          }

          const bOuts = [];
          for (let j = 0; j < nOut; j++) {
            const out = { id: state.nextId++, type: "out", x: 0, y: 0, rot: 0, on: false };
            state.components.push(out);
            state.wires.push({ id: state.nextId++, a: { c: box.id, t: nIn + j }, b: { c: out.id, t: 0 } });
            bOuts.push(out);
          }

          for (let v = 0; v < nOut; v++) {
            for (let bit = 0; bit < nIn; bit++) {
              bSws[bit].on = !!((v >> bit) & 1);
            }
            const r = simulate();
            const vals = bOuts.map(o => r.values[r.netOf.get(o.id + ":0")]);
            const activeCount = vals.filter(x => x === 1).length;
            if (activeCount !== 1 || vals[v] !== 1) {
              ok = false;
              break;
            }
          }
        } catch (e) {
          ok = false;
        } finally {
          state.components = savedComponents;
          state.wires = savedWires;
          state.nextId = savedNextId;
          gateOuts.clear();
          for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
          simulate();
        }
        return ok;
      }

      const results = [];

      if (is3 || is2) {
        const nIn = is3 ? 3 : 2;
        const nOut = is3 ? 8 : 4;
        const targetOuts = outs.length >= nOut ? outs.slice(0, nOut) : ands.slice(0, nOut);

        const readOut = (r, node) =>
          node.type === "out" ? r.values[r.netOf.get(node.id + ":0")] : r.values[r.netOf.get(node.id + ":2")];

        const switchCombos = [];
        if (sws.length === nIn) {
          switchCombos.push(sws);
        } else {
          const getCombos = (arr, k, start = 0, current = []) => {
            if (current.length === k) { switchCombos.push([...current]); return; }
            for (let i = start; i < arr.length; i++) {
              current.push(arr[i]);
              getCombos(arr, k, i + 1, current);
              current.pop();
            }
          };
          getCombos(sws, nIn);
        }

        let okOneHot = false;
        let okDistinct = false;
        const savedSw = sws.map(s => s.on);

        for (const combo of switchCombos) {
          sws.forEach(s => { if (!combo.includes(s)) s.on = false; });
          let comboOneHot = true;
          const activeIndices = new Set();

          for (let val = 0; val < nOut; val++) {
            for (let bit = 0; bit < nIn; bit++) {
              combo[bit].on = !!((val >> bit) & 1);
            }
            const r = simulate();
            const outVals = targetOuts.map(o => readOut(r, o));
            const active = [];
            for (let i = 0; i < outVals.length; i++) {
              if (outVals[i] === 1) active.push(i);
              else if (outVals[i] === -1) comboOneHot = false;
            }
            if (active.length !== 1) {
              comboOneHot = false;
            } else {
              activeIndices.add(active[0]);
            }
          }

          if (comboOneHot) okOneHot = true;
          if (comboOneHot && activeIndices.size === nOut) {
            okDistinct = true;
            break;
          }
        }

        sws.forEach((s, i) => s.on = savedSw[i]);
        simulate();

        results.push({
          name: TXT(LL(
            is3 ? "Decodificador 3→8 (3 Entradas, 8 Salidas)" : "Decodificador 2→4 (2 Entradas, 4 Salidas)",
            is3 ? "3→8 Decoder (3 Inputs, 8 Outputs)" : "2→4 Decoder (2 Inputs, 4 Outputs)"
          )),
          ok: true,
        });
        results.push({
          name: TXT(LL("Exactamente una salida activa por combinación", "Exactly one active output per combination")),
          ok: okOneHot,
        });
        results.push({
          name: TXT(LL("Cada valor enciende una salida distinta (biyección)", "Each value activates a distinct output (bijection)")),
          ok: okDistinct,
        });
      } else if (lib["DEC2"] || lib["DEC3"]) {
        results.push({
          name: TXT(LL("Decodificador empaquetado", "Decoder packed")),
          ok: true,
        });
      }

      if (lib["DEC2"]) {
        results.push({
          name: TXT(LL("Caja DEC2: la entrada v enciende Yv", "DEC2 box: input v activates Yv")),
          ok: testDecoderBox("DEC2", 2, 4),
        });
      }
      if (lib["DEC3"]) {
        results.push({
          name: TXT(LL("Caja DEC3: la entrada v enciende Yv", "DEC3 box: input v activates Yv")),
          ok: testDecoderBox("DEC3", 3, 8),
        });
      }

      return results;
    },
  },
  {
    id: "s24",
    title: LL("24. Contador de pasos y RESET (RING3)", "24. Step counter and RESET (RING3)"),
    theory: {
      es: `
        <p>Una computadora no puede hacer todo en un solo instante: necesita un compás rítmico
        y ordenado. En nuestra CPU, cada instrucción se ejecuta en <b>3 pasos</b>:</p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>T0</b>: Buscar la instrucción en la memoria (Fetch OP) y avanzar el PC</li>
          <li><b>T1</b>: Buscar el argumento (Fetch ARG) y avanzar el PC</li>
          <li><b>T2</b>: Ejecutar la operación (Execute)</li>
        </ul>
        <p>Para generar estas fases usamos un <b>contador de anillo</b> (<i>ring counter</i>):
        un único bit <code>1</code> que circula cíclicamente $T_0 \rightarrow T_1 \rightarrow T_2 \rightarrow T_0$.</p>
        <p><b>El problema del arranque y el milagro del RESET:</b><br>
        Al encender la computadora, todos los flip-flops arrancan en estado desconocido
        (cables grises con valor <code>-1</code>). Si conectamos un lazo directo, el circuito
        nunca arranca porque <code>-1</code> retroalimentado sigue siendo <code>-1</code>.</p>
        <p>La línea <b>RESET</b> rompe ese bloqueo gracias a las compuertas:</p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>$D_{T0} = \text{RESET} + T_2$: con $\text{RESET}=1$, la compuerta OR calcula $\text{OR}(1, -1) = 1$. ¡Garantiza un 1 limpio en T0!</li>
          <li>$D_{T1} = \neg\text{RESET} \cdot T_0$: con $\text{RESET}=1$ ($\neg\text{RESET}=0$), la compuerta AND calcula $\text{AND}(0, -1) = 0$.</li>
          <li>$D_{T2} = \neg\text{RESET} \cdot T_1$: calcula $\text{AND}(0, -1) = 0$.</li>
        </ul>
        <p>¡Un solo pulso de reloj con RESET=1 inicializa el contador en <code>100</code>!</p>
        <p><b>Componentes que necesitás:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>3× tu caja <b>DFF</b> 🧩 (de la lección 9)</li>
          <li>1× <b>OR</b> (tecla 7) — para inyectar RESET en T0</li>
          <li>2× <b>AND</b> (tecla 6) — para condicionar T1 y T2 al RESET</li>
          <li>1× <b>NOT</b> (tecla 5) — para obtener ¬RESET</li>
          <li>2× <b>Entrada</b> (tecla 2): RESET y CLK (o un Reloj ⏱ tecla 4)</li>
          <li>3× <b>Salida</b> (tecla 3): T0, T1, T2</li>
        </ul>
        <p><b>Conexión:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Conectá CLK al pin 1 (reloj) de los 3 DFF</li>
          <li>Conectá RESET al NOT para tener ¬RESET</li>
          <li>DFF0 (T0): su pin 0 (D) recibe la salida de la OR entre RESET y el pin 2 (Q) del DFF2 (T2)</li>
          <li>DFF1 (T1): su pin 0 (D) recibe la salida de la AND entre ¬RESET y el pin 2 (Q) del DFF0 (T0)</li>
          <li>DFF2 (T2): su pin 0 (D) recibe la salida de la AND entre ¬RESET y el pin 2 (Q) del DFF1 (T1)</li>
          <li>Conectá el pin 2 (Q) de cada DFF a su Salida correspondiente (T0, T1, T2)</li>
        </ol>
        <p><b>El experimento:</b><br>
        1. Con <code>RESET = 1</code>, dale un pulso al reloj: T0 se pone en 1 y T1, T2 en 0.<br>
        2. Bajá <code>RESET = 0</code> y dale pulsos: verás el 1 viajar $T_0 \rightarrow T_1 \rightarrow T_2 \rightarrow T_0 \dots$</p>
        <p style="color:var(--dim); font-size:12px;">💡 Empaquetalo como <b>RING3</b>:<br>
        📦 Empaquetar (P) → Nombralo <b>RING3</b>.<br>
        Pines de entrada: RESET, CLK (en orden de click).<br>
        Pines de salida: T0, T1, T2.<br>
        Este contador será el director de orquesta de tu CPU.</p>`,
      en: `
        <p>A computer cannot do everything in a single moment: it needs a rhythmic, orderly beat.
        In our CPU, every instruction executes in <b>3 steps</b>:</p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li><b>T0</b>: Fetch the instruction from memory (Fetch OP) and advance the PC</li>
          <li><b>T1</b>: Fetch the argument (Fetch ARG) and advance the PC</li>
          <li><b>T2</b>: Execute the operation (Execute)</li>
        </ul>
        <p>To generate these phases we use a <b>ring counter</b>:
        a single <code>1</code> bit that circles $T_0 \rightarrow T_1 \rightarrow T_2 \rightarrow T_0$.</p>
        <p><b>Startup problem and the power of RESET:</b><br>
        At power-on, all flip-flops start in an unknown state (gray wires with value <code>-1</code>).
        If directly looped, the circuit never starts because feeding back <code>-1</code> remains <code>-1</code>.</p>
        <p>The <b>RESET</b> line breaks this deadlock thanks to boolean absorption:</p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>$D_{T0} = \text{RESET} + T_2$: with $\text{RESET}=1$, the OR gate computes $\text{OR}(1, -1) = 1$. A clean 1 is guaranteed into T0!</li>
          <li>$D_{T1} = \neg\text{RESET} \cdot T_0$: with $\text{RESET}=1$ ($\neg\text{RESET}=0$), the AND gate computes $\text{AND}(0, -1) = 0$.</li>
          <li>$D_{T2} = \neg\text{RESET} \cdot T_1$: computes $\text{AND}(0, -1) = 0$.</li>
        </ul>
        <p>A single clock pulse with RESET=1 cleanly sets the counter to <code>100</code>!</p>
        <p><b>Components you need:</b></p>
        <ul style="padding-left:18px; margin:6px 0;">
          <li>3× your <b>DFF</b> box 🧩 (from lesson 9)</li>
          <li>1× <b>OR</b> (key 7) — injects RESET into T0</li>
          <li>2× <b>AND</b> (key 6) — gates T1 and T2 with RESET</li>
          <li>1× <b>NOT</b> (key 5) — yields ¬RESET</li>
          <li>2× <b>Input</b> (key 2): RESET and CLK (or a Clock ⏱ key 4)</li>
          <li>3× <b>Output</b> (key 3): T0, T1, T2</li>
        </ul>
        <p><b>Wiring:</b></p>
        <ol style="padding-left:18px; margin:6px 0;">
          <li>Connect CLK to pin 1 (clock) of all 3 DFFs</li>
          <li>Connect RESET to the NOT to get ¬RESET</li>
          <li>DFF0 (T0): pin 0 (D) receives the OR of RESET and DFF2's pin 2 (Q, T2)</li>
          <li>DFF1 (T1): pin 0 (D) receives the AND of ¬RESET and DFF0's pin 2 (Q, T0)</li>
          <li>DFF2 (T2): pin 0 (D) receives the AND of ¬RESET and DFF1's pin 2 (Q, T1)</li>
          <li>Connect pin 2 (Q) of each DFF to its visual Output (T0, T1, T2)</li>
        </ol>
        <p><b>The experiment:</b><br>
        1. With <code>RESET = 1</code>, pulse the clock: T0 turns on (1) and T1, T2 turn off (0).<br>
        2. Set <code>RESET = 0</code> and pulse the clock: watch the 1 step $T_0 \rightarrow T_1 \rightarrow T_2 \rightarrow T_0 \dots$</p>
        <p style="color:var(--dim); font-size:12px;">💡 Pack it as <b>RING3</b>:<br>
        📦 Pack (P) → Name it <b>RING3</b>.<br>
        Input pins: RESET, CLK (in click order).<br>
        Output pins: T0, T1, T2.<br>
        This counter is the conductor of your CPU.</p>`,
    },
    check() {
      const dff = state.components.filter(c => c.type === "DFF");
      const nameComps = TXT(LL("Circuito: 3 DFF y compuertas de control", "Circuit: 3 DFFs and control gates"));
      if (dff.length < 3) {
        return [{ name: nameComps, ok: false }];
      }

      const { netOf } = buildNets();
      let clkComp = null;
      for (const d of dff) {
        const netClk = netOf.get(d.id + ":1");
        if (netClk === undefined) continue;
        clkComp = state.components.find(c =>
          (c.type === "switch" || c.type === "clock") &&
          netOf.get(c.id + ":0") === netClk
        );
        if (clkComp) break;
      }
      if (!clkComp) {
        for (const d of dff) {
          const w = state.wires.find(w => (w.a.c === d.id && w.a.t === 1) || (w.b.c === d.id && w.b.t === 1));
          if (!w) continue;
          const otherId = w.a.c === d.id ? w.b.c : w.a.c;
          clkComp = state.components.find(c => c.id === otherId && (c.type === "switch" || c.type === "clock"));
          if (clkComp) break;
        }
      }

      const nameClk = TXT(LL("Reloj conectado al pin CLK de los DFF", "Clock wired to DFF CLK pin"));
      if (!clkComp) {
        return [{ name: nameComps, ok: true }, { name: nameClk, ok: false }];
      }

      const swClk = clkComp.type === "switch" ? clkComp : null;
      const clock = clkComp.type === "clock" ? clkComp : null;
      const clockPrev = clock ? (globalClockState.get(clock.id) ?? false) : false;
      const clkSet = v => {
        if (swClk) swClk.on = v;
        else if (clock) globalClockState.set(clock.id, v);
      };
      const pulse = () => {
        clkSet(true);
        simulate();
        clkSet(false);
        return simulate();
      };

      const sws = state.components.filter(c => c.type === "switch");
      const candidateResets = sws.filter(s => s !== swClk);

      const savedSw = sws.map(s => s.on);
      const savedGateOuts = new Map(gateOuts);

      const targetDffs = dff.slice(0, 3);
      const read3Q = r => targetDffs.map(d => r.values[r.netOf.get(d.id + ":2")]);

      let okReset = false;
      let okCount = false;

      for (const swReset of candidateResets) {
        gateOuts.clear();
        sws.forEach(s => s.on = false);
        swReset.on = true;
        clkSet(false);
        simulate();

        pulse();
        const q0 = read3Q(simulate());

        const t0Idx = q0.indexOf(1);
        if (t0Idx === -1 || q0.filter(v => v === 0).length !== 2) {
          continue;
        }

        okReset = true;

        swReset.on = false;
        clkSet(false);
        simulate();

        pulse();
        const q1 = read3Q(simulate());
        pulse();
        const q2 = read3Q(simulate());
        pulse();
        const q3 = read3Q(simulate());

        const idx1 = q1.indexOf(1);
        const idx2 = q2.indexOf(1);
        const idx3 = q3.indexOf(1);

        const oneHot = q => q.filter(v => v === 1).length === 1 && q.filter(v => v === 0).length === 2;

        if (oneHot(q1) && oneHot(q2) && oneHot(q3)) {
          if (idx1 !== t0Idx && idx2 !== t0Idx && idx2 !== idx1 && idx3 === t0Idx) {
            okCount = true;
            break;
          }
        }
      }

      sws.forEach((s, i) => s.on = savedSw[i]);
      if (clock) globalClockState.set(clock.id, clockPrev);
      gateOuts.clear();
      for (const [k, v] of savedGateOuts) gateOuts.set(k, v);
      simulate();

      const results = [
        { name: nameComps, ok: true },
        { name: nameClk, ok: true },
        { name: TXT(LL("RESET: con RESET=1 un pulso inicializa T0=1, T1=0, T2=0", "RESET: with RESET=1 a pulse sets T0=1, T1=0, T2=0")), ok: okReset },
        { name: TXT(LL("Con RESET=0 el contador cicla 3 pasos (T1 → T2 → T0)", "With RESET=0 counter cycles 3 steps (T1 → T2 → T0)")), ok: okCount },
      ];

      if (lib["RING3"]) {
        results.push({
          name: TXT(LL("Caja RING3: 2 entradas (RESET, CLK) y 3 salidas (T0-T2)", "RING3 box: 2 inputs (RESET, CLK) and 3 outputs (T0-T2)")),
          ok: lib["RING3"].inputs.length === 2 && lib["RING3"].outputs.length === 3,
        });
      }

      return results;
    },
  },
];

// Check for lesson 6 (SR): defined separately because it verifies a SEQUENCE
// (set → hold → reset → hold) that doesn't fit the table pattern.
LESSONS[5].check = function() {
  const nor = state.components.filter(c => c.type === "nor");
  const sws = state.components.filter(c => c.type === "switch");
  const nameNeeds = TXT(LL("Hay 2 NOR (tecla 9), 2 Entradas y todo cableado en cruz", "There are 2 NORs (key 9), 2 Inputs, all cross-wired"));
  if (nor.length < 2 || sws.length < 2)
    return [{ name: nameNeeds, ok: false }];
  sws.forEach(s => s.on = false);
  // Q can be on either of the 2 NORs: test both outputs.
  // And Set/Reset can be in either switch order: test both
  // roles for each switch.
  const results = [{ name: nameNeeds, ok: true }];
  let canSet = false, canHold = false, canReset = false;
  for (const qn of nor) {
    const qv = () => { const r = simulate(); return r.values[r.netOf.get(qn.id + ":2")]; };
    // role A: sw0=Set, sw1=Reset
    sws.forEach(s => s.on = false);
    sws[0].on = true; const a1 = qv();       // Set → Q must go to 1
    sws[0].on = false; const a2 = qv();      // hold → Q stays 1
    sws[1].on = true; const a3 = qv();       // Reset → Q must go to 0
    sws[1].on = false; const a4 = qv();      // hold → Q stays 0
    if (a1 === 1 && a2 === 1) canSet = true;
    if (a1 === 1 && a2 === 1 && a3 === 0) canReset = true;
    if (a2 === 1 && a4 === 0) canHold = true;
    // role B: sw1=Set, sw0=Reset (the circuit may be wired the other way around)
    sws.forEach(s => s.on = false);
    sws[1].on = true; const b1 = qv();
    sws[1].on = false; const b2 = qv();
    sws[0].on = true; const b3 = qv();
    sws[0].on = false; const b4 = qv();
    if (b1 === 1 && b2 === 1) canSet = true;
    if (b1 === 1 && b2 === 1 && b3 === 0) canReset = true;
    if (b2 === 1 && b4 === 0) canHold = true;
  }
  sws.forEach(s => s.on = false);
  results.push({ name: TXT(LL("Se puede setear (alguna entrada en 1 → Q=1)", "Can be set (some input to 1 → Q=1)")), ok: canSet });
  results.push({ name: TXT(LL("Recuerda al soltar (todo en 0 mantiene el valor)", "Holds after releasing (all 0 keeps the value)")), ok: canHold });
  results.push({ name: TXT(LL("Se puede resetear (la otra entrada → Q=0)", "Can be reset (the other input → Q=0)")), ok: canReset });
  return results;
};

// ============================================================
// LESSON PANEL UI
// (navigation, verification, toggle button)
// ============================================================
// Restore the last opened lesson (persisted in localStorage)
let lessonViewing = 0;
try {
  const saved = localStorage.getItem("lessonCurrent");
  if (saved !== null) {
    const v = parseInt(saved, 10);
    if (!isNaN(v) && v >= 0 && v < LESSONS.length) lessonViewing = v;
  }
} catch {}
function saveLessonCurrent() {
  try { localStorage.setItem("lessonCurrent", String(lessonViewing)); } catch {}
}

function lessonCurrentIdx() {
  return Math.min(lessonViewing, LESSONS.length - 1);
}

function renderLesson() {
  const panel = document.getElementById("lessonPanel");
  const i = lessonCurrentIdx();
  const L = LESSONS[i];
  if (!L) return;

  const nav = document.getElementById("lessonNav");
  nav.innerHTML = "";
  if (i > 0) {
    const prev = document.createElement("button");
    prev.textContent = "←";
    prev.title = TXT(LL("Lección anterior", "Previous lesson"));
    prev.addEventListener("click", () => { lessonViewing--; saveLessonCurrent(); renderLesson(); });
    nav.appendChild(prev);
  }
  const sel = document.createElement("select");
  for (let k = 0; k < LESSONS.length; k++) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = TXT(LESSONS[k].title);
    if (k === i) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.style.flex = "1";
  sel.addEventListener("change", () => {
    lessonViewing = +sel.value;
    saveLessonCurrent();
    renderLesson();
  });
  nav.appendChild(sel);
  if (lessonViewing < LESSONS.length - 1) {
    const next = document.createElement("button");
    next.textContent = "→";
    next.title = TXT(LL("Lección siguiente", "Next lesson"));
    next.addEventListener("click", () => { lessonViewing++; saveLessonCurrent(); renderLesson(); });
    nav.appendChild(next);
  }

  document.getElementById("lessonTitle").textContent = TXT(L.title);
  document.getElementById("lessonProgress").textContent =
    TXT(LL("Lección", "Lesson")) + " " + (i + 1) + " / " + LESSONS.length;
  document.getElementById("lessonBody").innerHTML = TXT(L.theory);
  document.getElementById("lessonChecks").innerHTML =
    '<div style="font-size:12px; color:var(--dim)">' +
    TXT(LL('Apretá "Verificar" cuando creas que lo tenés.', 'Press "Verify" when you think you have it.')) +
    '</div>';
  document.getElementById("lessonVerify").textContent = t("lessonVerifyLabel");
  panel.style.display = "flex";
}

function lessonVerify() {
  const i = lessonCurrentIdx();
  const L = LESSONS[i];
  const results = L.check();
  const box = document.getElementById("lessonChecks");
  let html = "";
  let allOk = true;
  for (const r of results) {
    if (!r.ok) allOk = false;
    html += '<div class="checkItem ' + (r.ok ? "ok" : "bad") + '">' + (r.ok ? "✓" : "✗") + " " + r.name + "</div>";
  }
  if (allOk && i < LESSONS.length - 1) {
    html += '<div style="margin-top:10px; font-weight:700; color:#9ade3f">🎉 ' +
      TXT(LL("¡Lección superada!", "Lesson passed!")) + "</div>" +
      '<button id="lessonNext" style="margin-top:8px; width:100%; border-color:var(--accent); color:var(--accent);">' +
      TXT(LL("Siguiente lección →", "Next lesson →")) + "</button>";
  } else if (allOk) {
    html += '<div style="margin-top:10px; font-weight:700; color:#9ade3f">🎉 ' +
      TXT(LL("¡Curso completado!", "Course completed!")) + "</div>";
  }
  box.innerHTML = html;
  const b = document.getElementById("lessonNext");
  if (b) b.addEventListener("click", () => {
    lessonViewing = Math.min(lessonViewing + 1, LESSONS.length - 1);
    saveLessonCurrent();
    renderLesson();
  });
}

document.getElementById("lessonBtn").addEventListener("click", () => {
  const p = document.getElementById("lessonPanel");
  if (p.style.display === "flex") {
    p.style.display = "none";
  } else {
    renderLesson();
  }
});
document.getElementById("lessonVerify").addEventListener("click", lessonVerify);
