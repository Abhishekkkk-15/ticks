const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');
  
  // wait for editor to load
  await page.waitForSelector('.cm-editor');
  
  // focus editor
  await page.click('.cm-content');
  
  // type /
  await page.keyboard.type('/');
  
  // wait a bit for completion to trigger
  await page.waitForTimeout(1000);
  
  // check if tooltip exists
  const tooltips = await page.$$eval('.cm-tooltip-autocomplete', els => els.map(e => e.innerHTML));
  
  console.log("Tooltips length:", tooltips.length);
  if (tooltips.length > 0) {
    console.log("Tooltip HTML:", tooltips[0]);
  } else {
    console.log("No tooltip found!");
  }
  
  // try shift+space
  await page.keyboard.press('Shift+Space');
  await page.waitForTimeout(1000);
  
  const tooltips2 = await page.$$eval('.cm-tooltip-autocomplete', els => els.map(e => e.innerHTML));
  console.log("Tooltips length after Shift+Space:", tooltips2.length);
  
  await browser.close();
})();
