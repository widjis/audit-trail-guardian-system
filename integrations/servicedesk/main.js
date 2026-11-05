import { mkdir, writeFile, rename } from 'node:fs/promises';
import { createSource, Hold } from './source.js';
import { createStore } from './store.js';
import { processRequest } from './worker.js';

const env=process.env;
const ids=name=>(env[name]||'').split(',').map(s=>s.trim()).filter(Boolean);
const config={baseUrl:env.SDP_API_URL,token:env.SDP_API_TOKEN,mode:env.SDP_BRIDGE_MODE||'observe',
  hrRoleField:env.SDP_BRIDGE_HR_ROLE_FIELD,templateId:env.SDP_BRIDGE_TEMPLATE_ID,workflowId:env.SDP_BRIDGE_WORKFLOW_ID,siteId:env.SDP_BRIDGE_SITE_ID,defaultSiteName:env.SDP_BRIDGE_DEFAULT_SITE_NAME,
  requesterIds:ids('SDP_BRIDGE_REQUESTER_IDS'),hrIds:ids('SDP_BRIDGE_HR_IDS'),itIds:ids('SDP_BRIDGE_IT_IDS'),uploadRoot:env.SDP_UPLOAD_ROOT||'/app/uploads'};
const numeric=s=>/^[1-9][0-9]{0,19}$/.test(s||'');
if(!['observe','process'].includes(config.mode)||![config.templateId,config.workflowId,config.siteId].every(numeric)||
  [config.requesterIds,config.hrIds,config.itIds].some(xs=>!xs.length||!xs.every(numeric))) {
  console.error('ServiceDesk bridge configuration invalid');process.exit(1);
}
const interval=Math.max(30000,Number(env.SDP_POLL_INTERVAL_MS)||60000);
const source=createSource(config);
let store,stopping=false;
process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
await mkdir('/state',{recursive:true,mode:0o700});
while(!stopping) {
  const summary={checked_at:new Date().toISOString(),mode:config.mode,healthy:false,requests:[]};
  try {
    store ||= await createStore(env);
    const requests=await source.discover();
    for(const id of requests) {
      if(stopping) break;
      try { summary.requests.push(await processRequest(id,{source,store,config})); }
      catch(error) {summary.requests.push({request_id:id,status:'HELD',reason:error instanceof Hold?error.code:'PROCESSING_UNAVAILABLE'});}
    }
    summary.healthy=true;
  } catch {summary.error='SOURCE_OR_DATABASE_UNAVAILABLE';}
  await writeFile('/state/health.tmp',JSON.stringify(summary),{mode:0o600});await rename('/state/health.tmp','/state/health.json');
  // Only IDs/state codes; no employee data, comments, SQL, tokens or credentials.
  console.log(JSON.stringify(summary));
  const until=Date.now()+interval;
  while(!stopping&&Date.now()<until) await new Promise(resolve=>setTimeout(resolve,1000));
}
if(store) await store.close();
