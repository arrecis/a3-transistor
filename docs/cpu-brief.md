# CPU 4 bits — brief de diseño (fuente de verdad para el bloque 4)

Restricciones del motor (verificadas):
- Flip-flops DFF maestro-esclavo: capturan D en el **flanco de bajada** de CLK.
- No existe componente tri-state: no hay bus compartido; las fuentes se eligen con **MUX2**.
- Al encender todo vale -1 (indeterminado). AND con un 0 da 0 y OR con un 1 da 1 aunque la otra entrada sea -1; XOR con -1 nunca resuelve. Por eso todo arranca con **RESET**.
- Las cajas pueden contener cajas (arreglado en engine.js).
- Reloj máximo 12 Hz (12 ciclos reales/s).

## Set de instrucciones (8)
Cada instrucción ocupa 2 celdas de RAM16: OP en dirección par, ARG en la siguiente. OP3 se ignora (reservado). Máximo 8 instrucciones.

| OP | Mnemónico | Efecto |
|---|---|---|
| 0 | NOP | nada |
| 1 | LDA n | A ← n |
| 2 | LDB n | B ← n |
| 3 | ADD | A ← A + B (mod 16, se descarta el acarreo) |
| 4 | AND | A ← A AND B |
| 5 | OUT | OUT ← A |
| 6 | JMP n | PC ← n |
| 7 | HALT | detiene el CPU |

## Ciclo de instrucción: 3 pasos (contador de anillo T0 → T1 → T2 → T0)
- T0 (fetch OP): OP ← RAM[PC]; PC ← PC + 1
- T1 (fetch ARG): ARG ← RAM[PC]; PC ← PC + 1
- T2 (execute): según OP
A 12 Hz: 4 instrucciones por segundo.

## Bloques y ecuaciones
Señales del decodificador 3→8 sobre OP0-OP2: NOP, LDA, LDB, ADD, AND, OUT, JMP, HALT.

- Contador de pasos (3 DFF, one-hot), reloj = CPU_CLK:
  - D_T0 = RESET + T2
  - D_T1 = ¬RESET · T0
  - D_T2 = ¬RESET · T1
- PC (4 DFF), reloj = CPU_CLK:
  - PC_LOAD = T0 + T1 + T2·JMP
  - PC_NEXT = (T2·JMP) ? ARG : PC + 1
  - D_PC = ¬RESET · (PC_LOAD ? PC_NEXT : PC)   (RESET fuerza 0000)
  - PC0-PC3 → RAM A0-A3. RAM CS = 1, WE = 0 (solo lectura en v1).
- OP (4 DFF): LOAD = T0, D = RAM Q. ARG (4 DFF): LOAD = T1, D = RAM Q.
- ALU4 (lección 18): entradas A y B, Cin = 0, selector = AND (decodificador). Salida ALU.
- A (4 DFF): LOAD = T2·(LDA + ADD + AND); D = (ADD + AND) ? ALU : ARG.
- B (4 DFF): LOAD = T2·LDB; D = ARG.
- OUT (4 DFF): LOAD = T2·OUT; D = A → 4 Salidas.
- Registros con LOAD = el patrón de la lección 10: D' = LOAD ? nuevo : Q (MUX2 por bit).
- HALT: flip-flop H con reloj CLK SIN compuerta: D_H = ¬RESET · (H + T2·HALT).
  - CPU_CLK = CLK · (¬H + RESET) — con RESET=1 el reloj pasa aunque el CPU esté detenido.

## Cajas y orden de pines (entradas | salidas)
Las existentes se reutilizan tal cual; el orden de pines es el orden de click al empaquetar.
- DFF: D, CLK | Q (lección 9)
- MUX2: A, B, S | OUT — S=0 → A, S=1 → B (lección 12)
- FULLADDER: A, B, Cin | S, Cout (lección 15)
- ADD4: A0-A3, B0-B3, Cin | S0-S3, Cout (lección 17)
- ALU4: A0-A3, B0-B3, OP | R0-R3 — OP=0 suma (Cin interno fijo en 0), OP=1 AND (lección 18; hoy la lección no fija el orden: hay que fijarlo)
- Nuevas:
  - DEC2: A0, A1 | Y0-Y3
  - DEC3: A0, A1, A2 | Y0-Y7 (se arma con DEC2 + AND, o con NOT + AND de 3 entradas en cascada)
  - REG4: D0-D3, LOAD, CLK | Q0-Q3 (4 DFF + 4 MUX2 de LOAD, lección 10)
  - RING3: RESET, CLK | T0, T1, T2

## RESET
Poner RESET=1, dar un pulso de CLK, poner RESET=0. Resultado: PC = 0, T0 = 1, H = 0. Los registros A, B y OUT quedan indeterminados hasta que una instrucción los carga (es correcto: un programa carga antes de usar).

## Programas de prueba
| Programa | RAM (hex, desde la dirección 0) | Resultado |
|---|---|---|
| Suma | 1 5 2 3 3 0 5 0 7 0 | OUT = 8, luego HALT |
| AND | 1 6 2 3 4 0 5 0 7 0 | OUT = 2 |
| Desborde | 1 F 2 1 3 0 5 0 7 0 | OUT = 0 |
| Contador | 1 0 2 1 3 0 5 0 6 4 | OUT = 1, 2, 3, … (vuelve a 0 tras 15) |

## Plan de lecciones (23–28)
| # | Lección | Pieza / caja nueva |
|---|---|---|
| 23 | Decodificador 2→4 y 3→8 | DEC2, DEC3 |
| 24 | Contador de pasos + RESET | RING3 (anillo T0/T1/T2) |
| 25 | Fetch: PC → RAM → OP/ARG | registro con LOAD (REG4) |
| 26 | Unidad de control | tabla paso × instrucción → señales |
| 27 | Tu primer CPU | ejecutar "Suma": OUT = 8 |
| 28 | JMP y HALT | "Contador" en bucle; HALT detiene el reloj |

El programa de ejemplo de la RAM (fillDemoProgram en js/pack.js) pasará a ser "Suma".

## Decisiones (respuestas a las preguntas abiertas de cpu-design.md)
1. ALU4: la lección 18 se actualiza para empaquetar ALU4 con el orden de este brief (A0-A3, B0-B3, OP | R0-R3), con Cin como Entrada interna fija en 0 y un solo bit de OP. Se quita OP1 de la lección.
2. PC del CPU: se reconstruye en la lección 25 con REG4 (LOAD = PC_LOAD) + incrementador +1 + MUX de salto. El PC de la lección 19 queda como lección conceptual.
3. MUX de entrada de A: entrada A del MUX2 = ARG (S=0, LDA) y entrada B = salida de ALU4 (S=1, ADD/AND). Se indica explícitamente en la lección 27.
4. RAM de lectura combinatoria: correcto, no hay carrera; sin cambios.
