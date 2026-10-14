import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

test("el interruptor alterna el tema y lo recuerda", async ({ page }) => {
  await openApp(page);
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
  for (const id of ["#tsLight", "#tsDark"]) {
    await expect.poll(() => page.locator(id).evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  }
});

test("el header es transparente arriba, sólido al bajar y muestra el progreso tras el hero", async ({ page }) => {
  await openApp(page);
  const header = page.locator("header");
  await expect(header).not.toHaveClass(/is-scrolled/);
  await expect(header).not.toHaveClass(/show-progress/);
  await page.evaluate(() => window.scrollTo(0, 120));
  await expect(header).toHaveClass(/is-scrolled/);
  await expect(header).not.toHaveClass(/show-progress/);
  await page.evaluate(() => window.scrollTo(0, 1000));
  await expect(header).toHaveClass(/show-progress/);
});

test("la marca es un logotipo con la tipografía de Dofus y se lee entera", async ({ page }) => {
  await openApp(page);
  const brand = page.locator("header .brand");
  // 14 letras animables: "Dofus" + "Silvestre"
  await expect(brand.locator(".logo i")).toHaveCount(14);
  await expect.poll(() => page.evaluate(() => document.fonts.check('27px "Lilita One"'))).toBe(true);
  expect(await brand.locator(".logo").evaluate(el => getComputedStyle(el).fontFamily)).toContain("Lilita One");
  // Las letras sueltas se ocultan a lectores de pantalla; el nombre se anuncia completo
  await expect(brand.locator(".logo")).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByText("Dofus Silvestre", { exact: true })).toHaveCount(1);
  await expect.poll(() => page.locator("#brandIcon").evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
});

test("los botones de overlay y reinicio usan objetos del juego", async ({ page }) => {
  await openApp(page);
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

test("el progreso del header aparece centrado solo al salir del hero", async ({ page }) => {
  await openApp(page, { "silvestre:done": { 1: true, 2: true, 3: true } });
  const pct = parseFloat(await page.locator("#heroPct").innerText());
  const bar = page.locator("header .tb-progress");
  // Arriba y aún dentro del hero no se ve
  await expect(bar).not.toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 200));
  await expect(page.locator("header")).toHaveClass(/is-scrolled/);
  await expect(bar).not.toBeVisible();
  // Fuera del hero aparece, centrado en el header
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect(bar).toBeVisible();
  await expect.poll(async () => {
    const box = await bar.boundingBox();
    return Math.abs(box.x + box.width / 2 - 720);
  }).toBeLessThanOrEqual(3);
  const fill = await page.locator("#sbFill").evaluate(el => el.style.width);
  expect(parseFloat(fill)).toBeCloseTo(pct, 1);
  await expect(page.locator("#sbPct")).toHaveText(`${pct}%`);
  await expect(page.locator("#sbDone")).toHaveText("3");
});

test("el progreso oculto del header no ocupa sitio", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await openApp(page);
  expect(await page.locator("header .tb-progress").evaluate(el => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
  // Márgenes simétricos: el contenido del header cabe dentro de su relleno
  const left = await page.locator("header .brand").evaluate(el => el.getBoundingClientRect().left);
  const right = await page.locator("#resetBtn").evaluate(el => innerWidth - el.getBoundingClientRect().right);
  expect(right).toBeGreaterThanOrEqual(left - 2);

  // Al aparecer, el porcentaje se ve entero y todo sigue cabiendo
  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect(page.locator("header")).toHaveClass(/show-progress/);
  // Se espera a la condición, no a un tiempo fijo: la transición tarda más con la máquina cargada
  await expect.poll(() => page.locator("header .tb-progress").evaluate(el => el.scrollWidth > el.clientWidth + 1))
    .toBe(false);
  await expect.poll(() => page.locator("#resetBtn").evaluate(el => innerWidth - el.getBoundingClientRect().right))
    .toBeGreaterThanOrEqual(left - 2);
  await ctx.close();
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
  const pageBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  // Se mide hasta que los colores se asientan: leerlos a mitad de la transición de tema
  // da un contraste falso. Uno que de verdad no llega a 4.5 sigue fallando.
  const settles = (fg, bg) => expect.poll(async () => ratio(await fg(), await bg()), { timeout: 3_000 })
    .toBeGreaterThanOrEqual(4.5);

  // Botón principal: texto sobre el relleno del acento
  await settles(() => style("#overlayBtn", "color"), () => style("#overlayBtn", "backgroundColor"));
  await settles(() => style("#heroNextGo", "color"), () => style("#heroNextGo", "backgroundColor"));
  // Acento usado como texto sobre el fondo de la página
  await settles(() => style(".hero-eyebrow", "color"), pageBg);
  await settles(() => style(".section-num", "color"), pageBg);
});

test("con la barra de progreso a la vista solo hay un Dofus Silvestre en el header", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => window.scrollTo(0, 1600));
  await expect(page.locator("header")).toHaveClass(/show-progress/);
  // El del logo; la barra se entiende con el porcentaje y los pasos
  await expect(page.locator('header img[src*="items/23036.png"]')).toHaveCount(1);
  await expect(page.locator(".brand img")).toBeVisible();
});

test("el botón de copiar de los objetos se lee en los dos temas", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await openApp(page, { "silvestre:theme": theme });
    await page.click("#tabItems");
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
    await page.click('.diary-row[data-n="35"] .row-main');
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
  await page.click('.diary-row[data-n="1"] .row-main');
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
