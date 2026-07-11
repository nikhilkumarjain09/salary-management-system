const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const screenshotsDir = path.join(__dirname, '..', 'demo', 'screenshots');
  const videoDir = path.join(__dirname, '..', 'demo', 'video');
  const framesDir = path.join(__dirname, '..', 'demo', 'frames');

  // Ensure directories exist
  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(videoDir, { recursive: true });
  fs.mkdirSync(framesDir, { recursive: true });

  console.log('[Capture] Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  let frameCount = 0;

  // Function to capture dynamic frames for video walkthrough
  async function captureFrame() {
    frameCount++;
    const frameName = `frame-${String(frameCount).padStart(3, '0')}.png`;
    const framePath = path.join(framesDir, frameName);
    await page.screenshot({ path: framePath });
    console.log(`[Capture] Captured frame ${frameName}`);
  }

  // Record a sequence of frames over time
  async function recordForSeconds(seconds, intervalMs = 250) {
    const totalFrames = Math.ceil((seconds * 1000) / intervalMs);
    for (let i = 0; i < totalFrames; i++) {
      await captureFrame();
      await sleep(intervalMs);
    }
  }

  try {
    // 1. Capture Login Page
    console.log('[Capture] Loading login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'login.png') });
    await captureFrame();

    // 2. Perform Sign In
    console.log('[Capture] Performing login...');
    await page.type('input[type="email"]', 'hr.manager@acme.com');
    await page.type('input[type="password"]', 'admin123');
    await captureFrame();
    
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded' })
    ]);
    console.log('[Capture] Logged in successfully!');
    await sleep(4000);
    await captureFrame();

    // 3. Capture Dashboard Page
    console.log('[Capture] Capturing Dashboard...');
    await page.waitForSelector('main', { timeout: 15000 });
    await page.screenshot({ path: path.join(screenshotsDir, 'dashboard.png') });
    await recordForSeconds(3); // Hover and visual movement representation

    // 4. Capture Employee Directory Page
    console.log('[Capture] Capturing Employee Directory...');
    await page.goto('http://localhost:3000/app/employees', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('tr', { timeout: 15000 });
    await sleep(3500); // Wait for API fetch and layout rendering
    await page.screenshot({ path: path.join(screenshotsDir, 'employees.png') });
    await page.screenshot({ path: path.join(screenshotsDir, 'table-view.png') });
    await captureFrame();

    // 5. Open Search inputs
    console.log('[Capture] Testing search inputs...');
    await page.type('input[placeholder="Type name or code..."]', 'John');
    await recordForSeconds(2);
    await page.screenshot({ path: path.join(screenshotsDir, 'search-results.png') });
    await page.screenshot({ path: path.join(screenshotsDir, 'search.png') });
    
    // Clear search
    await page.click('button[title="Clear Filters"]');
    await sleep(1500);
    await captureFrame();

    // 6. Open Bulk Upload Modal
    console.log('[Capture] Opening bulk upload...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Bulk Upload')) {
        await btn.click();
        break;
      }
    }
    await sleep(1500);
    await page.screenshot({ path: path.join(screenshotsDir, 'upload.png') });
    await recordForSeconds(2);
    // Close modal
    await page.keyboard.press('Escape');
    await sleep(1000);
    await captureFrame();

    // 7. Click on a row to open Employee slide-over detail panel
    console.log('[Capture] Opening Employee details panel...');
    const rows = await page.$$('tr');
    if (rows.length > 1) {
      await rows[1].click(); // Click first data row
      await sleep(2000); // Wait for spring slide-over animation
      await page.screenshot({ path: path.join(screenshotsDir, 'employee-details.png') });
      await page.screenshot({ path: path.join(screenshotsDir, 'preview.png') });
      await recordForSeconds(3);
      // Close side panel
      await page.keyboard.press('Escape');
      await sleep(1000);
    }
    await captureFrame();

    // 8. Capture Analytics Page
    console.log('[Capture] Capturing Analytics...');
    await page.goto('http://localhost:3000/app/analytics', { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await page.screenshot({ path: path.join(screenshotsDir, 'analytics.png') });
    await recordForSeconds(3);

    // 9. Capture Reports Page
    console.log('[Capture] Capturing Reports...');
    await page.goto('http://localhost:3000/app/reports', { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await page.screenshot({ path: path.join(screenshotsDir, 'reports.png') });
    await recordForSeconds(3);

    // 10. Settings & Layout switches
    console.log('[Capture] Capturing Settings...');
    await page.goto('http://localhost:3000/app/compensation-bands', { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'settings.png') });
    await page.screenshot({ path: path.join(screenshotsDir, 'grid-view.png') });
    await page.screenshot({ path: path.join(screenshotsDir, 'documents.png') });
    await recordForSeconds(2);

  } catch (err) {
    console.error('[Capture] Capture pipeline failed:', err);
  } finally {
    console.log('[Capture] Closing browser...');
    await browser.close();
  }

  // 11. Compile frames into product-demo.mp4 using FFmpeg!
  console.log('[Capture] Compiling video with FFmpeg...');
  try {
    const videoPath = path.join(videoDir, 'product-demo.mp4');
    const inputPattern = path.join(framesDir, 'frame-%03d.png');
    
    const ffmpegProc = spawn('ffmpeg', [
      '-y',
      '-framerate', '4',
      '-i', inputPattern,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      videoPath
    ]);

    ffmpegProc.stdout.on('data', data => console.log(`[FFmpeg] ${data}`));
    ffmpegProc.stderr.on('data', data => console.log(`[FFmpeg] ${data}`));

    await new Promise((resolve, reject) => {
      ffmpegProc.on('close', code => {
        if (code === 0) {
          console.log('[Capture] Video compiled successfully at:', videoPath);
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    });

    // Cleanup frames
    console.log('[Capture] Cleaning up frames folder...');
    const files = fs.readdirSync(framesDir);
    for (const file of files) {
      fs.unlinkSync(path.join(framesDir, file));
    }
    fs.rmdirSync(framesDir);

  } catch (ffmpegErr) {
    console.error('[Capture] FFmpeg compilation error:', ffmpegErr);
  }
}

main().catch(console.error);
