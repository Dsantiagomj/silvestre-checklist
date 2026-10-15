// ---------------------------------------------------------------------------
// Enlaces a las guías de Torrente Arcano (.build/import_guide_links.py) y a
// otros pasos mencionados en el texto ("véase el inciso 78")
// ---------------------------------------------------------------------------
import GUIDES from "../data/guides.json";

const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const byName = obj => new Map(Object.entries(obj).map(([k, v]) => [norm(k), v]));
const MISSIONS = byName(GUIDES.missions);
const ACHIEVEMENTS = byName(GUIDES.achievements);
// Las misiones que solo salen en la lista del diario: se enlazan allí, no en el texto
const QUESTS = byName(GUIDES.quests || {});
// Los nombres largos primero: "Ocre de ámbar" antes que una misión que lo contenga
const NAMES = [...Object.entries(GUIDES.missions), ...Object.entries(GUIDES.achievements)]
  .sort((a, b) => b[0].length - a[0].length);
// "inciso 78", "incisos 5 y 22" y, en las notas escritas a mano, "paso 66"
const INCISOS = /\b(?:incisos?|pasos?)\s+(\d+(?:\s*(?:,|y)\s*\d+)*)/gi;

export const missionGuide = name => MISSIONS.get(norm(name)) || QUESTS.get(norm(name)) || null;
export const achievementGuide = name => ACHIEVEMENTS.get(norm(name)) || null;

/**
 * Parte un texto de la guía en trozos: texto suelto, nombres con guía ({ href })
 * y números de inciso ({ step }). Los trozos no se solapan.
 */
export function linkify(text) {
  const marks = [];
  const free = (from, to) => marks.every(m => to <= m.from || from >= m.to);
  for (const [name, href] of NAMES) {
    for (let i = text.indexOf(name); i >= 0; i = text.indexOf(name, i + name.length)) {
      if (free(i, i + name.length)) marks.push({ from: i, to: i + name.length, href });
    }
  }
  for (const m of text.matchAll(INCISOS)) {
    const start = m.index + m[0].indexOf(m[1]);
    for (const d of m[1].matchAll(/\d+/g)) {
      const from = start + d.index;
      if (free(from, from + d[0].length)) marks.push({ from, to: from + d[0].length, step: Number(d[0]) });
    }
  }
  marks.sort((a, b) => a.from - b.from);
  const out = [];
  let at = 0;
  for (const m of marks) {
    if (m.from > at) out.push({ t: text.slice(at, m.from) });
    out.push({ ...m, t: text.slice(m.from, m.to) });
    at = m.to;
  }
  if (at < text.length) out.push({ t: text.slice(at) });
  return out;
}
