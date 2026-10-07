# Reestructura del curso: empaquetar antes de encadenar

Regla del autor: si una lección repite el mismo sub-circuito varias veces, ese
sub-circuito se arma primero solo, en su propia lección, y se empaqueta. La
lección siguiente encadena las cajas.

## Orden nuevo (30 lecciones)

| Nº | id nuevo | Viene de | Lección |
|---|---|---|---|
| 1-9 | s1-s9 | s1-s9 | sin cambios de orden |
| 10 | s10 | s11 | MUX: el selector |
| 11 | s11 | s12 | Empaquetá el MUX2 |
| 12 | s12 | **nueva** | Registro de 1 bit: DFF + MUX2 de LOAD → caja **REG1** (D, LOAD, CLK \| Q) |
| 13 | s13 | s10 (reescrita) | Registro de 4 bits: 4× REG1 con LOAD y CLK compartidos → caja **REG4** (D0-D3, LOAD, CLK \| Q0-Q3) |
| 14 | s14 | s13 | Half adder |
| 15 | s15 | s14 | Sumador completo |
| 16 | s16 | s15 | Empaquetá el FULLADDER |
| 17 | s17 | s16 | Sumador de 4 bits (ya encadena cajas) |
| 18 | s18 | s17 | Empaquetá el ADD4 |
| 19 | s19 | **nueva** | Selector de 4 bits: 4× MUX2 con S compartido → caja **SEL4** (A0-A3, B0-B3, S \| O0-O3); S=0 → A |
| 20 | s20 | s18 | ALU de 4 bits: ADD4 + 4 AND + **SEL4** → caja ALU4 (pines sin cambios) |
| 21 | s21 | s19 | Program Counter: **REG4** + ADD4 como +1 (B=0001, Cin=0) + **SEL4** de salto (S=JUMP, A=PC+1, B=destino). RESET = JUMP a 0000 |
| 22 | s22 | s20 | Repaso (actualizar la lista de cajas) |
| 23 | s23 | s21 | RAM con dirección |
| 24 | s24 | s22 | RAM16 |
| 25 | s25 | s23 | Decodificadores |
| 26 | s26 | s24 | Contador de pasos RING3 |
| 27 | s27 | s25 | Fetch: ya no arma REG4 (viene de la lección 13) |
| 28 | s28 | s26 | Unidad de control |
| 29 | s29 | s27 | Tu primer CPU: usar SEL4 donde hoy hay 4 MUX2 sueltos |
| 30 | s30 | s28 | JMP y HALT |

## Fase B1 (un agente)
Reordenar, renumerar ids y títulos, lecciones nuevas 12 (REG1) y 19 (SEL4),
reescribir la 13 (registro de 4 bits con REG1), actualizar tests.

## Fase B2 (otro agente, después de B1)
Actualizar 20, 21, 22, 27 y 29 para usar REG4 y SEL4; corregir todas las
referencias "lección N"; actualizar la sección 9 de docs/cpu-design.md.
