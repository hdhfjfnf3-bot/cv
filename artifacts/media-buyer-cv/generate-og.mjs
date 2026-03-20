import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

(async () => {
  const rootDir = process.cwd();
  const templatePath = path.join(rootDir, 'og-template.html');
  const imagePath = path.join(rootDir, 'public', 'profile.png');
  const outputPath = path.join(rootDir, 'public', 'og-image.jpg');

  console.log('Reading template and image...');
  let html = fs.readFileSync(templatePath, 'utf-8');
  
  if (fs.existsSync(imagePath)) {
    const imgBuffer = fs.readFileSync(imagePath);
    const base64Img = `data:image/png;base64,${imgBuffer.toString('base64')}`;
    html = html.replace('src=""', `src="${base64Img}"`);
  }

  console.log('Launching Playwright Chromium...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(html, { waitUntil: 'domcontentloaded' });

  // wait briefly for fonts
  await page.waitForTimeout(500);
  
  console.log('Saving screenshot...');
  await page.screenshot({ path: outputPath, type: 'jpeg', quality: 90 });

  await browser.close();
  console.log('🎉 og-image.jpg successfully created!');
})();
