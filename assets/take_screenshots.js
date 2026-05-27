/**
 * PageGenie App Store Screenshot Capture — v2
 * Generates a real page then captures polished screenshots.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP_URL = 'https://ai-page-builder-6h7l.onrender.com';
const OUT_DIR = path.join(__dirname);
const W = 1600, H = 1000;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: W, height: H });

  // ── Load app ──────────────────────────────────────────────────────────────
  console.log('Loading app...');
  await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(2000);

  // ── Type page goal and generate ───────────────────────────────────────────
  console.log('Typing page goal...');
  const input = page.locator('input[placeholder*="business"], input[placeholder*="e.g"], textarea[placeholder*="business"]').first();
  await input.click();
  await input.fill('SaaS project management tool for software teams');
  await sleep(500);

  // Click Generate button
  console.log('Clicking Generate...');
  const genBtn = page.locator('button:has-text("Generate")').first();
  await genBtn.click();

  // Wait for page generation (up to 30 seconds)
  console.log('Waiting for AI to generate page...');
  await sleep(3000);
  try {
    // Wait for blocks to appear on canvas
    await page.waitForSelector('[class*="canvas"] [class*="block"], [class*="Canvas"] section, [data-type], .block-wrapper', { timeout: 30000 });
    console.log('Page generated!');
  } catch (e) {
    console.log('Timeout waiting for blocks - proceeding anyway');
  }
  await sleep(2000);

  // ── Screenshot 1: Full builder with generated page ─────────────────────
  console.log('\n[1/4] Full builder interface...');
  // Close any modals
  try {
    await page.keyboard.press('Escape');
    await sleep(500);
  } catch(e){}

  await page.screenshot({ path: path.join(OUT_DIR, 'screenshot-1-main.png') });
  console.log('   Saved screenshot-1-main.png');

  // ── Screenshot 2: Canvas focused (hide sidebars if possible) ──────────────
  console.log('\n[2/4] Canvas view...');
  // Try clicking on the canvas area to focus it
  try {
    const canvas = page.locator('[class*="canvas"], [class*="Canvas"], main').first();
    await canvas.click({ position: { x: 400, y: 300 } });
    await sleep(500);
  } catch(e){}
  await page.screenshot({ path: path.join(OUT_DIR, 'screenshot-2-canvas.png') });
  console.log('   Saved screenshot-2-canvas.png');

  // ── Screenshot 3: Block library open ──────────────────────────────────────
  console.log('\n[3/4] Block library...');
  try {
    // Click Blocks tab in left panel
    const blocksTab = page.locator('button:has-text("Blocks"), [data-tab="blocks"], button[title*="Blocks"], div:has-text("Add Block")').first();
    if (await blocksTab.isVisible({ timeout: 2000 })) {
      await blocksTab.click();
      await sleep(1000);
    }
  } catch(e){ console.log('   Blocks tab not found'); }
  await page.screenshot({ path: path.join(OUT_DIR, 'screenshot-3-blocks.png') });
  console.log('   Saved screenshot-3-blocks.png');

  // ── Screenshot 4: Mobile preview mode ─────────────────────────────────────
  console.log('\n[4/4] Mobile preview...');
  try {
    // Click mobile preview toggle (look for phone icon or "Mobile" text)
    const mobileBtn = page.locator('button[title*="obile"], button[aria-label*="obile"], button:has-text("Mobile"), [class*="mobile-toggle"]').first();
    if (await mobileBtn.isVisible({ timeout: 2000 })) {
      await mobileBtn.click();
      await sleep(1500);
      console.log('   Mobile preview activated');
    } else {
      console.log('   Mobile toggle not found, using viewport resize');
    }
  } catch(e){}
  await page.screenshot({ path: path.join(OUT_DIR, 'screenshot-4-mobile.png') });
  console.log('   Saved screenshot-4-mobile.png');

  await browser.close();

  // ── Report ─────────────────────────────────────────────────────────────────
  console.log('\nDone! Files:');
  ['screenshot-1-main.png','screenshot-2-canvas.png','screenshot-3-blocks.png','screenshot-4-mobile.png']
    .forEach(f => {
      const p = path.join(OUT_DIR, f);
      const exists = fs.existsSync(p);
      const size = exists ? Math.round(fs.statSync(p).size / 1024) + 'KB' : 'MISSING';
      console.log(`  ${exists ? 'OK' : 'XX'} ${f} (${size})`);
    });
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
