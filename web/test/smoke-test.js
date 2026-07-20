const https = require("https");

const FRONTEND_URL = "https://autoservice-web.onrender.com";
const BACKEND_URL = "https://autoservice-backend-atyj.onrender.com/api/v1";

const WINDOWS_CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const WINDOWS_EDGE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0";
const IPHONE_SAFARI_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

function checkEndpoint(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          contentType: res.headers["content-type"] || "",
          cacheControl: res.headers["cache-control"] || "",
          body: data
        });
      });
    });
    req.on("error", reject);
    req.setTimeout(10000, () => {
      req.destroy(new Error("Timeout"));
    });
  });
}

async function runSmokeTests() {
  console.log("=== RUNNING PRODUCTION STABILITY SMOKE TESTS ===");
  let passed = 0;
  let failed = 0;

  async function assertCheck(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. Root page response
  await assertCheck("Root page HTML (200 OK)", async () => {
    const res = await checkEndpoint(`${FRONTEND_URL}/`, { "User-Agent": WINDOWS_CHROME_UA });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (!res.contentType.includes("text/html")) throw new Error(`Expected text/html, got ${res.contentType}`);
    if (!res.body.includes("Autoservice")) throw new Error("Root HTML missing Autoservice title");
  });

  // 2. Windows Edge UA check
  await assertCheck("Windows Edge User-Agent compatibility", async () => {
    const res = await checkEndpoint(`${FRONTEND_URL}/`, { "User-Agent": WINDOWS_EDGE_UA });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
  });

  // 3. Mobile Safari UA check
  await assertCheck("Mobile Safari User-Agent compatibility", async () => {
    const res = await checkEndpoint(`${FRONTEND_URL}/`, { "User-Agent": IPHONE_SAFARI_UA });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
  });

  // 4. CSS Assets check
  await assertCheck("Stylesheet /assets/style.css?v=3 (200 OK & text/css)", async () => {
    const res = await checkEndpoint(`${FRONTEND_URL}/assets/style.css?v=3`, { "User-Agent": WINDOWS_CHROME_UA });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (!res.contentType.includes("text/css")) throw new Error(`Expected text/css, got ${res.contentType}`);
  });

  // 5. JavaScript App bundle check
  await assertCheck("JS Bundle /assets/app.js (200 OK & JS MIME)", async () => {
    const res = await checkEndpoint(`${FRONTEND_URL}/assets/app.js`, { "User-Agent": WINDOWS_CHROME_UA });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (!res.contentType.includes("javascript")) throw new Error(`Expected javascript, got ${res.contentType}`);
  });

  // 6. Runtime config check
  await assertCheck("Runtime config /assets/config.js (200 OK)", async () => {
    const res = await checkEndpoint(`${FRONTEND_URL}/assets/config.js`, { "User-Agent": WINDOWS_CHROME_UA });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
  });

  // 7. Backend API readiness
  await assertCheck("Backend API Health Endpoint (/readyz 200 OK)", async () => {
    const res = await checkEndpoint(`${BACKEND_URL}/readyz`);
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    if (!res.body.includes('"status":"ready"')) throw new Error("Backend not ready");
  });

  console.log(`\n=== SMOKE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runSmokeTests();
