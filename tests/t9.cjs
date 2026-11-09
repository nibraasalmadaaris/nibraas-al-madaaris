const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const path = require("path");
const url = "file://" + path.join(__dirname, "index.html");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  const errs = []; page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGEERROR", e.message); });
  await page.goto(url); await page.waitForFunction(() => window.__mock);
  const body = () => page.evaluate(() => document.body.innerText);
  await page.waitForSelector("select[aria-label^='Language']");
  ok(/Gal NIBRAAS/.test(await body()), "login in Somali by default");
  await page.selectOption("select[aria-label^='Language']", "ar"); await sleep(200);
  let t = await body();
  ok(/الدخول إلى نبراس/.test(t) && /البريد الإلكتروني/.test(t) && /نسيت كلمة المرور/.test(t), "login in Arabic");
  ok(await page.evaluate(() => document.documentElement.dir === "rtl"), "Arabic sets rtl");
  const ph = await page.evaluate(() => [...document.querySelectorAll("input")].map((i) => i.placeholder).join("|"));
  console.log("placeholders:", ph);
  await page.selectOption("select[aria-label^='Language']", "en"); await sleep(200);
  t = await body();
  ok(/Sign in to NIBRAAS/.test(t) && /Email/.test(t) && /I forgot my password/.test(t), "login in English");
  ok(await page.evaluate(() => document.documentElement.dir === "ltr"), "English is ltr");
  // signup picker
  await page.click("button:has-text('Sign up')"); await sleep(200);
  t = await body();
  ok(/Choose the System Type/.test(t) && /Quran School Management System/.test(t), "signup step 1 English");
  await page.selectOption("select[aria-label^='Language']", "so"); await sleep(200);
  ok(/Dooro Nooca Nidaamka/.test(await body()), "switching back to Somali restores text");
  // persisted language + dashboard
  await page.evaluate(() => { const M = window.__mock; M.memberships.push({ tenant_id: "T1", user_id: "u1", role: "Admin" }); M.emit("SIGNED_IN", M.mkSession("u1", "t")); });
  await page.waitForSelector("aside nav", { timeout: 10000 });
  await page.selectOption("select[aria-label^='Language']", "ar").catch(() => {});
  const sel = await page.$$("aside select, header select, select");
  await page.evaluate(() => { const s = [...document.querySelectorAll("select")].find((x) => [...x.options].some((o) => o.value === "ar")); const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set; setter.call(s, "ar"); s.dispatchEvent(new Event("change", { bubbles: true })); });
  await sleep(500);
  t = await page.evaluate(() => document.body.innerText);
  console.log("AR DASH:", t.slice(0, 500).replace(/\n+/g, " | "));
  ok(/الطلاب/.test(t) && /الحضور/.test(t), "dashboard/nav in Arabic");
  // stored data untouched by translation
  const w = await page.evaluate(() => window.__mock.calls.storageWrites);
  ok(w === 0, "translation wrote nothing to storage (writes=" + w + ")");
  // navigate to a screen and a form; check no errors and still interactive
  await page.click("aside nav button:nth-child(2)"); await sleep(600);
  console.log("AR STUDENTS:", (await body()).slice(0, 400).replace(/\n+/g, " | "));
  await page.reload(); await page.waitForFunction(() => window.__mock);
  ok(await page.evaluate(() => localStorage.getItem("nibraas-language") === "ar"), "language persisted");
  ok(errs.length === 0, "no page errors: " + errs.length);
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
})();
