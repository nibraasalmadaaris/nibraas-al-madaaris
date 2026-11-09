const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const path = require("path");
let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++;console.log("PASS",m);} else {fail++;console.log("FAIL",m);} };
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1280,height:900}}); const p=await ctx.newPage();
  const uiErrors=[]; p.on("pageerror",e=>uiErrors.push("pageerror: "+e.message)); p.on("console",m=>{ if(m.type()==="error" && /NIBRAAS UI error|Maximum update depth|Rendered more hooks|Cannot read/.test(m.text())) uiErrors.push(m.text().slice(0,160)); });
  await p.goto("file://"+path.join(__dirname,"index.html")); await p.waitForFunction(()=>window.__mock);
  await p.evaluate(()=>{ const M=window.__mock; M.memberships.push({tenant_id:"T1",user_id:"u1",role:"Admin"});
    const put=(k,v)=>M.rows.set("T1:main:"+k,{key:"T1:main:"+k,tenant_id:"T1",value:v});
    const today=new Date().toISOString().slice(0,10), mon=today.slice(0,7);
    put("students-data",[{id:"s1",name:"Axmed Cali",className:"Al-maahiruun",status:"Firfircoon"},{id:"s2",name:"Faadumo Nuur",className:"An-nujuum",status:"Firfircoon"}]);
    put("classes-data",[{id:"c1",name:"Al-maahiruun",capacity:30},{id:"c2",name:"An-nujuum",capacity:25}]);
    put("employees-data",[{id:"e1",name:"Macalin Maxamad",role:"Macalin"}]);
    put("payroll-data",[{id:"p1",employeeName:"Macalin Maxamad",netSalary:300,month:mon,status:"La bixiyay"}]);
    put("activities-data",[{id:"a1",title:"Tartan Qur'aan",date:today}]);
    put("quran-progress-data",[{id:"q1",studentName:"Axmed Cali",date:today,type:"Xifdhi"}]);
    put("finance-data",[{id:"f1",type:"Lacag La Bixiyay",amount:50,studentName:"Axmed Cali",date:today}]);
    put("attendance-"+today+"__Al-maahiruun",{date:today,className:"Al-maahiruun",records:[{id:"s1",name:"Axmed Cali",status:"Joogto"}]});
    window.__mock.emit("SIGNED_IN",M.mkSession("u1","t")); });
  await p.waitForSelector("aside nav",{timeout:10000});
  const labels=await p.$$eval("aside nav button",bs=>bs.map(b=>b.innerText.trim()));
  ok(labels.length>=15,"admin sees "+labels.length+" menu items");
  for(const l of labels){
    await p.click(`aside nav button:has-text("${l}")`); await sleep(500);
    const txt=await p.evaluate(()=>document.getElementById("root").innerText);
    const crashed=/Wax baa khaldamay|Something went wrong|khalad/i.test(txt.slice(0,400)) && !(await p.$("aside nav"));
    if(crashed||!(await p.$("aside nav"))) ok(false,"screen crashed: "+l); else pass++;
  }
  ok(uiErrors.length===0,"no React crash/hook errors across "+labels.length+" screens "+JSON.stringify(uiErrors.slice(0,3)));
  // CRUD on Ardayda
  await p.click('aside nav button:has-text("Ardayda")'); await sleep(400);
  await p.click('button:has-text("Ku dar")'); await sleep(200);
  await p.fill('input[type=text]', "Cabdi Test"); 
  await p.click('form button[type=submit]'); await sleep(600);
  let srv=await p.evaluate(()=>window.__mock.rows.get("T1:main:students-data").value);
  ok(srv.length===3 && srv.some(s=>s.name==="Cabdi Test"),"CRUD create: student saved to storage (3 records)");
  ok(await p.evaluate(()=>document.body.innerText.includes("Cabdi Test")),"CRUD create: shown in list");
  // search
  await p.fill('input[placeholder="Raadi..."]',"Faadumo"); await sleep(200);
  const vis=await p.evaluate(()=>document.body.innerText);
  ok(vis.includes("Faadumo")&&!vis.includes("Cabdi Test"),"search filter works");
  await p.fill('input[placeholder="Raadi..."]',""); await sleep(200);
  // edit
  const row=p.locator("text=Cabdi Test").first(); 
  await row.click(); await sleep(300);
  await p.fill('input[type=text]',"Cabdi Edited"); await p.click('form button[type=submit]'); await sleep(600);
  srv=await p.evaluate(()=>window.__mock.rows.get("T1:main:students-data").value);
  ok(srv.length===3 && srv.some(s=>s.name==="Cabdi Edited")&&!srv.some(s=>s.name==="Cabdi Test"),"CRUD update: edited in place, no duplicate");
  // other device adds student meanwhile, then we delete one -> other's record must survive
  await p.evaluate(()=>{const M=window.__mock;const r=M.rows.get("T1:main:students-data");r.value=[...r.value,{id:"s-other",name:"Qof Kale",status:"Firfircoon"}];});
  const card=p.locator("div").filter({hasText:"Cabdi Edited"}).last();
  const del=p.locator('button:has(svg[data-icon="Trash2"])'); const n=await del.count();
  // find delete button in the row of Cabdi Edited
  const rowDel=p.locator('xpath=//*[contains(text(),"Cabdi Edited")]/ancestor::div[.//button[.//*[@data-icon="Trash2"]]][1]//button[.//*[@data-icon="Trash2"]]').first();
  await rowDel.click(); await sleep(200); await p.locator('button:has-text("Xaqiiji")').first().click(); await sleep(800);
  srv=await p.evaluate(()=>window.__mock.rows.get("T1:main:students-data").value);
  ok(!srv.some(s=>s.name==="Cabdi Edited")&&srv.some(s=>s.id==="s-other")&&srv.length===3,"CRUD delete: removed; record added by another device is kept ("+srv.map(s=>s.name).join(", ")+")");
  // storage failure on create keeps UI honest
  await p.click('button:has-text("Ku dar")'); await p.fill('input[type=text]',"Waa Fashil"); 
  await p.evaluate(()=>{window.__mock.failStorageWrite={message:"boom"}});
  await p.click('form button[type=submit]'); await sleep(700);
  await p.evaluate(()=>{window.__mock.failStorageWrite=null});
  srv=await p.evaluate(()=>window.__mock.rows.get("T1:main:students-data").value);
  ok(!srv.some(s=>s.name==="Waa Fashil"),"failed save: nothing stored");
  const toast=await p.evaluate(()=>document.getElementById("nibraas-toast-host")?.innerText||"");
  ok(/fashilantay|lama kaydin/i.test(toast),"failed save: user sees an error toast: "+toast.slice(0,60));
  await b.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
