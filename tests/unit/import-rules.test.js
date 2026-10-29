// Las fronteras entre carpetas de src/: los embebidos (src/embeds/) y las herramientas
// (src/tools/) van solos a páginas ajenas, así que nunca cargan nada del sitio (src/site/), y
// una herramienta tampoco carga un embebido. El sitio usa las herramientas, nunca un embebido. Mientras esas carpetas no existan pasa sin más;
// la prueba con archivos de mentira demuestra que la regla sí muerde.
// Run: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

// import x from "y", import "y", export … from "y" e import("y")
const SPEC = /\b(?:import|export)\b\s*(?:[^"'`;]*?\bfrom\s*)?["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

/** Los especificadores que importa `source`. */
const specifiers = source => [...source.matchAll(SPEC)].map(m => m[1] ?? m[2]);

// Desde dónde (prefijo de la ruta) no se puede cargar qué
const RULES = [
  { from: "src/embeds/", banned: "src/site/" },
  { from: "src/tools/", banned: "src/site/" },
  { from: "src/tools/", banned: "src/embeds/" },
  { from: "src/site/", banned: "src/embeds/" },
];

/**
 * Las importaciones que rompen las reglas. `files`: [{ file, source }] con rutas relativas a
 * la raíz del repo, con "/". Solo se resuelven las relativas: los paquetes no son de src/.
 */
function violations(files) {
  const out = [];
  for (const { file, source } of files) {
    for (const spec of specifiers(source)) {
      if (!spec.startsWith(".")) continue;
      const target = path.posix.join(path.posix.dirname(file), spec.split("?")[0]);
      for (const { from, banned } of RULES) {
        if (file.startsWith(from) && (target + "/").startsWith(banned)) out.push(`${file} → ${spec}`);
      }
    }
  }
  return out;
}

const sourcesUnder = dir => fs.readdirSync(path.join(ROOT, dir), { recursive: true })
  .filter(f => /\.(js|jsx|mjs)$/.test(f))
  .map(f => {
    const file = path.posix.join(dir, f.split(path.sep).join("/"));
    return { file, source: fs.readFileSync(path.join(ROOT, file), "utf8") };
  });

test("la regla muerde: un embebido o una herramienta que carga lo que no debe", () => {
  const files = [
    // Mal: del sitio a un embebido, en sus tres formas
    { file: "src/embeds/hub/embed.js", source: 'import { shell } from "../../site/shell.js";' },
    { file: "src/tools/cosecha/embed.js", source: 'export * from "../../site";\nconst m = import("../../embeds/hub/hub.js");' },
    // Mal: el sitio cargando un embebido en vez de la herramienta
    { file: "src/site/cosecha/main.js", source: 'import "../../embeds/cosecha/embed.js";' },
    // Bien: lo compartido, un paquete, su propio CSS y del sitio hacia una herramienta
    { file: "src/embeds/hub/hub.js", source: 'import css from "./hub.css?inline";\nimport { pageFonts } from "../../lib/fonts.js";\nimport { motion } from "motion";' },
    { file: "src/site/cosecha/main.js", source: 'import { renderCosecha } from "../../tools/cosecha/cosecha.js";' },
    // Un nombre que solo empieza igual no es la carpeta
    { file: "src/embeds/inicio/inicio.js", source: 'import x from "../../site-data/x.js";' },
  ];
  assert.deepEqual(violations(files), [
    "src/embeds/hub/embed.js → ../../site/shell.js",
    "src/tools/cosecha/embed.js → ../../site",
    "src/tools/cosecha/embed.js → ../../embeds/hub/hub.js",
    "src/site/cosecha/main.js → ../../embeds/cosecha/embed.js",
  ]);
});

test("se leen las importaciones de varias líneas y las de efecto", () => {
  assert.deepEqual(specifiers('import {\n  a,\n  b,\n} from "./a.js";\nimport "./b.css";\nexport { c } from "./c.js";\nexport const d = "x";'), ["./a.js", "./b.css", "./c.js"]);
});

test("en src/ nadie cruza las fronteras", () => {
  const files = sourcesUnder("src");
  assert.ok(files.length > 0);
  assert.deepEqual(violations(files), []);
});
