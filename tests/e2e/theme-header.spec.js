import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

/** El tema y el reinicio van en el menú «⋯» de la barra de la ventana. */
const openMore = page => page.click("#moreBtn");

test("el interruptor alterna el tema y lo recuerda", async ({ page }) => {
  await openApp(page);
  await openMore(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#themeBtn")).toHaveAttribute("aria-checked", "true");
  await page.click("#themeBtn");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 3_000 });
  await expect(page.locator("#themeBtn")).toHaveAttribute("aria-checked", "false");
  expect(await page.evaluate(() => localStorage.getItem("silvestre:theme"))).toBe("light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("los huevos del interruptor cargan", async ({ page }) => {
  await openApp(page);
  await openMore(page);
  for (const id of ["#tsLight", "#tsDark"]) {
    await expect.poll(() => page.locator(id).evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  }
});

test("los botones de overlay y reinicio usan objetos del juego", async ({ page }) => {
  await openApp(page);
  await openMore(page);
  for (const id of ["#overlayBtn", "#resetBtn"]) {
    const img = page.locator(`${id} img.btn-icon`);
    await expect.poll(() => img.evaluate(el => el.naturalWidth)).toBeGreaterThan(0);
    await expect(img).toHaveAttribute("alt", "");
  }
  await expect(page.locator("#overlayBtn")).toHaveAttribute("aria-label", "Abrir overlay sobre el juego");
  await expect(page.locator("#resetBtn")).toHaveAttribute("aria-label", "Reiniciar progreso");
  // Al pasar el ratón, el reloj de arena se da la vuelta: rotate(180deg) = matrix(-1, 0, 0, -1, …)
  await page.hover("#resetBtn");
  await expect.poll(() => page.locator("#resetBtn img.btn-icon").evaluate(el => getComputedStyle(el).transform))
    .toMatch(/^matrix\(-1, [^,]+, [^,]+, -1/);
});

test("en el tema claro el acento tiene contraste suficiente como relleno y como texto", async ({ page }) => {
  await openApp(page, { "silvestre:theme": "light", "silvestre:done": { 1: true } });
  const ratio = (fg, bg) => page.evaluate(([fg, bg]) => {
    const lum = c => {
      const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
        v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
      });
      return .2126 * r + .7152 * g + .0722 * b;
    };
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    return (a + .05) / (b + .05);
  }, [fg, bg]);
  const style = (sel, prop) => page.locator(sel).first().evaluate((el, p) => getComputedStyle(el)[p], prop);
  // Se mide hasta que los colores se asientan: leerlos a mitad de la transición de tema
  // da un contraste falso. Uno que de verdad no llega a 4.5 sigue fallando.
  const settles = (fg, bg) => expect.poll(async () => ratio(await fg(), await bg()), { timeout: 3_000 })
    .toBeGreaterThanOrEqual(4.5);

  // Pantalla alta: botones principales (texto sobre el relleno del acento), el acento
  // como texto sobre la página y el porcentaje de la franja sobre su panel
  await settles(() => style("#overlayBtn", "color"), () => style("#overlayBtn", "backgroundColor"));
  await settles(() => style("#heroNextGo", "color"), () => style("#heroNextGo", "backgroundColor"));
  await settles(() => style(".hero-eyebrow", "color"), () => page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  await settles(() => style("#winPct", "color"), () => style(".steps-win", "backgroundColor"));
  // Pantalla baja: la barra compacta y las fichas de notas del paso, sobre su pergamino
  await page.setViewportSize({ width: 1280, height: 720 });
  await settles(() => style("#diaryNext", "color"), () => style("#diaryNext", "backgroundColor"));
  await settles(() => style("#winPct", "color"), () => style(".steps-win", "backgroundColor"));
  await settles(() => style(".win-done", "color"), () => style(".steps-win", "backgroundColor"));
  await page.locator('.diary-row[data-n="1"] .row-num').click();
  await settles(() => style("#journal .call-peek", "color"), () => style("#journal .journal-top", "backgroundColor"));
});

test("el botón de copiar de los objetos se lee en los dos temas", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await openApp(page, { "silvestre:theme": theme }, { view: "items" });
    const btn = page.locator("#items .slot-copy").first();
    await btn.focus();
    // El icono (trazo) contra el fondo del botón: al menos 4.5
    await expect.poll(() => btn.evaluate(el => {
      const lum = c => {
        const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
          v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
        });
        return .2126 * r + .7152 * g + .0722 * b;
      };
      const [a, b] = [lum(getComputedStyle(el.querySelector("svg")).stroke), lum(getComputedStyle(el).backgroundColor)]
        .sort((x, y) => y - x);
      return (a + .05) / (b + .05);
    }), { timeout: 3_000 }).toBeGreaterThanOrEqual(4.5);
  }
});

test("las cantidades de «Necesitas» se leen en los dos temas", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await openApp(page, { "silvestre:theme": theme });
    await page.click('.diary-row[data-n="35"] .row-num');
    const q = page.locator("#journal .journal-needs .slot .q").first();
    await expect.poll(() => q.evaluate(el => {
      const lum = c => {
        const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
          v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
        });
        return .2126 * r + .7152 * g + .0722 * b;
      };
      const st = getComputedStyle(el);
      // Una etiqueta propia y opaca: el número no depende del icono que tenga detrás
      if (st.backgroundColor === "rgba(0, 0, 0, 0)") return 0;
      const [a, b] = [lum(st.color), lum(st.backgroundColor)].sort((x, y) => y - x);
      return (a + .05) / (b + .05);
    }), { timeout: 3_000 }).toBeGreaterThanOrEqual(4.5);
  }
});

test("la pestaña lleva de favicon el huevo del Dofus Silvestre", async ({ page, request }) => {
  await openApp(page);
  for (const sel of ['link[rel="icon"][sizes="32x32"]', 'link[rel="icon"][sizes="128x128"]', 'link[rel="apple-touch-icon"]']) {
    const href = await page.locator(`head ${sel}`).getAttribute("href");
    const res = await request.get(new URL(href, page.url()).href);
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toContain("image/png");
  }
});

test("la cabecera del paso sigue el tema claro y se lee", async ({ page }) => {
  await openApp(page, { "silvestre:theme": "light" });
  // El 1 lleva un aviso («Incluye») en la cabecera
  await page.click('.diary-row[data-n="1"] .row-num');
  const lum = c => {
    const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
      v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    });
    return .2126 * r + .7152 * g + .0722 * b;
  };
  const bg = await page.locator("#journal .journal-top").evaluate(el => getComputedStyle(el).backgroundColor);
  // Fondo claro, como el resto del diario en este tema
  expect(lum(bg)).toBeGreaterThan(.6);
  for (const sel of [".journal-title", ".journal-goal .journal-base", ".goal-calls .call", ".journal-to-map"]) {
    await expect.poll(async () => {
      const fg = await page.locator(`#journal ${sel}`).first().evaluate(el => getComputedStyle(el).color);
      const own = await page.locator(`#journal ${sel}`).first().evaluate(el => getComputedStyle(el).backgroundColor);
      const back = own === "rgba(0, 0, 0, 0)" ? bg : own;
      const [a, b] = [lum(fg), lum(back)].sort((x, y) => y - x);
      return (a + .05) / (b + .05);
    }, { timeout: 3_000, message: sel }).toBeGreaterThanOrEqual(4.5);
  }
});

test("los textos con contorno lo dibujan con sombras, sin -webkit-text-stroke (en algunos navegadores raya el interior de las letras)", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="83"] .row-num');
  await expect(page.locator("#journal .journal-title")).toBeVisible();
  for (const sel of ["#journal .journal-num", "#journal .journal-title", "#journal .journal-show-name", ".egg-pct-row > b"]) {
    const [stroke, shadows] = await page.locator(sel).first().evaluate(el => {
      const s = getComputedStyle(el);
      return [s.webkitTextStrokeWidth, (s.textShadow.match(/rgb/g) || []).length];
    });
    expect(stroke, sel).toBe("0px");
    // Un anillo de sombras alrededor más la sombra dura de abajo
    expect(shadows, sel).toBeGreaterThanOrEqual(5);
  }
});
