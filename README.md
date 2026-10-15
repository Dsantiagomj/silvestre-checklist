# Checklist Dofus Silvestre — rediseño

App web (React + Vite) que rediseña el checklist del Dofus Silvestre de **torrentearcano.com/checklist-silvestre**. La guía sigue siendo la de **Sandglass**, en su versión 4: los textos de los 100 pasos se importan tal cual de esa página y NO se modificaron. Lo que cambia es **cómo se calcula y se muestra el progreso**, más una nueva interfaz tipo dashboard gaming.

---

## El problema que resolvemos

El checklist actual usa **conteo plano**: cada uno de los 100 pasos vale 1%. Esto distorsiona el progreso de forma brutal porque los pasos tienen costos muy distintos:

| Paso | Descripción | Tiempo real | Peso actual | Peso nuevo |
|------|-------------|-------------|-------------|------------|
| 4    | Misión "Barnabé en el espacio" (nivel 15) | 10-15 min | 1% | **0.03%** |
| 93   | Logro "Blanco marfil" completo (6 jefes, 4 tótems, 4 sacrificios, Necronix) | 30-40 h | 1% | **4.59%** |

El paso 93 pesa **132 veces más** que el paso 4. La barra antigua los trataba igual; la nueva refleja la realidad.

---

## Sistema de progreso ponderado

El peso de cada paso sale del nivel de las misiones que cubre (las de `src/data/quests.json`):

- Cada misión vale 100 puntos por un multiplicador de dificultad: su nivel entre 100. Una de nivel 2 vale 2 puntos (×0,02), una de nivel 20 vale 20 (×0,2) y una de nivel 200 vale 200 (×2).
- Una misión que sale en varios pasos (66 de las 351) reparte sus puntos a partes iguales entre ellos, así que nada cuenta dos veces. La misión de clase del paso 1 cuenta como nivel 20.
- El peso del paso es la suma de lo que le toca de cada misión. Un paso sin misiones pesaría 0, así que tendría el peso de una misión de nivel 1 para que marcarlo siga contando (hoy todos tienen alguna).

El nivel es el "Nivel mínimo" de la guía de la misión en Torrente Arcano cuando la página lo dice (251 misiones). Si no, el `levelMin` de DofusDB (100: 94 páginas no dicen nivel y 6 misiones no tienen guía). Las dos fuentes no coinciden casi nunca: en 234 de las 251 Torrente Arcano da un nivel más bajo (nunca más alto), a veces mucho ("La cólera de los dioses": 50 frente a 200). `.build/build_weights.py` baja cada guía una sola vez (`.build/data/ta_levels.json`) y escribe `src/data/weights.json`, que usa `progressPct` en `src/state/store.js`.

Total: **43 126 puntos**. Los pasos más pesados son el 61 (6,0 %), el 47 (5,5 %) y el 82 (5,2 %); el más ligero, el 6 (0,02 %). Con los pasos hechos en orden, el porcentaje va así: 0,8 % tras el 1, 2,6 % tras el 10, 12,7 % tras el 20, 32,8 % tras el 50, 57,6 % tras el 70, 85,4 % tras el 90 y 98,7 % tras el 99. El porcentaje se redondea a un decimal, pero solo marca 100 % con todo hecho y 0 % sin nada.

El conteo "X/100 pasos" se mantiene visible como stat secundario para los completistas, pero la barra principal es la ponderada.

---

## Interfaz: el diario de pasos

Los 100 pasos se leen como el diario de misiones del juego.

### Desktop
- **Lista** a la izquierda, con los 100 pasos seguidos (sin capítulos por Dofus: muchos pasos no tienen que ver con el Dofus del tramo). Cada fila tiene una casilla para marcar el paso sin abrirlo, la miniatura del paisaje de su zona, el número, el logro que persigue con su zona debajo y, a la derecha, lo que se gana en él. Lo que se gana es el Dofus que da o, si no da ninguno, el jefe que resuelve (el que nombra su verde, no el que deja pendiente); si no hay ninguno, va en blanco. Si el paso se termina más adelante, lo dice ("se cierra en el 34"). Las pestañas Pendientes, Hechos y Todos filtran la lista.
- **Detalle** a la derecha. Arriba, en oscuro en los dos temas, va el estandarte. A la izquierda, un pendón vertical con marco dorado (también en la punta) sobre el mapa del juego donde empieza la primera misión del paso (sin mapa, el paisaje de la zona), con el número, la zona y la figura que mejor representa el paso. Esa figura es el Dofus que da. Si no da ninguno, es la figura elegida para su logro: el dragón primordial de su Dofus, el jinete o Draconiros en Selocalipsis, Silvosse en la línea del Silvestre. Las líneas primordiales que empieza Meriana llevan a Meriana. Si no hay nada de eso, sale el PNJ que empieza el paso (en una misión sin punto de inicio, el primer PNJ al que manda, como Pandawelo en el 64; si el PNJ depende de la clase, como en el 7, ninguno, y la misión lo dice; en el 7 sale a mano la diosa Feca, con la que se habla en la misión, `STEP_FIGURE` en `build_figures.py`) y, en último caso, el jefe que resuelve (`src/data/figures.json` y `public/img/npcs/`, de `build_figures.py`). A la derecha va el objetivo: el logro con su icono y su guía, una ✓ dorada en el icono si el paso pide el logro entero, el texto de Sandglass una sola vez, bajo el rótulo "Texto de la guía" y en letra normal, y los avisos de la guía como líneas con su icono y su rótulo de color. Los pasos que cierra ya los nombra el aviso verde con fichas que llevan a ellos; si el paso se termina en otro, una línea "Se termina más adelante" lleva a ese paso. En escritorio, esa cabecera y la barra de pasos de abajo quedan fijas y solo se desplaza lo de en medio. Debajo, con el estilo de la ventana de Misiones del juego (madera oscura, o pergamino en el tema claro), lo que hace falta reunir y después las misiones con la «!» del juego (si el paso mezcla misiones de varios logros, como el 1, van bajo un título por logro: `STEP_GROUPS` en `build_quests_js.py`) y sus objetivos como una ruta de medallones dorados unidos por un camino punteado, como el mapa de pasos: cada tipo de objetivo lleva un objeto del juego (carta para hablar, espada para combatir, bolsa para entregar, brújula para ir a un sitio, martillo para fabricar y libro para lo demás; `OBJ_ICONS` en `build_assets_js.py`), lo que se entrega sale como casilla con el icono del objeto y, con el avance que guarda el overlay, lo hecho se marca en verde y el objetivo actual brilla (con el paso hecho, todo sale hecho). Pulsar un medallón da el objetivo por hecho (o, si ya lo estaba, vuelve a él), con el mismo avance que el overlay; al terminar una misión se pasa a la siguiente del paso y esa se despliega. Al abrir un paso, todas sus misiones salen plegadas, se llegue desde donde se llegue. La parada roja entiende también "hasta que puedas entrar a la mazmorra X": va antes del primer objetivo cuya zona es esa mazmorra. Cuando ningún objetivo nombra al jefe ni la zona (el paso 10: el hueso de hierro de "Encender la mecha" se consigue venciendo a Maxilubo), `STOP_AT` en `src/lib/journal.js` dice a mano en qué objetivo cae (o en cuáles, si el paso para en dos misiones), según la guía de la misión en Torrente Arcano: 33 pasos. El paso 78 lleva las misiones de orden de Espíritu de la salvación hasta la 4, el 89 la de orden 5, y el 80 empieza por "La última piedra", que "Alma máster" pide antes (`STEP_EXTRA` en `build_quests_js.py`). En un paso que se resuelve en sí mismo (lleva verde), el rojo no es dónde parar sino dónde se retoma: no sale como aviso, y en la ruta la línea es verde y dice lo que se resuelve ("Se pasa Nelwynn y se terminan las misiones de los incisos 5 y 22"); si el rojo añadía algo más ("Retomar sala 5…"), queda como nota. Si el verde termina con "…hasta tener que pasar X" (el 43 con Kodámade, el 72 con Ilyzaelle), esa es una parada nueva: sale como aviso rojo y como línea roja en su misión, que puede llevar las dos líneas, la verde donde se retoma y la roja donde vuelve a parar. "Lo que se resuelve" lleva el retrato del jefe que se pasa (sin jefe, la espada del juego), también en la ficha del mapa. Lo que hace falta reunir usa las mismas casillas que "Objetos necesarios": pulsar una la marca como cogida para ese paso, y se ve igual en las dos partes porque es el mismo estado. El icono de la esquina copia el nombre para el mercadillo. Un objeto que también piden otros pasos sale sumado en "Objetos necesarios": lo ya cogido para un paso (o cubierto por un paso hecho) se descuenta, así que la casilla muestra lo que falta, en el color de "Pronto", hasta tener todas sus partes. Por ejemplo, la Ortiga ×100 (50 del paso 1 y 50 de los prerrequisitos) pasa a ×50 al cogerla en el paso 1. Al final, una barra con el paso anterior, "Paso hecho" (marca el paso y abre el siguiente pendiente) y el siguiente. Si el combate del paso cierra otros que siguen pendientes, ofrece marcarlos también. Sin nada elegido, el detalle muestra el siguiente pendiente. "Ver en el mapa", arriba a la derecha del objetivo, vuelve al mapa con ese paso abierto y a la vista. En la lista, las etiquetas de "se cierra en" y "cierra" van a la derecha, una bajo otra y junto al retrato, y llevan al paso con un clic; así el título tiene casi todo el ancho. En móvil bajan bajo el título. Las coordenadas llevan la brújula del juego; al pulsarlas copian el /travel.

### Mapa
- La vista por defecto, primera pestaña de la ventana ("Mapa | Diario | Prerrequisitos | Objetos"): los 100 pasos como un camino que serpentea sobre el paisaje de la zona del paso actual. Cada paso es un sello con el paisaje de su zona; los hechos se apagan con ✓, el actual brilla y los 12 Dofus son hitos dorados con su huevo. Los pasos cuyo combate cierra otros llevan la insignia de su jefe y, al elegir uno, un arco los une. La ficha del paso dice hasta dónde llegar y qué cierra, y deja marcarlo o abrirlo en el diario. Se cierra con ×, pulsando fuera o con Escape; pulsar otro paso la cambia a ese paso. Los sellos y la búsqueda apagan los pasos que no coinciden sin romper el camino. La vista elegida se recuerda.

### Mobile
- La lista ocupa todo el ancho. Al tocar un paso, sube un **bottom sheet** con el detalle. Se cierra arrastrando hacia abajo o tocando el overlay.

### Otras features
- ✅ **Hero inmersivo**: el mapa del juego ocupa todo el ancho y casi toda la pantalla, con parallax al bajar, luciérnagas de noche y hojas que caen de día. El progreso lo marca un anillo de 10 tramos alrededor del Dofus Silvestre, que va apagado hasta el final. Al marcar el 99, la página sube al hero y el Silvestre apagado tiembla, estalla en un destello y se convierte en la Piñata de pino. Al marcar el 100 pasa lo mismo con la Piñata, que se convierte en el Silvestre encendido. La animación solo sale en ese momento: al recargar, el huevo ya está como corresponde, y con movimiento reducido cambia sin animación. Al 100 % se marca como obtenido. Junto al porcentaje van los pasos hechos y una nota que explica que el porcentaje pesa cada paso por el nivel de sus misiones. Bajo el título, una tarjeta con el siguiente paso que lleva a su detalle y, aparte, "Lo que necesitas": prerrequisitos y objetos necesarios, cada uno con su barra, que abre su pestaña en la ventana de los pasos. Con la guía terminada, el hero se queda con el título y el huevo obtenido. El parallax y el ambiente se apagan con movimiento reducido.
- ✅ **Header fusionado con el hero**: arriba es transparente sobre el mapa del hero y al bajar se vuelve sólido. No lleva barra de progreso: el progreso vive en la franja de arriba de la ventana de los pasos.
- ✅ **Lo que necesitas**: prerrequisitos y objetos son dos pestañas de la ventana de los pasos, tras "Mapa | Diario" y separadas de ellas por una raya. Cada pestaña lleva una insignia con lo que falta (una ✓ cuando no falta nada). Las tarjetas del hero cambian la ventana a su pestaña y la dejan a la vista, y la tecla "/" abre la de objetos con el buscador listo desde cualquier parte de la página. Ya no hay una sección aparte, así que los títulos pierden la numeración. La pestaña abierta se recuerda, como la vista de los pasos, y abrir un paso desde una lista (el aviso del Dofus Ocre, por ejemplo) vuelve a la última vista de los pasos. Arriba de cada lista va el crédito a Sandglass y, en la misma fila que la explicación de qué hacen en cada pestaña, los botones "Marcar todo" y "Limpiar": actúan sobre lo que se ve y se pueden deshacer.
- ✅ **Prerrequisitos** (21: 12 logros y misiones previos, 6 oficios y 3 hechizos, al día con torrentearcano) como tarjetas que se marcan, con los objetos que piden debajo. Cada objeto va asociado al prerrequisito en el que se gasta (`PREREQ_OF` en `build_resources.py`, sacado de los objetivos de sus misiones en DofusDB), así que al completar un prerrequisito sus objetos cuentan como usados. Al revés no: marcar un objeto no completa el prerrequisito, porque se puede comprar antes. La página apunta dos veces la Ortiga ×50 y la Lana de jalatín negro ×5 de "El despertar de Pandala": en los prerrequisitos (l11) y en el paso 1, cuyo "El receptáculo de los dofus" pide hacer esa misión. `DUPLICATES` en `build_resources.py` las deja solo en los prerrequisitos. La página también pone en el paso 4 (Barnabé en el espacio, que solo pide un combate) la Lana de jalató ×5 y la Llave del Laboratorio de Brumen Tinctorias del paso 5: son el primer objetivo de sus dos misiones, según DofusDB y sus guías. `MOVED` las pasa al 5. Igual con el 19 (la Calavera, la Llave del Ring Eskarlata y el Tallo de bambuto son de las misiones 5 y 6 de Púrpura profundo, en el 21) y el 34 (la Glándula de arak-hai se entrega en el 35). Las tablas y la cuerda del paso 75 son un duplicado del 76, de cuando la página partió el antiguo paso 75: `DUPLICATES` las quita. Todo revisado en la guía de cada misión y en DofusDB. El Casco y las Alas de madera son para el cañón a la isla de Moon de "Ida sin vuelta" (Pan Koko Mío): basta con llevarlos encima. "Altos vuelos", que es opcional, pide en cambio el Casco mejorado y las Alas de madera mejoradas; la página no los lista, así que `EXTRA` los añade con la etiqueta "Opcional · Altos vuelos". La etiqueta de un paso en "Pronto" no espera a lo opcional para marcarse. Al pasar el ratón, cada objeto de los prerrequisitos dice para cuál es ("Para «Intrusión en el territorio wabbit»"), también en "Pronto". Los de los pasos dicen además para qué misión son ("«Las primeras impresiones son engañosas»"). Lo saca `.build/audit_resources.py`, que cruza lo que pide cada paso con lo que consumen sus misiones en DofusDB (entregas y fabricaciones, con sus recetas) y con el "Necesitarás" de su guía en Torrente Arcano. Escribe `.build/lists/item_quests.json` y muestra lo que no cuadra: objetos que ninguna misión del paso pide (y en qué paso vecino sí), cantidades distintas y lo que las misiones consumen y la lista no recoge. Con `0` revisa los prerrequisitos contra DofusDB. Encima, la recomendación de Sandglass de empezar el Dofus Ocre cuanto antes: lo da "La eterna cosecha", una misión larga que la guía termina en el paso 79 con el logro "El fin de la eternidad", y el aviso lleva a ese paso. **NO suman al progreso del Silvestre**: son un seguimiento aparte.
- ✅ **Modo claro/oscuro** con un interruptor de dos huevos del juego, Dofus Ébano y Dofus Marfil: intercambian sitio en arco y el que llega aparece con un rebote y chispas. La página cambia con una diagonal desde la esquina del interruptor, y volver es el mismo recorrido al revés.
- ✅ **Paleta clara "lima y tinta"**: en modo claro los rellenos usan un verde lima y el texto de acento un verde tinta (`--accent-ink`) con contraste AA sobre fondos claros; el modo oscuro no cambia.
- ✅ **Reiniciar con red de seguridad**: un diálogo muestra tu progreso, deja elegir qué borrar (pasos, prerrequisitos, objetos conseguidos). Borrar los pasos borra también su avance objetivo a objetivo, el del overlay y los medallones del diario. Lo que se conserva se guarda tal como se ve: si la guía estaba completa, prerrequisitos y objetos quedan marcados aunque se borren los pasos. Tras reiniciar, un aviso permite deshacer durante 8 segundos.
- ✅ **Copia de seguridad**: dentro del mismo diálogo, una tarjeta con el cofre del juego dice cuándo fue la última copia (y avisa si hace más de 14 días o nunca), descarga el progreso en JSON y lo restaura con un botón o soltando el archivo encima.
- ✅ **Controles iguales en toda la ventana**: el buscador de pasos y el de objetos son el mismo control (`SearchField.jsx`): lupa, el mismo alto y la misma letra, el mismo aro al enfocarlo y, con algo escrito, cuántos coinciden ("12 de 100") y una × para borrar; Escape también borra. Cada uno guarda su búsqueda. Los interruptores de varias opciones (Pendientes/Hechos/Todos, el orden y la vista de los objetos, los objetos por página) comparten estilo: una pista redondeada con la opción elegida resaltada.
- ✅ **Sellos de zona**: en la barra de herramientas de la ventana (solo en "Mapa" y "Diario"), junto al buscador (por número o texto), un botón "Zona: Todas · 79/100 ▾" dice la zona elegida y su avance. Al pulsarlo se despliega un panel con un medallón por zona, con su paisaje y un anillo que se llena con los pasos hechos; las zonas completas llevan ✓ y un marcador de ubicación encima señala la zona del paso abierto (el anillo amarillo es del filtro, así que se pueden ver los dos a la vez). Elegir un sello deja en los pasos solo esa zona y cierra el panel; "Todas" los devuelve todos. Escape o un clic fuera también lo cierran, sin cerrar el paso abierto.
- ✅ **Avisos de la guía**: los resaltados de torrentearcano en tres colores. Rojo, hasta dónde avanzar ("Hasta tener que pasar Lasoberaña"); verde, lo que se resuelve y qué pasos cierra. El azul de torrentearcano mezcla cosas, así que `import_guide.py` lo separa por lo que dice: "Incluye" (lo que abarca el paso), "También hay que" (una misión que la guía exige además, con la «!» del juego), "Consejo" (lo que se recomienda, se puede hacer o se aprovecha) y "Nota" (el resto). Cada tipo lleva su color y su icono del juego. Cuando el rojo nombra un jefe que aparece en los objetivos, una línea roja marca dentro de la misión dónde parar.
- ✅ **Guías de Torrente Arcano**: las misiones y los logros que nombra el texto enlazan a su guía en torrentearcano.com, igual que en su checklist, y cada misión con guía lleva "Guía ↗" en su fila. `.build/import_guide_links.py` saca los nombres de la página, construye las mismas direcciones y guarda solo las que responden (65 logros y 100 de 102 misiones). Además enlaza cada misión de la lista del diario con su guía si su página está en el sitemap del sitio (345 de 346; solo falta "Respuestas para todo", que no tiene página). Esas van aparte (`quests` en `guides.json`) y solo se enlazan en la lista: un título corto como "Memo" no debe enlazar palabras sueltas del texto. Las menciones a otros incisos ("véase el inciso 78") llevan a ese paso.
- ✅ **Copiar para el mercadillo**: en "Necesitas", pulsar un objeto copia su nombre para pegarlo en el buscador del mercadillo del juego.
- ✅ **Navegación por teclado**: ←/→ entre pasos, espacio para marcar, Esc para cerrar.
- ✅ **Movimiento con sentido**: cada cambio de estado se ve. Pasar del mapa al diario es un zoom in sutil sobre el sello del paso actual (0,3 s, como los fundidos de duffus.fr), y del diario al mapa un zoom out. El zoom hace de pantalla de carga: la vista que se va empieza su zoom y la que llega se prepara invisible encima, en el mismo sitio, hasta que lo que va a quedar a la vista está listo (la lista colocada en el paso, las imágenes visibles de la propia página, incluidos los paisajes de fondo, y en el diario las misiones), con un límite de 1,5 s. Entonces se cruzan: la nueva aparece mientras la vieja sigue su zoom y se desvanece, así que nunca se ve a medio cargar ni se queda parada (`src/lib/viewSwap.js`). El mapa del juego de DofusDB no se espera: puede tardar casi un segundo y llega encima del paisaje, que ya hace de fondo. Al terminar, si la vista nueva es más baja, la sección encoge con suavidad. Lo coordina `AnimatePresence` de [motion](https://motion.dev) (Framer Motion) en modo `popLayout`, con `usePresence` para decidir cuándo retirar la vista que se va, que sigue siendo la de React, inerte y sin ids. Anima con el `useAnimate` mini de motion, que usa la API del navegador: motion suma unos 6 KB comprimidos. Las alturas no usan `layout` de motion, que escala con transformaciones y haría saltar lo de debajo: siguen con `useHeightMorph`, que anima la altura real. Entre las demás pestañas de la ventana (Prerrequisitos y Objetos, o desde y hacia ellas) la vista que se va se aparta hacia un lado y se apaga deprisa, y la nueva llega desde el lado de su pestaña un instante después. La píldora de la pestaña activa se desliza hasta la elegida, las insignias rebotan cuando cambia lo que falta y la barra del buscador y la zona se pliega al pasar a una lista y se despliega al volver. Cambiar de pestaña o de vista anima la altura (`useHeightMorph` en `src/lib/motion.js`, hacia `height: auto` con `interpolate-size`), así lo de debajo se desplaza en vez de saltar. Al cambiar de paso, el paisaje se asienta, el jefe aparece de un salto y el texto sube. El desplegable de zona cae un poco desde su botón al abrirse y se apaga al cerrarse. Con el filtro Pendientes, la fila que se marca se queda un momento con su ✓ y se pliega, y las de debajo suben; al cambiar de filtro o de búsqueda la lista cambia al momento. Las ✓ aparecen con un rebote al marcar un paso, un prerrequisito o un objeto. Las misiones y "Necesitas" se abren con su altura (plegarlas o desplegarlas no mueve la lista de pasos: en escritorio el diario es un panel del alto de la pantalla en el que la lista y el detalle se desplazan cada uno por dentro, así que la página no cambia de altura; al cambiar de paso, el detalle vuelve arriba), los sellos llenan su anillo poco a poco, en el mapa la ficha sale del paso y el paso actual late. Las secciones entran al hacer scroll (scroll-driven, sin JavaScript). Con movimiento reducido no se anima nada.
- ✅ **Dofus del camino**: los 12 Dofus que da la guía antes del Silvestre (Dofawa, Esmeralda, Púrpura, Domakuro, Dorigami, Turquesa, Moteado, Ocre, Marfil, Ébano, Pesadilla y la Piñata de pino), cada uno en el paso que completa su logro. Salen de las recompensas de los logros y de sus misiones, filtradas por el tipo de objeto Dofus de DofusDB, no por el nombre. DofusDB no tiene ni los objetivos ni la recompensa de "El fin de la eternidad" (paso 79), el logro de terminar "La eterna cosecha", así que `MISSING_DOFUS` en `build_assets_js.py` le asigna el Dofus Ocre. Lo mismo con la Piñata de pino: sale de una misión aparte (Grunob y luego Goblepino) que se abre con "El secreto de los dofus: Prólogo", y cuenta como conseguida en el paso 99. Abren la ventana de los pasos: una franja con el rótulo "Dofus del camino", la cuenta en grande (8/12) y los 12 huevos repartidos a lo ancho. Los conseguidos brillan con un halo dorado y los que faltan van en gris. Al marcar el paso que da uno (nunca al cargar la página ni al restaurar una copia), su huevo se enciende desde el gris con un rebote, un destello dorado detrás y un brillo que lo cruza, la cuenta sube de un salto y un aviso dice "¡Dofus Esmeralda obtenido!", así se entera aunque la franja no esté a la vista. Desmarcarlo solo lo apaga; con movimiento reducido cambia sin animación y el aviso sale igual; al pasar el ratón dicen su nombre y su paso, y al pulsarlos abren ese paso. En la misma franja van el progreso global (el porcentaje ponderado, como en el hero, los pasos hechos y una barra fina) y "Siguiente: N →", que lleva al siguiente pendiente. En móvil los huevos van en dos filas de 6.
- ✅ **Nota aclaratoria** sobre "Hasta tener que pasar X jefe": explica la pausa con un ejemplo real dibujado con casillas del tablero (los pasos 43 y 44 se detienen ante Kodámade y el 45 los termina) y lleva a los 33 pasos que usan esa instrucción.
- ✅ **Arte real del juego**: cada paso muestra el sprite de su recompensa o del jefe que exige (ver abajo).
- ✅ **Objetos necesarios**: la lista de torrentearcano, paso a paso, como un inventario del juego. La franja **Pronto** reúne lo que piden tus próximos 5 pasos (más los prerrequisitos mientras falte alguno; de cada objeto, solo lo que pide un prerrequisito sin completar) con la cantidad justa para ellos, ordenado por paso: prerrequisitos, 1, 2, 3…; el resto queda en "Más adelante". Al completar un paso, la franja avanza al siguiente. Arriba a la derecha, la etiqueta de cada paso se marca con ✓ cuando todo lo suyo está reunido, y se atenúa si no pide nada. Marcar algo en Pronto marca solo esa parte. "Pronto" y "Más adelante" muestran solo lo que queda por gastar: una parte se da por gastada al hacer su paso o al completar el prerrequisito que la pide. Con "Solo pasos pendientes" apagado, debajo aparece "Ya utilizados", con la cantidad que se gastó de cada objeto; uno gastado a medias sale en las dos, cada una con su cantidad. Se puede ordenar por cantidad o de la A a la Z, filtrar por categoría y buscar sin tildes (atajo `/`). Hay vista de cuadrícula y de lista: en la cuadrícula la búsqueda resalta en vez de esconder y sube las coincidencias al principio de cada franja; la lista se pagina (10, 25, 50, 100 o todo, sin tocar Pronto) y la búsqueda filtra. Un objeto deja de hacer falta al completar todos los pasos que lo piden o al marcarlo. El icono de copiar de cada casilla (o mantenerla pulsada en móvil) copia su nombre para buscarlo en el mercadillo.
- ✅ **Overlay**: una ventana compacta que se queda encima del juego y te lleva objetivo a objetivo por las misiones del paso, con mapa y coordenadas. Ver abajo.
- ✅ **Misiones por paso**: el detalle de cada paso lista sus misiones con el NPC inicial, el nivel y todos los objetivos.  Van en el orden de los objetivos del logro (contando los que no son misiones, para que "misión 7" sea la séptima del logro), y si un paso cita varios logros, en el orden en que los nombra la guía. Los avisos solo añaden misiones si las citan por número o dicen que el paso "incluye" el logro: nombrar otro logro de pasada no mete sus misiones. Lo que el paso "incluye" son sus requisitos, así que va primero. El objetivo de "Un ciudadano modelo" que cumple la misión de cualquier clase sale como una sola fila, "Misión de clase", enlazada a la página de Torrente Arcano que da la de cada clase.
- ✅ **Iconos en prerrequisitos**: oficios y hechizos con su icono del juego. Lo que pide misiones concretas, aunque sean de un logro, lleva la «!» de misión; lo que pide un logro completo, el librito con trofeo. Lo opcional lleva una etiqueta azul y el borde discontinuo. Los logros previos con guía en Torrente Arcano (El gran Guarrok, Turbera maldita, Altos vuelos, Pan Koko Mío, Frío al cubo y Ángeles y demonios) la enlazan con "Guía ↗": la del logro, aunque el prerrequisito pida solo algunas de sus misiones. Los que son una misión suelta enlazan la de la misión (El despertar de Pandala, Intrusión en el territorio wabbit); El cementerio primitivo no tiene guía en Torrente Arcano. El enlace va encima de la esquina de la tarjeta y no dentro, porque la tarjeta es el botón que la marca.
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
python3 -I .build/build_weights.py     # escribe src/data/weights.json: el peso de cada paso en el porcentaje
python3 -I .build/build_figures.py     # escribe src/data/figures.json: mapa de inicio y figura del estandarte por paso
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

1. **El nivel mide la dificultad, no el tiempo**. El peso de un paso sale del nivel de sus misiones, no de lo que se tarda: una misión de nivel 200 de hablar con dos PNJ pesa igual que una de nivel 200 con tres mazmorras. Es una aproximación objetiva y reproducible, no una medida exacta del esfuerzo.

2. **El progreso vive en localStorage** — sin sync a servidor / cuenta de usuario.

3. **El emparejamiento de assets es automático**. Un paso puede mostrar el icono de una
   recompensa secundaria en vez de la que tú esperarías, porque el script toma el primer
   logro del texto que entrega un ítem. Los jefes se detectan por nombre propio en
   mayúscula, lo que descarta falsos positivos como "la guerra interminable" pero
   dependería de que Sandglass siga escribiéndolos así. Revisar
   `.build/data/step_assets.json` para auditar cualquier paso.

4. **Los datos vienen de DofusDB**, un servicio de terceros. Las imágenes ya están
   copiadas en `public/img/`, así que la página no depende de él para funcionar; solo para
   regenerar los datos.

5. **Los mapas del overlay dependen de DofusDB**. Iconos y objetos están en `public/img/`, pero los
   mapas se enlazan desde su CDN por tamaño.

6. **La sintaxis de `/travel` no está verificada en el juego**. La única referencia que
   encontré es una extensión para dofus-map.com que copia `/travel` seguido de dos
   coordenadas. Si el juego espera otro formato, se cambia en `copyTravel()`.

7. **Las misiones de alineamiento salen del criterio de inicio**, no de un listado oficial.
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
    ├── build_weights.py      ← peso de cada paso para el porcentaje, por el nivel de sus misiones
    ├── build_figures.py      ← mapa de inicio y figura del estandarte de cada paso
    ├── build_resources.py    ← objetos de cada paso desde la lista de torrentearcano
    ├── lists/                ← datos importados de torrentearcano y su compilado
    ├── steps.js
    └── data/                 ← datos crudos y cachés de la API (gitignored)
```

## Créditos

- **Guía original de los 100 pasos**: Sandglass — autoridad de la comunidad hispana de Dofus
- **Sistema actual de checklist en torrentearcano.com**: el dueño del sitio
- **Rediseño del scoring + UI**: este proyecto
- **Datos y arte del juego**: [DofusDB](https://dofusdb.fr)

Dofus es una marca de Ankama. Esta es una herramienta no oficial hecha por y para la comunidad.
