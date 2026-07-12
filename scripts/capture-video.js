const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Lightweight dotenv loader to support raw Node script execution
function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed
              .slice(eqIdx + 1)
              .trim()
              .replace(/^["']|["']$/g, '');
            if (key && !process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  } catch (err) {
    // Ignore env loading errors
  }
}

async function main() {
  loadEnv();
  const videoDir = path.join(__dirname, '..', 'demo', 'video');
  const framesDir = path.join(__dirname, '..', 'demo', 'video_frames');
  const dummyFilePath = path.join(__dirname, '..', 'demo', 'dummy-document.pdf');

  // Ensure directories exist
  fs.mkdirSync(videoDir, { recursive: true });
  fs.mkdirSync(framesDir, { recursive: true });

  // Write a local dummy document for the upload simulation
  fs.writeFileSync(dummyFilePath, 'This is a secure, illustrative offer letter document for Nikhil Kumar Jain.');

  console.log('[Capture] Preparing database state...');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is missing. Please check .env config.');
  }

  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');

  const pool = new Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Ensure employee Nikhil Kumar Jain exists in the Postgres database
    const nikhil = await prisma.employee.upsert({
      where: { employeeCode: 'EMP-NIK01' },
      update: {
        name: 'Nikhil Kumar Jain',
        department: 'Engineering',
        level: 'L4',
        country: 'US',
        isActive: true,
      },
      create: {
        employeeCode: 'EMP-NIK01',
        name: 'Nikhil Kumar Jain',
        department: 'Engineering',
        level: 'L4',
        country: 'US',
        startDate: new Date('2022-01-15'),
        isActive: true,
      }
    });

    // 2. Ensure he has a clean salary history matching our presentation
    await prisma.salaryRecord.deleteMany({ where: { employeeId: nikhil.id } });
    await prisma.salaryRecord.createMany({
      data: [
        {
          employeeId: nikhil.id,
          baseAmount: 160000,
          currency: 'USD',
          bonusAmount: 15000,
          baseAmountUSD: 160000,
          bonusAmountUSD: 15000,
          effectiveDate: new Date('2022-01-15'),
        },
        {
          employeeId: nikhil.id,
          baseAmount: 180000,
          currency: 'USD',
          bonusAmount: 18000,
          baseAmountUSD: 180000,
          bonusAmountUSD: 18000,
          effectiveDate: new Date('2024-03-01'),
        }
      ]
    });
    console.log('[Capture] Database state prepared successfully!');
  } catch (dbErr) {
    console.error('[Capture] Error preparing database state:', dbErr);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  console.log('[Capture] Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  let frameCount = 0;

  // Injects/updates a beautiful overlay subtitle onto the page DOM
  async function showSubtitle(text) {
    await page.evaluate((msg) => {
      let el = document.getElementById('demo-subtitle');
      if (!el) {
        el = document.createElement('div');
        el.id = 'demo-subtitle';
        el.style.position = 'fixed';
        el.style.bottom = '50px';
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
        el.style.backgroundColor = 'rgba(9, 9, 11, 0.95)';
        el.style.color = '#f4f4f5';
        el.style.padding = '14px 28px';
        el.style.borderRadius = '8px';
        el.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        el.style.fontSize = '20px';
        el.style.fontWeight = '600';
        el.style.border = '1px solid rgba(255, 255, 255, 0.08)';
        el.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        el.style.zIndex = '999999';
        el.style.textAlign = 'center';
        el.style.maxWidth = '75%';
        el.style.letterSpacing = '-0.025em';
        document.body.appendChild(el);
      }
      el.textContent = msg;
    }, text);
  }

  // Capture frame
  async function captureFrame() {
    frameCount++;
    const frameName = `frame-${String(frameCount).padStart(3, '0')}.png`;
    const framePath = path.join(framesDir, frameName);
    await page.screenshot({ path: framePath });
    if (frameCount % 50 === 0) {
      console.log(`[Capture] Captured ${frameCount} frames...`);
    }
  }

  // Record loop
  async function recordDuration(seconds, subtitle, action = async () => {}) {
    await showSubtitle(subtitle);
    const steps = Math.ceil(seconds * 2); // 2 fps
    for (let i = 0; i < steps; i++) {
      await action(i, steps);
      await captureFrame();
      await sleep(500); // 500ms interval for 2 fps
    }
  }

  try {
    // SCENE 1: Introduction & Login (30s, 60 frames)
    console.log('[Capture] Waiting for dev server to be responsive on http://localhost:3000/login...');
    let retries = 30;
    while (retries > 0) {
      try {
        const resp = await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 5000 });
        if (resp && resp.status() === 200) {
          console.log('[Capture] Dev server is ready!');
          break;
        }
      } catch (e) {
        // Wait and retry
      }
      retries--;
      await sleep(2000);
    }

    console.log('[Capture] Running Scene 1: Login Page...');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    
    await recordDuration(10, "Hello, I'm Nikhil Kumar Jain, a Senior Software Engineer with 4+ years of experience. You are looking at the secure CompensaIQ login screen.");
    await recordDuration(10, "Now I am logging in using the seeded HR Manager credentials. Notice the clean, responsive layout built with Tailwind CSS.", async (step) => {
      if (step === 2) await page.type('input[type="email"]', 'hr.manager@acme.com', { delay: 100 });
      if (step === 6) await page.type('input[type="password"]', 'admin123', { delay: 100 });
    });
    
    await recordDuration(10, "Submitting credentials to authenticate the session... The system redirects us to the landing dashboard.", async (step) => {
      if (step === 2) {
        await Promise.all([
          page.click('button[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'domcontentloaded' })
        ]);
      }
    });

    // SCENE 2: Executive Dashboard & NL Assistant (60s, 120 frames)
    console.log('[Capture] Running Scene 2: Executive Dashboard...');
    await page.waitForSelector('main', { timeout: 15000 });
    await recordDuration(15, "Now we are looking at the main Executive Dashboard, which aggregates payroll statistics in real-time.");
    await recordDuration(15, "I am scrolling down to show the precomputed department aggregates, headcount trends, and pay equity charts.", async (step, total) => {
      await page.evaluate((s, t) => {
        window.scrollTo(0, (s / t) * 350);
      }, step, total);
    });
    await recordDuration(15, "Here is the 'Ask about pay' Natural Language Assistant. I will query 'Average pay by department' to fetch real-time metrics.", async (step) => {
      if (step === 2) {
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text && text.includes('Average pay by department')) {
            await btn.click();
            break;
          }
        }
      }
    });
    await recordDuration(15, "The AI compiles and extracts parameters from the request, returning structural salary calculations in under 15ms.", async (step) => {
      // Show query results
    });

    // SCENE 3: Virtualized Employee Directory (50s, 100 frames)
    console.log('[Capture] Running Scene 3: Directory Virtualization...');
    await page.goto('http://localhost:3000/app/employees', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('tr', { timeout: 15000 });
    await sleep(2000);
    
    await recordDuration(15, "Now I am navigating to the Employee Directory page. The list you see handles over 10,000 active employee records.");
    await recordDuration(18, "I am scrolling down the table list. Notice the virtualized viewport rendering only the visible rows to maintain 60 FPS.", async (step, total) => {
      await page.evaluate((s, t) => {
        const el = document.querySelector('div.overflow-y-auto');
        if (el) el.scrollTop = (s / t) * 1200;
      }, step, total);
    });
    await recordDuration(17, "Scrolling back to the top of the directory. CompensaIQ handles huge database queries with zero interface lag.", async (step, total) => {
      await page.evaluate((s, t) => {
        const el = document.querySelector('div.overflow-y-auto');
        if (el) el.scrollTop = 1200 - (s / t) * 1200;
      }, step, total);
    });

    // SCENE 4: Advanced Search & Dynamic Matching (40s, 80 frames)
    console.log('[Capture] Running Scene 4: Advanced Filtering...');
    await recordDuration(15, "Now I am typing 'Nikhil' in the search bar. The input is debounced by 200ms to optimize search client resources.");
    await recordDuration(15, "You are looking at the filtered search results. Users can select Starts With, Contains, or Exact matching modes.", async (step) => {
      if (step === 2) await page.type('input[placeholder="Type name or code..."]', 'Nikhil Kumar Jain', { delay: 100 });
    });
    await recordDuration(10, "Now that the search results display his profile card, I will proceed to inspect his full salary timeline.", async (step) => {
      // Keep search output active
    });

    // SCENE 5: Salary Timeline & Document Upload (60s, 120 frames)
    console.log('[Capture] Running Scene 5: Salary Audits and Document Upload...');
    await recordDuration(10, "Now I am clicking on Nikhil Kumar Jain's row to open his slide-over Profile Quick View drawer.", async (step) => {
      if (step === 2) {
        const rows = await page.$$('tr');
        if (rows.length > 1) await rows[1].click();
        await sleep(1500);
      }
    });

    await recordDuration(10, "Clicking 'View Full Salary Timeline' to navigate to his dedicated employee workspace.", async (step) => {
      if (step === 2) {
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('View Full Salary Timeline')) {
            await btn.click();
            await sleep(2000);
            break;
          }
        }
      }
    });

    await recordDuration(10, "Navigating to the Documents workspace tab to manage files for Nikhil Kumar Jain.", async (step) => {
      if (step === 2) {
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('Documents')) {
            await btn.click();
            await sleep(1500);
            break;
          }
        }
      }
    });

    await recordDuration(10, "Opening the secure Document Upload Modal. We can upload PDF, Excel, image, or text files.", async (step) => {
      if (step === 2) {
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('Upload') && !text.includes('Official')) {
            await btn.click();
            await sleep(1500);
            break;
          }
        }
      }
    });

    await recordDuration(10, "Dragging and dropping or selecting the file. Now I am categorizing it as an Offer Letter.", async (step) => {
      if (step === 2) {
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
          await fileInput.uploadFile(dummyFilePath);
          await sleep(1000);
        }
      }
      if (step === 4) {
        const selectButtons = await page.$$('button');
        for (const btn of selectButtons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('Select Category')) {
            await btn.click();
            await sleep(500);
            break;
          }
        }
      }
      if (step === 6) {
        const optionButtons = await page.$$('button');
        for (const opt of optionButtons) {
          const text = await page.evaluate(el => el.textContent, opt);
          if (text && text.trim() === 'Offer Letter') {
            await opt.click();
            await sleep(500);
            break;
          }
        }
      }
      if (step === 8) {
        await page.type('textarea[placeholder="Enter document summary or details..."]', 'Nikhil Kumar Jain signed offer letter.', { delay: 50 });
      }
    });

    await recordDuration(10, "Clicking 'Save Upload' to securely commit the file to CompensaIQ's document storage.", async (step) => {
      if (step === 2) {
        const saveButtons = await page.$$('button');
        for (const btn of saveButtons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('Save Upload')) {
            await btn.click();
            await sleep(3000);
            break;
          }
        }
      }
    });

    // SCENE 6: Analytics & Pay Equity Metrics (30s, 60 frames)
    console.log('[Capture] Running Scene 6: Pay Equity...');
    await page.goto('http://localhost:3000/app/analytics', { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await recordDuration(15, "Now I am navigating to the Home page. You are looking at normalized salary bands and pay equity distribution details.");
    await recordDuration(15, "HR managers can instantly identify compensation anomalies where actual pay deviates from defined country bands.");

    // SCENE 7: Administrative Controls (30s, 60 frames)
    console.log('[Capture] Running Scene 7: Administration...');
    await page.goto('http://localhost:3000/app/compensation-bands', { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    await recordDuration(15, "Now we are looking at the Compensation Bands setup page, where administrators manage min, mid, and max thresholds.");
    await recordDuration(15, "Thank you for watching this demo of CompensaIQ. If you need any assistance or have questions, feel free to ask me.");

  } catch (err) {
    console.error('[Capture] Screen capture failed:', err);
  } finally {
    console.log('[Capture] Closing browser...');
    await browser.close();
    // Cleanup local dummy file
    try {
      if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);
    } catch (ignore) {}
  }

  // Compile frames into a standard 5-minute (300s) MP4 video at 2 fps input / 30 fps output!
  console.log('[Capture] Compiling video with FFmpeg...');
  try {
    const videoPath = path.join(videoDir, 'product-demo.mp4');
    const inputPattern = path.join(framesDir, 'frame-%03d.png');
    
    // Command: ffmpeg -y -framerate 2 -i frame-%03d.png -c:v libx264 -r 30 -pix_fmt yuv420p product-demo.mp4
    const ffmpegProc = spawn('ffmpeg', [
      '-y',
      '-framerate', '2',
      '-i', inputPattern,
      '-c:v', 'libx264',
      '-r', '30',
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

    // Cleanup frames folder
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
