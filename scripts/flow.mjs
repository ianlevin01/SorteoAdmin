/* Crea un sorteo desde el panel y verifica que quede en la API.
 *   TOKEN=... node scripts/flow.mjs
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://localhost:5182';
const API = process.env.API || 'http://localhost:4001';
const TOKEN = process.env.TOKEN;
const OUT = process.env.OUT || '.screenshots/flow';
mkdirSync(OUT, { recursive: true });

let USER = '';
if (TOKEN) {
  const r = await fetch(`${API}/api/me`, { headers: { authorization: `Bearer ${TOKEN}` } });
  if (r.ok) USER = await r.text();
}

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });

await page.goto(`${BASE}/`);
await page.evaluate(([t, u]) => {
  localStorage.setItem('sorteo.admin.token', t);
  if (u) localStorage.setItem('sorteo.admin.user', u);
}, [TOKEN, USER]);

await page.goto(`${BASE}/sorteos/nuevo`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

const title = `Sorteo de prueba ${Date.now().toString().slice(-5)}`;
await page.getByPlaceholder('Sorteo Fiat Cronos 0KM').fill(title);
await page.getByPlaceholder('Fiat Cronos Drive 1.3 · 0KM').fill('Premio de prueba');

// tier 1: 1 número $2000
const rows = page.locator('input[type=number]');
await rows.nth(0).fill('1'); // chances
await rows.nth(1).fill('2000'); // price
// agregar 2da opción: 10 números $16000
await page.getByRole('button', { name: '+ Agregar opción' }).click();
await page.waitForTimeout(200);
await rows.nth(2).fill('10');
await rows.nth(3).fill('16000');

// total y estado
await page.locator('input[type=number]').last().fill('100000'); // total de números
await page.locator('select').selectOption('active');

await shot('1-form-lleno');
await page.getByRole('button', { name: 'Crear sorteo' }).click();
await page.waitForURL(/\/sorteos$/, { timeout: 10000 });
await page.waitForTimeout(600);
await shot('2-listado');

await page.goto(`${BASE}/sorteos`, { waitUntil: 'networkidle' });
await page.getByText(title).click();
await page.waitForTimeout(600);
await shot('3-detalle');

// verificar en la API pública
const raffles = await fetch(`${API}/api/raffles`).then((r) => r.json());
const created = raffles.find((r) => r.title === title);
console.log(created ? `OK: "${title}" está en /api/raffles (${created.raffleId})` : `FALLO: no aparece "${title}"`);
if (created) console.log('  tiers:', created.chanceTiers.map((t) => `${t.chances}=$${t.price}`).join(' '), '| total:', created.totalNumbers, '| status:', created.status);

await browser.close();
