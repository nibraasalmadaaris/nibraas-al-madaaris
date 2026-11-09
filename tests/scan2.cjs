const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "index.html");
const type = process.argv[2] || "quran";
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.addInitScript(() => localStorage.setItem("nibraas-language", "ar"));
  await page.goto(url); await page.waitForFunction(() => window.__mock);
  await page.evaluate((type) => {
    const M = window.__mock; const now = "2026-11-01T00:00:00Z";
    const put = (k, v, b = "main") => M.rows.set(`T1:${b}:${k}`, { key: `T1:${b}:${k}`, tenant_id: "T1", branch_id: b, value: v, updated_at: now });
    M.memberships.push({ tenant_id: "T1", user_id: "u1", role: "Admin" });
    put("school-profile", { type, version: 1 }, "__global__");
    put("students-data", [{ id: 1, name: "Axmed Cali", className: "Fasalka 1", status: "Firfircoon" }]);
    M.emit("SIGNED_IN", M.mkSession("u1", "t"));
  }, type);
  await page.waitForSelector("aside nav", { timeout: 10000 });
  const n = await page.$$eval("aside nav button", (b) => b.length);
  const left = new Map();
  for (let i = 1; i <= n; i++) {
    await page.click(`aside nav button:nth-child(${i})`); await page.waitForTimeout(500);
    const nodes = await page.evaluate(() => {
      const out = []; const tw = document.createTreeWalker(document.querySelector("main") || document.body, NodeFilter.SHOW_TEXT);
      let x; while ((x = tw.nextNode())) { const v = x.nodeValue.trim(); if (v && /[A-Za-z]{3}/.test(v) && !/[؀-ۿ]/.test(v)) out.push(v); }
      [...document.querySelectorAll("main [placeholder]")].forEach((e) => { const v = e.placeholder; if (/[A-Za-z]{3}/.test(v) && !/[؀-ۿ]/.test(v)) out.push("PH:" + v); });
      return out;
    });
    const opener = await page.$("main button:has-text('Ku dar'), main button:has-text('Cusub'), main button:has-text('Samee'), main button:has-text('Diiwaangeli')");
    if (opener) { await opener.click().catch(()=>{}); await page.waitForTimeout(400);
      const more = await page.evaluate(() => { const out=[]; const tw=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let x; while((x=tw.nextNode())){const v=x.nodeValue.trim(); if(v&&/[A-Za-z]{3}/.test(v)&&!/[\u0600-\u06FF]/.test(v)) out.push(v);} [...document.querySelectorAll("[placeholder]")].forEach(e=>{const v=e.placeholder; if(/[A-Za-z]{3}/.test(v)&&!/[\u0600-\u06FF]/.test(v)) out.push("PH:"+v);}); return out; });
      more.forEach((v)=>left.set(v,(left.get(v)||0)+1)); }
    nodes.forEach((v) => left.set(v, (left.get(v) || 0) + 1));
  }
  console.log([...left.keys()].join("\n"));
  await browser.close();
})();
