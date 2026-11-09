import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
import path from "node:path";
const G="/home/claude/.npm-global/lib/node_modules";
const here=path.dirname(new URL(import.meta.url).pathname);
await build({
  entryPoints:[here+"/entry.jsx"], bundle:true, outfile:here+"/out/bundle.js", format:"iife",
  loader:{".jsx":"jsx",".js":"jsx",".png":"dataurl",".svg":"dataurl"}, jsx:"automatic",
  define:{"process.env.NODE_ENV":'"development"',"import.meta.env":"{}","import.meta.env.VITE_SUPABASE_URL":'"x"'},
  alias:{"lucide-react":here+"/lucide-shim.jsx","react":G+"/react","react-dom":G+"/react-dom"},
  plugins:[{name:"mock",setup(b){b.onLoad({filter:/nibraas-al-madaaris-main\/src\/App\.jsx$/},async(a)=>{const fs=await import("node:fs");return {contents:fs.readFileSync(a.path,"utf8")+"\n;window.__core={saveObj,loadObj,loadArrSafe,setStorageTenant,setStorageBranch,listKeys,resetStorageSync,merge3,canon};",loader:"jsx"};});b.onResolve({filter:/lib\/supabase$/},()=>({path:here+"/mock-supabase.js"}));}}],
  logLevel:"warning",
});
console.log("bundle ok");
