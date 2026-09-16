const { chromium } = require('playwright');
const fs = require('node:fs');
const TARGET_URL = 'https://paloframework.org';
const OUT = __dirname;
const audit = JSON.parse(fs.readFileSync(`${OUT}/sitemap-audit.json`, 'utf8'));
const mobilePaths = ['/', '/PALO_DocumentationLibrary.html', '/PALO_PlatformMap.html', '/PALO_AgenticCapabilityMatrix.html', '/governance-hub/', '/docs/palo-ai-full-cycle-assurance.html', '/designs/theory-to-practice-infographic/'];
const jobs = audit.sitemap.map(e => ({ url: e.loc, device: 'desktop' })).concat(mobilePaths.map(p => ({ url: TARGET_URL+p, device: 'mobile' })));
(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    await Promise.all([0,1].map(async () => {
      while (jobs.length) {
        const job = jobs.shift();
        const context = await browser.newContext({ viewport: job.device === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 } });
        const page = await context.newPage();
        const errors = []; const failedRequests = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('requestfailed', r => failedRequests.push({ url: r.url(), reason: r.failure()?.errorText }));
        try {
          const response = await page.goto(job.url, { waitUntil: 'load', timeout: 25000 });
          await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
          if (job.url.includes('/governance-hub/')) await page.locator('h1').first().waitFor({ timeout: 10000 });
          const state = await page.evaluate(() => ({
            title: document.title,
            h1: [...document.querySelectorAll('h1')].map(x => ({ text:x.textContent.trim(), visible:!!x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden' })),
            width: innerWidth, documentWidth: document.documentElement.scrollWidth,
            overflowing: [...document.querySelectorAll('body *')].filter(x => x.getBoundingClientRect().right > innerWidth+2 && x.getBoundingClientRect().width > 0 && getComputedStyle(x).position !== 'fixed').slice(0,8).map(x => ({tag:x.tagName, id:x.id, class:x.className, right:x.getBoundingClientRect().right})),
            matrixCounts: [...document.querySelectorAll('[data-matrix-count]')].map(x => ({kind:x.getAttribute('data-matrix-count'), value:x.textContent.trim()})),
            brokenImages: [...document.images].filter(x=>x.complete&&!x.naturalWidth&&x.currentSrc).map(x=>x.currentSrc),
            bodyText: document.body.innerText.slice(0,1800)
          }));
          results.push({ ...job, status:response?.status(), ...state, errors, failedRequests });
          if (state.documentWidth > state.width+2 || errors.length || job.url.endsWith('/governance-hub/')) {
            const name = `browser-${job.device}-${new URL(job.url).pathname.replace(/[^a-z0-9]+/gi,'_')}.png`;
            await page.screenshot({ path:`${OUT}/${name}`, fullPage:false });
            results.at(-1).screenshot = name;
          }
        } catch (e) { results.push({...job,error:e.message,errors,failedRequests}); }
        finally { await context.close(); }
        fs.writeFileSync(`${OUT}/browser-audit.json`, JSON.stringify({ generatedAt:new Date().toISOString(),results },null,2));
        console.log(`${results.length}/44 ${job.device} ${new URL(job.url).pathname}`);
      }
    }));
  } finally { await browser.close(); }
  console.log(JSON.stringify({tested:results.length,failedNavigation:results.filter(x=>x.error).length,jsErrors:results.filter(x=>x.errors.length).length,overflow:results.filter(x=>x.documentWidth>x.width+2).map(x=>({url:x.url,device:x.device})),brokenImagePages:results.filter(x=>x.brokenImages?.length).length},null,2));
})();
