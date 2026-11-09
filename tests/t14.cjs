const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "index.html");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXPECT = [["Ardayda", /Ardayda|Arday/], ["Macallimiin", /Shaqaalaha|Shaqaale/], ["Fasallo", /Fasal/], ["Celcelis natiijo", /Falanqayn/], ["Xaadirin maanta", /Xaadirin/], ["Fees la helay", /Biil|Fees|Khidmad/]];
const AR = { Ardayda: "الطلاب", Macallimiin: "المعلمون", Fasallo: "فصول", "Celcelis natiijo": "متوسط النتائج", "Xaadirin maanta": "حضور اليوم", "Fees la helay": "الرسوم المحصّلة" };
async function seed(page, role, type, lang) {
  if (lang) await page.addInitScript((l) => localStorage.setItem("nibraas-language", l), lang);
  await page.goto(url); await page.waitForFunction(() => window.__mock);
  await page.evaluate(([role, type]) => {
    const M = window.__mock; const now = "2026-11-01T00:00:00Z";
    const put = (k, v, b = "main") => M.rows.set(`T1:${b}:${k}`, { key: `T1:${b}:${k}`, tenant_id: "T1", branch_id: b, value: v, updated_at: now });
    M.memberships.push({ tenant_id: "T1", user_id: "u1", role });
    put("school-profile", { type, version: 1 }, "__global__");
    put("students-data", [{ id: 1, name: "Axmed Cali", className: "Fasalka 1" }]);
    put("employees-data", [{ id: 5, name: "Macalin A", role: "Macalin", status: "Firfircoon" }]);
    M.emit("SIGNED_IN", M.mkSession("u1", "t"));
  }, [role, type]);
  await page.waitForSelector("aside nav, nav", { timeout: 10000 }).catch(() => {});
  await sleep(600);
}
async function runViewport(name, viewport, lang) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 600 });
  const page = await ctx.newPage(); const errs = [];
  page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGEERROR", e.message); });
  await seed(page, "Admin", "academic", lang);
  const cardSel = (label) => (lang === "ar" ? AR[label] : label);
  for (const [label, re] of EXPECT) {
    // return to home first
    const home = await page.$("main button:has-text('" + cardSel(label) + "')");
    ok(!!home, `${name}${lang ? "/" + lang : ""}: card "${label}" is a real button`);
    if (!home) continue;
    if (viewport.width < 600) await home.tap(); else await home.click();
    await sleep(500);
    const txt = await page.evaluate(() => (document.querySelector("main h1, main h2")?.innerText || "") + " | " + document.querySelector("main").innerText.replace(/^[\s\S]*?(?=\n[A-Z\u0600-\u06FF])/, ""));
    const left = !/Qaybinta darajooyinka|توزيع التقديرات/.test(txt);
    ok(left && (lang === "ar" ? true : re.test(txt.split(" | ")[0])), `${name}${lang ? "/" + lang : ""}: "${label}" opens its screen (${txt.slice(0, 40).replace(/\n/g, " ")})`);
    // back home via first nav entry (Guriga)
    await page.evaluate(() => { const b = document.querySelector("aside nav button, nav button"); b && b.click(); });
    await sleep(500);
    if (!(await page.$("main button:has-text('" + cardSel(label) + "')"))) { await page.screenshot({ path: "/tmp/dbg.png" }); }
  }
  ok(errs.length === 0, `${name}: no page errors`);
  await browser.close();
}
(async () => {
  await runViewport("desktop", { width: 1280, height: 800 });
  await runViewport("mobile", { width: 390, height: 780 });
  await runViewport("desktop-ar", { width: 1280, height: 800 }, "ar");
  // Teacher role: Macallimiin (employees) is not allowed -> must NOT be a button; others fine
  const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await seed(page, "Macalin", "academic");
  ok(!(await page.$("main button:has-text('Macallimiin')")), "Macalin role: Macallimiin card is not clickable (no access)");
  ok(!!(await page.$("main button:has-text('Ardayda')")), "Macalin role: Ardayda card is clickable");
  await browser.close();
  // Quran dashboard unchanged: no StatCard buttons introduced
  const b2 = await chromium.launch(); const p2 = await (await b2.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await seed(p2, "Admin", "quran");
  const t = await p2.evaluate(() => document.querySelector("main").innerText);
  ok(!/Fees la helay/.test(t) && !!(await p2.$("main button")), "Quran dashboard still its own (no academic stat cards)");
  await b2.close();
  console.log(`\n${pass} passed, ${fail} failed`);
})();
