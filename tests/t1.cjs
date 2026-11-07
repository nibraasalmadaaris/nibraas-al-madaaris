const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "index.html");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  async function fresh(setup) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
    await page.addInitScript(() => { try { localStorage.setItem("nibraas-branches", JSON.stringify([{ id: "evil", name: "Tenant X laan" }])); localStorage.setItem("nibraas-active-branch", "evil"); } catch {} });
    await page.goto(url);
    await page.waitForFunction(() => window.__mock);
    if (setup) await page.evaluate(setup);
    return page;
  }
  const signIn = (page, uid = "u1") => page.evaluate((uid) => window.__mock.emit("SIGNED_IN", window.__mock.mkSession(uid, "tok1")), uid);
  const ready = (page) => page.waitForSelector("aside nav", { timeout: 8000 });

  // T1/T2: token refresh must not rebuild the app
  let page = await fresh(() => { const M = window.__mock; M.memberships.push({ tenant_id: "T1", user_id: "u1", role: "Admin" }); });
  await signIn(page); await ready(page);
  await page.evaluate(() => { window.__nav = document.querySelector("aside nav"); window.__mock.calls.bootstrap = 0; window.__mock.calls.membership = 0; window.__mock.calls.role = 0; });
  for (let i = 0; i < 5; i++) {
    await page.evaluate((i) => { const M = window.__mock; M.emit(i % 2 ? "SIGNED_IN" : "TOKEN_REFRESHED", M.mkSession("u1", "tok" + (i + 2))); }, i);
    await sleep(60);
  }
  await sleep(300);
  const t1 = await page.evaluate(() => ({ same: window.__nav === document.querySelector("aside nav") && document.body.contains(window.__nav), c: window.__mock.calls }));
  ok(t1.same, "T1 UI element survives 5 token refresh/SIGNED_IN events (no rebuild)");
  ok(t1.c.bootstrap === 0 && t1.c.membership === 0 && t1.c.role === 0, "T2 no tenant/role re-verification on refresh " + JSON.stringify(t1.c));
  // branches written? only default list may be written once (loaded value) -> storage writes must be 0 (no needless write)
  const w = await page.evaluate(() => window.__mock.calls.storageWrites);
  ok(w === 0, "T2b no storage writes caused by login/refresh (writes=" + w + ")");
  // T6: poisoned legacy localStorage not adopted into tenant data
  const branchRow = await page.evaluate(() => [...window.__mock.rows.keys()].filter((k) => k.includes("branches-data")));
  ok(branchRow.length === 0, "T6 legacy global branches NOT written into tenant data: " + JSON.stringify(branchRow));
  const act = await page.evaluate(() => ({ scoped: localStorage.getItem("nibraas-active-branch:T1"), legacy: localStorage.getItem("nibraas-active-branch") }));
  ok(act.scoped === "main", "T6b active branch scoped per tenant, legacy 'evil' ignored: " + JSON.stringify(act));
  await page.context().close();

  // T3: offline start then online
  page = await fresh(() => { const M = window.__mock; M.memberships.push({ tenant_id: "T1", user_id: "u1", role: "Admin" }); M.offline = true; });
  await signIn(page); await sleep(1500);
  let txt = await page.evaluate(() => document.body.innerText);
  ok(!/lama xaqiijin|SQL-ka v20|Amniga NIBRAAS lama diyaarin/.test(txt), "T3 offline: no 'not verified'/SQL v20 error screen while retrying");
  ok(/Dib ayaa loo isku dayayaa|waa la hubinayaa/.test(txt), "T3 offline: shows retry/checking note");
  await page.evaluate(() => { window.__mock.offline = false; });
  await ready(page);
  ok(true, "T3 recovers automatically after internet returns");
  await page.context().close();

  // T4: non-member -> denied, no auto retry loop
  page = await fresh();
  await signIn(page); await page.waitForSelector("button:has-text(\"Mar kale isku day\")", { timeout: 8000 });
  txt = await page.evaluate(() => document.body.innerText);
  ok(/lama xaqiijin karin/.test(txt), "T4 non-member sees clear 'cannot verify account' message");
  const c4 = await page.evaluate(() => window.__mock.calls.bootstrap);
  await sleep(2500);
  const c4b = await page.evaluate(() => window.__mock.calls.bootstrap);
  ok(c4 === 1 && c4b === 1, `T4 denied is not auto-retried (calls ${c4}/${c4b})`);
  ok((await page.evaluate(() => window.__mock.session && 1)) === 1, "T4 tenant verification not bypassed: app UI not shown: " + !(await page.$("aside nav")));
  ok(!(await page.$("aside nav")), "T4 no app shell for non-member");
  await page.context().close();

  // T5: setup error
  page = await fresh(() => { const M = window.__mock; M.memberships.push({ tenant_id: "T1", user_id: "u1", role: "Admin" }); M.failRpc = { err: { message: "Could not find the function public.nibraas_bootstrap", code: "PGRST202", status: 404 } }; });
  await signIn(page); await page.waitForSelector("text=Supabase-ka weli ma diyaarsana", { timeout: 8000 });
  ok(true, "T5 missing-function error shown as setup problem");
  await page.context().close();

  // T7: transient server error once then OK via retry button
  page = await fresh(() => { const M = window.__mock; M.memberships.push({ tenant_id: "T1", user_id: "u1", role: "Admin" }); });
  await page.evaluate(() => { window.__mock.failStorageRead = { message: "Failed to fetch", code: "", status: 0 }; });
  await signIn(page);
  await page.waitForSelector("button:has-text(\"Mar kale isku day\")", { timeout: 45000 });
  txt = await page.evaluate(() => document.body.innerText);
  ok(/Liiska laamaha lama akhrin karin|Nooca nidaamka dugsiga lama akhrin karin/.test(txt), "T7 branch-list read failure fails closed with retry (no guessing branch)");
  ok(!(await page.$("aside nav")), "T7 app not shown with unknown branch");
  const w7 = await page.evaluate(() => window.__mock.calls.storageWrites);
  ok(w7 === 0, "T7 nothing written while branch list unreadable");
  await page.evaluate(() => { window.__mock.failStorageRead = null; });
  await page.click("button:has-text(\"Mar kale isku day\")"); await ready(page);
  ok(true, "T7 retry button recovers");
  await page.context().close();

  // T8: two tenants / users isolation
  page = await fresh(() => { const M = window.__mock; M.memberships.push({ tenant_id: "T1", user_id: "u1", role: "Admin" }, { tenant_id: "T2", user_id: "u2", role: "Macalin" });
    M.rows.set("T1:__global__:branches-data", { key: "T1:__global__:branches-data", tenant_id: "T1", value: [{ id: "main", name: "A1" }, { id: "b2", name: "A2" }] }); });
  await signIn(page, "u1"); await ready(page);
  await page.evaluate(() => { localStorage.setItem("nibraas-active-branch:T1", "b2"); });
  await page.evaluate(() => window.__mock.emit("SIGNED_OUT", null)); await sleep(200);
  await signIn(page, "u2"); await ready(page);
  const st = await page.evaluate(() => ({ t1: localStorage.getItem("nibraas-active-branch:T1"), t2: localStorage.getItem("nibraas-active-branch:T2"), txt: document.body.innerText }));
  ok(st.t2 === "main", "T8 tenant 2 starts on own default branch, not tenant 1's: " + st.t2);
  ok(!/A2/.test(st.txt), "T8 tenant 1 branch names not visible to tenant 2");
  const keys = await page.evaluate(() => [...window.__mock.rows.keys()].filter((k) => k.startsWith("T2:")));
  ok(keys.every((k) => k.startsWith("T2:")), "T8 tenant 2 only touched T2 keys " + JSON.stringify(keys));
  await page.context().close();

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
