const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const path = require("path");
let pass=0, fail=0; const ok=(c,m)=>{ if(c){pass++;console.log("PASS",m);} else {fail++;console.log("FAIL",m);} };
(async()=>{
  const b=await chromium.launch(); const p=await b.newPage();
  p.on("pageerror",e=>console.log("PAGEERROR",e.message));
  await p.goto("file://"+__dirname+"/index.html"); await p.waitForFunction(()=>window.__core);
  const R=(f,...a)=>p.evaluate(f,...a);
  await R(()=>{ window.__core.setStorageTenant("T1"); window.__core.setStorageBranch("main"); });
  const seed=(k,v)=>R(([k,v])=>window.__mock.rows.set("T1:main:"+k,{key:"T1:main:"+k,tenant_id:"T1",value:v}),[k,v]);
  const srv=(k)=>R((k)=>{const r=window.__mock.rows.get("T1:main:"+k);return r?r.value:null},k);
  const wr=()=>R(()=>window.__mock.calls.storageWrites);

  // C1 save without read
  await seed("c1",[{id:1}]); let w0=await wr();
  let r=await R(()=>window.__core.saveObj("c1",[{id:9}],{silent:true}));
  ok(r===false && (await wr())===w0 && JSON.stringify(await srv("c1"))==='[{"id":1}]',"C1 save without prior read is refused, data untouched");
  // C2 read fails -> screen has [] -> save refused
  await seed("c2",[{id:1},{id:2}]);
  await R(()=>{window.__mock.failStorageRead={message:"Failed to fetch",status:0}});
  const loaded=await R(()=>window.__core.loadObj("c2",[]));
  await R(()=>{window.__mock.failStorageRead=null});
  r=await R(()=>window.__core.saveObj("c2",[{id:99}],{silent:true}));
  ok(loaded.length===0 && r===false && (await srv("c2")).length===2,"C2 failed read (looks empty) then save: refused, 2 stored records intact");
  // after successful reload, save allowed
  await R(()=>window.__core.loadObj("c2",[]));
  r=await R(()=>window.__core.saveObj("c2",[{id:1},{id:2},{id:3}],{silent:true}));
  ok(r===true && (await srv("c2")).length===3,"C2b save works again after a successful read");
  // C3 write failure
  await R(()=>window.__core.loadObj("c2",[]));
  await R(()=>{window.__mock.failStorageWrite={message:"boom"}});
  r=await R(()=>window.__core.saveObj("c2",[{id:1}],{silent:true}));
  await R(()=>{window.__mock.failStorageWrite=null});
  ok(r===false && (await srv("c2")).length===3,"C3 write error returns false, stored data unchanged");
  // C4 two devices add different records (simulate: A loads, B writes, A saves)
  await seed("c4",[{id:1,n:"a"},{id:2,n:"b"}]);
  await R(()=>window.__core.loadObj("c4",[]));                       // device A view
  await seed("c4",[{id:1,n:"a"},{id:2,n:"b"},{id:3,n:"fromB"}]);     // device B saved
  r=await R(()=>window.__core.saveObj("c4",[{id:1,n:"a"},{id:2,n:"b"},{id:4,n:"fromA"}],{silent:true}));
  ok(r===true && JSON.stringify((await srv("c4")).map(x=>x.id).sort())==='[1,2,3,4]',"C4 two devices adding records: both kept (1,2,3,4)");
  // C5 A deletes 2, B edits 1
  await seed("c5",[{id:1,n:"a"},{id:2,n:"b"}]);
  await R(()=>window.__core.loadObj("c5",[]));
  await seed("c5",[{id:1,n:"EDITED_B"},{id:2,n:"b"}]);
  r=await R(()=>window.__core.saveObj("c5",[{id:1,n:"a"}],{silent:true}));
  const c5=await srv("c5");
  ok(r===true && c5.length===1 && c5[0].n==="EDITED_B","C5 delete on A + edit on B: B's edit survives, delete applied");
  // C6 stale unchanged list does not wipe newer data
  await seed("c6",[{id:1}]);
  await R(()=>window.__core.loadObj("c6",[]));
  await seed("c6",[{id:1},{id:2},{id:3}]);
  r=await R(()=>window.__core.saveObj("c6",[{id:1}],{silent:true}));
  ok(r===true && (await srv("c6")).length===3,"C6 stale unchanged screen cannot overwrite newer records");
  // C6b empty list vs existing data (screen thinks empty but row existed when read)
  await seed("c6b",[]);
  await R(()=>window.__core.loadObj("c6b",[]));
  await seed("c6b",[{id:1},{id:2}]);
  r=await R(()=>window.__core.saveObj("c6b",[],{silent:true}));
  ok((await srv("c6b")).length===2,"C6b saving [] over a list another device filled keeps the data");
  // C7 list without ids both changed -> refuse
  await seed("c7",["a","b"]); await R(()=>window.__core.loadObj("c7",[]));
  await seed("c7",["a","b","x"]);
  r=await R(()=>window.__core.saveObj("c7",["a","b","y"],{silent:true}));
  ok(r===false && (await srv("c7")).length===3 && (await srv("c7"))[2]==="x","C7 un-mergeable concurrent edit is refused, not overwritten");
  // C8 config object field merge
  await seed("c8",{a:1,b:2}); await R(()=>window.__core.loadObj("c8",null));
  await seed("c8",{a:1,b:3});
  r=await R(()=>window.__core.saveObj("c8",{a:5,b:2},{silent:true}));
  const c8=await srv("c8"); ok(r===true && c8.a===5 && c8.b===3,"C8 object settings merged field by field");
  // C9 listKeys failure throws (not silent empty)
  await R(()=>{window.__mock.failStorageRead={message:"Failed to fetch",status:0}});
  const threw=await R(async()=>{try{await window.__core.listKeys("attendance-");return false}catch(e){return true}});
  await R(()=>{window.__mock.failStorageRead=null});
  ok(threw,"C9 listKeys read failure throws instead of returning an empty list");
  await b.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
