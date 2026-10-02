# Documento de Diseño: CPU de 4 Bits (Bloque 4, Lecciones 23–28)

Este documento constituye la especificación técnica completa y la guía de implementación para el Bloque 4 del tutorial de *a3-transistor* (lecciones 23 a 28). Su fuente de verdad es [`docs/cpu-brief.md`](cpu-brief.md).

---

## 1. Objetivo y Restricciones del Motor

### Objetivo
Construir una unidad central de procesamiento (**CPU**, por sus siglas en inglés *Central Processing Unit*) didáctica de 4 bits con arquitectura Harvard modificada / von Neumann simplificada de programa almacenado. La CPU es capaz de leer instrucciones desde una memoria RAM de 16 palabras, decodificarlas, secuenciar su ejecución en un ciclo de 3 pasos, realizar operaciones aritmético-lógicas, interactuar con registros de datos, alterar el flujo de control mediante saltos incondicionales y detener su propia ejecución.

### Restricciones del Motor de Simulación (`engine.js`)
1. **Comportamiento de los Flip-Flops (DFF)**:
   - Los biestables tipo D empaquetados (`DFF`) son de arquitectura **maestro-esclavo**.
   - Capturan el dato presente en la entrada $D$ exactamente en el **flanco de bajada** del reloj (`CLK`: transición de $1 \rightarrow 0$).
   - Durante el resto del ciclo mantienen el valor capturado estable en su salida $Q$.
2. **Inexistencia de Tri-State (Tercer Estado / Alta Impedancia)**:
   - En el simulador no existen compuertas ni pines tri-state ($Z$). Por lo tanto, **no hay buses compartidos bidireccionales**.
   - Toda multiplexación o enrutamiento de datos entre múltiples emisores hacia un receptor debe resolverse explícitamente mediante multiplexores de dos entradas (`MUX2`) o compuertas lógicas discretas equivalentes.
3. **Lógica Ternaria al Encender (Manejo de Indeterminación)**:
   - Al encender la energía (`state.powerOn = true`), todas las compuertas y memorias arrancan con valor `-1` (indeterminado, visualizado como cables grises).
   - Álgebra ternaria en `simulate()`:
     - $\text{AND}(0, -1) = 0$ (un cero absorbe la indeterminación).
     - $\text{OR}(1, -1) = 1$ (un uno absorbe la indeterminación).
     - $\text{XOR}(-1, x) = -1$ para cualquier valor de $x \in \{0, 1, -1\}$.
     - $\text{NOT}(-1) = -1$.
   - Consecuencia fundamental: **El circuito NUNCA puede auto-iniciarse por retroalimentación pura**. Es imprescindible una línea global de **RESET** que fuerce ceros o unos limpios utilizando compuertas AND u OR con valores conocidos.
4. **Jerarquía de Cajas (Empaquetado Anidado)**:
   - El motor soporta cajas dentro de cajas (`makePackage` y `flattenCircuit` recursivo). Las sub-cajas creadas en lecciones anteriores (`DFF`, `MUX2`, `FULLADDER`, `ADD4`, `ALU4`) y las nuevas (`DEC2`, `DEC3`, `REG4`, `RING3`) se instancian como componentes de primer nivel.
5. **Frecuencia de Reloj y Rendimiento**:
   - El reloj del simulador tiene un límite superior de **12 Hz** (12 ciclos reales por segundo) para garantizar una tasa de cuadros fluida y animación visual de las señales.
   - Como cada instrucción consume 3 pasos de reloj ($T_0, T_1, T_2$), la velocidad de procesamiento máxima es de **4 instrucciones por segundo**.

---

## 2. Diagrama de Bloques en ASCII

El siguiente esquema ilustra la ruta de datos (buses de 4 bits representados con `====>`), las líneas de control de 1 bit (representadas con `---->`) y la distribución de reloj y reset.

```text
                           ===========================
                           |       LÍNEA RESET       |
                           ===========================
                                |               |
       =========================+===============+=========================
       |                        |               |                        |
       v (Reset)                v (Reset)       v (Reset)                v (Reset)
  +----------+             +----------+   +-----------+            +-----------+
  |   CLK    |--[Pulse]--> |  HALT    |   | Contador  |            |    PC     |
  | (Manual/ |             | Gating   |   | de Pasos  |            | (4 bits)  |
  |  Reloj)  |             |  (H-FF)  |   |  (RING3)  |            |           |
  +----------+             +----------+   +-----------+            +-----------+
       |                        |           |   |   |                |       ^
       |                        v           |   |   |                v       |
       |                   [ CPU_CLK ]      |   |   |           [PC0..PC3]   |
       |                        |           |   |   |                |       |
       |       +----------------+           |   |   |                v       |
       |       |        |       |           |   |   |          +-----------+ |
       |       |        |       |           |   |   |          |   RAM16   | |
       |       |        |       |           |   |   |          | A0..A3    | |
       |       |        |       |           |   |   |          | CS=1,WE=0 | |
       |       |        |       |           |   |   |          +-----------+ |
       |       |        |       |           |   |   |                |       |
       |       |        |       |           |   |   |          [RAM Q0..Q3]  |
       |       |        |       |           |   |   |           (4 bits)     |
       |       |        |       |           |   |   |           /        \   |
       |       |        |       |           |   |   |          /          \  |
       |       |        |       |           |   |   |         v            v |
       |       |        |       |       +---------------+  +-------+  +-------+
       |       |        |       |       |      T0       |->|  OP   |  |  ARG  |
       |       |        |       |       |      T1       |--|REG4   |  |REG4   |
       |       |        |       |       |      T2       |  +-------+  +-------+
       |       |        |       |       +---------------+      |          |
       |       |        |       |               |              |          |
       |       |        |       |               |          [OP0..OP2] [ARG0..ARG3]
       |       |        |       |               v              v          |
       |       |        |       |       +---------------+  +-------+      |
       |       |        |       |       |    UNIDAD     |<-| DEC3  |      |
       |       |        |       |       |      DE       |  | (3->8)|      |
       |       |        |       |       |    CONTROL    |  +-------+      |
       |       |        |       |       +---------------+                 |
       |       |        |       |         | | | | | | |                   |
       |       |        |       |         | | | | | | +--------+          |
       |       |        |       |         | | | | | +--------+ |          |
       |       |        |       |         | | | | +--------+ | |          |
       |       |        |       |         | | | +--------+ | | |          |
       |       |        |       |         | | +--------+ | | | |          |
       |       |        |       |         | +--------+ | | | | |          |
       |       |        |       |         v          v v v v v v          |
       |       |        |       |    PC_LOAD/SEL    A_LOAD/SEL B_LOAD     |
       |       |        |       |         |                |     |        |
       |       |        |       |         +----------------+     |        |
       |       |        |       |         |                |     |        |
       |       |        v       v         v                v     v        |
       |       |      +---------------------+            +-------+        |
       |       |      |     REGISTRO A      |            |  REG  |<-------+
       |       |      |    (Acumulador)     |            |   B   | (ARG)
       |       |      +---------------------+            +-------+
       |       |           |             ^                   |
       |       |           |             | (ARG o ALU)       |
       |       |           v             |                   v
       |       |     [Bus A: 4b]    +---------+         [Bus B: 4b]
       |       |       /       \    | MUX2-A  |              |
       |       |      /         \   +---------+              |
       |       |     /           \       ^                   |
       |       |    v             v      | (ALU)             v
       |       |  +-------+     +-------------------------------+
       |       |  |  REG  |     |             ALU4              |
       |       |  |  OUT  |     |     (Suma ADD4 / AND bit)     |
       |       |  +-------+     +-------------------------------+
       |       |      |                          ^
       |       |      v                          | (Señal AND del decodificador)
       |       |  [Visualizador]                 |
       |       |    (4 LEDs)           ALU_OP (0=Suma, 1=AND)
       v       v
  [ Distribución de CPU_CLK a todos los registros: PC, OP, ARG, A, B, OUT ]
```

---

## 3. Set de Instrucciones y Programas de Ejemplo

### Formato de Instrucción
- **Tamaño fijo**: Toda instrucción ocupa **2 celdas de RAM consecutivas** (2 nibbles = 8 bits totales):
  - **Celda Par ($2k$)**: Código de operación (`OP`). Bits $OP_0..OP_2$ determinan la operación; $OP_3$ está reservado (se asume 0).
  - **Celda Impar ($2k+1$)**: Argumento (`ARG`, 4 bits: valor numérico inmediato o dirección de salto).
- **Capacidad de memoria**: En 16 celdas caben exactamente hasta **8 instrucciones**.

### Codificación de Instrucciones (8 Opcodes)

| OP (Hex) | OP (Binario) | Mnemónico | Argumento | Semántica / Efecto |
|:---:|:---:|:---|:---:|:---|
| `0` | `000` | **NOP** | Ignorado | No opera. El PC avanza a la siguiente instrucción. |
| `1` | `001` | **LDA n** | `n` (dato) | Carga el valor inmediato `n` en el registro A ($A \leftarrow n$). |
| `2` | `010` | **LDB n** | `n` (dato) | Carga el valor inmediato `n` en el registro B ($B \leftarrow n$). |
| `3` | `011` | **ADD** | Ignorado | Suma A y B; guarda en A ($A \leftarrow (A + B) \pmod{16}$). Descarta el acarreo. |
| `4` | `100` | **AND** | Ignorado | Operación lógica bit a bit entre A y B ($A \leftarrow A \text{ AND } B$). |
| `5` | `101` | **OUT** | Ignorado | Copia el contenido del registro A en el registro OUT ($\text{OUT} \leftarrow A$). |
| `6` | `110` | **JMP n** | `n` (dirección) | Salto incondicional: carga `n` en el PC ($PC \leftarrow n$). |
| `7` | `111` | **HALT** | Ignorado | Detiene el reloj de la CPU hasta el próximo RESET. |

*Nota sobre argumentos ignorados*: En operaciones que no requieren operando (ADD, AND, OUT, NOP, HALT), la celda impar correspondiente contiene habitualmente `0` para mantener la regularidad de 2 celdas por instrucción.

---

### Programas de Prueba

#### Programa 1: "Suma" (Cálculo de $5 + 3 = 8$ y parada)
- **Ensamblador**:
  ```text
  dir 0:  LDA 5
  dir 2:  LDB 3
  dir 4:  ADD
  dir 6:  OUT
  dir 8:  HALT
  ```
- **Contenido en RAM (Hexadecimal)**:
  `1 5 2 3 3 0 5 0 7 0`
- **Resultado esperado**: La salida visual muestra `8` (`1000` binario) y el procesador se detiene.

#### Programa 2: "AND Lógico" (Operación bit a bit: $6 \text{ AND } 3 = 2$)
- **Ensamblador**:
  ```text
  dir 0:  LDA 6     ; 6 = 0110b
  dir 2:  LDB 3     ; 3 = 0011b
  dir 4:  AND       ; A = 0110b AND 0011b = 0010b (2)
  dir 6:  OUT       ; Muestra 2
  dir 8:  HALT
  ```
- **Contenido en RAM (Hexadecimal)**:
  `1 6 2 3 4 0 5 0 7 0`
- **Resultado esperado**: La salida visual muestra `2` (`0010` binario) y se detiene.

#### Programa 3: "Contador Infinito" (Bucle de incremento continuo)
- **Ensamblador**:
  ```text
  dir 0:  LDA 0     ; Inicializa A en 0
  dir 2:  LDB 1     ; Incremento constante = 1
  dir 4:  ADD       ; [Bucle] A <- A + 1
  dir 6:  OUT       ; Muestra valor actual
  dir 8:  JMP 4     ; Salta a la dirección 4 (repite ADD)
  ```
- **Contenido en RAM (Hexadecimal)**:
  `1 0 2 1 3 0 5 0 6 4`
- **Resultado esperado**: La salida muestra sucesivamente $1, 2, 3, 4, \dots, 15, 0, 1, \dots$ en bucle infinito a razón de $\approx 1.33$ incrementos por segundo.

#### Programa 4: "Desborde Aritmético" ($15 + 1 = 0 \pmod{16}$)
- **Ensamblador**:
  ```text
  dir 0:  LDA 15    ; A = 0xF
  dir 2:  LDB 1     ; B = 0x1
  dir 4:  ADD       ; 15 + 1 = 16 -> 0 (descarte de acarreo)
  dir 6:  OUT       ; Muestra 0
  dir 8:  HALT
  ```
- **Contenido en RAM (Hexadecimal)**:
  `1 F 2 1 3 0 5 0 7 0`
- **Resultado esperado**: La salida visual muestra `0` (`0000` binario) y se detiene.

---

## 4. Descripción Detallada de Bloques: Función, Ecuaciones, Cajas y Pines

### 4.1. Contador de Pasos (`RING3`)
- **Función**: Contador de anillo de 3 etapas one-hot ($T_0, T_1, T_2$). En cada instante, exactamente una de las tres fases vale 1. Se sincroniza con `CPU_CLK`.
- **Ecuaciones de Transición**:
  $$D_{T0} = \text{RESET} + T_2$$
  $$D_{T1} = \neg\text{RESET} \cdot T_0$$
  $$D_{T2} = \neg\text{RESET} \cdot T_1$$
- **Caja y Orden de Pines**:
  - Caja: `RING3`
  - Entradas: `RESET, CLK`
  - Salidas: `T0, T1, T2`

### 4.2. Contador de Programa (PC)
- **Función**: Registro de 4 bits con incremento condicional ($+1$) y carga paralela desde el bus `ARG` durante la ejecución de la instrucción `JMP`.
- **Ecuaciones**:
  - Habilitación de carga:
    $$\text{PC\_LOAD} = T_0 + T_1 + (T_2 \cdot \text{JMP})$$
  - Selector de próximo valor:
    $$\text{JMP\_SEL} = T_2 \cdot \text{JMP}$$
    $$\text{PC\_NEXT} = \text{JMP\_SEL} \text{ ? } \text{ARG} : (\text{PC} + 1)$$
  - Entrada D de los DFFs con RESET síncrono/asíncrono seguro:
    $$D_{\text{PC}} = \neg\text{RESET} \cdot (\text{PC\_LOAD} \text{ ? } \text{PC\_NEXT} : \text{PC})$$
- **Implementación**: 4 biestables `DFF` (o una caja `REG4`), un sumador de 4 bits fijado en $+1$ (4 medios sumadores en cascada con $C_{in}=1$) y 4 `MUX2` de selección de entrada.
- **Conexiones**: Salidas $PC_0..PC_3 \rightarrow$ entradas de dirección $A_0..A_3$ de la `RAM16`.

### 4.3. Memoria Principal (`RAM16`)
- **Función**: Almacén direccionable de 16 palabras de 4 bits.
- **Pines**:
  - Entradas: $A_0, A_1, A_2, A_3$ (dirección), $D_0, D_1, D_2, D_3$ (datos de entrada), $\text{WE}$ (Write Enable), $\text{CS}$ (Chip Select).
  - Salidas: $Q_0, Q_1, Q_2, Q_3$ (datos leídos).
- **Configuración estática en v1**:
  - $\text{CS} = 1$, $\text{WE} = 0$ (modo solo lectura para código de programa).
  - Entradas $D_0..D_3$ conectadas a masa ($0$).
  - Entradas $A_0..A_3$ gobernadas exclusivamente por $PC_0..PC_3$.
  - Salidas $Q_0..Q_3$ alimentan las entradas de datos de los registros `OP` y `ARG`.

### 4.4. Registros de Instrucción (`OP` y `ARG`)
- **Función**:
  - `OP`: Captura el código de operación en el paso $T_0$.
  - `ARG`: Captura el argumento u operando en el paso $T_1$.
- **Ecuaciones**:
  - $\text{OP\_LOAD} = T_0 \implies D_{\text{OP}}' = T_0 \text{ ? } \text{RAM\_Q} : \text{OP}$
  - $\text{ARG\_LOAD} = T_1 \implies D_{\text{ARG}}' = T_1 \text{ ? } \text{RAM\_Q} : \text{ARG}$
- **Cajas**: Dos instancias de `REG4`.

### 4.5. Decodificador 3→8 (`DEC3`)
- **Función**: Convierte el número binario $OP_0..OP_2$ (3 bits) en una de 8 líneas activas en alto.
- **Ecuaciones Lógicas**:
  $$Y_0 (\text{NOP})  = \neg OP_2 \cdot \neg OP_1 \cdot \neg OP_0$$
  $$Y_1 (\text{LDA})  = \neg OP_2 \cdot \neg OP_1 \cdot OP_0$$
  $$Y_2 (\text{LDB})  = \neg OP_2 \cdot OP_1 \cdot \neg OP_0$$
  $$Y_3 (\text{ADD})  = \neg OP_2 \cdot OP_1 \cdot OP_0$$
  $$Y_4 (\text{AND})  = OP_2 \cdot \neg OP_1 \cdot \neg OP_0$$
  $$Y_5 (\text{OUT})  = OP_2 \cdot \neg OP_1 \cdot OP_0$$
  $$Y_6 (\text{JMP})  = OP_2 \cdot OP_1 \cdot \neg OP_0$$
  $$Y_7 (\text{HALT}) = OP_2 \cdot OP_1 \cdot OP_0$$
- **Caja y Orden de Pines**:
  - Caja: `DEC3`
  - Entradas: `A0, A1, A2`
  - Salidas: `Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7`

### 4.6. Registros de Datos (Acumulador A, Registro B y Registro OUT)
- **Registro A (Acumulador)**:
  - Carga condicional: $\text{A\_LOAD} = T_2 \cdot (\text{LDA} + \text{ADD} + \text{AND})$.
  - Selección de fuente: $\text{A\_SEL} = \text{ADD} + \text{AND}$.
  - Dato de entrada: $D_A = \text{A\_SEL} \text{ ? } \text{ALU\_R} : \text{ARG}$.
  - Caja: `REG4` precedido por 4 cajas `MUX2` para seleccionar entre `ALU_R` y `ARG`.
- **Registro B (Segundo Operando)**:
  - Carga condicional: $\text{B\_LOAD} = T_2 \cdot \text{LDB}$.
  - Dato de entrada: $D_B = \text{ARG}$.
  - Caja: `REG4`.
- **Registro OUT (Salida Visual)**:
  - Carga condicional: $\text{OUT\_LOAD} = T_2 \cdot \text{OUT}$.
  - Dato de entrada: $D_{\text{OUT}} = A$.
  - Caja: `REG4` conectado directamente a 4 componentes `out` (Salida).

### 4.7. Unidad Aritmético-Lógica (`ALU4`)
- **Función**: Realiza la operación matemática entre los registros A y B.
- **Pines**:
  - Entradas: $A_0..A_3, B_0..B_3, \text{OP}$
  - Salidas: $R_0..R_3$
- **Operaciones**:
  - $\text{OP} = 0 \implies \text{Suma } (A + B) \pmod{16}$ (utiliza `ADD4` con $C_{in} = 0$, acarreo descartado).
  - $\text{OP} = 1 \implies \text{AND bit a bit } (A \text{ AND } B)$.
- **Control**: La entrada de selección $\text{OP}$ de la `ALU4` se conecta directamente a la señal de decodificador **AND** ($Y_4$). Cuando la instrucción es ADD ($Y_3$), la señal AND es 0 y la ALU suma; cuando la instrucción es AND ($Y_4$), la señal AND es 1 y la ALU ejecuta la lógica AND.

### 4.8. Control de Parada (HALT) y Compuerta de Reloj
- **Función**: Desactiva el pulso de reloj a la CPU al ejecutarse la instrucción HALT, pero garantiza el paso del pulso cuando se activa RESET.
- **Flip-Flop H**: Biestable `DFF` alimentado por el reloj maestro `CLK` (sin compuerta):
  $$D_H = \neg\text{RESET} \cdot (H + T_2 \cdot \text{HALT})$$
- **Compuerta de Reloj**:
  $$\text{CPU\_CLK} = \text{CLK} \cdot (\neg H + \text{RESET})$$

---

## 5. Tabla de la Unidad de Control

La Unidad de Control es un bloque combinatorio puro. Sus entradas son las fases de tiempo ($T_0, T_1, T_2$) y las salidas decodificadas de la instrucción (`NOP`, `LDA`, `LDB`, `ADD`, `AND`, `OUT`, `JMP`, `HALT`).

### Ecuaciones Lógicas de las Señales de Control
- $\text{PC\_LOAD} = T_0 + T_1 + (T_2 \cdot \text{JMP})$
- $\text{JMP\_SEL} = T_2 \cdot \text{JMP}$
- $\text{OP\_LOAD} = T_0$
- $\text{ARG\_LOAD} = T_1$
- $\text{A\_LOAD} = T_2 \cdot (\text{LDA} + \text{ADD} + \text{AND})$
- $\text{A\_SEL} = \text{ADD} + \text{AND}$
- $\text{B\_LOAD} = T_2 \cdot \text{LDB}$
- $\text{OUT\_LOAD} = T_2 \cdot \text{OUT}$
- $\text{HALT\_SET} = T_2 \cdot \text{HALT}$

### Tabla de Señales: Paso × Instrucción

| Paso | Instrucción Activa en OP | PC_LOAD | JMP_SEL | OP_LOAD | ARG_LOAD | A_LOAD | A_SEL | B_LOAD | OUT_LOAD | HALT_SET |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **T0** | *(Cualquiera / Fetch OP)* | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| **T1** | *(Cualquiera / Fetch ARG)*| 1 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| **T2** | **NOP** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **T2** | **LDA** | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| **T2** | **LDB** | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| **T2** | **ADD** | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 |
| **T2** | **AND** | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 |
| **T2** | **OUT** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| **T2** | **JMP** | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **T2** | **HALT**| 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |

*Notas sobre la tabla*:
1. En $T_0$ y $T_1$, el valor de `A_SEL` es irrelevante ($X$) porque `A_LOAD = 0`; se fuerza a $0$ por simplicidad.
2. Obsérvese que en $T_2$ de todas las instrucciones que no son `JMP`, `PC_LOAD = 0`. Esto se debe a que el PC ya avanzó al inicio de la siguiente instrucción durante los pasos $T_0$ y $T_1$.

---

## 6. Traza Ciclo a Ciclo del Programa "Suma"

### Programa Cargado en RAM16
- Celda 0: `1` (LDA)
- Celda 1: `5` (arg 5)
- Celda 2: `2` (LDB)
- Celda 3: `3` (arg 3)
- Celda 4: `3` (ADD)
- Celda 5: `0` (arg 0)
- Celda 6: `5` (OUT)
- Celda 7: `0` (arg 0)
- Celda 8: `7` (HALT)
- Celda 9: `0` (arg 0)

### Convenciones de la Traza
- **Ciclo**: Cada pulso de reloj (flanco de subida seguido del flanco de bajada que realiza la captura).
- Los valores de las columnas reflejan el estado **estable al finalizar el ciclo de reloj correspondiente** (tras el flanco de bajada).
- El valor `?` representa el estado indeterminado (`-1`).

### Tabla de Traza Completa

| Pulso / Evento | Fase $T$ | PC | OP | ARG | Reg A | Reg B | Reg OUT | Flip-Flop H | Operación / Observaciones |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **RESET** | **T0** | **0** | `?` | `?` | `?` | `?` | `?` | **0** | RESET=1 + pulso. Se limpian PC=0, T0=1, H=0. |
| **1** | T1 | 1 | 1 (LDA) | `?` | `?` | `?` | `?` | 0 | **Fetch OP 1**: Lee RAM[0]=1 en OP. PC avanza a 1. |
| **2** | T2 | 2 | 1 (LDA) | 5 | `?` | `?` | `?` | 0 | **Fetch ARG 1**: Lee RAM[1]=5 en ARG. PC avanza a 2. |
| **3** | T0 | 2 | 1 (LDA) | 5 | **5** | `?` | `?` | 0 | **Execute LDA**: Reg A captura ARG (5). PC no cambia. |
| **4** | T1 | 3 | 2 (LDB) | 5 | 5 | `?` | `?` | 0 | **Fetch OP 2**: Lee RAM[2]=2 en OP. PC avanza a 3. |
| **5** | T2 | 4 | 2 (LDB) | 3 | 5 | `?` | `?` | 0 | **Fetch ARG 2**: Lee RAM[3]=3 en ARG. PC avanza a 4. |
| **6** | T0 | 4 | 2 (LDB) | 3 | 5 | **3** | `?` | 0 | **Execute LDB**: Reg B captura ARG (3). PC no cambia. |
| **7** | T1 | 5 | 3 (ADD) | 3 | 5 | 3 | `?` | 0 | **Fetch OP 3**: Lee RAM[4]=3 en OP. PC avanza a 5. |
| **8** | T2 | 6 | 3 (ADD) | 0 | 5 | 3 | `?` | 0 | **Fetch ARG 3**: Lee RAM[5]=0 en ARG. PC avanza a 6. |
| **9** | T0 | 6 | 3 (ADD) | 0 | **8** | 3 | `?` | 0 | **Execute ADD**: ALU calcula 5+3=8. Reg A captura 8. |
| **10** | T1 | 7 | 5 (OUT) | 0 | 8 | 3 | `?` | 0 | **Fetch OP 4**: Lee RAM[6]=5 en OP. PC avanza a 7. |
| **11** | T2 | 8 | 5 (OUT) | 0 | 8 | 3 | `?` | 0 | **Fetch ARG 4**: Lee RAM[7]=0 en ARG. PC avanza a 8. |
| **12** | T0 | 8 | 5 (OUT) | 0 | 8 | 3 | **8** | 0 | **Execute OUT**: Reg OUT captura A (8). Salida visible = 8. |
| **13** | T1 | 9 | 7 (HALT)| 0 | 8 | 3 | 8 | 0 | **Fetch OP 5**: Lee RAM[8]=7 en OP. PC avanza a 9. |
| **14** | T2 | 10| 7 (HALT)| 0 | 8 | 3 | 8 | 0 | **Fetch ARG 5**: Lee RAM[9]=0 en ARG. PC avanza a 10. |
| **15** | T0 | 10| 7 (HALT)| 0 | 8 | 3 | 8 | **1** | **Execute HALT**: H pasa a 1. CPU_CLK se congela en 0. |
| **16+** | T0 | 10| 7 (HALT)| 0 | 8 | 3 | 8 | 1 | **CPU DETENIDO**: El reloj externo no produce flancos en CPU_CLK. |

---

## 7. Mecánica de RESET y HALT con Valores Indeterminados

### El Dilema del Arranque en Frío
En electrónica digital real y en el simulador `engine.js`, el encendido deja los lazos biestables en estado desconocido (`-1`). Si un circuito depende de su valor anterior para calcular el siguiente (como un contador con XOR: $Q \oplus 1$), la compuerta XOR evalúa $-1 \oplus 1 = -1$, quedando bloqueada indefinidamente.

### Cómo Funciona el RESET Frente a $-1$
El RESET fuerza valores booleanos limpios aprovechando las propiedades absorbentes de la lógica de Boole implementadas en `engine.js`:
1. **Puesta a 1 de $T_0$ en `RING3`**:
   $$D_{T0} = \text{RESET} + T_2$$
   Cuando $\text{RESET} = 1$, la compuerta OR calcula $\text{OR}(1, -1) = 1$. Se garantiza un $1$ determinista en la entrada D del primer DFF sin importar el estado previo de $T_2$.
2. **Puesta a 0 de $T_1$ y $T_2$ en `RING3`**:
   $$D_{T1} = \neg\text{RESET} \cdot T_0$$
   $$D_{T2} = \neg\text{RESET} \cdot T_1$$
   Cuando $\text{RESET} = 1$, su negación es limpia: $\neg\text{RESET} = 0$. La compuerta AND calcula $\text{AND}(0, -1) = 0$. Los biestables de $T_1$ y $T_2$ reciben ceros garantizados.
3. **Puesta a cero del Program Counter (PC = 0000)**:
   $$D_{\text{PC}} = \neg\text{RESET} \cdot (\text{lógica de avance})$$
   Con $\text{RESET} = 1$, $\neg\text{RESET} = 0$, forzando $D_{\text{PC}} = 0000$ en los 4 DFFs, anulando cualquier indeterminación proveniente del sumador o del multiplexor de salto.
4. **Puesta a cero de HALT ($H = 0$)**:
   $$D_H = \neg\text{RESET} \cdot (H + T_2 \cdot \text{HALT})$$
   Con $\text{RESET} = 1$, la compuerta AND fuerza $D_H = 0$.

### Por qué los Registros A, B y OUT no Necesitan RESET Físico
Los registros A, B y OUT arrancan en `-1`. Esto es deliberado y arquitectónicamente correcto: ningún programa lee un registro antes de cargarlo. La primera instrucción que los utiliza (`LDA`, `LDB`) sobreescribe incondicionalmente el registro con un dato válido proveniente de la RAM. Ahorrar compuertas de reset en A, B y OUT reduce sustancialmente el número de componentes en el lienzo del alumno.

### Mecánica del Flip-Flop H y la Compuerta de Reloj
- **Independencia del Reloj de H**: El flip-flop H recibe la señal directa de `CLK` (el generador de pulsos del simulador), **no** `CPU_CLK`. Esto es vital: si H estuviera alimentado por `CPU_CLK`, al apagarse `CPU_CLK` el flip-flop jamás podría volver a recibir un pulso para resetearse.
- **Ecuación de la compuerta**:
  $$\text{CPU\_CLK} = \text{CLK} \cdot (\neg H + \text{RESET})$$
  - Durante ejecución normal ($H=0, \text{RESET}=0$): $\neg H = 1 \implies \text{CPU\_CLK} = \text{CLK} \cdot 1 = \text{CLK}$. El reloj pasa íntegro.
  - Al ejecutar HALT ($H=1, \text{RESET}=0$): $\neg H = 0 \implies \text{CPU\_CLK} = \text{CLK} \cdot 0 = 0$. La señal de reloj interna queda en bajo continuo.
  - Al presionar RESET tras un HALT ($H=1, \text{RESET}=1$): $(\neg H + \text{RESET}) = (0 + 1) = 1 \implies \text{CPU\_CLK} = \text{CLK} \cdot 1 = \text{CLK}$. El pulso de reset logra atravesar la compuerta y resincroniza todo el procesador.

---

## 8. Límites del Sistema e Ideas Futuras

### Límites de la Versión 1 (Tutorial Básico)
1. **Conjunto de 8 Instrucciones**: Opcodes codificados en 3 bits ($OP_0..OP_2$). El bit $OP_3$ queda sin utilizar.
2. **Espacio de Datos y Direcciones de 4 Bits**:
   - 16 celdas de RAM en total.
   - Operaciones aritméticas limitadas a números de 0 a 15.
3. **Ausencia de Flags y Saltos Condicionales**:
   - No existen biestables para almacenar banderas de estado (Zero Flag $Z$, Carry Flag $C$, Negative Flag $N$).
   - La única instrucción de control de flujo es `JMP` incondicional; no se pueden tomar decisiones dinámicas en código (`JZ`, `JC`).
4. **Solo Lectura en RAM (Sin Instrucción `STA`)**:
   - $\text{WE}$ está permanentemente a 0. La memoria funciona como una ROM de programa; los cálculos solo pueden vivir en el acumulador A o verse en OUT.
5. **Aritmética Sin Resta**:
   - La ALU únicamente implementa suma y AND; no hay resta (`SUB`), desplazamiento ni comparaciones directas.

### Ideas Futuras y Mejoras Posibles (V2+)
- **Instrucción de Resta (`SUB`)**:
  - Aprovechando el bit $OP_3$ o reasignando un opcode libre, invertir el bus B con compuertas NOT e inyectar $C_{in} = 1$ en el `ADD4` (sustracción por complemento a dos).
- **Instrucción de Escritura en RAM (`STA n`)**:
  - Cablear el bus A a las entradas de datos de la RAM y habilitar $\text{WE}$ durante el paso $T_2$ cuando la instrucción sea `STA`, dirigiendo la dirección desde `ARG`.
- **Banderas de Estado y Saltos Condicionales (`JZ n`, `JC n`)**:
  - Añadir biestables para almacenar el acarreo de salida de `ADD4` ($C_{out}$) y una compuerta NOR de 4 entradas conectada al bus de resultado para detectar resultado cero ($Z$). Habilitar `PC_LOAD` en $T_2$ condicionado al flag correspondiente.
- **Herramientas de Depuración en la Interfaz (UI)**:
  - **Ejecución Paso a Paso**: Un botón de pulsación manual de reloj en el panel de la RAM.
  - **Resaltado Dinámico del PC en la Vista Hexadecimal**: Pintar con un borde brillante la celda de memoria que coincide con el valor actual de $PC_0..PC_3$.
  - **Mini-Ensamblador / Desensamblador**: Permitir escribir texto mnemónico (`LDA 5`) en lugar de nibbles hexadecimales en el panel de la RAM.

---

## 9. Plan de Lecciones (23 a 28)

*Guía pedagógica*: Cada lección sigue rigurosamente el estilo establecido en `js/lessons.js`: define qué es cada elemento mediante una analogía intuitiva de la vida cotidiana, explica por qué es crucial para la CPU final, detalla componentes con sus atajos de teclado, enumera los pasos de cableado sin omitir conexiones, propone un experimento visible, establece los criterios estrictos del `check()` y documenta la caja empaquetada con su orden exacto de pines.

---

### Lección 23: Decodificadores 2→4 y 3→8 (`DEC2` y `DEC3`)

- **Objetivo**: Comprender cómo un circuito combinatorio puede traducir un código binario compacto de pocos cables en la activación exclusiva de una sola línea entre muchas. Construir y empaquetar `DEC2` y `DEC3`.
- **Analogía**:
  - *¿Qué es?* Es como el conserje de un hotel con un casillero de llaves numeradas: si le pedís el número 3, va exactamente al casillero 3 y enciende su luz, dejando todas las demás apagadas.
  - *¿Por qué importa?* En la CPU, las instrucciones se guardan como números (0 a 7). El decodificador es el encargado de leer ese número y levantar el cable exacto que activa la operación correspondiente (`LDA`, `ADD`, `OUT`, etc.).
- **Componentes con Teclas**:
  - 3× **Entrada** (tecla 2): $A_0, A_1, A_2$
  - 3× **NOT** (tecla 5): para obtener $\neg A_0, \neg A_1, \neg A_2$
  - 4× **AND** (tecla 6): para armar el `DEC2` básico
  - 8× **AND** (tecla 6): para combinar con $A_2$ y formar el `DEC3`
  - 8× **Salida** (tecla 3): $Y_0$ a $Y_7$
- **Pasos de Cableado**:
  1. Conectar cada Entrada $A_x$ a la entrada de su compuerta NOT correspondiente para disponer en el lienzo de la señal directa y su negada.
  2. Construir `DEC2` para $A_0$ y $A_1$:
     - $Y_0 = \neg A_1 \cdot \neg A_0$
     - $Y_1 = \neg A_1 \cdot A_0$
     - $Y_2 = A_1 \cdot \neg A_0$
     - $Y_3 = A_1 \cdot A_0$
  3. Expandir a `DEC3` utilizando $A_2$:
     - Multiplicar cada salida del `DEC2` por $\neg A_2$ para generar $Y_0..Y_3$.
     - Multiplicar cada salida del `DEC2` por $A_2$ para generar $Y_4..Y_7$.
  4. Conectar las 8 salidas a los indicadores visuales.
- **Experimento**:
  - Probar las 8 combinaciones posibles de $A_0, A_1, A_2$ (desde `000` hasta `111`).
  - Observar cómo la luz encendida viaja limpiamente de $Y_0$ a $Y_7$, encendiéndose exactamente una a la vez.
- **Verificación `check()`**:
  - Comprobar que existen al menos 3 Entradas y 8 Salidas.
  - Evaluar exhaustivamente las 8 combinaciones de entrada: para cada una, verificar que la salida esperada valga 1 y las otras 7 valgan 0.
- **Empaquetado**:
  - **DEC2**:
    - Entradas (click en orden): `A0, A1`
    - Salidas (click en orden): `Y0, Y1, Y2, Y3`
  - **DEC3**:
    - Entradas (click en orden): `A0, A1, A2`
    - Salidas (click en orden): `Y0, Y1, Y2, Y3, Y4, Y5, Y6, Y7`

---

### Lección 24: Contador de Pasos y RESET (`RING3`)

- **Objetivo**: Construir el generador de ritmo y secuencia temporal de la CPU: un contador de anillo (*ring counter*) de 3 fases ($T_0, T_1, T_2$) con inicialización limpia por `RESET`.
- **Analogía**:
  - *¿Qué es?* Es como el distribuidor de tiempos de un semáforo o los tiempos de un motor de 4 tiempos: primero busca la orden ($T_0$), luego busca el dato ($T_1$) y finalmente ejecuta la acción ($T_2$).
  - *¿Por qué importa?* La CPU no puede hacer todo en un solo instante; necesita un compás ordenado para no mezclar la lectura de la memoria con la ejecución.
- **Componentes con Teclas**:
  - 3× caja **DFF** 🧩
  - 1× **OR** (tecla 7): para inyectar el RESET en $T_0$
  - 2× **AND** (tecla 6): para condicionar el paso de $T_1$ y $T_2$ al RESET
  - 1× **NOT** (tecla 5): para generar $\neg\text{RESET}$
  - 2× **Entrada** (tecla 2): `RESET` y `CLK`
  - 3× **Salida** (tecla 3): indicadores de $T_0, T_1, T_2$
- **Pasos de Cableado**:
  1. Colocar los 3 `DFF` en fila horizontal.
  2. Conectar la Entrada `CLK` al pin 1 (CLK) de los 3 `DFF`.
  3. Conectar la Entrada `RESET` a la compuerta NOT para obtener $\neg\text{RESET}$.
  4. Realimentar $T_2$ hacia $T_0$: conectar la salida $Q$ del DFF2 y la línea `RESET` a la compuerta OR. Llevar la salida de la OR al pin 0 ($D$) del DFF0.
  5. Conectar la salida $Q$ del DFF0 y $\neg\text{RESET}$ a una AND; llevar su salida al pin 0 ($D$) del DFF1.
  6. Conectar la salida $Q$ del DFF1 y $\neg\text{RESET}$ a otra AND; llevar su salida al pin 0 ($D$) del DFF2.
  7. Conectar las salidas $Q$ a los 3 visualizadores.
- **Experimento**:
  1. Con `RESET = 1`, dar un pulso de reloj: observar cómo $T_0$ se pone en 1 y $T_1, T_2$ quedan en 0 (eliminando cualquier cable gris).
  2. Bajar `RESET = 0` y enviar pulsos de reloj: ver cómo el "1" salta ordenadamente $T_0 \rightarrow T_1 \rightarrow T_2 \rightarrow T_0$ en bucle continuo.
- **Verificación `check()`**:
  - Identificar entradas de RESET y CLK.
  - Probar con RESET=1 y un pulso de reloj $\rightarrow$ verificar $T_0=1, T_1=0, T_2=0$.
  - Probar con RESET=0 y 3 pulsos sucesivos $\rightarrow$ verificar la secuencia cíclica $100 \rightarrow 010 \rightarrow 001 \rightarrow 100$.
- **Empaquetado**:
  - **RING3**:
    - Entradas: `RESET, CLK`
    - Salidas: `T0, T1, T2`

---

### Lección 25: Registro con LOAD y la Etapa de Búsqueda (Fetch: `REG4`)

- **Objetivo**: Construir un registro multipropósito de 4 bits con permiso de escritura condicional (`REG4`) y conectarlo a la memoria `RAM16` para implementar la fase de *Fetch* (captura de $OP$ y $ARG$).
- **Analogía**:
  - *¿Qué es?* Es como una caja fuerte con botón de depósito: aunque alguien deje paquetes afuera, la caja solo guarda lo que hay en la puerta si pulsás el botón `LOAD` al mismo tiempo que gira la cerradura (`CLK`).
  - *¿Por qué importa?* En la CPU, los registros OP y ARG comparten la misma salida de la RAM, pero deben retener valores distintos en momentos distintos: OP solo captura en $T_0$, y ARG solo captura en $T_1$.
- **Componentes con Teclas**:
  - 4× caja **DFF** 🧩
  - 4× caja **MUX2** 🧩
  - 1× caja **RAM16** 🧠
  - Entradas de datos y control (tecla 2)
  - Salidas (tecla 3)
- **Pasos de Cableado de `REG4`**:
  1. Para cada bit $i \in \{0, 1, 2, 3\}$, colocar un `MUX2` frente al pin $D$ del DFF:
     - Entrada A del MUX: conectada a la propia salida $Q$ del DFF (retroalimentación de retención).
     - Entrada B del MUX: conectada al dato nuevo externo $D_i$.
     - Selector S del MUX: conectado a la línea común `LOAD`.
     - Salida del MUX: al pin 0 ($D$) del DFF.
  2. Conectar la línea común `CLK` al pin 1 de los 4 DFFs.
- **Experimento**:
  1. Empaquetar `REG4`.
  2. Probarlo aisladamente: colocar datos en $D_0..D_3$, cambiar el reloj con $\text{LOAD}=0$ (el registro ignora el dato), activar $\text{LOAD}=1$ y dar un pulso (el registro captura el dato).
  3. Conectar dos cajas `REG4` (bautizadas `OP` y `ARG`) a las salidas $Q_0..Q_3$ de una `RAM16`. Conectar $T_0$ al `LOAD` de OP y $T_1$ al `LOAD` de ARG: observar cómo cada registro captura alternadamente su celda correspondiente.
- **Verificación `check()`**:
  - Evaluar la caja o subcircuito `REG4`:
    - Con $\text{LOAD}=1$ y un pulso de reloj, verificar que captura un patrón de prueba (ej. `1010`).
    - Con $\text{LOAD}=0$ y cambio en las entradas de datos, verificar que retiene inalterado el patrón previo tras múltiples pulsos de reloj.
- **Empaquetado**:
  - **REG4**:
    - Entradas (click en orden): `D0, D1, D2, D3, LOAD, CLK`
    - Salidas (click en orden): `Q0, Q1, Q2, Q3`

---

### Lección 26: La Unidad de Control

- **Objetivo**: Implementar el decodificador de control central: la matriz combinatoria que toma las señales de tiempo ($T_0, T_1, T_2$) y las instrucciones decodificadas (`LDA`, `LDB`, `ADD`, `AND`, `OUT`, `JMP`, `HALT`) para encender los cables de habilitación exactos en cada micro-operación.
- **Analogía**:
  - *¿Qué es?* Es la torre de control de un aeropuerto o la mesa de mezclas de un teatro: según qué escena esté sonando ($T$) y qué actor esté en el escenario ($OP$), abre el micrófono del actor adecuado (`LOAD`) y apunta el reflector (`SEL`).
  - *¿Por qué importa?* Sin este bloque, los registros no sabrían cuándo escuchar ni la ALU sabría cuándo guardar su resultado.
- **Componentes con Teclas**:
  - Compuertas **AND** (tecla 6)
  - Compuertas **OR** (tecla 7)
  - Entradas de prueba (tecla 2) para simular fases de tiempo e instrucciones
  - Salidas de prueba (tecla 3) para inspeccionar las líneas de control
- **Pasos de Cableado**:
  1. Cablear las ecuaciones canónicas:
     - $\text{PC\_LOAD} = T_0 + T_1 + (T_2 \cdot \text{JMP})$ (usar AND para $T_2 \cdot \text{JMP}$ y OR de 3 entradas o cascada de dos OR).
     - $\text{JMP\_SEL} = T_2 \cdot \text{JMP}$.
     - $\text{OP\_LOAD} = T_0$.
     - $\text{ARG\_LOAD} = T_1$.
     - $\text{A\_LOAD} = T_2 \cdot (\text{LDA} + \text{ADD} + \text{AND})$.
     - $\text{A\_SEL} = \text{ADD} + \text{AND}$.
     - $\text{B\_LOAD} = T_2 \cdot \text{LDB}$.
     - $\text{OUT\_LOAD} = T_2 \cdot \text{OUT}$.
     - $\text{HALT\_SET} = T_2 \cdot \text{HALT}$.
- **Experimento**:
  - Forzar $T_0=1$: verificar que únicamente se encienden `PC_LOAD` y `OP_LOAD`.
  - Forzar $T_1=1$: verificar que únicamente se encienden `PC_LOAD` y `ARG_LOAD`.
  - Forzar $T_2=1$ y alternar las líneas de instrucción:
    - Con `LDA=1`: se enciende solo `A_LOAD` con `A_SEL=0`.
    - Con `ADD=1`: se enciende `A_LOAD` con `A_SEL=1`.
    - Con `OUT=1`: se enciende solo `OUT_LOAD`.
    - Con `JMP=1`: se encienden `PC_LOAD` y `JMP_SEL`.
- **Verificación `check()`**:
  - Verificar que las salidas de control responden fielmente a la tabla de verdad de la sección 5 ante todas las combinaciones de paso e instrucción.
- **Empaquetado**:
  - Las compuertas pueden organizarse en un bloque agrupado o cablearse directamente como el cableado de control maestro de la CPU en la siguiente lección.

---

### Lección 27: Tu Primer CPU (Ejecución del Programa "Suma")

- **Objetivo**: Integrar la ruta de datos completa (Datapath: PC, RAM16, OP, ARG, A, B, ALU4, OUT) con el secuenciador `RING3`, el decodificador `DEC3` y la lógica de control. Ejecutar el programa "Suma" ($5 + 3 = 8$) de principio a fin.
- **Analogía**:
  - *¿Qué es?* Es el momento en que se ensambla el motor, las ruedas y la transmisión en el chasis del auto: por primera vez, el vehículo arranca y rueda por sus propios medios sin empujarlo a mano.
  - *¿Por qué importa?* Es la culminación del concepto de computación digital: compuertas elementales organizadas para seguir un programa almacenado en memoria.
- **Componentes con Teclas**:
  - 1× caja **RING3** 🧩 (lección 24)
  - 1× caja **DEC3** 🧩 (lección 23)
  - 1× caja **RAM16** 🧠
  - 4× caja **REG4** 🧩 (para OP, ARG, A, B, OUT)
  - 1× caja **ALU4** 🧩 (lección 18)
  - 4× caja **MUX2** 🧩 (para el selector de entrada de A)
  - Circuito del PC (lección 19: 4 DFF + sumador +1 + MUX de avance)
  - 1× **Entrada** `RESET` (tecla 2)
  - 1× **Reloj** `CLK` (⏱, tecla 4) o Entrada manual de reloj
  - 4× **Salida** (tecla 3) para el resultado visual
- **Pasos de Cableado**:
  1. Conectar `PC` a las direcciones $A_0..A_3$ de la `RAM16`.
  2. Conectar las salidas de datos de la RAM a las entradas de los registros `OP` y `ARG`.
  3. Conectar las salidas $Q_0..Q_2$ de `OP` al decodificador `DEC3`.
  4. Conectar `RING3` a `RESET` y `CLK`.
  5. Cablear las compuertas de la Unidad de Control conectando sus salidas a los pines `LOAD` correspondientes.
  6. Conectar `ARG` al registro B.
  7. Conectar `ARG` y las salidas de la `ALU4` a los 4 `MUX2` de entrada del registro A (controlados por `A_SEL = ADD + AND`).
  8. Conectar los buses de salida de A y B a las entradas de la `ALU4`. Conectar la señal de control `AND` del decodificador al pin selector de la `ALU4`.
  9. Conectar el bus A al registro `OUT`, y las salidas de `OUT` a las lámparas indicadoras.
- **Experimento**:
  1. Abrir la RAM16 y cargar el programa "Suma": `1 5 2 3 3 0 5 0 7 0`.
  2. Activar `RESET = 1`, dar un pulso de reloj y bajar `RESET = 0`.
  3. Encender el reloj: contemplar cómo el PC avanza, OP y ARG cargan los valores, A toma el 5, B toma el 3, la ALU produce 8 y, exactamente en el ciclo 12, las 4 salidas se iluminan marcando el número **8** (`1000` binario).
- **Verificación `check()`**:
  - Cargar el programa "Suma" en la RAM del simulador.
  - Ejecutar el pulso de RESET.
  - Simular 12 ciclos de reloj y comprobar que:
    - El registro A contiene el valor `8`.
    - La salida visual `OUT` muestra limpiamente `8`.
- **Empaquetado**:
  - No aplica empaquetado (el circuito completo es el procesador visible en el lienzo).

---

### Lección 28: Salto y Parada (JMP y HALT)

- **Objetivo**: Dotar a la CPU de control de flujo dinámico: implementar la instrucción de salto `JMP` para permitir bucles de código y la instrucción `HALT` con compuerta de reloj para detener la máquina automáticamente.
- **Analogía**:
  - *¿Qué es?* Es como el pedal de freno que apaga el motor al llegar a destino (`HALT`) y las rotondas de tránsito que te permiten dar otra vuelta a la pista (`JMP`).
  - *¿Por qué importa?* Sin saltos, una computadora solo puede ejecutar programas lineales que mueren al final de la memoria; con saltos, puede repetir tareas, ejecutar algoritmos y tomar decisiones.
- **Componentes con Teclas**:
  - 1× caja **DFF** 🧩 (para el biestable H de parada)
  - 1× **OR** (tecla 7) y 1× **AND** (tecla 6) para la compuerta de reloj
  - 1× **AND** y 1× **NOT** para la lógica del flip-flop H
  - MUX de salto del PC conectado al bus `ARG`
- **Pasos de Cableado**:
  1. Conectar la señal `JMP` del decodificador y $T_2$ a la habilitación del MUX de entrada del PC: cuando $T_2 \cdot \text{JMP} = 1$, el PC carga los 4 bits provenientes del registro `ARG` en lugar de $PC+1$.
  2. Construir el biestable H:
     - Entrada D: $D_H = \neg\text{RESET} \cdot (H + T_2 \cdot \text{HALT})$.
     - Reloj: conectado a `CLK` directo (antes de la compuerta).
  3. Construir la compuerta de reloj de la CPU:
     - Conectar $\neg H$ y `RESET` a una compuerta OR.
     - Conectar la salida de la OR y el reloj maestro `CLK` a una compuerta AND.
     - La salida de esta AND es `CPU_CLK`, que distribuye el reloj a `RING3`, `PC`, `OP`, `ARG`, `A`, `B` y `OUT`.
- **Experimento**:
  1. **Prueba de HALT**: Ejecutar el programa "Suma" con la instrucción final `7 0` (HALT): observar cómo, tras escribir 8 en OUT, el procesador se detiene en seco en el ciclo 15; el reloj sigue oscilando pero el CPU no consume más instrucciones ni se desborda la memoria.
  2. **Prueba de JMP en bucle**: Cargar el programa "Contador": `1 0 2 1 3 0 5 0 6 4`. Dar RESET y encender el reloj: ver cómo la CPU suma 1 continuamente, muestra el valor en OUT y salta de regreso a la dirección 4 indefinidamente ($1, 2, 3 \dots 15, 0, 1 \dots$).
- **Verificación `check()`**:
  - **Prueba 1 (HALT)**: Cargar `1 5 2 3 3 0 5 0 7 0`, ejecutar y verificar que en el ciclo 15 $H=1$, `CPU_CLK` se mantiene en 0 y el PC se detiene en 10.
  - **Prueba 2 (Bucle JMP)**: Cargar `1 0 2 1 3 0 5 0 6 4`, ejecutar varios ciclos y verificar que el PC salta exitosamente a la dirección 4 al finalizar cada iteración y que OUT incrementa periódicamente.
- **Empaquetado**:
  - Cierre y certificación del Bloque 4 del tutorial.

---

## 10. Preguntas Abiertas y Consideraciones de Implementación

En estricto apego a la directiva de no alterar decisiones del brief por cuenta propia, a continuación se registran los aspectos que presentan ambigüedades técnicas, vacíos de especificación o discrepancias con el código actual para su resolución formal:

### 1. Orden de Pines y Definición de la Caja `ALU4` (Lección 18)
- **Situación**:
  - En [`docs/cpu-brief.md`](cpu-brief.md) se indica:
    `ALU4: A0-A3, B0-B3, OP | R0-R3 — OP=0 suma (Cin interno fijo en 0), OP=1 AND (lección 18; hoy la lección no fija el orden: hay que fijarlo)`.
  - En [`js/lessons.js`](../js/lessons.js) (lección 18 actual), la teoría solicita 9 Entradas de datos (`A0-A3, B0-B3, Cin`), 2 Entradas de opcode (`OP0, OP1`) y 4 Salidas, pero el `check()` solo valida componentes en el lienzo y no fija el orden de empaquetado `makePackage`.
- **Pregunta para el diseñador**:
  ¿Se debe actualizar la lección 18 para que empaquete formalmente `ALU4` con exactamente 9 entradas (`A0..A3, B0..B3, OP`) y 4 salidas (`R0..R3`), dejando $C_{in}$ fijado internamente en 0 y descartando $OP_1$? ¿O se debe proveer un alias / autocompletado en el simulador para que el alumno de la lección 27 no tenga incompatibilidades de pines si empaquetó su ALU4 en un orden diferente en la lección 18?

### 2. Arquitectura Interna del Program Counter (PC)
- **Situación**:
  - En la lección 19 recién corregida, el PC cuenta incondicionalmente en cada flanco cuando $\text{JUMP}=0$.
  - En el CPU completo (brief líneas 38-40), el PC debe avanzar en $T_0$ y $T_1$, pero **debe permanecer congelado en $T_2$** para todas las instrucciones excepto `JMP`.
  - La ecuación del brief es:
    $$\text{PC\_LOAD} = T_0 + T_1 + T_2 \cdot \text{JMP}$$
- **Pregunta para el diseñador**:
  El circuito de la lección 19 no cuenta con entrada de habilitación `LOAD` (cuenta siempre en cada flanco salvo que salte). Para la lección 25/27, ¿se instruirá al alumno para reconstruir el PC utilizando la nueva caja `REG4` combinada con un sumador $+1$ y un MUX de salto, o se creará una lección intermedia que adapte el PC con la señal `PC_LOAD`? Recomendamos utilizar `REG4` para unificar el hardware.

### 3. Asignación de Entradas en el Multiplexor de A (`A_SEL`)
- **Situación**:
  - La ecuación de control establece:
    $$\text{A\_LOAD} = T_2 \cdot (\text{LDA} + \text{ADD} + \text{AND})$$
    $$D_A = (\text{ADD} + \text{AND}) \text{ ? } \text{ALU} : \text{ARG}$$
  - En la caja estándar `MUX2` (lección 12):
    - Pin 0 = Entrada A (seleccionada cuando $S=0$).
    - Pin 1 = Entrada B (seleccionada cuando $S=1$).
    - Pin 2 = Selector S.
- **Punto de consistencia**:
  Si $\text{A\_SEL} = \text{ADD} + \text{AND}$, entonces cuando $\text{A\_SEL} = 0$ (instrucción `LDA`), el MUX debe entregar `ARG`. Cuando $\text{A\_SEL} = 1$ (instrucciones `ADD` o `AND`), debe entregar `ALU`. Por lo tanto, en los `MUX2` de entrada al acumulador A, **la entrada A del MUX debe conectarse a `ARG` y la entrada B del MUX debe conectarse a la salida de la `ALU4`**. Es vital documentar esta asignación explícitamente en la lección 27 para evitar que los alumnos inviertan las fuentes.

### 4. Lectura Asíncrona de la RAM frente al Flanco de Reloj
- **Situación**:
  - En `engine.js`, `RAM16` actualiza su salida $Q$ de manera combinatoria en cuanto cambia la dirección $A_0..A_3$.
  - En el flanco de bajada de $T_0$, el PC cambia a la dirección siguiente. Esto modifica inmediatamente la dirección de la RAM en el semiperiodo bajo del reloj.
- **Análisis de estabilidad**:
  Como los biestables capturan estrictamente en el flanco de bajada y mantienen su valor durante todo el ciclo, la dirección de la RAM es perfectamente estable mucho antes de que llegue el siguiente flanco de bajada en $T_1$. Las lecturas de $OP$ y $ARG$ son 100% inmunes a carreras críticas.

### Resoluciones del diseñador
Las cuatro preguntas quedaron resueltas en la sección "Decisiones" de [docs/cpu-brief.md](cpu-brief.md): ALU4 se fija en la lección 18 (A0-A3, B0-B3, OP | R0-R3, Cin interno en 0); el PC del CPU se arma con REG4 en la lección 25; en el MUX de A, la entrada A es ARG y la entrada B es la ALU; la lectura combinatoria de la RAM no requiere cambios.

---

FIN
