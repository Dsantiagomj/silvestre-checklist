import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { EMBED_OUT, servePages } from "./harness.js";

// El contrato público de los cinco embebidos: lo que ya está pegado en Squarespace y lo que
// guardó la gente en localStorage. Mover carpetas de src/ no puede cambiar nada de esto, así
// que aquí no se importa nada de src/ y lo esperado va escrito a mano, sin leer configs
const ROOT = path.resolve(import.meta.dirname, "../..");
const BASE = "https://dsantiagomj.github.io/silvestre-checklist/";
const SHARED = "dofus-checklists:shared";
const FIXTURES = path.join(import.meta.dirname, "fixtures");
const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const bundle = entry => fs.readFileSync(path.join(EMBED_OUT, entry), "utf8");
// Qué textos de `list` faltan en el bundle (o sobran, con `present = false`): así el fallo
// nombra el texto y no vuelca el bundle entero
const missing = (entry, list, present = true) => { const js = bundle(entry); return list.filter(s => js.includes(s) !== present); };

const EMBEDS = [
  { entry: "embed/silvestre.js", host: "silvestre-root", fonts: "silvestre-fonts", top: "--silvestre-top", page: "squarespace.html", prefix: "silvestre:", classic: ["dofus_silvestre_clean_v4", "dofus_silvestre_clean_v3"] },
  { entry: "embed/hielos.js", host: "hielos-root", fonts: "hielos-fonts", top: "--hielos-top", page: "squarespace-hielos.html", prefix: "hielos:", classic: ["dofus_hielos_clean_v2"] },
  { entry: "embed/checklists.js", host: "checklists-root", fonts: "checklists-fonts", top: "--checklists-h", page: "checklists.html" },
  { entry: "embed/inicio.js", host: "inicio-root", fonts: "inicio-fonts", top: null, page: "inicio.html" },
  { entry: "embed/cosecha.js", host: "cosecha-root", fonts: "cosecha-fonts", top: "--cosecha-top", page: "cosecha.html" },
];

test("la base de los embebidos es la de GitHub Pages, también en las vistas previas", () => {
  expect(read("vite.config.js")).toContain(`"${BASE}"`);
  expect(read("public/checklists/index.html")).toContain(`<div id="checklists-root"></div>\n<script type="module" src="${BASE}embed/checklists.js"></script>`);
  // Cada embebido saca sus trozos e imágenes de ahí
  for (const { entry } of EMBEDS) expect(missing(entry, [BASE]), entry).toEqual([]);
});

test("el build deja cada entrada con su nombre fijo y los trozos de la app en su carpeta", () => {
  for (const { entry } of EMBEDS) expect(fs.statSync(path.join(EMBED_OUT, entry)).isFile(), entry).toBe(true);
  // Solo la app parte su código (quests.json va aparte); el hub, el inicio y la cosecha van
  // en un solo archivo y ninguno saca assets: el CSS va dentro y las imágenes son las de public/
  for (const dir of ["embed/chunks", "embed/hielos-chunks"]) {
    expect(fs.readdirSync(path.join(EMBED_OUT, dir)).filter(f => f.endsWith(".js")).length, dir).toBeGreaterThan(0);
  }
});

test("cada bundle lleva su anfitrión y su marca de fuentes", () => {
  for (const { entry, host, fonts } of EMBEDS) expect(missing(entry, [host, fonts]), entry).toEqual([]);
});

test("las claves de localStorage que ya tiene la gente siguen en los bundles", () => {
  // El clásico solo se lee; la entrada compartida es la misma en los dos checklists
  for (const { entry, classic } of EMBEDS.filter(e => e.classic)) expect(missing(entry, [...classic, SHARED]), entry).toEqual([]);
  expect(missing("embed/cosecha.js", ["cosecha:done", "cosecha:ui", "cosecha:theme"])).toEqual([]);
  // El hub y el inicio no guardan nada
  for (const entry of ["embed/checklists.js", "embed/inicio.js"]) expect(missing(entry, ["localStorage"], false), entry).toEqual([]);
});

// El shell del sitio (su raíz será .dt-shell) no puede colarse en ningún embebido: van
// solos a páginas ajenas. Hoy el shell no existe, así que pasa; vigila las fases siguientes
test("ningún embebido lleva el shell del sitio", () => {
  const files = fs.readdirSync(path.join(EMBED_OUT, "embed"), { recursive: true }).filter(f => f.endsWith(".js"));
  expect(files.length).toBeGreaterThan(EMBEDS.length);
  for (const f of files) expect(missing(path.join("embed", f), ["dt-shell"], false), f).toEqual([]);
});

/** Monta un embebido en su página de prueba (fixtures/) y espera a que pinte su shadow root. */
async function mount(page, { host, page: fixture }) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  const context = page.context();
  await context.route(`${BASE}**`, servePages);
  await context.route("https://www.torrentearcano.com/**", route =>
    route.fulfill({ status: 200, path: path.join(FIXTURES, fixture), headers: { "content-type": "text/html; charset=utf-8" } }));
  await page.goto("https://www.torrentearcano.com/contrato");
  await expect.poll(() => page.locator(`#${host}`).evaluate(el => el.shadowRoot?.childElementCount ?? 0), { timeout: 20_000 }).toBeGreaterThan(1);
  return errors;
}

for (const embed of EMBEDS) {
  test(`${embed.entry} se monta en #${embed.host}: shadow root, fuentes, su variable y sus claves`, async ({ page }) => {
    const errors = await mount(page, embed);
    const host = page.locator(`#${embed.host}`);
    expect(await host.evaluate(el => el.shadowRoot.mode)).toBe("open");
    await expect(page.locator(`head link[rel="stylesheet"][data-${embed.fonts}]`)).toHaveCount(1);
    // Las variables que pone el embebido en su anfitrión; el inicio no pone ninguna
    const vars = await host.evaluate(el => [...el.style].filter(p => p.startsWith("--")));
    expect(vars).toEqual(embed.top ? [embed.top] : []);
    // localStorage al montar: el Silvestre y el Hielos guardan con su prefijo y escriben la
    // entrada compartida cuando llegan sus misiones (van en su propio trozo, después de
    // pintar), así que se espera a que esté. Los demás no guardan nada hasta que se toca algo
    // (las claves de la cosecha van arriba, en su bundle)
    const keys = () => page.evaluate(() => Object.keys(localStorage));
    if (embed.prefix) {
      await expect.poll(keys).toContain(SHARED);
      const own = (await keys()).filter(k => k !== SHARED);
      expect(own.length).toBeGreaterThan(0);
      for (const k of own) expect(k.startsWith(embed.prefix), k).toBe(true);
    } else expect(await keys()).toEqual([]);
    expect(errors).toEqual([]);
  });
}
