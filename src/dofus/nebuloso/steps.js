// ============================================================================
// DATASET — 26 pasos verbatim de la guía del Dofus Nebuloso de Torrente Arcano
// ============================================================================
export const STEPS = [
  { n: 1, zone: "Llanuras de Cania", effort: "medio", text: "Logro \"De un mundo a otro\". Completo.", complete: true },
  { n: 2, zone: "Llanuras de Cania", effort: "medio", text: "Logro \"A las puertas de la noche\". Completo.", complete: true },
  { n: 3, zone: "Llanuras de Cania", effort: "medio", text: "Logro \"Generaciones futuras\". Completo.", complete: true },
  { n: 4, zone: "Llanuras de Cania", effort: "largo", text: "Logro \"Las apariencias engañan\". Completo. Dependiendo de tu nivel, la primera misión te pedirá pasar una mazmorra u otra.", complete: true },
  { n: 5, zone: "Anutropía", effort: "medio", text: "Empezamos Anutropía. Logro \"Favores encadenados\". Completo.", complete: true },
  { n: 6, zone: "Anutropía", effort: "largo", text: "Logro \"El perforar se va a acabar\". Completo.", complete: true },
  { n: 7, zone: "Anutropía", effort: "corto", text: "Logro \"El alegre retirado\", misión 2: Muestreo. Avanza hasta que te pida entregar muestras de sangre. Así podrás avanzar esta misión pasivamente.", base: "Logro \"El alegre retirado\", misión 2: Muestreo. Así podrás avanzar esta misión pasivamente.", marks: [["stop", "Avanza hasta que te pida entregar muestras de sangre."]] },
  { n: 8, zone: "Anutropía", effort: "medio", text: "Logro \"El rey y yo\", misión 4: Anutrof salve al rey. Avanza hasta tener que pasar la mazmorra del Rey Nidas.", base: "Logro \"El rey y yo\", misión 4: Anutrof salve al rey.", marks: [["stop", "Avanza hasta tener que pasar la mazmorra del Rey Nidas."]] },
  { n: 9, zone: "Anutropía", effort: "medio", text: "Logro \"El rey y yo\", misión 6: El barbero de Anutropía. Avanza hasta tener que pasar la mazmorra del Rey Nidas. Pasa la mazmorra y completa las etapas 8 y 9.", base: "Logro \"El rey y yo\", misión 6: El barbero de Anutropía.", marks: [["stop", "Avanza hasta tener que pasar la mazmorra del Rey Nidas."], ["done", "Pasa la mazmorra y completa las etapas 8 y 9."]], closes: [8] },
  { n: 10, zone: "Anutropía", effort: "largo", text: "Logro \"El rey y yo\". Completo.", complete: true },
  { n: 11, zone: "Anutropía", effort: "medio", text: "Logro \"El alegre retirado\". Completo. Se termina pasivamente la etapa 7.", complete: true, base: "Logro \"El alegre retirado\".", marks: [["done", "Se termina pasivamente la etapa 7."]], closes: [7] },
  { n: 12, zone: "Anutropía", effort: "trivial", text: "Misión: Hablar con el dios Anutrof." },
  { n: 13, zone: "Sramvil", effort: "medio", text: "Pasamos a Sramvil. Logro \"Salvado por la campana\". Completo.", complete: true },
  { n: 14, zone: "Sramvil", effort: "corto", text: "Logro \"Escupe tu veneno\", misión 2: Ponzoña que ponzoña. Avanza hasta que te pida entregar Jugo tóxico de necrótico. Así podrás avanzar esta misión pasivamente.", base: "Logro \"Escupe tu veneno\", misión 2: Ponzoña que ponzoña. Así podrás avanzar esta misión pasivamente.", marks: [["stop", "Avanza hasta que te pida entregar Jugo tóxico de necrótico."]] },
  { n: 15, zone: "Sramvil", effort: "largo", text: "Logro \"Escupe tu veneno\". Completo. Se termina pasivamente la misión iniciada en la etapa 14.", complete: true, base: "Logro \"Escupe tu veneno\".", marks: [["done", "Se termina pasivamente la misión iniciada en la etapa 14."]], closes: [14] },
  { n: 16, zone: "Sramvil", effort: "largo", text: "Logro \"El juego del trono\". Completo.", complete: true },
  { n: 17, zone: "Sramvil", effort: "largo", text: "Logro \"Ladrones de Sramvil\". Completo.", complete: true },
  { n: 18, zone: "Sramvil", effort: "trivial", text: "Misión: Hablar con el dios Sram." },
  { n: 19, zone: "Xelorium", effort: "medio", text: "Vamos a Xelorium. Logro \"Los tiempos que corren\". Completo.", complete: true },
  { n: 20, zone: "Xelorium", effort: "corto", text: "Logro \"Carpe diem\", misión 1: Los ladrones de colores. Avanza hasta que te pida entregar krosmorbes. Así podrás avanzar esta misión pasivamente.", base: "Logro \"Carpe diem\", misión 1: Los ladrones de colores. Así podrás avanzar esta misión pasivamente.", marks: [["stop", "Avanza hasta que te pida entregar krosmorbes."]] },
  { n: 21, zone: "Xelorium", effort: "largo", text: "Logro \"Carpe diem\". Completo. Se termina pasivamente la etapa 20.", complete: true, base: "Logro \"Carpe diem\".", marks: [["done", "Se termina pasivamente la etapa 20."]], closes: [20] },
  { n: 22, zone: "Xelorium", effort: "medio", text: "Logro \"El pozo del loco\", misión 4: La verdad está oculta en un pozo. Avanza hasta tener que pasar la mazmorra de Vórtex.", base: "Logro \"El pozo del loco\", misión 4: La verdad está oculta en un pozo.", marks: [["stop", "Avanza hasta tener que pasar la mazmorra de Vórtex."]] },
  { n: 23, zone: "Xelorium", effort: "medio", text: "Logro \"El pozo del loco\", misión 5: Las arenas del tiempo. Avanza hasta tener que pasar la mazmorra de Vórtex. Pasa la mazmorra y termina las etapas 22 y 23.", base: "Logro \"El pozo del loco\", misión 5: Las arenas del tiempo.", marks: [["stop", "Avanza hasta tener que pasar la mazmorra de Vórtex."], ["done", "Pasa la mazmorra y termina las etapas 22 y 23."]], closes: [22] },
  { n: 24, zone: "Xelorium", effort: "largo", text: "Logro \"Idas y venidas\". Completo.", complete: true },
  { n: 25, zone: "Xelorium", effort: "trivial", text: "Misión: Hablar con el dios Xelor." },
  { n: 26, zone: "Xelorium", effort: "largo", text: "Logro \"El sueño de otro mundo\", misión: En busca del pájaro del tiempo." },
];
// Paso nuevo -> pasos de la versión anterior de la guía (previousStepsByNewStep
// de torrentearcano). Sirve para migrar el progreso guardado.
export const PREVIOUS_STEPS = [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13], [14], [15], [16], [17], [18], [19], [20], [21], [22], [23], [24], [25], [26]];

// Sin resaltados, el texto base es el texto entero
for (const step of STEPS) step.base ??= step.text;

// ============================================================================

// PREREQUISITOS
export const PREREQS_INTRO = "Esta checklist incluye también las misiones para conseguir el Dofus de los Vigilantes, obligatorio para obtener el Dofus Nebuloso. Nivel recomendado: 180 o superior. Algunas misiones son sencillas, pero otras pueden requerir aliados o paciencia.";

// Mismo orden que la guía; los ids no cambian porque son la clave del progreso guardado.
// "Requisitos obligatorios" y la recomendación de los portales, de la introducción de la página
export const PREREQS_LOGROS = [
  { id: "l1", text: "Más de 3 000 puntos de logro en el personaje (obligatorio)" },
  { id: "l2", text: "Búsquedas de los portales de Anutropía, Sramvil y Xelorium (no obligatorio, para desplazarse con mayor fluidez)" },
];

// Sin recomendación aparte (la del Dofus Ocre es del Silvestre): sin paso ni texto
export const OCRE_STEP = null;
export const PREREQS_OCRE = "";

// "Tener cualquier oficio al nivel 200"
export const PREREQS_OFICIOS = [
  { id: "o1", text: "Cualquier oficio nivel 200 (obligatorio)" },
];

export const PREREQS_HECHIZOS = [
  { id: "h1", text: "Captura de almas (obligatorio)" },
];

export const ALL_PREREQS = [...PREREQS_LOGROS, ...PREREQS_OFICIOS, ...PREREQS_HECHIZOS];
export const ZONES = [...new Set(STEPS.map(s => s.zone))];

// Color por zona (HSL distribuido)
export const ZONE_COLOR = {};
ZONES.forEach((z, i) => {
  const hue = Math.round((i / ZONES.length) * 360);
  ZONE_COLOR[z] = `hsl(${hue}, 34%, 54%)`;
});
