// ============================================================================
// EL DOFUS DE ESTE CHECKLIST — todo lo que la app dice o guarda propio del Silvestre.
// El Dofus se elige al construir (DOFUS=silvestre, por defecto): vite.config.js apunta el
// alias @dofus a src/dofus/<id>/, donde están este archivo y los datos generados por
// .build/ (steps.js, *.json). Sin imports: vite.config.js también lo lee.
// ============================================================================

const LEFT = "La guía no la retoma: para el Silvestre basta con llegar hasta aquí.";

export default {
  id: "silvestre",
  // El nombre del Dofus, entero y la parte que se resalta en el título del hero
  name: "Dofus Silvestre",
  short: "Silvestre",

  // index.html: el título de la pestaña, la descripción y el comentario sobre el favicon
  html: {
    title: "Dofus Silvestre · Checklist",
    description: "Checklist del Dofus Silvestre — guía de Sandglass con sistema de progreso ponderado por esfuerzo.",
    iconNote: "El huevo del Dofus Silvestre (DofusDB, objeto 23036), el mismo de la marca",
  },

  texts: {
    // El título de la página: «Checklist del Dofus» + el nombre corto resaltado
    title: "Checklist del Dofus Silvestre",
    titleLead: "Checklist del Dofus",
    // El hero con la guía terminada
    heroEyebrow: "Guía de Sandglass",
    heroSub: "Los 100 pasos para obtener el Dofus Silvestre en el orden más eficiente, con las misiones, jefes de mazmorra y objetos que vas a necesitar.",
    // El título (para lectores de pantalla) de la ventana de pasos
    stepsTitle: "Los 100 pasos",
    // El pie: quién escribió la guía
    footerLead: "Guía original de los 100 pasos por",
    author: "Sandglass",
    // Bajo el detalle del paso
    assetNote: "Texto de Sandglass · resaltados de Torrente Arcano · imágenes vía DofusDB",
    // El título de la ventana del overlay (popup)
    overlayTitle: "Silvestre · Overlay",
  },

  // localStorage: las claves de la app empiezan por aquí. El checklist clásico de Torrente
  // Arcano (solo se lee): su versión actual y la anterior de la guía
  storagePrefix: "silvestre:",
  classicKeys: { v4: "dofus_silvestre_clean_v4", v3: "dofus_silvestre_clean_v3" },
  // Versión de la guía de Sandglass con la que se numeran los pasos guardados
  guideVersion: 4,

  // La copia de seguridad: el id que la marca como de este checklist y el nombre del archivo
  backup: { app: "silvestre-checklist", file: "silvestre-progreso" },

  // El nombre de la ventana popup del overlay
  overlayWindow: "silvestre-overlay",

  // El embebido (src/embed.jsx): el <div> de la página que lo aloja, la variable CSS con lo
  // que tapa la cabecera fija de la página, el data-* de la hoja de fuentes y el nombre en
  // los errores de consola
  embed: { hostId: "silvestre-root", topVar: "--silvestre-top", fonts: "silvestre-fonts", logName: "Checklist Silvestre" },

  // Dónde se construye (vite.config.js), relativo a dist/: el sitio en la raíz y el embebido
  build: {
    outDir: "",
    embed: { entry: "embed/silvestre.js", chunks: "embed/chunks", assets: "embed/assets" },
  },

  // El huevo del hero y de la barra: apagado hasta el final; con `pre` hecho, el Dofus que
  // da ese paso (la Piñata de pino, que se convierte en el Silvestre); con `final`, encendido
  egg: { pre: 99, final: 100 },
  // Los Dofus del camino cuyo nombre es femenino: «¡Piñata de pino obtenida!»
  feminine: /^Piñata/,

  // La recomendación de Sandglass sobre los prerrequisitos (el Dofus Ocre): la misión que
  // lo da y el logro con el que la guía la termina en OCRE_STEP (steps.js). null, sin ella
  prereqNote: {
    title: "Empieza el Dofus Ocre cuanto antes",
    quest: "La eterna cosecha",
    achievement: "El fin de la eternidad",
  },

  // La nota aclaratoria («Hasta tener que pasar X»), con un ejemplo real: los pasos 43 y 44
  // se detienen ante Kodámade; el 45 pasa la mazmorra y "se terminan las misiones de los
  // incisos 43, 44 y 45". Cuándo pasa el punto por cada casilla en pausa y la deja marcada
  // (s) y cuándo se marca cada casilla (s): primero el 45 al vencer al jefe, luego hacia atrás
  nota: {
    paused: [43, 44],
    closer: 45,
    pauseAt: { 43: 0.5, 44: 1.2 },
    checkAt: { 45: 3.6, 44: 4.3, 43: 5.0 },
  },

  journal: {
    /**
     * Notas escritas a mano, para lo que la guía no dice. En el 64, por qué se llega hasta
     * la cerveza fuerte (STOP_AT) y no solo hasta la taberna. En el 87, por qué termina la
     * misión del 73 (closes a mano en import_guide.py).
     */
    extraNotes: {
      64: "Para empezar la misión 2, «Dos alientos, una inspiración» (paso 66), hay que llegar hasta entregarle"
        + " la cerveza fuerte a Pandawelo. «De la mano» se termina en el paso 67, con el logro completo.",
      87: "Sus dos misiones piden tener tomada «Toma de conciencia», que se hace en el paso 91, y esta pide"
        + " terminada «Las cuatro voluntades», que el paso 73 deja a medias: se termina aquí. Las dos misiones"
        + " se hacen de una en una.",
    },
    /**
     * Notas escritas a mano dentro de una misión del paso: paso -> { id de la misión: texto }.
     * Van con las de missionNotes. En el 38, «La sombra del reino»: el rojo dice que se puede
     * lanzar en la misión 3 y hacer en cualquier punto hasta antes del inciso 80.
     */
    questNotes: {
      38: { 1665: "Se puede hacer en cualquier momento antes del paso 80." },
      // Misiones que la guía deja a medias y no retoma. Ninguna misión ni logro que pide la guía
      // las necesita terminadas (startCriterion Qf= en DofusDB, logros completos): «Birk, hija
      // de Bork» solo pide «El daño de Búril» a medias (Torrente Arcano)
      13: { 1869: LEFT },
      15: { 1736: LEFT },
      83: { 2011: LEFT },
    },
    /**
     * Misión opcional -> paso que la termina sin cerrar el suyo. Nota del 93: «Con los cuatro
     * sacrificios dropeados, se termina la misión opcional del inciso 7»: «Arma letal». El 7
     * se hace sin ella (import_guide.py no lo cuenta como cierre).
     */
    optionalDoneBy: { 1939: 93 },
    // Paradas que el texto no permite situar: ningún objetivo nombra al jefe o la zona.
    // Paso -> [misión, comienzo del objetivo que va justo después de la parada] (o varias
    // si el paso para en más de una misión), sacado de la guía de esa misión en Torrente
    // Arcano y contrastado con los objetivos de DofusDB. Un tercer elemento, { later, text },
    // es una misión madre que espera a una hija de otro paso: la parada sigue en rojo aunque
    // el paso se resuelva en sí mismo, con su propio texto si lo lleva, y no la termina el
    // paso que cierra este sino uno posterior que lleva la misión (closingPlan en store.js)
    stopAt: {
      // "te pedirá dropear 1 x sacrificio de 4 zonas diferentes"
      7: [["Arma letal", "Sacrifica a armadutinados para la muñeca de necrónix"]],
      // Hasta hablar con Volkaragnar (los pasos 41 y 83 piden la fragua a medias)
      13: [["El daño de Búril", "Habla con un amigo de Brumen"]],
      // "debes salir del submarino. Hay un selotrop… El combate…"
      15: [["Su nombre es Ninguno", "Ve a ver a Desconocido al acecho"]],
      // "tienes que pasar toda la mazmorra del Morsagüino Real"
      25: [["Los cazadores", "Registra la caverna en busca de Gerard"]],
      // La leleche cae de las mamagüinas del bosque de los pinos perdidos
      26: [["El recadero", "Encuentra y lleva a Mac Friguer 4 unidades de leleche de mamagüina"]],
      // Los pelos de kaniglú para las herramientas y las mamagüinas, luchando en la zona
      27: [["Star ski y Dutch", "Entrégale a Ross Iñol: 1 x Cepillo para encerar"],
        ["La marcha de la emperatriz", "Entrégale a Ken Tucky: 1 x Mamagüina"]],
      // "Lo único que te faltaría, serían las 50 x Grasa de güino… luchando contra los pingüinos"
      28: [["Pesca en aguas congeladas", "Entrégale a Damar: 50 x Grasa de güino"]],
      // "te pide vencer tanto al Dragocerdo como al Roble Blando": el Roble queda pendiente
      32: [["Dragones y chapuzonas", "Vence a 1 x Roble Blando en un solo combate"]],
      // "tendrás que realizar la mazmorra hasta el final"
      36: [["Venganza por procuración", "Arráncale la abrakllota ancestral al Abráknido Ancestral"]],
      // "vencer a 7 x Monstruos de cada tipo de la zona de la Cuna de Alma". Después, la
      // bendición de Viti la da «La bendición de Viti» (Qa=1657&Qo>10011), del paso 39 (la
      // termina el 48); la guía no la retoma hasta el 62, con el logro completo
      38: [["La bruja mala del Este", "Vence 7 x Harpirata"],
        ["La bruja mala del Este", "Obtén la bendición de Viti",
          { later: true, text: "Hasta obtener la bendición de Viti: la da «La bendición de Viti», en el paso 39" }]],
      // Las mazmorras con ídolo, en cualquier orden: falta Funoroshi para volver al discípulo
      // Funoroshi queda para el 48: va el último de los tres combates (OBJECTIVE_ORDER)
      39: [["La bendición de Viti", "Vence a 1 x Funoroshi"]],
      // "con hacer una 'run' entera es suficiente"
      41: [["Hasta el final del sueño", "Progresa si es necesario y explora el pozo hasta encontrar el primer sueño"]],
      // Las esporas y el mildiu caen de los monstruos de Plantala
      43: [["El sauce del paseante", "Entrégale a Surivitna: 5 x Esporas soporíferas"],
        ["Inmunda putrefacción", "Entrégale a Fhang: 20 x Mildiu de Pandala"]],
      // "tienes que entrar a la mazmorra y llegar a la sala 4"
      47: [["Una nueva lección que enseñar", "Descubre el mapa: Trastero del Taller de Tanukui San"]],
      // "Se pasa Roca negra, Obsidiantre y Kimbo…, quedando pendiente Sfinter cell": Sfinter
      // Cell va el último de los cuatro combates (OBJECTIVE_ORDER)
      50: [["La bendición de Thomahon", "Vence a 1 x Sfinter Cell"]],
      // "lo primero que tienes que hacer es pasar la mazmorra Sfinter Cell para dropear una Bandana"
      51: [["Objetivo: Bandana", "Encuentra la bandana de Tugtora"]],
      // La pócima sale de terminar "El S.L.I.P. está que arde"
      52: [["Almacén de avituallamiento", "Enséñale a Asselo: 1 x Pócima del S.L.I.P."]],
      // "Hasta tener que pasar Kumijo": el combate es demostrarle tu fuerza a la kitsu, no el
      // trato de después
      54: [["Cuando se caldean las ánimas", "Capta la atención de la kitsu de nueve colas"]],
      // "Se pasa Perfósil…, dejando pendiente Kanigrula y Cil": van tras Perfósil
      58: [["La bendición de Foluk", "Vence a 1 x Kanígrula"]],
      // "tienes que pasar la mazmorra de Kanígrula y vencer a la jefa"
      59: [["La triquiñuela del cuerno", "Consigue grasa mamaria de kanig"]],
      // "Hasta tener que pasar Cil": el combate de la mazmorra, no el mapa de su entrada
      61: [["Un frío que hiela las piedras", "Vence a 1 x Cil"]],
      // "farmear Tejaiss hasta dropear 10 de esos corazones"
      63: [["Misión solución", "Entrégale a Marta Angaha: 10 x Corazón de tejaiss"]],
      // La guía dice "hasta poder entrar en la taberna", pero la misión 2 (paso 66) pide
      // «De la mano» pasada la entrega de la cerveza fuerte (Qo>16993), y esta se bloquea
      // ahí hasta terminar la 2: se para antes de hablar con la diosa
      64: [["De la mano", "Habla con la diosa Pandawa a través de Pandawelo"]],
      // "tienes que dropear 3 x Gota de tinta indeleble" (monstruos del Reino de Papel)
      65: [["Tinta espectacular", "Enséñale a Cigrulla teatral: 3 x Gota de tinta indeleble"]],
      // Los trozos del pergamino caen de los monstruos de tinta y de papel
      68: [["La última muralla", "Encuentra los 3 trozos del pergamino olvidado"]],
      // Los kianzhi caen de los monstruos de Wuking y Wukang
      72: [["Una última voluntad", "Entrégale a Namuna: 1 x Kianzhi de la lanza del wukin"]],
      // "tienes que terminar el logro La guerra interminable" (y los otros tres)
      73: [["Las cuatro voluntades", "Impide que Guerra tome el Krosmoz a sangre y fuego"]],
      // "Debes pasar primero Kimbo… Ahora deberás pasar Roble Blando… Por último… Ugah"
      77: [["Santísimo poder", "Vence a 1 x Roble Blando en un solo combate"]],
      // La orden 4 pide la estatuilla del Templo del Gran Ugah: "vencer al jefe de mazmorra"
      78: [["Aprendizaje: Maestro de los Pergaminos", "Encuentra la estatuilla de Sumens"]],
      // Justo después de vencer a Dazahk y obtener "La biblia de los rencores"
      83: [["Birk, hija de Bork", "Salda varias afrentas de la biblia de los rencores"]],
      // "Hasta tener que pasar Ilyzaelle": su combate, no el mapa de su mirador, que va antes
      85: [["Inclemencias", "Vence a 1 x Ilyzaelle"]],
      // "matar 10 x Monstruos de cada tipo de la zona de Ilyzaelle"
      86: [["La guardia muere, pero no se rinde", "Vence 10 x Ectórrido"]],
      // "tienes que vencer a Ilyzaelle en su mazmorra ya que es la única que suelta ese drop"
      87: [["El juicio de la Muerte", "Entrégale a Maestro Cuerbok: 1 x Fuego devorador"]],
      // "debes recuperar 1 x Sueño de armonía… intensidad Sueño 3 o más"
      90: [["El peso de su mirada", "Arroja un sueño de armonía al pozo demoníaco"]],
      // "debes hacer sueños infinitos hasta dropear 1 x Sueño relajante"
      91: [["Toma de conciencia", "Duerme la desconfianza del guardián"]],
      // "tienes que entregarle a Maimane 6 x Tótems". «Un legado atormentado» no fabrica la
      // runa de armonía sin el tótem del equilibrio, que da «Los tótems de Maimane» al
      // terminarla (en el 93): la termina el 98, con el logro completo
      92: [["Un legado atormentado", "Fabrica 1 Runa de armonía", { later: true }],
        ["Los tótems de Maimane", "Entrégale a Maimane: 1 x Tótem de alegría"]],
      // "El hueso de hierro se consigue venciendo al Maxilubo en su mazmorra"
      10: [["Encender la mecha", "Consigue un hueso de hierro"]],
    },
  },
};
