const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.goto("file://" + path.join(__dirname, "index.html")); await p.waitForFunction(() => window.__lh);
  const html = '<!doctype html><html><head><title>x</title><style>td{color:red}</style></head><body><h1>WARQADDA NATIIJADA · REPORT CARD</h1><table><tr><td>Magaca</td><td>Axmed &amp; Cali</td></tr><tr><td>Celcelis</td><td>85%</td></tr></table></body></html>';
  for (const l of ["ar", "en", "so"]) console.log(l, await p.evaluate(([h, l]) => window.__lh(h, l), [html, l]));
  await b.close();
})();
