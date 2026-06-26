# Checklist Dofus Silvestre — propuestas de mejora

Tres prototipos HTML standalone que rediseñan el sistema de progreso del checklist actual de **torrentearcano.com/checklist-silvestre-2**. La guía sigue siendo la de **Sandglass**: los textos de los 100 pasos NO se modificaron. Lo único que cambia es **cómo se calcula y se muestra el progreso**.

---

## El problema que resolvemos

El checklist actual usa **conteo plano**: cada uno de los 100 pasos vale 1%. Esto distorsiona el progreso de forma brutal porque los pasos tienen costos muy distintos:

| Paso | Descripción | Tiempo real | Peso actual | Peso justo |
|------|-------------|-------------|-------------|------------|
| 4    | Misión "Barnabé en el espacio" | 10-15 min | 1% | **0.10%** |
| 93   | Logro "Blanco marfil" completo (6 jefes, 4 tótems, 4 sacrificios, Necronix) | 30-40 h | 1% | **5.21%** |

El paso 93 vale literalmente **50 veces más esfuerzo** que el paso 4, pero la barra los trata igual. Resultado: el jugador se desmotiva (siente que falta mucho cuando va por el 80%) o se confía (cree que está avanzando rápido en pasos triviales).

---

## Las 3 propuestas

Los 3 HTMLs comparten **el mismo dataset, la misma estética y las mismas features básicas**. Solo cambia el sistema de scoring.

### 🥉 V1 — Peso por zona

**Archivo**: `silvestre-v1-pesos-zona.html`

Cada zona (Frigost, Pandala, Selocalipsis, etc.) tiene un peso global proporcional al esfuerzo total que requiere. Dentro de cada zona, todos los pasos pesan parecido.

- ✅ **Pro**: simple, intuitivo, el cambio se nota poco para el jugador casual
- ✅ **Pro**: barras por zona muestran dónde está concentrado el esfuerzo (Misiones de Mundo pesa 41.8% — los logros centrales del Silvestre)
- ❌ **Contra**: dentro de una misma zona sigue habiendo distorsión (un paso trivial de Frigost pesa igual que un boss kill)

### 🥈 V2 — Peso por esfuerzo

**Archivo**: `silvestre-v2-pesos-esfuerzo.html`

Cada paso individual tiene un peso según una clasificación de esfuerzo en 5 niveles:

| Tier | Puntos | Tiempo aprox. | Ejemplos |
|------|--------|---------------|----------|
| 🌱 Trivial | 1 pt | 10-30 min | Misión única corta |
| 🕐 Corto | 3 pts | 1-2 h | Fragmento de logro |
| ⚔️ Medio | 8 pts | 3-5 h | Boss + misión |
| 🛡️ Largo | 20 pts | 8-15 h | Logro completo |
| 👑 Épico | 50 pts | 20-40+ h | Mega-logros (Blanco marfil, Negro ébano, Seis de seis) |

Total: **960 puntos** distribuidos entre los 100 pasos.

- ✅ **Pro**: máxima precisión — refleja el esfuerzo real
- ✅ **Pro**: el jugador VE el peso de cada paso en el badge, entiende por qué su % avanza distinto
- ❌ **Contra**: si el jugador NO entiende el sistema, puede confundirse ("¿por qué hice 10 pasos y solo subió 3%?")

### 🥇 V3 — Doble barra (RECOMENDADA)

**Archivo**: `silvestre-v3-doble-barra.html`

Combina lo mejor de los dos mundos: muestra **AMBAS barras** simultáneamente.

- Barra 1: **"Pasos completados"** — el conteo plano actual (X/100). Para los completistas que quieren ver muchos checks.
- Barra 2: **"Progreso real"** — el sistema ponderado de V2. Para los que quieren saber cuánto les falta de verdad.

- ✅ **Pro**: respeta al jugador casual y al jugador serio sin obligar a nadie a entender un sistema nuevo
- ✅ **Pro**: educativo — el jugador VE la diferencia entre los dos sistemas en tiempo real
- ✅ **Pro**: si tu amigo decide volver al sistema viejo después, los datos siguen siendo válidos (la primera barra ES el sistema viejo)
- ⚠️ **Contra**: visualmente un poco más cargado

**Mi recomendación es esta**. Es la transición más suave y la que mejor educa al usuario.

---

## Cómo abrirlos

1. Doble click en cualquier `.html` → se abre en tu navegador
2. Marca pasos como completados haciendo click en ellos
3. El progreso se guarda en `localStorage` (igual que la versión actual)
4. Las 3 versiones usan claves de almacenamiento separadas, así que puedes probarlas en paralelo sin que se pisen

---

## Features compartidas

Las 3 versiones incluyen:

- ✅ Modo claro / oscuro con switch (paleta dark gaming + light pergamino)
- ✅ Estética temática Dofus (turquesa + dorado, gradientes, glows sutiles)
- ✅ Badges de **zona** (18 zonas con colores únicos)
- ✅ Badges de **esfuerzo** (🌱 trivial / 🕐 corto / ⚔️ medio / 🛡️ largo / 👑 épico)
- ✅ Badge de **tiempo estimado** por paso
- ✅ Filtros por zona, por esfuerzo, "solo pendientes", búsqueda de texto
- ✅ Botón "Ir al siguiente pendiente" (scroll + pulse al elemento)
- ✅ Botón "Reiniciar progreso" con confirmación
- ✅ Estimador de **tiempo restante** según pasos pendientes
- ✅ Animaciones suaves (cubic-bezier en barras, hover lift en cards)
- ✅ Responsive mobile (testeado mentalmente a 375px)
- ✅ Zero dependencies (sin CDN, sin fuentes externas, abre offline)

---

## Limitaciones honestas

1. **La clasificación de esfuerzo es aproximada.** Yo clasifiqué los 100 pasos basándome en patrones del texto ("Completo" = más esfuerzo, "misión X" = menos), pero **Sandglass y los jugadores experimentados son la autoridad real**. Si alguno de los pesos parece mal calibrado, se cambia en 1 línea de código (en el array `STEPS`, campo `effort`).

2. **Los tiempos son referenciales**, no medidos. Sirven como heurística visual, no como SLA.

3. **No agregamos sub-checklists** (ej: marcar misión 1, 2, 3 dentro del paso 93 por separado). Sería trabajo grande y requiere coordinación con Sandglass para no romper la guía. Si interesa, es una v2 fácil de agregar.

4. **El progreso sigue en localStorage** — igual que la versión actual. No agregamos sync a servidor / cuenta de usuario (eso es trabajo de backend, no aplica para un demo).

---

## Implementación en Squarespace (importante)

El sitio actual NO es WordPress — es **Squarespace**. La implementación final será:

### Opción A: Code Block (más rápido, más limitado)
1. En el editor de Squarespace, agregar un bloque "Code" en la página
2. Copiar el contenido completo de uno de los `.html` (sin `<html>`, `<head>`, `<body>` — solo desde el primer `<div class="wrap">` hasta el `</script>` final)
3. El bloque Code de Squarespace acepta HTML+CSS+JS inline
4. **Atención**: algunos estilos pueden colisionar con el tema de Squarespace. Recomendación: aumentar especificidad CSS o envolver todo en `<div id="silvestre-app">` y prefijar todos los selectores

### Opción B: Page Header Injection (más limpio)
1. Settings → Advanced → Code Injection → Page Header (de la página del checklist)
2. Pegar el `<style>` y el `<script>` ahí
3. En el contenido de la página, solo dejar el HTML (`<div class="wrap">...</div>`)
4. Más limpio pero requiere plan Squarespace Business o superior

### Opción C: Custom CSS panel
1. El `<style>` puede ir en Design → Custom CSS (sin las tags `<style>`)
2. El `<script>` y el HTML van en un Code Block en la página

**Yo recomiendo Opción A primero** para validar que funciona, y migrar a B si tu amigo quiere algo más limpio a largo plazo.

---

## Estructura del proyecto

```
silvestre/
├── README.md                          ← este archivo
├── silvestre-v1-pesos-zona.html       ← propuesta 1
├── silvestre-v2-pesos-esfuerzo.html   ← propuesta 2
├── silvestre-v3-doble-barra.html      ← propuesta 3 (RECOMENDADA)
└── .build/                            ← internos (no enviar)
    ├── steps.js                       ← dataset canónico de los 100 pasos
    └── gen.mjs                        ← generador de los 3 HTMLs
```

Para Discord: **enviá solo el README + los 3 HTMLs**. Total ~155KB, sin problemas.

---

## Créditos

- **Guía original de los 100 pasos**: Sandglass — autoridad de la comunidad hispana de Dofus
- **Sistema de progreso original**: torrentearcano.com (tu amigo)
- **Rediseño del scoring + UI**: prototipo propuesto, libre de modificar/adaptar

Dofus es una marca de Ankama. Esta es una herramienta no oficial hecha por y para la comunidad.
