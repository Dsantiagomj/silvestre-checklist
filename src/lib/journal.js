// ---------------------------------------------------------------------------
// Diario de pasos: lo que la lista y el detalle derivan de la guía
// ---------------------------------------------------------------------------
import { STEPS } from "../data/steps.js";
import { DOFUS_ROAD, OBJ_ICONS, assetsFor } from "./assets.js";
import FIGURES from "../data/figures.json";

/**
 * Título corto del paso: el logro que persigue o, si no hay, el texto base sin
 * punto final ni comillas ("Alineamiento Bontariano: Misión 19").
 */
export function stepTitle(step) {
  const ach = assetsFor(step.n)?.achievements?.[0]?.name;
  if (ach) return ach;
  return step.base.replace(/["«»]/g, "").replace(/\.$/, "");
}

/**
 * Avisos que muestra el detalle. Un paso con verde se resuelve en sí mismo: su rojo
 * no es dónde parar sino dónde se retoma (la línea verde de la ruta), así que no va
 * como aviso; lo que añade tras su primera frase ("Retomar sala 5 como…") queda como nota.
 */
export function stepCalls(step) {
  const marks = step.marks || [];
  if (!resolvesHere(step)) return marks;
  const calls = marks.flatMap(([kind, text]) => {
    if (kind !== "stop") return [[kind, text]];
    const extra = text.match(/^.*?\.\s+(\S[\s\S]*)$/)?.[1];
    return extra ? [["note", extra]] : [];
  });
  // Si lo que se resuelve sigue "hasta tener que pasar X", esa sí es una parada
  const next = followUpStop(step);
  return next ? [...calls, ["stop", next]] : calls;
}

/**
 * La parada que deja el verde: "…y se actualiza la misión 1 del inciso 43 hasta tener
 * que pasar Kodámade." Tras resolver lo del paso, una misión sigue y vuelve a parar.
 */
export function followUpStop(step) {
  const done = step.marks?.find(m => m[0] === "done")?.[1];
  const m = done?.match(/hasta tener que pasar (.+?)\.?$/i);
  return m ? `Hasta tener que pasar ${m[1]}` : null;
}
export const resolvesHere = step => !!step.marks?.some(m => m[0] === "done");
/**
 * El jefe que el paso resuelve: el que nombra su verde ("Se pasa Nelwynn…"), sin
 * contar el que deja pendiente ("…hasta tener que pasar Kodámade"). O null.
 */
export function resolvedBoss(n) {
  const done = STEPS[n - 1]?.marks?.find(m => m[0] === "done")?.[1];
  if (!done) return null;
  const text = norm(done.replace(/hasta tener que pasar .*$/i, ""));
  return assetsFor(n)?.bosses?.find(b => text.includes(norm(b.name))) || null;
}
const ROAD_AT = Object.fromEntries(DOFUS_ROAD.map(d => [d.step, d]));

/**
 * La figura del estandarte del paso: el Dofus que da; si no, la elegida para su logro
 * (el dragón primordial, el jinete, Draconiros, Silvosse) o el PNJ que lo empieza
 * (build_figures.py); y, si no hay nada, el jefe que resuelve.
 */
export function bannerFigure(n) {
  const egg = ROAD_AT[n];
  if (egg) return { img: egg.img, name: egg.name, as: "Se gana", kind: "egg" };
  const f = FIGURES[n]?.f;
  if (f) return { ...f, kind: "figure" };
  const boss = resolvedBoss(n);
  return boss ? { img: boss.img, name: boss.name, as: "Jefe del paso", kind: "boss" } : null;
}

/** El mapa del juego donde empieza la primera misión del paso (id de DofusDB). */
export const startMap = n => FIGURES[n]?.m ?? null;

/** Lo que se resuelve: el jefe que se pasa; sin jefe, la espada del juego. */
export const doneIcon = n => resolvedBoss(n)?.img || OBJ_ICONS.fight;


/** Paso -> paso posterior cuyo combate termina sus misiones (el verde de la guía). */
export const CLOSED_BY = (() => {
  const out = {};
  for (const step of STEPS) for (const n of step.closes || []) out[n] ??= step.n;
  return out;
})();

/** El siguiente pendiente a partir de n; si no queda ninguno después, el primero que quede. */
export function nextPendingAfter(done, n) {
  const after = STEPS.find(st => st.n > n && !done[st.n]);
  return (after || STEPS.find(st => !done[st.n]))?.n ?? null;
}

/** Lo que se muestra en el escenario: el jefe del paso o, si no tiene, su icono. */
export function showcase(n) {
  const a = assetsFor(n);
  const boss = a?.bosses?.[0];
  if (boss) return { img: boss.img, name: boss.name, label: "Jefe del paso" };
  if (a?.icon) return { img: a.icon.src, name: a.icon.label, label: a.icon.from === "item" ? "Recompensa" : "Del paso" };
  return null;
}

const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Dónde cae la parada roja dentro de las misiones: si dice "hasta tener que pasar X",
 * antes del primer objetivo que nombra a X. Devuelve { quest, index, text } con el
 * índice sobre los objetivos aplanados de la misión, o null.
 */
// Paradas que el texto no permite situar: ningún objetivo nombra al jefe o la zona.
// Paso -> [misión, comienzo del objetivo que va justo después de la parada] (o varias
// si el paso para en más de una misión), sacado de la guía de esa misión en Torrente
// Arcano y contrastado con los objetivos de DofusDB
export const STOP_AT = {
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
  // "vencer a 7 x Monstruos de cada tipo de la zona de la Cuna de Alma"
  38: [["La bruja mala del Este", "Vence 7 x Harpirata"]],
  // Las mazmorras con ídolo, en cualquier orden: falta Funoroshi para volver al discípulo
  39: [["La bendición de Viti", "Vuelve a ver a Discípulo de Viti"]],
  // "con hacer una 'run' entera es suficiente"
  41: [["Hasta el final del sueño", "Progresa si es necesario y explora el pozo hasta encontrar el primer sueño"]],
  // Las esporas y el mildiu caen de los monstruos de Plantala
  43: [["El sauce del paseante", "Entrégale a Surivitna: 5 x Esporas soporíferas"],
    ["Inmunda putrefacción", "Entrégale a Fhang: 20 x Mildiu de Pandala"]],
  // "tienes que entrar a la mazmorra y llegar a la sala 4"
  47: [["Una nueva lección que enseñar", "Descubre el mapa: Trastero del Taller de Tanukui San"]],
  // Falta Sfinter cell para volver al discípulo
  50: [["La bendición de Thomahon", "Vuelve a ver a Discípulo de Thomahon"]],
  // "lo primero que tienes que hacer es pasar la mazmorra Sfinter Cell para dropear una Bandana"
  51: [["Objetivo: Bandana", "Encuentra la bandana de Tugtora"]],
  // La pócima sale de terminar "El S.L.I.P. está que arde"
  52: [["Almacén de avituallamiento", "Enséñale a Asselo: 1 x Pócima del S.L.I.P."]],
  // Faltan Kanígrula y Cil para volver al discípulo
  58: [["La bendición de Foluk", "Vuelve a ver a Discípulo de Foluk"]],
  // "tienes que pasar la mazmorra de Kanígrula y vencer a la jefa"
  59: [["La triquiñuela del cuerno", "Consigue grasa mamaria de kanig"]],
  // "farmear Tejaiss hasta dropear 10 de esos corazones"
  63: [["Misión solución", "Entrégale a Marta Angaha: 10 x Corazón de tejaiss"]],
  // Hasta entrar en la Taberna Prohibida, que pide "Tinta espectacular" (paso 65)
  64: [["De la mano", "Ve a ver a Pandawelo para hablar con la diosa Pandawa"]],
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
  // "matar 10 x Monstruos de cada tipo de la zona de Ilyzaelle"
  86: [["La guardia muere, pero no se rinde", "Vence 10 x Ectórrido"]],
  // "tienes que vencer a Ilyzaelle en su mazmorra ya que es la única que suelta ese drop"
  87: [["El juicio de la Muerte", "Entrégale a Maestro Cuerbok: 1 x Fuego devorador"]],
  // "debes recuperar 1 x Sueño de armonía… intensidad Sueño 3 o más"
  90: [["El peso de su mirada", "Arroja un sueño de armonía al pozo demoníaco"]],
  // "debes hacer sueños infinitos hasta dropear 1 x Sueño relajante"
  91: [["Toma de conciencia", "Duerme la desconfianza del guardián"]],
  // "tienes que entregarle a Maimane 6 x Tótems"
  92: [["Los tótems de Maimane", "Entrégale a Maimane: 1 x Tótem de alegría"]],
  // "El hueso de hierro se consigue venciendo al Maxilubo en su mazmorra"
  10: [["Encender la mecha", "Consigue un hueso de hierro"]],
};

/**
 * Dónde caen las paradas rojas dentro de las misiones: las de STOP_AT o, si el rojo dice
 * "hasta tener que pasar X", antes del primer objetivo que nombra a X. Devuelve
 * [{ quest, index, text }] con el índice sobre los objetivos aplanados de la misión.
 */
export function stopPoints(step, quests) {
  const next = followUpStop(step);
  const after = next && stopPoint({ marks: [["stop", next]] }, quests);
  return [...ownStops(step, quests), ...(after ? [{ ...after, followUp: true }] : [])];
}

function ownStops(step, quests) {
  const stops = (step.marks || []).filter(m => m[0] === "stop").map(m => m[1]);
  const at = STOP_AT[step.n];
  if (at && stops.length) {
    const found = at.map(([name, start], i) => {
      const q = quests.find(x => x.n === name);
      const index = q ? q.s.flatMap(stg => stg.o).findIndex(o => o.t.startsWith(start)) : -1;
      return index >= 0 ? { quest: q.id, index, text: stops[Math.min(i, stops.length - 1)] } : null;
    }).filter(Boolean);
    if (found.length) return found;
  }
  const one = stopPoint(step, quests);
  return one ? [one] : [];
}

/** La parada que se deduce del texto del rojo (ver stopPoints). */
export function stopPoint(step, quests) {
  for (const [kind, text] of step.marks || []) {
    if (kind !== "stop") continue;
    // "Hasta tener que pasar X": el objetivo que nombra al jefe. "Hasta que puedas entrar
    // a la mazmorra X": el primero que ocurre dentro (su zona es la mazmorra)
    const boss = text.match(/pasar (?:la mazmorra (?:de )?)?(?:a )?(.+?)(?:\s+con\b|[.,;)]|$)/i);
    const dungeon = !boss && text.match(/entrar a la mazmorra (?:de )?(.+?)(?:[.,;)]|$)/i);
    if (!boss && !dungeon) continue;
    const name = norm((boss || dungeon)[1]);
    // Dentro de la mazmorra: por la zona (el texto puede nombrarla sin estar dentro,
    // como "Llave del Laboratorio de Brumen Tinctorias"). "Pasar la mazmorra X" busca
    // antes en el texto y, si ningún objetivo la nombra, en la zona
    const byText = o => norm(o.t).includes(name);
    const byArea = o => norm(o.a || "").includes(name);
    const tries = dungeon ? [byArea] : /pasar la mazmorra/i.test(text) ? [byText, byArea] : [byText];
    for (const match of tries) {
      for (const q of quests) {
        const index = q.s.flatMap(stg => stg.o).findIndex(match);
        if (index >= 0) return { quest: q.id, index, text };
      }
    }
  }
  return null;
}
