import { build } from "/opt/npm-tools/node_modules/esbuild/lib/main.js";
import path from "node:path"; import fs from "node:fs";
const G="/home/claude/.npm-global/lib/node_modules";
const here=path.dirname(new URL(import.meta.url).pathname);
fs.mkdirSync(here+"/site/assets",{recursive:true});
for (const id of ["v1","v2"]) {
  await build({
    entryPoints:[here+"/../proj/nibraas-al-madaaris-main/src/main.jsx"], bundle:true, outfile:here+`/site/assets/app-${id}.js`, format:"iife",
    loader:{".jsx":"jsx",".js":"jsx",".png":"dataurl",".svg":"dataurl",".css":"empty"}, jsx:"automatic",
    define:{"process.env.NODE_ENV":'"development"',"import.meta.env":"{}","__BUILD_ID__":JSON.stringify(id)},
    alias:{"lucide-react":here+"/lucide-shim.jsx","react":G+"/react","react-dom":G+"/react-dom"},
    plugins:[{name:"mock",setup(b){b.onResolve({filter:/lib\/supabase$/},()=>({path:here+"/mock-supabase.js"}));}}],
    logLevel:"warning",
  });
}
console.log("pwa bundles ok");
