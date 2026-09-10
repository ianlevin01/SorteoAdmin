/*
 * Utilidad de desarrollo: saca capturas de las páginas y detecta desbordes
 * horizontales. Requiere el dev server corriendo (npm run dev).
 *
 *   node scripts/screenshot.mjs                 # set por defecto
 *   node scripts/screenshot.mjs / /sorteos      # rutas puntuales
 *   BASE=http://localhost:5182 node scripts/screenshot.mjs
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME =
  process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://localhost:5182';
const OUT = process.env.OUT || '.screenshots';
mkdirSync(OUT, { recursive: true });

const routes = process.argv.slice(2);
const defaults = ['/ingresar', '/sorteos', '/sorteos/nuevo'];
const paths = routes.length ? routes : defaults;
const TOKEN = process.env.TOKEN;
const ONLY = process.env.ONLY; // 'd' | 'm'

let USER = process.env.USER_JSON;
if (TOKEN && !USER) {
  try {
    const r = await fetch(`${BASE}/api/me`, { headers: { authorization: `Bearer ${TOKEN}` } });
    if (r.ok) USER = await r.text();
  } catch {
    /* seguimos sin user */
  }
}

const viewports = [
  { tag: 'd', width: 1440, height: 900 },
  { tag: 'm', width: 390, height: 844 },
].filter((v) => !ONLY || v.tag === ONLY);

const browser = await chromium.launch({ executablePath: CHROME });

for (const path of paths) {
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    if (TOKEN) {
      await page.goto(`${BASE}/`, { timeout: 15000 }).catch(() => {});
      await page.evaluate(
        ([t, u]) => {
          localStorage.setItem('sorteo.admin.token', t);
          if (u) localStorage.setItem('sorteo.admin.user', u);
        },
        [TOKEN, USER],
      );
    }
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(700);

    const info = await page.evaluate(() => {
      const de = document.documentElement;
      const bad = [];
      if (de.scrollWidth > de.clientWidth + 1) {
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1)) {
            bad.push(
              `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ` +
                `[${Math.round(r.left)}..${Math.round(r.right)}]`,
            );
          }
        }
      }
      return { scrollW: de.scrollWidth, clientW: de.clientWidth, bad: bad.slice(0, 10) };
    });

    const name = `${path.replace(/\W+/g, '_') || 'home'}-${vp.tag}`;
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

    const flag = info.scrollW > info.clientW + 1 ? '  ⚠ OVERFLOW' : '';
    console.log(`${name.padEnd(28)} ${info.scrollW}/${info.clientW}${flag}`);
    for (const b of info.bad) console.log(`   ${b}`);
    await page.close();
  }
}

await browser.close();
console.log('\nCapturas en', OUT);
