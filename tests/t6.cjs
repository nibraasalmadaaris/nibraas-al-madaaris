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
    await page.goto(url);
    await page.waitForFunction(() => window.__mock);
    if (setup) await page.evaluate(setup);
    return page;
  }
  const navText = (page) => page.evaluate(() => document.querySelector("aside nav").innerText);
  async function signup(type, email) {
    const page = await fresh();
    await page.waitForSelector("button:has-text('Isdiiwaangeli')", { timeout: 8000 });
    await page.click("button:has-text('Isdiiwaangeli')");
    await page.waitForSelector("[data-school-type]");
    const cards = await page.$$eval("[data-school-type]", (e) => e.map((x) => x.dataset.schoolType));
    ok(cards.join() === "quran,academic", type + ": signup step 1 shows exactly two cards " + cards);
    const dis = await page.$eval("button:has-text('Sii wad')", (b) => b.disabled);
    ok(dis, type + ": Sii wad disabled until a type is chosen");
    await page.click(`[data-school-type=${type}]`);
    await page.click("button:has-text('Sii wad')");
    await page.fill("input[placeholder='Tusaale: Madrasada Al-Huda']", "Test School " + type);
    await page.fill("input[placeholder='Magacaaga']", "Admin " + type);
    await page.fill("input[type=email]", email);
    await page.fill("input[type=password]", "secret123");
    await page.click("form button[type=submit]");
    await page.waitForSelector("aside nav", { timeout: 10000 });
    await sleep(500);
    return page;
  }
  const quran = await signup("quran", "q@x.test");
  const meta = await quran.evaluate(() => window.__mock.lastSignUp.options.data.nibraas_school_type);
  ok(meta === "quran", "quran signup metadata: " + meta);
  let prof = await quran.evaluate(() => [...window.__mock.rows.entries()].filter(([k]) => k.includes("school-profile")).map(([k, v]) => [k, JSON.stringify(v)]));
  ok(prof.length === 1 && /"quran"/.test(prof[0][1]) && /__global__/.test(prof[0][0]), "quran school-profile written once, global scope: " + JSON.stringify(prof));
  const qn = await navText(quran);
  console.log("QURAN NAV:", qn.replace(/\n+/g, " | "));
  const qside = await quran.evaluate(() => document.querySelector("aside").innerText);
  ok(/Qur/i.test(qside), "quran sidebar shows type");

  const acad = await signup("academic", "a@x.test");
  const am = await acad.evaluate(() => window.__mock.lastSignUp.options.data.nibraas_school_type);
  ok(am === "academic", "academic signup metadata: " + am);
  prof = await acad.evaluate(() => [...window.__mock.rows.entries()].filter(([k]) => k.includes("school-profile")).map(([k, v]) => [k, JSON.stringify(v)]));
  ok(prof.length === 1 && /"academic"/.test(prof[0][1]), "academic school-profile written: " + JSON.stringify(prof));
  const an = await navText(acad);
  console.log("ACADEMIC NAV:", an.replace(/\n+/g, " | "));
  ok(an !== qn, "navigation differs between the two systems");
  const hasHome = await acad.evaluate(() => document.body.innerText);
  console.log("ACADEMIC HOME:", hasHome.slice(0, 400).replace(/\n+/g, " | "));
  const tenants = await acad.evaluate(() => window.__mock.registered.length);
  ok(tenants === 1, "one tenant created per signup");

  // legacy tenant with no profile
  const leg = await fresh(() => { window.__mock.memberships.push({ tenant_id: "T1", user_id: "u1", role: "Admin" }); });
  await leg.evaluate(() => window.__mock.emit("SIGNED_IN", window.__mock.mkSession("u1", "t")));
  await leg.waitForSelector("aside nav", { timeout: 8000 });
  const ln = await navText(leg);
  const lw = await leg.evaluate(() => [...window.__mock.rows.keys()].filter((k) => k.includes("school-profile")).length);
  ok(lw === 0, "legacy tenant: nothing written for profile");
  ok(ln === qn, "legacy tenant gets Quran nav identical to new Quran school");

  // existing academic profile read by Admin of another tenant, plus teacher
  const tp = await fresh(() => {
    const M = window.__mock;
    M.memberships.push({ tenant_id: "T2", user_id: "u2", role: "Admin" });
    M.rows.set("T2:__global__:school-profile", { key: "T2:__global__:school-profile", tenant_id: "T2", branch_id: "__global__", value: { type: "academic", version: 1 }, updated_at: new Date().toISOString() });
  });
  await tp.evaluate(() => window.__mock.emit("SIGNED_IN", window.__mock.mkSession("u2", "t")));
  await tp.waitForSelector("aside nav", { timeout: 8000 });
  ok((await navText(tp)) === an, "stored academic profile -> same academic nav (isolated by tenant)");

  // profile read failure fails closed
  const ff = await fresh(() => {
    const M = window.__mock;
    M.memberships.push({ tenant_id: "T2", user_id: "u2", role: "Admin" });
    M.rows.set("T2:__global__:school-profile", { key: "T2:__global__:school-profile", tenant_id: "T2", branch_id: "__global__", value: { type: "academic", version: 1 }, updated_at: new Date().toISOString() });
    M.failStorageRead = { message: "boom" };
  });
  await ff.evaluate(() => window.__mock.emit("SIGNED_IN", window.__mock.mkSession("u2", "t")));
  await sleep(3000);
  const hasNav = await ff.$("aside nav");
  const ft = await ff.evaluate(() => document.body.innerText);
  ok(!hasNav, "profile read failure: dashboard not shown (fail closed)");
  console.log("FAILCLOSED TEXT:", ft.slice(0, 300).replace(/\n+/g, " | "));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
})();
