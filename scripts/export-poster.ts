/** Export: npx tsx scripts/export-poster.ts [post|story|a2] [base-url]
 * Start the Astro server first, or pass a deployed URL. */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const formats = {
  post: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
  a2: { width: 1748, height: 2472 }, // A2 at 150 dpi, portrait
} as const;
type Format = keyof typeof formats;
const selected = process.argv[2] ?? 'post';
if (!(selected in formats)) throw new Error('Formato inválido. Usá post, story o a2.');
const format = selected as Format;
const base = process.argv[3] ?? 'http://127.0.0.1:4321';
const output = resolve('exports', `poster-${format}.png`);
await mkdir(resolve('exports'), { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  const page = await browser.newPage({ viewport: formats[format], deviceScaleFactor: 1, reducedMotion: 'reduce' });
  // Freeze time before any page scripts run. The poster's static fallback has no
  // animation, so its exported frame is identical on every run.
  await page.clock.install({ time: new Date('2026-12-19T00:00:00-03:00') });
  const response = await page.goto(`${base.replace(/\/$/, '')}/poster?f=${format}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`No se pudo abrir el póster: ${response?.status() ?? 'sin respuesta'}`);
  await page.waitForSelector('html[data-poster-ready="true"]');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: output, animations: 'disabled' });
  console.log(`Póster exportado: ${output}`);
} finally {
  await browser.close();
}
