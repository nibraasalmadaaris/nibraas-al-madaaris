const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const PUB = path.join(__dirname, "../proj/nibraas-al-madaaris-main/public"), SITE = path.join(__dirname, "site");
let CUR = "v1"; let HELD = [];
const types = { ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json", ".html": "text/html" };
const srv = http.createServer((req, res) => {
  const u = req.url.split("?")[0];
  const send = (body, type, extra = {}) => { res.writeHead(200, { "content-type": type, "cache-control": "no-cache", ...extra }); res.end(body); };
  if (u === "/slow-write") { HELD.push(res); return; }
  if (u === "/sw.js") return send(fs.readFileSync(path.join(PUB, "sw.js"), "utf8").replace(/__BUILD_ID__/g, CUR), "text/javascript");
  if (u === "/version.json") return send(JSON.stringify({ id: CUR }), "application/json");
  if (u === "/" || u === "/index.html") return send(`<!doctype html><html><head><meta charset="utf-8"><link rel="manifest" href="/manifest.webmanifest"></head><body><div id="root"></div><script src="/assets/app-${CUR}.js"></script></body></html>`, "text/html");
  const f = u.startsWith("/assets/") ? path.join(SITE, u) : path.join(PUB, u);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) return send(fs.readFileSync(f), types[path.extname(f)] || "application/octet-stream");
  res.writeHead(404); res.end("nf");
});
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await new Promise((r) => srv.listen(0, r));
  const base = "http://localhost:" + srv.address().port;
  const b = await chromium.launch();
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.goto(base + "/");
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
  const first = await page.evaluate(async () => ({ ctrl: !!navigator.serviceWorker.controller, reg: !!(await navigator.serviceWorker.getRegistration()) }));
  ok(first.reg, "SW registered on first visit");
  ok(await page.evaluate(() => !document.getElementById("nibraas-update-bar")), "no update bar on first install (claim is not an update)");
  const marker = await page.evaluate(() => { window.__marker = Math.random(); return window.__marker; });
  await sleep(300);
  ok((await page.evaluate(() => window.__marker)) === marker, "first install did not reload the page");

  // new deploy
  CUR = "v2";
  await page.evaluate(() => window.dispatchEvent(new Event("online")));   // forces a check
  await page.waitForSelector("#nibraas-update-bar[data-state=ready]", { timeout: 15000 });
  ok(true, "update bar appears after a new deploy: " + (await page.textContent("#nibraas-update-bar")).slice(0, 60));
  ok(await page.evaluate(() => window.__marker) === marker, "page not reloaded automatically");

  // a pending write must delay the reload
  await page.evaluate(() => { window.__slow = fetch("/slow-write", { method: "POST", body: "{}" }).catch(() => {}); });
  await sleep(200);
  await page.click("#nibraas-update-bar button:has-text('Cusboonaysii')");
  await sleep(1500);
  ok(await page.evaluate(() => window.__marker) === marker, "update waits while a database write is pending (no reload)");
  ok((await page.textContent("#nibraas-update-bar")).includes("sugayaa"), "bar says it is waiting for the save to finish");
  HELD.forEach((r) => { r.writeHead(200, {"content-type":"application/json"}); r.end("{}"); }); HELD = [];
  await page.waitForFunction((m) => window.__marker !== m, marker, { timeout: 20000 }).catch(() => {});
  const after = await page.evaluate(() => window.__marker);
  ok(after === undefined || after !== marker, "page reloaded after the write finished");
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r.active && r.active.scriptURL; });
  const ver = await page.evaluate(() => [...document.scripts].map((s) => s.src).join());
  ok(/app-v2\.js/.test(ver), "after update the page runs the new bundle (" + ver.split("/").pop() + ")");
  const caches = await page.evaluate(async () => (await caches.keys()).join());
  ok(/v2/.test(caches) && !/nibraas-shell-v1/.test(caches), "old v1 caches deleted: " + caches);
  ok(await page.evaluate(() => !document.getElementById("nibraas-update-bar")), "no update bar after update");

  // offline start
  await ctx.setOffline(true);
  await page.reload().catch(() => {});
  await sleep(800);
  const txt = await page.evaluate(() => document.body.innerText);
  ok(txt.length > 0 && !/ERR_|This site can/.test(txt), "offline reload still shows the app shell (not a browser error page)");
  await ctx.setOffline(false);
  await b.close(); srv.close();
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
