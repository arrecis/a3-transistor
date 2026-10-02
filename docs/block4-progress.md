# Progreso del Bloque 4: Construcción del CPU

## Lecciones 18, 23, 24

### 1. Lección 18 (ALU4) — Empaquetado y Configuración según el Brief
- **Ajustes en `js/lessons.js` (es y en):**
  - **Pines y Opcode:** Se redujo el opcode a 1 solo bit `OP` (con `OP=0` realiza suma mediante `ADD4` y con `OP=1` realiza `AND` lógico bit a bit). Se eliminó la referencia a `OP1`.
  - **Cin interno:** La entrada `Cin` de `ADD4` se alimenta de una Entrada auxiliar fija en 0 y se documentó explícitamente que no debe seleccionarse como pin al empaquetar la caja.
  - **Orden de pines de empaquetado (caja ALU4):**
    - Entradas (en orden de click): `A0, A1, A2, A3, B0, B1, B2, B3, OP` (9 pines de entrada).
    - Salidas: `R0, R1, R2, R3` (4 pines de salida).
  - **Verificación `check()`:** Se incorporó la validación condicional que comprueba que si existe `lib["ALU4"]`, cuenta exactamente con 9 entradas y 4 salidas.

### 2. Lección 22 (RAM16) — Ajuste de Referencia al Bloque 4
- **Ajuste en `js/lessons.js` (es y en):**
  - Se modificó la frase final de la teoría ("a partir de la próxima lección tus programas van a vivir ahí dentro") para apuntar explícitamente al Bloque 4:
    - *es:* *"y en el bloque 4, cuando construyas el CPU, tus programas van a vivir ahí dentro."*
    - *en:* *"and in block 4, when you build the CPU, your programs will live in there."*

### 3. Lección 23 (s23) — Decodificador 2→4 y 3→8
- **Contenido pedagógico (es y en):**
  - **Concepto:** Explica el decodificador como un traductor que toma $N$ bits binarios y activa exactamente una de sus $2^N$ salidas (representación one-hot).
  - **Analogía:** Conserje de hotel con casillero de llaves numeradas (pedir una habitación enciende exclusivamente esa luz).
  - **Relevancia:** En el CPU las instrucciones se leen como números compactos de memoria; el decodificador activa la línea física de control encargada de la acción.
  - **Componentes y Cableado:** Atajos de teclado para entradas (2), NOT (5), AND (6) y salidas (3). Ecuaciones booleanas explícitas ($Y_0 = \neg A_1 \cdot \neg A_0$, $Y_1 = \neg A_1 \cdot A_0$, $Y_2 = A_1 \cdot \neg A_0$, $Y_3 = A_1 \cdot A_0$).
  - **Nota de empaquetado 💡:**
    - `DEC2`: Entradas `A0, A1` | Salidas `Y0, Y1, Y2, Y3`.
    - `DEC3`: Entradas `A0, A1, A2` | Salidas `Y0..Y7`.
- **Lógica de `check()` funcional:**
  - Identifica si el circuito corresponde a `DEC2` ($\ge 4$ salidas/ANDs, $\ge 2$ switches) o a `DEC3` ($\ge 8$ salidas/ANDs, $\ge 3$ switches).
  - Robusto frente al orden de creación de las Entradas mediante prueba exhaustiva de permutaciones.
  - Comprueba que para cada valor binario de entrada se encienda exactamente la salida correspondiente y todas las demás permanezcan apagadas (sin estados indeterminados).
  - Si existen `lib["DEC2"]` o `lib["DEC3"]`, valida sus números de pines (2 in / 4 out para DEC2; 3 in / 8 out para DEC3).

### 4. Lección 24 (s24) — Contador de Pasos y RESET (RING3)
- **Contenido pedagógico (es y en):**
  - **Concepto y necesidad:** Explica por qué una instrucción de CPU se descompone en 3 pasos temporales:
    - $T_0$: Fetch OP (buscar instrucción y avanzar PC).
    - $T_1$: Fetch ARG (buscar argumento y avanzar PC).
    - $T_2$: Execute (ejecutar operación).
  - **Mecanismo de RESET frente al arranque indeterminado:**
    - Al encender, los flip-flops inician en estado `-1` (cables grises). Un lazo directo sin RESET nunca saldría del estado indeterminado.
    - $D_{T0} = \text{RESET} + T_2$: con $\text{RESET}=1$, $\text{OR}(1, -1) = 1$, asegurando $T_0=1$.
    - $D_{T1} = \neg\text{RESET} \cdot T_0$ y $D_{T2} = \neg\text{RESET} \cdot T_1$: con $\text{RESET}=1$ ($\neg\text{RESET}=0$), $\text{AND}(0, -1) = 0$, forzando $T_1=0$ y $T_2=0$.
    - Un pulso con RESET=1 garantiza la inicialización limpia a `[1, 0, 0]`.
  - **Componentes y Cableado:** 3 DFFs, compuertas OR, AND, NOT, reloj y entradas con teclas.
  - **Nota de empaquetado 💡:**
    - `RING3`: Entradas `RESET, CLK` | Salidas `T0, T1, T2`.
- **Lógica de `check()` funcional:**
  - Localiza el conductor del pin CLK de los DFFs (sea interruptor o componente de Reloj ⏱ mediante `globalClockState`).
  - Encuentra la Entrada de RESET probando las entradas restantes.
  - Aplica un pulso con $\text{RESET}=1$ y verifica que $T_0=1, T_1=0, T_2=0$.
  - Con $\text{RESET}=0$, aplica 3 pulsos y verifica que la señal activa circule ordenadamente ($T_1 \rightarrow T_2 \rightarrow T_0$) manteniendo exactamente una salida activa en cada ciclo.
  - Restaura los estados de interruptores, reloj y `gateOuts` al finalizar para evitar alterar la vista del alumno.
  - Si existe `lib["RING3"]`, verifica 2 entradas y 3 salidas.

### 5. Casos de Prueba en `tests/lessons.test.js`
Se construyeron builders de circuito (`dec2`, `dec3`, `ring3`) y se añadieron los 6 casos de prueba solicitados:
1. `DEC2 correcto pasa`: Comprueba decodificador 2→4 correctamente cableado (Pasa).
2. `DEC2 con una salida mal cableada falla`: Comprueba que si una salida está duplicada o mal conectada, el check falla (Pasa).
3. `DEC3 correcto pasa`: Comprueba decodificador 3→8 con 8 salidas (Pasa).
4. `RING3 correcto pasa`: Comprueba contador de anillo con compuertas de RESET que inicializa y cicla 3 pasos (Pasa).
5. `RING3 sin RESET (D_T0 = T2 solamente) falla`: Comprueba que un contador en lazo sin compuertas de absorción de RESET queda en `-1` y el check falla (Pasa).
6. `ALU4 empaquetada con el orden del brief suma y hace AND correctamente (A=6,B=3: OP=0 → 9, OP=1 → 2)`: Empaqueta ADD4, MUX2 y ALU4 con el orden de pines del brief (`A0-A3, B0-B3, OP | R0-R3`) y verifica funcionalmente las operaciones de suma ($6 + 3 = 9$) y AND ($6 \text{ AND } 3 = 2$) (Pasa).

### 6. Ejecución de Verificaciones
- `node --check js/lessons.js`: Sin errores de sintaxis.
- `node tests/lessons.test.js`: **29/29 passed** (todos los tests pasan exitosamente).
- Sin modificaciones ni interferencias con `tests/cpu.test.js`.
- Sin commits realizados.

FIN

## Ronda 2 s23

### 1. Corrección del Falso Negativo en el Canvas (`check()` de s23)
- **Problema identificado:** El check anterior asumía un orden estricto de creación en las salidas (`targetOuts = [Y0, Y1, Y2, Y3]`), comparando `outVals[val]`. Aunque se probaban permutaciones de las entradas, esto solo cubría 2 de los 24 órdenes posibles de creación de salidas, provocando falsos negativos si el usuario creaba las salidas en un orden distinto (por ejemplo, de abajo hacia arriba o en orden inverso).
- **Nueva lógica en canvas (Biyección One-Hot):**
  - Para cada combinación de entrada binaria ($0 \dots 2^N - 1$), se verifica que se active **exactamente una salida** (sin valores indeterminados `-1` ni salidas múltiples).
  - Se comprueba que cada combinación de entrada active una **salida distinta**, garantizando una correspondencia biyectiva ($2^N$ salidas distintas activadas a lo largo de las $2^N$ combinaciones).
  - Es totalmente agnóstico al orden en que el alumno coloque o cree sus Salidas en el canvas.

### 2. Verificación Funcional de la Caja Empaquetada (`lib["DEC2"]` y `lib["DEC3"]`)
- **Aislamiento y preservación:** El orden físico de los pines sólo importa al empaquetar. Si existe `lib["DEC2"]` o `lib["DEC3"]`, se ejecuta una prueba funcional aislada (`testDecoderBox`):
  - Guarda el estado del canvas del alumno (`state.components`, `state.wires`, `state.nextId`, `gateOuts`).
  - Instancia temporalmente la caja empaquetada cableando sus pines de entrada y salida con switches y outs auxiliares.
  - Verifica que para cada valor de entrada $v$, se encienda exactamente el pin de salida $Y_v$ y ningún otro.
  - Restaura íntegramente los componentes, cables, nextId y `gateOuts` del alumno, re-simulando para que la vista del canvas quede intacta.
  - Ítems reportados:
    - `"Caja DEC2: la entrada v enciende Yv"` (o `"DEC2 box: input v activates Yv"`).
    - `"Caja DEC3: la entrada v enciende Yv"` (o `"DEC3 box: input v activates Yv"`).

### 3. Nuevos Tests en `tests/lessons.test.js`
Se actualizaron los helpers y se añadieron los 3 casos requeridos:
1. `DEC2 correcto con Salidas creadas en orden inverso PASA`: Crea las salidas en orden `[Y3, Y2, Y1, Y0]` y valida que el check en canvas pase satisfactoriamente (**PASS**).
2. `un decodificador donde un valor enciende 2 salidas FALLA`: Cablea la salida 11 para encender dos salidas simultáneas y comprueba que falle (**PASS**).
3. `DEC2 empaquetada con pines de salida en orden incorrecto (Y1 antes que Y0) hace FALLAR el ítem de la caja`: Empaqueta la caja con pines de salida `[Y1, Y0, Y2, Y3]` y valida que el ítem de la caja falle (**PASS**).

### 4. Resultados de Verificación
- `node --check js/lessons.js`: Sintaxis limpia sin errores.
- `node tests/lessons.test.js`: **32/32 passed** (todos los tests pasan exitosamente).
- `tests/cpu.test.js` no ha sido modificado ni alterado.
- Sin commits realizados.

FIN2
