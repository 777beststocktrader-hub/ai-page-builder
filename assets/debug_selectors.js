const { chromium } = require('playwright');
const path = require('path');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('https://ai-page-builder-6h7l.onrender.com', { waitUntil: 'networkidle', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  // Take a screenshot to see current state
  await page.screenshot({ path: path.join(__dirname, 'debug-state.png') });

  // Print all input/textarea placeholders
  const inputs = await page.$$eval('input, textarea', els => els.map(el => ({
    tag: el.tagName,
    placeholder: el.placeholder,
    id: el.id,
    class: el.className.slice(0, 80),
    value: el.value,
    disabled: el.disabled,
  })));
  console.log('INPUTS:', JSON.stringify(inputs, null, 2));

  // Print all buttons
  const buttons = await page.$$eval('button', els => els.map(el => ({
    text: el.innerText.trim().slice(0, 50),
    disabled: el.disabled,
    class: el.className.slice(0, 60),
  })));
  console.log('\nBUTTONS:', JSON.stringify(buttons, null, 2));

  await browser.close();
}
main().catch(err => { console.error(err.message); process.exit(1); });
