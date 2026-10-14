# Checklist Dofus Silvestre — rediseño

App web (React + Vite) que rediseña el checklist del Dofus Silvestre de **torrentearcano.com/checklist-silvestre**. La guía sigue siendo la de **Sandglass**, en su versión 4: los textos de los 100 pasos se importan tal cual de esa página y NO se modificaron. Lo que cambia es **cómo se calcula y se muestra el progreso**, más una nueva interfaz tipo dashboard gaming.

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

## Interfaz: el diario de pasos

Los 100 pasos se leen como el diario de misiones del juego.

### Desktop
- **Lista** a la izquierda, agrupada por el Dofus al que lleva cada tramo ("Hacia el Domakuro", 11/28). Cada fila tiene una casilla para marcar el paso sin abrirlo, la miniatura del paisaje de su zona, el número, el logro que persigue, su jefe o su Dofus y la duración. Si el paso se termina más adelante, lo dice ("se cierra en el 34"). Las pestañas Pendientes, Hechos y Todos filtran la lista.
- **Detalle** a la derecha. Arriba va un escenario con el paisaje de la zona, el número y el título del paso, y su jefe flotando. Debajo, con el estilo de la ventana de Misiones del juego (madera oscura, o pergamino en el tema claro): el texto de Sandglass, los avisos de la guía en paneles con medallón, las misiones con la «!» del juego y sus objetivos, y lo que hace falta reunir como casillas de inventario. Al final, una barra con el paso anterior, "Paso hecho" (marca el paso y abre el siguiente pendiente) y el siguiente. Si el combate del paso cierra otros que siguen pendientes, ofrece marcarlos también. Sin nada elegido, el detalle muestra el siguiente pendiente. "Ver en el mapa", arriba a la derecha del escenario, vuelve al mapa con ese paso abierto y a la vista.

### Mapa
- La vista por defecto, primera en el selector "Mapa | Diario": los 100 pasos como un camino que serpentea sobre el paisaje de la zona del paso actual. Cada paso es un sello con el paisaje de su zona; los hechos se apagan con ✓, el actual brilla y los 12 Dofus son hitos dorados con su huevo. Los pasos cuyo combate cierra otros llevan la insignia de su jefe y, al elegir uno, un arco los une. La ficha del paso dice hasta dónde llegar y qué cierra, y deja marcarlo o abrirlo en el diario. Los sellos y la búsqueda apagan los pasos que no coinciden sin romper el camino. La vista elegida se recuerda.

### Mobile
- La lista ocupa todo el ancho. Al tocar un paso, sube un **bottom sheet** con el detalle. Se cierra arrastrando hacia abajo o tocando el overlay.

### Otras features
- ✅ **Hero inmersivo**: el mapa del juego ocupa todo el ancho y casi toda la pantalla, con parallax al bajar, luciérnagas de noche y hojas que caen de día. El progreso es el propio Dofus Silvestre, que se llena de color desde abajo dentro de un anillo de 10 tramos; al 100 % se marca como obtenido. Junto al porcentaje van los pasos hechos y una nota que explica que el porcentaje está ponderado por esfuerzo. Bajo el título, una tarjeta con el siguiente paso que lleva a su detalle y, aparte, "Lo que necesitas": prerrequisitos y objetos necesarios, cada uno con su barra y un enlace a su sección. El parallax y el ambiente se apagan con movimiento reducido.
- ✅ **Header fusionado con el hero**: arriba es transparente sobre el mapa del hero; al bajar se vuelve sólido y, al dejar atrás el hero, muestra en el centro una barra de experiencia enmarcada, en 10 tramos y con brillo, como la del juego, junto al porcentaje y los pasos hechos. En pantallas estrechas ocupa el hueco entre la marca y los botones.
- ✅ **Lo que necesitas**: prerrequisitos y objetos en una sola sección con dos pestañas, que se abren desde las tarjetas del hero. Bajo las pestañas, los botones "Marcar todo" y "Limpiar" van en la misma fila que la explicación de qué hacen en cada pestaña; actúan sobre lo que se ve y se pueden deshacer. La sección se puede ocultar en cualquier momento, y la elección se recuerda. Oculta, queda una tarjeta con el avance de prerrequisitos y objetos y, debajo, los objetos que piden tus próximos pasos con nombre y cantidad, tantos como quepan en dos líneas (tres en móvil); al pulsarla se vuelve a abrir. Con la guía completa se contrae sola en una franja "Todo reunido" que se despliega en un resumen de lo reunido (6.770 unidades, lo que más pesó, el reparto por categoría) y, desde ahí, en las listas.
- ✅ **Prerrequisitos** (21: 12 logros y misiones previos, 6 oficios y 3 hechizos, al día con torrentearcano) como tarjetas que se marcan, con los objetos que piden debajo. Cada objeto va asociado al prerrequisito en el que se gasta (`PREREQ_OF` en `build_resources.py`, sacado de los objetivos de sus misiones en DofusDB), así que al completar un prerrequisito sus objetos cuentan como usados. Al revés no: marcar un objeto no completa el prerrequisito, porque se puede comprar antes. Encima, la recomendación de Sandglass de empezar el Dofus Ocre cuanto antes: lo da "La eterna cosecha", una misión larga que la guía termina en el paso 79 con el logro "El fin de la eternidad", y el aviso lleva a ese paso. **NO suman al progreso del Silvestre**: son un seguimiento aparte.
- ✅ **Modo claro/oscuro** con un interruptor de dos huevos del juego, Dofus Ébano y Dofus Marfil: intercambian sitio en arco y el que llega aparece con un rebote y chispas. La página cambia con una diagonal desde la esquina del interruptor, y volver es el mismo recorrido al revés.
- ✅ **Paleta clara "lima y tinta"**: en modo claro los rellenos usan un verde lima y el texto de acento un verde tinta (`--accent-ink`) con contraste AA sobre fondos claros; el modo oscuro no cambia.
- ✅ **Reiniciar con red de seguridad**: un diálogo muestra tu progreso, deja elegir qué borrar (pasos, prerrequisitos, objetos conseguidos) sin tocar la posición en el overlay. Lo que se conserva se guarda tal como se ve: si la guía estaba completa, prerrequisitos y objetos quedan marcados aunque se borren los pasos. Tras reiniciar, un aviso permite deshacer durante 8 segundos.
- ✅ **Copia de seguridad**: dentro del mismo diálogo, una tarjeta con el cofre del juego dice cuándo fue la última copia (y avisa si hace más de 14 días o nunca), descarga el progreso en JSON y lo restaura con un botón o soltando el archivo encima.
- ✅ **Sellos de zona**: sobre el diario, un medallón por zona con su paisaje y un anillo que se llena con los pasos hechos; las zonas completas llevan ✓ y un marcador de ubicación encima señala la zona del paso abierto (el anillo amarillo es del filtro, así que se pueden ver los dos a la vez). Pulsar un sello deja en la lista solo esa zona; "Todas" la devuelve entera. Junto al título van el buscador (por número o texto) y "Siguiente pendiente".
- ✅ **Avisos de la guía**: los resaltados de torrentearcano en tres colores. Rojo, hasta dónde avanzar ("Hasta tener que pasar Lasoberaña"); verde, lo que se resuelve y qué pasos cierra; azul, consejos. Cuando el rojo nombra un jefe que aparece en los objetivos, una línea roja marca dentro de la misión dónde parar.
- ✅ **Guías de Torrente Arcano**: las misiones y los logros que nombra el texto enlazan a su guía en torrentearcano.com, igual que en su checklist, y cada misión con guía lleva "Guía ↗" en su fila. `.build/import_guide_links.py` saca los nombres de la página, construye las mismas direcciones y guarda solo las que responden (65 logros y 99 de 101 misiones). Las menciones a otros incisos ("véase el inciso 78") llevan a ese paso.
- ✅ **Copiar para el mercadillo**: en "Necesitas", pulsar un objeto copia su nombre para pegarlo en el buscador del mercadillo del juego.
- ✅ **Navegación por teclado**: ←/→ entre pasos, espacio para marcar, Esc para cerrar.
- ✅ **Movimiento con sentido**: cada cambio de estado se ve. Pasar del mapa al diario es un zoom in sutil sobre el sello del paso actual (0,3 s, como los fundidos de duffus.fr), y del diario al mapa un zoom out. El zoom hace de pantalla de carga: la vista que se va hace su zoom y espera, y la que llega se prepara invisible encima hasta que lo que va a quedar a la vista está listo (la lista colocada en el paso, las imágenes visibles, incluidos los paisajes de fondo, y en el diario las misiones), con un límite de 1,5 s. Entonces se cruzan, así que nunca se ve a medio cargar (`src/lib/viewSwap.js`). Lo coordina `AnimatePresence` de [motion](https://motion.dev) (Framer Motion) en modo `popLayout`, con `usePresence` para decidir cuándo retirar la vista que se va, que sigue siendo la de React, inerte y sin ids. Anima con el `useAnimate` mini de motion, que usa la API del navegador: motion suma unos 6 KB comprimidos. Las alturas no usan `layout` de motion, que escala con transformaciones y haría saltar lo de debajo: siguen con `useHeightMorph`, que anima la altura real. Ocultar, mostrar y cambiar de pestaña o de vista animan la altura (`useHeightMorph` en `src/lib/motion.js`, hacia `height: auto` con `interpolate-size`), así lo de debajo se desplaza en vez de saltar. Al cambiar de paso, el paisaje se asienta, el jefe aparece de un salto y el texto sube. Las ✓ aparecen con un rebote al marcar un paso, un prerrequisito o un objeto. Las misiones y "Necesitas" se abren con su altura, los sellos llenan su anillo poco a poco, en el mapa la ficha sale del paso y el paso actual late. Las secciones entran al hacer scroll (scroll-driven, sin JavaScript). Con movimiento reducido no se anima nada.
- ✅ **Dofus del camino**: los 12 Dofus que da la guía antes del Silvestre (Dofawa, Esmeralda, Púrpura, Domakuro, Dorigami, Turquesa, Moteado, Ocre, Marfil, Ébano, Pesadilla y la Piñata de pino), cada uno en el paso que completa su logro. Salen de las recompensas de los logros y de sus misiones, filtradas por el tipo de objeto Dofus de DofusDB, no por el nombre. DofusDB no tiene ni los objetivos ni la recompensa de "El fin de la eternidad" (paso 79), el logro de terminar "La eterna cosecha", así que `MISSING_DOFUS` en `build_assets_js.py` le asigna el Dofus Ocre. Lo mismo con la Piñata de pino: sale de una misión aparte (Grunob y luego Goblepino) que se abre con "El secreto de los dofus: Prólogo", y cuenta como conseguida en el paso 99. Mientras avanzas se ven en una fila del hero, oscuros y con su paso hasta conseguirlos; con la guía terminada ocupan el sitio del siguiente paso y de "Lo que necesitas", que ya no hacen falta.
- ✅ **Nota aclaratoria** sobre "Hasta tener que pasar X jefe": explica la pausa con un ejemplo real dibujado con casillas del tablero (los pasos 43 y 44 se detienen ante Kodámade y el 45 los termina) y lleva a los 33 pasos que usan esa instrucción.
- ✅ **Arte real del juego**: cada paso muestra el sprite de su recompensa o del jefe que exige (ver abajo).
- ✅ **Objetos necesarios**: la lista de torrentearcano, paso a paso, como un inventario del juego. La franja **Pronto** reúne lo que piden tus próximos 5 pasos con la cantidad justa para ellos, y el resto queda en "Más adelante"; marcar algo en Pronto marca solo esa parte. Se puede ordenar por cantidad o de la A a la Z, filtrar por categoría y buscar sin tildes (atajo `/`). Hay vista de cuadrícula y de lista: en la cuadrícula la búsqueda resalta en vez de esconder; la lista se pagina (10, 25, 50, 100 o todo, sin tocar Pronto) y la búsqueda filtra. Un objeto deja de hacer falta al completar todos los pasos que lo piden o al marcarlo. El icono de copiar de cada casilla (o mantenerla pulsada en móvil) copia su nombre para buscarlo en el mercadillo.
- ✅ **Overlay**: una ventana compacta que se queda encima del juego y te lleva objetivo a objetivo por las misiones del paso, con mapa y coordenadas. Ver abajo.
- ✅ **Misiones por paso**: el detalle de cada paso lista sus misiones con el NPC inicial, el nivel y todos los objetivos. La misión donde cae la parada roja se abre sola. Van en el orden de los objetivos del logro (contando los que no son misiones, para que "misión 7" sea la séptima del logro), y si un paso cita varios logros, en el orden en que los nombra la guía. Los avisos solo añaden misiones si las citan por número o dicen que el paso "incluye" el logro: nombrar otro logro de pasada no mete sus misiones.
- ✅ **Iconos en prerrequisitos**: oficios y hechizos con su icono del juego. Lo que pide misiones concretas, aunque sean de un logro, lleva la «!» de misión; lo que pide un logro completo, el librito con trofeo. Lo opcional lleva una etiqueta azul y el borde discontinuo.
- ✅ **Estética tipo duffus.fr**: carbón verdoso, acento lima, tipografía Barlow y un mapa del juego de fondo en la cabecera. La marca es un logotipo en la línea del de Dofus (Lilita One con contorno) junto al Dofus Silvestre inclinado; las letras hacen una ola al pasar el ratón. Los botones de overlay y reinicio usan objetos del juego: el Catalejo de gobletrotter, que se inclina y acerca, y el Minirreloj de arena, que se da la vuelta.

---

## Assets del juego (DofusDB)

Los 100 pasos citan logros, misiones y jefes por su nombre en español. Eso permite
emparejarlos automáticamente contra [DofusDB](https://dofusdb.fr) y traer el arte real
del juego. El emparejamiento cubre **99 de los 100 pasos**; el que falta es el 87
("Misión de orden 5"), que no nombra nada concreto.

Cada paso elige su icono en este orden:

| Prioridad | Fuente | Pasos |
|-----------|--------|-------|
| 1 | Ítem que recompensa el logro (los Dofus de colores, reliquias, ingredientes) | 70 |
| 2 | Retrato del jefe que el paso exige pasar | 14 |
| 3 | Icono de categoría del logro | 12 |

La primera fuente es la buena. El logro "Blanco marfil" recompensa el ítem 7115, que es
el Dofus Marfil, así que el paso 93 muestra ese huevo. Los iconos de categoría son el
último recurso porque Ankama solo tiene tres para todo el checklist.

El detalle muestra el primer jefe del paso en su escenario y, si hay más, sus retratos en
una fila (64 en total, 36 jefes distintos). Cuando el icono del paso es la recompensa de
su logro, aparece aparte como "Recompensa".

El escenario y las filas usan un paisaje por zona: un mapa del juego elegido a mano entre
los que recorren sus misiones. `.build/fetch_zone_maps.py` los descarga de DofusDB, recorta
la marca de agua y los guarda en dos tamaños en `public/img/zones/`.

### Objetos necesarios

Salen de la misma página de torrentearcano: Sandglass lista, paso a paso, solo lo que hay
que reunir (recursos base, equipo, consumibles, almas, criaturas), sin los objetos
intermedios que se fabrican por el camino. El "paso 0" son los prerrequisitos.
`.build/build_resources.py` busca cada nombre en DofusDB para su imagen y escribe
`src/data/resources.json`: **407 objetos en 68 pasos**.

La suma se hace con las mismas reglas que el compilado de la página, y el script lo
comprueba contra `.build/lists/compilado.txt` (420 de 420 filas iguales):

- Lo que se conserva tras usarlo (Mazorrasombrero, Varita pitusa, Piedra de alma mediana,
  Calzoncillo de repuesto de capitán chafer) cuenta una vez aunque lo pidan dos pasos.
- El Elixir de los barquerontes sale en su paso pero no suma: solo hace falta si se perdió
  la alteración.
- Los objetos de una misión opcional o de una sola orden de alineamiento llevan etiqueta.
  Cuentan en el total como los demás: van ligados a sus pasos, así que completarlos los cubre.

La lista de la página trae un error, corregido en `CORRECTIONS`: pide "Hoja de kalipto", que
no existe; es la Flor de kalipto. Tres nombres no existen en DofusDB y salen sin imagen:
Esencia de cil, Filtro de dragonalgas y "Recursos recolectables de los reinos de tinta y papel".

### Todo auto-alojado

Las 336 imágenes de iconos, jefes y objetos viven en `public/img/` (5.2 MB), copiadas de DofusDB por el script de build.
Los iconos de oficio salen del release `job_images_64.tar.gz` de
[dofusdude/dofus3-main](https://github.com/dofusdude/dofus3-main), porque DofusDB
devuelve 404 en los suyos. La excepción son los mapas del overlay: son 1.210 y pesarían
unos 80 MB, así que se cargan desde DofusDB al verlos. Si no cargan, el overlay sigue sin
la imagen. Lo demás externo es Google Fonts.

### Actualizar la guía

Cuando Sandglass publica una versión nueva, se importa de la página de torrentearcano:

```bash
curl -sL -A "Mozilla/5.0" -o /tmp/ta/page.html https://www.torrentearcano.com/checklist-silvestre
python3 -I .build/import_guide.py /tmp/ta/page.html
```

Reescribe los pasos de `src/data/steps.js` y guarda una copia de los datos de la página en
`.build/lists/torrentearcano.json`. La página publica también qué pasos de la versión
anterior forman cada paso nuevo (`PREVIOUS_STEPS`). Con esa tabla se migra el progreso
guardado y las copias de seguridad antiguas: un paso nuevo queda hecho si lo estaban todos
los antiguos que lo forman. Después hay que regenerar los assets.

### Regenerar los assets

```bash
python3 -I .build/fetch_dofusdb.py     # descarga logros, jefes, mazmorras y misiones
python3 -I .build/match_assets.py      # empareja los 100 pasos e imprime la cobertura
python3 -I .build/build_assets_js.py   # escribe src/data/assets.json (60 KB) y copia las imágenes a public/img/
python3 -I .build/build_quests_js.py   # escribe src/data/quests.json (506 KB): misiones y objetivos por paso
python3 -I .build/build_resources.py   # escribe src/data/resources.json: los objetos de cada paso
```

El primer paso baja unos 190 MB a `.build/data/`, que está en `.gitignore`. Se versionan
los JSON de `src/data/` y `public/img/`. Las respuestas de la API (nombres, posiciones de
mapa, oficios) se cachean en `.build/data/lookup_*.json`, así que regenerar no vuelve a
pedir nada que ya esté descargado.

## Misiones de cada paso

Cada logro guarda sus objetivos en orden, y cada objetivo es "terminar la misión X". Sandglass
numera las misiones igual: la "misión 4" de un logro es su cuarto objetivo. Con eso cada
paso se resuelve a sus misiones:

- "hasta la misión N" toma de la 1 a la N.
- "misión 7, misión 8" toma exactamente esas.
- "(Completo)" o sin números toma el logro entero.
- "Alineamiento Bontariano: Misión N" usa la misión de alineamiento cuyo requisito es nivel
  de alineamiento N−1 en el bando de Bonta. El paso cubre desde la misión que dejó en pausa
  el paso de alineamiento anterior hasta la N.

Resultado: **97 de 100 pasos**, 344 misiones y 4.546 objetivos, 3.642 de ellos con mapa o
coordenadas. Los nombres de NPC, objetos y monstruos dentro de los textos se resuelven todos.
Quedan fuera el 76 y el 87 ("misión de orden"), que dependen de la orden que elijas, y el 77,
cuyo logro no tiene misiones.

`src/data/quests.json` pesa 506 KB y la página lo carga en diferido, después del primer render.

## Overlay

El botón **Overlay** de la cabecera abre una ventana de 380×640 que sigue la estructura del
overlay de duffus.fr:

- Cabecera con la misión, el NPC que la da, el nivel, la zona y las coordenadas.
- Selector para moverte entre las misiones del paso ("Misión 4 / 10").
- Objetos necesarios del paso.
- El mapa donde se hace el objetivo. Si el objetivo no trae ubicación, muestra la última
  conocida y lo dice.
- El objetivo actual en grande, con un contador ("5 / 16"), y los tres siguientes debajo.
- Las indicaciones de Sandglass para el paso, plegadas.
- Abajo y siempre visibles: paso anterior, marcar hecho, paso siguiente.

Se avanza objetivo a objetivo porque 313 de las 344 misiones tienen una sola etapa con una
docena de objetivos. Al terminar una misión pasa a la siguiente. La posición se guarda por
misión, así que puedes cerrar la ventana y volver donde estabas.

Las coordenadas son botones: al pulsarlas copian `/travel x,y` para pegarlo en el chat del
juego. Con la ventana enfocada, ←/→ cambian de paso, ↑/↓ de objetivo y espacio marca el paso.

Lo que marques en el overlay se refleja en la página y al revés. Si no hay ningún paso
seleccionado, muestra el siguiente pendiente.

Usa la API Document Picture-in-Picture, la misma que duffus.fr. En **Chrome y Edge** la
ventana se queda por encima de todo, incluido el cliente de Dofus. Firefox y Safari no
la implementan: ahí se abre un popup normal con el mismo contenido, pero no flota. En
móvil el botón no aparece.

## Cómo trabajar en él

Es una app de React 19 con Vite. Necesita Node 20 o superior.

```bash
npm install
npm run dev        # servidor de desarrollo con recarga en caliente
npm run build      # genera dist/, un sitio estático
npm run preview    # sirve dist/ en http://127.0.0.1:4173
```

El progreso se guarda en `localStorage`, con las mismas claves que la versión anterior, así
que quien ya tuviera progreso lo conserva.

### Pruebas

```bash
npx playwright test
```

Son pruebas de extremo a extremo con Playwright en `tests/e2e/`: diario, detalle, misiones,
filtros, prerrequisitos, lista de objetos, tema, header, reinicio con copia de seguridad,
overlay y móvil. Sin `APP_URL`, construyen el sitio y lo prueban en `vite preview`. Con
`APP_URL` se pueden pasar contra cualquier otro despliegue:

```bash
APP_URL=https://mi-despliegue.example/ npx playwright test
```

Se escribieron contra la antigua versión de un solo archivo antes de migrar a React, y las
dos versiones las pasaban sin cambios.

---

## Limitaciones honestas

1. **La clasificación de esfuerzo es aproximada**. Yo clasifiqué los 100 pasos basándome en patrones del texto ("Completo" = más esfuerzo, "misión X" = menos), pero **Sandglass y jugadores experimentados son la autoridad real**. Si algún peso parece mal calibrado, se cambia en 1 línea del array `STEPS` en el HTML.

2. **Los pesos aún no usan las misiones**. `src/data/quests.json` ya trae las misiones y objetivos de cada paso; el siguiente paso natural es recalibrar el esfuerzo con esa cantidad real en vez de con patrones del texto.

3. **El progreso vive en localStorage** — sin sync a servidor / cuenta de usuario.

4. **El emparejamiento de assets es automático**. Un paso puede mostrar el icono de una
   recompensa secundaria en vez de la que tú esperarías, porque el script toma el primer
   logro del texto que entrega un ítem. Los jefes se detectan por nombre propio en
   mayúscula, lo que descarta falsos positivos como "la guerra interminable" pero
   dependería de que Sandglass siga escribiéndolos así. Revisar
   `.build/data/step_assets.json` para auditar cualquier paso.

5. **Los datos vienen de DofusDB**, un servicio de terceros. Las imágenes ya están
   copiadas en `public/img/`, así que la página no depende de él para funcionar; solo para
   regenerar los datos.

6. **Los mapas del overlay dependen de DofusDB**. Iconos y objetos están en `public/img/`, pero los
   mapas se enlazan desde su CDN por tamaño.

7. **La sintaxis de `/travel` no está verificada en el juego**. La única referencia que
   encontré es una extensión para dofus-map.com que copia `/travel` seguido de dos
   coordenadas. Si el juego espera otro formato, se cambia en `copyTravel()`.

8. **Las misiones de alineamiento salen del criterio de inicio**, no de un listado oficial.
   Los niveles cuadran con lo que dice cada paso (la 99, nivel 199, lleva al Mirador de
   Ilyzaelle), pero es una inferencia.


---

## Despliegue

`npm run build` deja en `dist/` un sitio estático de unos 6.7 MB, de los que 5.8 MB son
imágenes. Se puede subir tal cual a cualquier hosting estático: Netlify, GitHub Pages o
Cloudflare Pages. Las misiones (`quests`, 95 KB comprimidas) van en un archivo aparte que solo
se descarga cuando hace falta.

Ya no es viable pegarlo en un bloque de Squarespace: son varios archivos y una carpeta de
imágenes. Para enlazarlo desde torrentearcano.com, lo práctico es un enlace o un iframe
apuntando al sitio desplegado.

---

## Estructura del proyecto

```
silvestre-checklist/
├── index.html                ← entrada de Vite
├── src/
│   ├── main.jsx, App.jsx
│   ├── state/store.js        ← estado único y persistencia en localStorage
│   ├── components/           ← Header, ThemeSwitch, Hero, Grid, StepDetail, Shop, ResetDialog…
│   ├── overlay/              ← ventana Picture-in-Picture (portal de React)
│   ├── lib/                  ← imágenes, carga diferida de misiones, animaciones
│   ├── data/                 ← steps.js (los 100 pasos de Sandglass) y JSON generados
│   └── styles/global.css
├── public/img/               ← las 336 imágenes del juego, auto-alojadas (5.2 MB)
├── tests/e2e/                ← pruebas de Playwright
└── .build/                   ← internos (no enviar al usuario final)
    ├── import_guide.py       ← importa los pasos de la guía desde torrentearcano
    ├── fetch_dofusdb.py      ← descarga los datos crudos de DofusDB
    ├── match_assets.py       ← empareja los 100 pasos con logros, jefes y misiones
    ├── build_assets_js.py    ← genera los datos de pasos y copia las imágenes
    ├── build_quests_js.py    ← resuelve cada paso a sus misiones
    ├── build_resources.py    ← objetos de cada paso desde la lista de torrentearcano
    ├── lists/                ← datos importados de torrentearcano y su compilado
    ├── steps.js, steps_data.py
    └── data/                 ← datos crudos y cachés de la API (gitignored)
```

## Créditos

- **Guía original de los 100 pasos**: Sandglass — autoridad de la comunidad hispana de Dofus
- **Sistema actual de checklist en torrentearcano.com**: el dueño del sitio
- **Rediseño del scoring + UI**: este proyecto
- **Datos y arte del juego**: [DofusDB](https://dofusdb.fr)

Dofus es una marca de Ankama. Esta es una herramienta no oficial hecha por y para la comunidad.
