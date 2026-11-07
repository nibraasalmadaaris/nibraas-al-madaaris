const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "index.html");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGEERROR", e.message); });
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto(url); await page.waitForFunction(() => window.__mock);
  await page.evaluate(() => {
    const M = window.__mock; const now = new Date().toISOString();
    const put = (k, v, b = "main") => M.rows.set(`T2:${b}:${k}`, { key: `T2:${b}:${k}`, tenant_id: "T2", branch_id: b, value: v, updated_at: now });
    M.memberships.push({ tenant_id: "T2", user_id: "u2", role: "Admin" });
    put("school-profile", { type: "academic", version: 1 }, "__global__");
    put("students-data", [{ id: 1, name: "Axmed Cali", className: "Fasalka 1" }, { id: 2, name: "Faadumo Nuur", className: "Fasalka 1" }]);
    put("exams-data", [{ id: 11, name: "Imtixaanka Dhexe", subject: "Xisaab", className: "Fasalka 1", maxScore: 100, date: "2026-11-01" }]);
    M.emit("SIGNED_IN", M.mkSession("u2", "t"));
  });
  await page.waitForSelector("aside nav", { timeout: 8000 });
  const labels = ["Hoyga", "Sannadka & Terms", "Maaddooyin & Macallimiin", "Imtixaannada", "Dhibcaha & Darajooyinka", "Warqadaha Natiijada", "Falanqaynta Waxbarashada", "Fasallada & Sections", "Khidmadaha Dugsiga (Fees)", "Parent Portal & Waalidiinta"];
  for (const l of labels) {
    const before = errs.length;
    await page.click(`aside nav button:has-text("${l}")`);
    await sleep(400);
    const txt = await page.evaluate(() => document.querySelector("main")?.innerText || document.body.innerText);
    ok(errs.length === before && txt.length > 30, `screen "${l}" renders w/o errors (${txt.length} chars)`);
  }
  // Marks
  await page.click('aside nav button:has-text("Dhibcaha & Darajooyinka")'); await sleep(500);
  console.log("MARKS:", (await page.evaluate(() => document.querySelector("main").innerText)).slice(0, 500).replace(/\n+/g, " | "));
  await page.selectOption("main select", { index: 1 }); await sleep(400);
  const inputs = await page.$$("main input[type=number]");
  ok(inputs.length >= 2, "marks screen has score inputs: " + inputs.length);
  if (inputs.length >= 2) {
    await inputs[0].fill("95"); await inputs[1].fill("42");
    await page.click('main button:has-text("Kaydi")'); await sleep(800);
    const saved = await page.evaluate(() => { const r = window.__mock.rows.get("T2:main:exam-results-data"); return r && r.value; });
    console.log("SAVED:", JSON.stringify(saved));
    ok(Array.isArray(saved) && saved.length === 2, "marks saved to exam-results-data (2 rows)");
    ok(saved && saved.some((x) => +x.score === 95) && saved.some((x) => +x.score === 42), "scores stored correctly");
  }
  await page.click('aside nav button:has-text("Falanqaynta Waxbarashada")'); await sleep(500);
  console.log("ANALYTICS:", (await page.evaluate(() => document.querySelector("main").innerText)).slice(0, 400).replace(/\n+/g, " | "));
  console.log(`\n${pass} passed, ${fail} failed; errors: ${errs.length}`);
  errs.slice(0, 5).forEach((e) => console.log("ERR", e.slice(0, 200)));
  await browser.close();
})();
