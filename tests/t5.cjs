const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const path=require("path"),fs=require("fs");
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log("PASS",m);}else{fail++;console.log("FAIL",m);}};
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({acceptDownloads:true,viewport:{width:1280,height:900}}); const p=await ctx.newPage();
  p.on("pageerror",e=>console.log("PAGEERROR",e.message));
  await p.addInitScript(()=>{ window.__reloads=0; });
  await p.goto("file://"+path.join(__dirname,"index.html")); await p.waitForFunction(()=>window.__mock);
  await p.evaluate(()=>{const M=window.__mock;M.memberships.push({tenant_id:"T1",user_id:"u1",role:"Admin"});
    const put=(k,v)=>M.rows.set(k,{key:k,tenant_id:"T1",branch_id:"main",value:v,updated_at:"2026-10-01T00:00:00Z"});
    put("T1:main:students-data",[{id:"s1",name:"Axmed"},{id:"s2",name:"Faadumo"}]);
    put("T1:main:attendance-2026-10-26__Al-maahiruun ",{date:"2026-10-26",className:"Al-maahiruun ",records:[{id:"s1",status:"Joogto"}]});
    put("T1:main:attendance-2026-10-26__Al-maahiruun",{date:"2026-10-26",className:"Al-maahiruun",records:[{id:"s2",status:"Maqan"}]});
    M.emit("SIGNED_IN",M.mkSession("u1","t"));});
  await p.waitForSelector("aside nav");
  await p.click('aside nav button:has-text("Dejinta")'); await sleep(600);
  const [dl]=await Promise.all([p.waitForEvent("download"),p.click('button:has-text("Backup")')]);
  const file=path.join(__dirname,"backup-test.json"); await dl.saveAs(file);
  const bk=JSON.parse(fs.readFileSync(file,"utf8"));
  ok(bk.app==="NIBRAAS"&&bk.data.length===3&&bk.recordCount===3,"backup file has all 3 records");
  ok(bk.data.some(r=>r.key==="T1:main:attendance-2026-10-26__Al-maahiruun "),"backup keeps key with trailing space exactly");
  // invalid file
  fs.writeFileSync(file+".bad.json","{not json"); await p.setInputFiles('input[type=file][accept*="json"]',file+".bad.json"); await sleep(500);
  const t=await p.evaluate(()=>document.body.innerText);
  ok(/Restore-ku wuu fashilmay/.test(t)&&/JSON/.test(t),"invalid backup rejected with a message, no write");
  await p.click('button:has-text("Hagaag")'); await sleep(200);
  // damage data then restore (with an OLD tenant id in the backup keys to test remap)
  bk.data.forEach(r=>{r.key=r.key.replace(/^T1:/,"OLDTENANT:");});
  fs.writeFileSync(file,JSON.stringify(bk));
  await p.evaluate(()=>{const M=window.__mock;M.rows.get("T1:main:students-data").value=[];M.rows.delete("T1:main:attendance-2026-10-26__Al-maahiruun");});
  await p.setInputFiles('input[type=file][accept*="json"]',file); await sleep(500);
  await p.click('button:has-text("Restore")'); await sleep(1200);
  const st=await p.evaluate(()=>({s:window.__mock.rows.get("T1:main:students-data")?.value.length,a:!!window.__mock.rows.get("T1:main:attendance-2026-10-26__Al-maahiruun"),b:!!window.__mock.rows.get("T1:main:attendance-2026-10-26__Al-maahiruun "),old:[...window.__mock.rows.keys()].some(k=>k.startsWith("OLDTENANT"))}));
  ok(st.s===2&&st.a&&st.b,"restore brought back students and both class variants (trailing-space key intact)");
  ok(!st.old,"old tenant id remapped to the signed-in tenant (nothing written under another tenant)");
  await b.close();console.log(`\n${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})();
