// Qué suites con navegador corre la CI según los archivos que cambia un PR. La carpeta dice
// qué puede romperse: un embebido propio no toca la app, las pruebas de una suite solo
// corren esa suite. Gana la primera regla que encaja; lo que no encaja en ninguna (lo
// compartido, la configuración, una carpeta nueva) lo corre todo. Las unitarias corren
// siempre, así que no salen aquí.
//
// En la CI (job "Qué cambia"): git diff --name-only … | node .github/ci-paths.mjs
// escribe e2e=…, embed=… y hielos=… para $GITHUB_OUTPUT. Sus pruebas: tests/unit/ci-paths.test.js

import { pathToFileURL } from "node:url";

const RULES = [
  // Documentación
  { match: /\.md$|^docs\/|^LICENSE$/, run: [] },
  // El pipeline de datos y las unitarias: solo las unitarias
  { match: /^\.build\/|^tests\/unit\//, run: [] },
  // Los embebidos propios (hub, inicio, cosecha), sus vistas previas y sus imágenes
  { match: /^src\/embeds\/|^tests\/embed\/|^public\/checklists\/|^public\/cosecha\/|^public\/img\/(hub|inicio|cosecha)\//, run: ["embed"] },
  { match: /^src\/tools\/cosecha\//, run: ["embed"] },
  // La app del checklist: el sitio del Silvestre, el del Hielos y su embebido
  { match: /^src\/tools\/checklist\//, run: ["e2e", "hielos", "embed"] },
  { match: /^src\/site\/|^index\.html$/, run: ["e2e", "hielos"] },
  { match: /^tests\/e2e\//, run: ["e2e"] },
  { match: /^tests\/hielos\//, run: ["hielos"] },
  // Los datos de cada Dofus: su sitio y el embebido (que monta los dos)
  { match: /^src\/dofus\/silvestre\//, run: ["e2e", "embed"] },
  { match: /^src\/dofus\/hielos\//, run: ["hielos", "embed"] },
];

export const SUITES = ["e2e", "embed", "hielos"];

/** Las suites que corren para estos archivos: { e2e, embed, hielos }. */
export function suites(files) {
  const on = new Set();
  for (const file of files) {
    const rule = RULES.find(r => r.match.test(file));
    for (const s of rule ? rule.run : SUITES) on.add(s);
  }
  return Object.fromEntries(SUITES.map(s => [s, on.has(s)]));
}

// Como script: los archivos por la entrada estándar, uno por línea
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const files = input.split("\n").map(f => f.trim()).filter(Boolean);
  for (const [s, on] of Object.entries(suites(files))) console.log(`${s}=${on}`);
}
