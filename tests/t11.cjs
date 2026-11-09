const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const path = require("path");
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.goto("file://" + path.join(__dirname, "index.html")); await p.waitForFunction(() => window.__tr);
  const T = (s, l) => p.evaluate(([s, l]) => window.__tr(s, l), [s, l]);
  ok(/إضافة طالب جديد/.test(await T("Ku dar Arday Cusub", "ar")), "Ku dar X Cusub (ar)");
  ok((await T("Ku dar Arday Cusub", "en")) === "Add New Student", "Ku dar X Cusub (en)");
  ok(/تعديل/.test(await T("Wax ka beddel Arday", "ar")), "Wax ka beddel X");
  ok((await T("Isku xirka waa daciif yahay. Dib ayaa loo isku dayayaa (2/5)...", "en")).includes("(2/5)"), "retry notice keeps numbers");
  ok((await T('Arday magaca "Cali" leh ayaa horey fasalkan ugu jira. Ma sii wadaa oo ma ku darta mar kale?', "en")).includes('"Cali"'), "duplicate student confirm keeps name");
  const bk = await T("Backup-kan wuxuu ka kooban yahay 42 qaybood oo xog ah.\n\nXogta leh furayaal isku mid ah waa la cusboonaysiin karaa. Hubi inaad haysato backup cusub ka hor intaadan sii wadin.\n\nMa sii wadeysaa?", "ar");
  ok(bk.includes("42") && /هل تريد المتابعة/.test(bk), "restore confirm (multi-line) in Arabic");
  ok((await T("Restore-ku wuu fashilmay.\n\nxx detail", "en")).endsWith("xx detail"), "restore failed keeps detail");
  ok((await T("Hawl cusub oo aan la aqoon", "ar")) === "Hawl cusub oo aan la aqoon", "unknown text stays Somali");
  console.log(`\n${pass} passed, ${fail} failed`); await b.close();
})();
