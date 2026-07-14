const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set up console listener to catch errors
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  await page.addInitScript(() => {
    window.api = {
      notifyActiveNote: () => {},
      onNoteOpened: () => {},
      offNoteOpened: () => {},
      platform: 'linux'
    };
  });

  await page.goto('http://localhost:5173');
  
  // Wait for empty state or editor
  await page.waitForTimeout(2000);
  
  // Click "New Note" if we are in EmptyState
  try {
    await page.click('text="New note"');
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log("No new note button found, assuming we are in editor.");
  }
  
  // Wait for CodeMirror to be visible
  await page.waitForSelector('.cm-content');
  
  // Focus the editor
  await page.click('.cm-content');
  
  // Type /
  await page.keyboard.type('Hello /');
  await page.waitForTimeout(1000);
  
  // Check for tooltip
  let tooltips = await page.$$eval('.cm-tooltip-autocomplete', els => els.map(e => e.innerHTML));
  console.log("Tooltips after typing /:", tooltips.length);
  if (tooltips.length > 0) {
    console.log("Tooltip HTML (slash):", tooltips[0]);
  }
  
  // Try Shift-Space
  await page.keyboard.press('Shift+Space');
  await page.waitForTimeout(1000);
  
  tooltips = await page.$$eval('.cm-tooltip-autocomplete', els => els.map(e => e.innerHTML));
  console.log("Tooltips after Shift+Space:", tooltips.length);
  
  // Take a screenshot
  await page.screenshot({ path: 'screenshot.png' });
  console.log("Screenshot saved to screenshot.png");
  
  await browser.close();
})();
