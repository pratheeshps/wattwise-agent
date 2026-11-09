import {spawn} from "node:child_process";
import assert from "node:assert/strict";
const port=3100,base="http://127.0.0.1:"+port;
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","-p",String(port)],{stdio:"ignore",env:{...process.env,PORT:String(port)}});
async function wait(){for(let i=0;i<40;i++){if(server.exitCode!=null)throw Error("Next server exited");try{const r=await fetch(base);if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,1000))}throw Error("Next server did not start")}
async function expectStatus(p,status,label){assert.equal(p.status,status,label);const b=await p.json();assert.equal(typeof b.error,"string",label+" error payload");}
try{
 await wait();
 for(const [path,heading] of [["/","Your electricity"],["/solar","Your solar energy"],["/sign-in","WATTWISE ACCOUNT"]]){const r=await fetch(base+path);assert.equal(r.status,200,path+" renders");const html=await r.text();assert.ok(html.includes(heading),path+" heading");assert.ok(html.includes('name="viewport"'),path+" responsive viewport")}
 await expectStatus(await fetch(base+"/api/bills"),401,"bill list requires authentication");
 await expectStatus(await fetch(base+"/api/bills",{method:"POST",body:new FormData()}),401,"bill create requires authentication");
 await expectStatus(await fetch(base+"/api/bills/preview",{method:"POST",body:new FormData()}),401,"bill preview requires authentication");
 await expectStatus(await fetch(base+"/api/bills/test-id",{method:"DELETE"}),401,"bill delete requires authentication");
 await expectStatus(await fetch(base+"/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({selectedMonth:"2026-10"})}),401,"analysis requires authentication");
 const auth=await fetch(base+"/api/auth/get-session");assert.equal(auth.status,200,"auth session endpoint responds");
 console.log("Production smoke tests passed: public pages render and every personal-data API rejects unauthenticated access.");
}finally{server.kill("SIGTERM");}
