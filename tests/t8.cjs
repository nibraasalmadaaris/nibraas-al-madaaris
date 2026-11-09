const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "index.html");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  async function fresh(setup) {
    const page = await (await browser.newContext()).newPage();
    page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
    await page.goto(url); await page.waitForFunction(() => window.__mock);
    await page.evaluate(setup); return page;
  }
  const seed = (type) => () => { const M = window.__mock; M.memberships.push({ tenant_id: "T2", user_id: "u2", role: "Admin" });
    M.rows.set("T2:__global__:school-profile", { key: "T2:__global__:school-profile", tenant_id: "T2", branch_id: "__global__", value: { type: "hybrid-x", version: 9 }, updated_at: "x" }); };
  // unknown type fails closed
  let p = await fresh(seed());
  await p.evaluate(() => window.__mock.emit("SIGNED_IN", window.__mock.mkSession("u2", "t")));
  await p.waitForSelector("button:has-text('Mar kale isku day')", { timeout: 15000 });
  ok(!(await p.$("aside nav")), "unknown profile type: no dashboard (fail closed)");
  ok(/lama aqoonsan/.test(await p.evaluate(() => document.body.innerText)), "unknown type: clear message");
  const w = await p.evaluate(() => window.__mock.calls.storageWrites);
  ok(w === 0, "unknown type: nothing overwritten (writes=" + w + ")");
  await p.context().close();

  // transient read failure (all storage): one retry click recovers, no data written meanwhile
  p = await fresh(() => { const M = window.__mock; M.memberships.push({ tenant_id: "T1", user_id: "u1", role: "Admin" }); M.failStorageRead = { message: "Failed to fetch", code: "", status: 0 }; });
  await p.evaluate(() => window.__mock.emit("SIGNED_IN", window.__mock.mkSession("u1", "t")));
  await p.waitForSelector("button:has-text('Mar kale isku day')", { timeout: 60000 });
  console.log("T7 shown message:", (await p.evaluate(() => document.body.innerText)).replace(/\n+/g, " | ").slice(0, 200));
  await p.evaluate(() => { window.__mock.failStorageRead = null; });
  await p.click("button:has-text('Mar kale isku day')");
  await p.waitForSelector("aside nav", { timeout: 20000 });
  ok(true, "single retry click recovers when both branch + school-type reads failed");
  ok((await p.evaluate(() => window.__mock.calls.storageWrites)) === 0, "no writes during failure/recovery (legacy tenant)");

  // signup with metadata but profile write fails: fail closed, no guess; retry succeeds
  p = await fresh(() => { const M = window.__mock; M.memberships.push({ tenant_id: "T3", user_id: "u3", role: "Admin" }); M.failStorageWrite = { message: "Failed to fetch", code: "", status: 0 }; });
  await p.evaluate(() => { const M = window.__mock; const s = M.mkSession("u3", "t"); s.user.user_metadata = { nibraas_school_type: "academic" }; M.emit("SIGNED_IN", s); });
  await p.waitForSelector("button:has-text('Mar kale isku day')", { timeout: 60000 });
  ok(!(await p.$("aside nav")), "profile write failure: no dashboard, type not guessed");
  await p.evaluate(() => { window.__mock.failStorageWrite = null; });
  await p.click("button:has-text('Mar kale isku day')");
  await p.waitForSelector("aside nav", { timeout: 20000 });
  const nav = await p.evaluate(() => document.querySelector("aside nav").innerText);
  ok(/Warqadaha Natiijada/.test(nav) && !/Xifdhi|Qur'aan/.test(nav), "after retry: academic menu, profile saved");
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
})();
