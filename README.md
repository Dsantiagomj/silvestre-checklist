# Checklist Dofus Silvestre — rediseño

Prototipo HTML standalone que rediseña el checklist del Dofus Silvestre en **torrentearcano.com/checklist-silvestre-2**. La guía sigue siendo la de **Sandglass** — los textos de los 100 pasos NO se modificaron. Lo que cambia es **cómo se calcula y se muestra el progreso**, más una nueva interfaz tipo dashboard gaming.

---

## El problema que resolvemos

El checklist actual usa **conteo plano**: cada uno de los 100 pasos vale 1%. Esto distorsiona el progreso de forma brutal porque los pasos tienen costos muy distintos:

| Paso | Descripción | Tiempo real | Peso actual | Peso nuevo |
|------|-------------|-------------|-------------|------------|
| 4    | Misión "Barnabé en el espacio" | 10-15 min | 1% | **0.10%** |
| 93   | Logro "Blanco marfil" completo (6 jefes, 4 tótems, 4 sacrificios, Necronix) | 30-40 h | 1% | **5.21%** |

El paso 93 vale **50 veces más esfuerzo** que el paso 4. La barra antigua los trataba igual; la nueva refleja la realidad.

---

## Sistema de progreso ponderado

Cada paso tiene un peso según una clasificación de esfuerzo en 5 niveles:

| Tier | Puntos | Cuándo se usa |
|------|--------|---------------|
| 🌱 Trivial | 1 pt | Misión única corta |
| 🕐 Corto | 3 pts | Fragmento de logro |
| ⚔️ Medio | 8 pts | Boss + misión |
| 🛡️ Largo | 20 pts | Logro completo |
| 👑 Épico | 50 pts | Mega-logros (Blanco marfil, Negro ébano, Seis de seis, etc.) |

Total: **960 puntos** distribuidos entre los 100 pasos.

El conteo "X/100 pasos" se mantiene visible como stat secundario para los completistas, pero la barra principal es la ponderada.

---

## Interfaz (diseño D — grid + detalle)

**No más lista lineal.** El nuevo diseño usa un layout tipo "achievement board":

### Desktop
- **Grid 10×10** a la izquierda con los 100 pasos como cuadritos visualmente diferenciados por zona (color de borde) y tier (ícono de esquina). Estados visuales claros: pendiente, completo (dorado), seleccionado (turquesa).
- **Panel de detalle** a la derecha (sticky) con texto completo del paso seleccionado, badges, peso, navegación entre pasos, y CTA grande para marcar completado.

### Mobile
- Grid 5×20 con cuadritos más grandes (touch-friendly).
- Al tocar un paso, sube un **bottom sheet** estilo app nativa con el detalle. Se cierra arrastrando hacia abajo o tocando el overlay.

### Otras features
- ✅ **Barra sticky compacta**: al hacer scroll, una mini-barra con % se queda fija arriba.
- ✅ **Prerrequisitos** (18 items: logros previos, oficios, hechizos) checkeables como sección colapsable. **NO suman al progreso del Silvestre** — son tracking separado. Si tienes prereqs pendientes, aparece un warning chip clickeable arriba.
- ✅ **Modo claro/oscuro** con switch (dark gaming + light pergamino).
- ✅ **Filtros**: chips por zona, chips por tier, toggle "solo pendientes", búsqueda por texto o número.
- ✅ **Navegación por teclado**: ←/→ entre pasos, espacio para marcar, Esc para cerrar.
- ✅ **Animaciones**: pulse dorado al completar, shimmer en barra de progreso, transitions cubic-bezier.
- ✅ **Nota aclaratoria** de Sandglass sobre "Hasta tener que pasar X jefe".
- ✅ **Zero dependencies**: sin CDN, sin fuentes externas, abre offline.

---

## Cómo abrirlo

1. Doble click en `silvestre.html` → se abre en tu navegador.
2. Marca pasos como completados haciendo click/tap.
3. El progreso se guarda en `localStorage`.

---

## Limitaciones honestas

1. **La clasificación de esfuerzo es aproximada**. Yo clasifiqué los 100 pasos basándome en patrones del texto ("Completo" = más esfuerzo, "misión X" = menos), pero **Sandglass y jugadores experimentados son la autoridad real**. Si algún peso parece mal calibrado, se cambia en 1 línea del array `STEPS` en el HTML.

2. **Próximo paso**: cuando esté la lista de misiones individuales por paso (work in progress), refinaremos el scoring usando cantidad/dificultad real de sub-misiones.

3. **El progreso vive en localStorage** — sin sync a servidor / cuenta de usuario.

---

## Implementación en Squarespace

El sitio actual de torrentearcano.com es **Squarespace** (no WordPress). Opciones:

### Opción A: Code Block (más rápido)
1. Editor de Squarespace → agregar bloque "Code" en la página
2. Pegar todo el contenido de `silvestre.html` (desde `<style>` en adelante o el archivo completo)
3. El bloque Code acepta HTML+CSS+JS inline
4. ⚠️ Algunos estilos pueden colisionar con el tema. Si pasa, envolver todo en `<div id="silvestre-app">` y prefijar selectores con `#silvestre-app`.

### Opción B: Page Header Injection (más limpio)
1. Settings → Advanced → Code Injection → Page Header (de la página del checklist)
2. Pegar el `<style>` y `<script>` ahí
3. En el contenido, dejar solo el HTML body
4. Requiere plan Squarespace Business o superior

### Opción C: Custom CSS + Code Block
1. `<style>` → Design → Custom CSS (sin tags `<style>`)
2. `<script>` y HTML → Code Block en la página

**Recomendación**: empezar con Opción A para validar; migrar a B si se quiere algo más limpio a largo plazo.

---

## Estructura del proyecto

```
silvestre-checklist/
├── README.md
├── silvestre.html       ← archivo principal (single-file, abrir con doble click)
└── .build/              ← internos (no enviar al usuario final)
    ├── steps.js         ← dataset canónico de referencia (100 pasos verbatim)
    └── steps_data.py    ← script de verificación de la clasificación de tiers
```

---

## Créditos

- **Guía original de los 100 pasos**: Sandglass — autoridad de la comunidad hispana de Dofus
- **Sistema actual de checklist en torrentearcano.com**: el dueño del sitio
- **Rediseño del scoring + UI**: este proyecto

Dofus es una marca de Ankama. Esta es una herramienta no oficial hecha por y para la comunidad.
