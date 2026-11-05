import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { createSource, mapApprovedRequest, verifyApprovedHistory, sourceFields, sha256 } from './source.js';
import { processRequest } from './worker.js';
import { renderSrf } from './srf.js';
const config={templateId:'905',workflowId:'2',siteId:'322',requesterIds:['18621'],hrIds:['18622'],itIds:['18623'],mode:'observe'};
function fixture() {
  const start=1793592689071;
  return {
    request:{id:'7297',template:{id:'905'},workflow:{id:'2'},requester:{id:'18621',name:'Synthetic TA'},
      site:{id:'322',name:'Merdeka Tsingshan Indonesia'},approval_status:{name:'Approved'},resources:{},
      udf_fields:{udf_sline_19:'Synthetic Employee',udf_sline_22:'Test Analyst',udf_pick_2880:'Staff',
        udf_pick_2865:'ICT',udf_pick_2866:'Synthetic Manager',udf_date_2857:{value:'1794153600000'},
        udf_pick_2860:{name:'Notebook',id:'3303'},udf_multiselect_2861:[{name:'User Login (AD)'},{name:'Email Account'},
          {name:'Mailing List (Email Group)'},{name:'Shared Folder'}],udf_sline_2862:{value:'test@example.invalid'},
        udf_sline_2863:{value:'\\\\test-server\\share | Modify'}}},
    levels:[1,2].map(level=>({id:String(level),level,deleted:false,status:{name:'Approved'}})),
    approvals:[1,2].map(level=>({level_id:String(level),decisions:[{id:String(level),deleted:false,status:{name:'Approved'},
      action_by:{id:level===1?'18622':'18623',name:level===1?'Synthetic HR':'Synthetic IT'},
      action_taken_on:{value:String(start+(level-1)*60000)},comments:'Synthetic test approval',
      approval_level:{id:String(level),request:{id:'7297'}}}]})),
    history:[{id:'134868',operation:'CREATE',request:{id:'7297'},time:{value:String(start-100000)},diff:[]},
      {id:'134873',operation:'UPDATE',request:{id:'7297'},time:{value:String(start-1000)},diff:[{field:{name:'description'}}]},
      {id:'134910',operation:'Approve',request:{id:'7297'},time:{value:String(start+50)},diff:[{field:{name:'APPR_LEVEL'}}]}],
  };
}
const masters={masterIds:async()=>({departmentId:'773',managerId:'18622'})};
test('live-shaped mapping binds history revision, site-scoped master IDs and UTC+8 date',async()=>{
  const p=await mapApprovedRequest(fixture(),config,masters);
  assert.equal(p.revision,134873);assert.equal(p.employee.join_date,'2026-11-09');assert.equal(p.employee.department_id,'773');
  assert.equal(p.requirements.equipment,'Notebook');assert.equal(p.requirements.email_account,true);
  assert.deepEqual(p.requirements.shared_folders,[{path:'\\\\test-server\\share',access:'Modify'}]);
});
test('approval history rejects changed requirements, unknown operations, wrong identities and incomplete history',()=>{
  const changes=[
    e=>e.history.push({id:'134920',operation:'UPDATE',request:{id:'7297'},time:{value:'1793592789071'},diff:[{field:{name:'udf_pick_2860'}}]}),
    e=>e.history.push({id:'134920',operation:'UNKNOWN',request:{id:'7297'},time:{value:'1793592789071'},diff:[]}),
    e=>e.history.shift(),e=>e.history.push(e.history[0]),e=>e.approvals[1].decisions[0].action_by.id='999',
    e=>e.request.requester.id='5',e=>e.request.approval_status.name='Pending Approval',
  ];
  for(const change of changes){const e=fixture();change(e);assert.throws(()=>verifyApprovedHistory(e,config));}
});
test('conditional fields never silently lose mailing or shared-folder details',async()=>{
  const cases=[e=>e.request.udf_fields.udf_sline_2863.value='\\\\test-server\\share',
    e=>e.request.udf_fields.udf_sline_2862.value=null,
    e=>e.request.udf_fields.udf_multiselect_2861.push({name:'Unknown Service'}),
    e=>e.request.udf_fields.udf_pick_2880=null];
  for(const change of cases){const e=fixture();change(e);await assert.rejects(mapApprovedRequest(e,config,masters));}
  assert.throws(()=>sourceFields({udf_fields:{udf_pick_2860:'Desktop'},resources:{res_301:{udf_pick_2860:'Notebook'}}}));
});
test('observation does not persist, render PDF, upload or create a hire',async()=>{
  let writes=0;
  const source={read:async()=>fixture(),...masters};
  const store={gradeActive:async()=>true,prepare:async()=>{writes++;}};
  const result=await processRequest('7297',{source,store,config,render:async()=>{writes++;}});
  assert.equal(result.status,'OBSERVED_READY');assert.equal(writes,0);
});
test('delivery stores immutable PDF, acknowledges bytes, promotes once and safely replays',async t=>{
  const uploadRoot=await mkdtemp(path.join(os.tmpdir(),'sdp-bridge-test-'));t.after(()=>rm(uploadRoot,{recursive:true,force:true}));
  let job,remote,uploads=0,promotions=0;
  const source={read:async()=>fixture(),...masters,attachments:async()=>remote?[{id:'10',name:remote.name}]:[],
    upload:async(_id,name,bytes)=>{uploads++;remote={name,bytes};return '10';},download:async()=>remote.bytes};
  const store={gradeActive:async()=>true,lookup:async()=>job,
    prepare:async(p,hash)=>job||=( {revision:p.revision,payload_hash:hash,processing_status:'PREPARED'}),
    document:async(_id,file,hash)=>{job.document_path=file;job.document_hash=hash;},
    claimUpload:async()=>{job.processing_status='UPLOAD_IN_FLIGHT';return true;},
    attachment:async(_id,id)=>{job.attachment_id=id;job.processing_status='ATTACHED';},
    promote:async()=>{promotions++;job.processing_status='COMPLETE';return 'test-hire';}};
  const options={source,store,config:{...config,mode:'process',uploadRoot}};
  await processRequest('7297',options);await processRequest('7297',options);
  assert.equal(uploads,1);assert.equal(promotions,1);assert.equal(sha256(await readFile(job.document_path)),job.document_hash);
  assert.equal((await PDFDocument.load(remote.bytes)).getPageCount(),1);
});
test('ambiguous upload timeout does not cause a second attachment or a hire',async t=>{
  const uploadRoot=await mkdtemp(path.join(os.tmpdir(),'sdp-bridge-timeout-'));t.after(()=>rm(uploadRoot,{recursive:true,force:true}));
  let job,uploads=0,promotions=0;
  const source={read:async()=>fixture(),...masters,attachments:async()=>[],upload:async()=>{uploads++;throw new Error('timeout');}};
  const store={gradeActive:async()=>true,lookup:async()=>job,prepare:async(p,h)=>job||=({payload_hash:h,processing_status:'PREPARED'}),
    document:async(_id,p,h)=>{job.document_path=p;job.document_hash=h;},claimUpload:async()=>{job.processing_status='UPLOAD_IN_FLIGHT';return true;},
    promote:async()=>{promotions++;}};
  const args={source,store,config:{...config,mode:'process',uploadRoot}};
  await assert.rejects(processRequest('7297',args));
  await assert.rejects(processRequest('7297',args),{message:'UPLOAD_OUTCOME_REQUIRES_RECONCILIATION'});
  assert.equal(uploads,1);assert.equal(promotions,0);
});
test('long approved access lists are preserved over continuation pages',async()=>{
  const p=await mapApprovedRequest(fixture(),config,masters);
  p.requirements.shared_folders=Array.from({length:70},(_,i)=>({path:`\\\\test-server\\synthetic-long-share-${i}`,access:'Read'}));
  p.employee.name='Synthetic long employee name '.repeat(8).trim();
  p.notes='Synthetic approved justification with preserved detail. '.repeat(45);
  const bytes=await renderSrf(p);
  const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>1);
  for(const page of pdf.getPages()) {assert.ok(Math.abs(page.getWidth()-595.32)<0.02);assert.ok(Math.abs(page.getHeight()-841.92)<0.02);}
  if(process.env.SDP_LONG_PDF_OUTPUT){const {writeFile}=await import('node:fs/promises');await writeFile(process.env.SDP_LONG_PDF_OUTPUT,bytes);}
});

// Optional local visual QA output, containing synthetic data only.
if(process.env.SDP_SYNTHETIC_PDF_OUTPUT){const p=await mapApprovedRequest(fixture(),config,masters);
  const {writeFile}=await import('node:fs/promises');await writeFile(process.env.SDP_SYNTHETIC_PDF_OUTPUT,await renderSrf(p,{requestedAt:Date.parse('2026-11-01T14:00:00Z')}));}


test('department resolution uses unique global fallback, preferring an exact site match',async()=>{
  let departments=[{id:'1802',name:'Human Resources',site:null},{id:'1202',name:'Human Resources',site:{id:'303'}}];
  let users=[{id:'3387',name:'Synthetic Manager'}];
  const source=createSource({baseUrl:'https://synthetic.invalid/api/v3/',token:'synthetic-token'},async url=>({ok:true,
    json:async()=>({response_status:{status_code:2000},list_info:{has_more_rows:false},
      ...(url.pathname.endsWith('/departments')?{departments}:{users})})}));
  assert.deepEqual(await source.masterIds('Human Resources','Synthetic Manager','322'),{departmentId:'1802',managerId:'3387'});
  departments.push({id:'1900',name:'Human Resources',site:{id:'322'}});
  assert.equal((await source.masterIds('Human Resources','Synthetic Manager','322')).departmentId,'1900');
  departments.push({id:'1901',name:'Human Resources',site:{id:'322'}});
  await assert.rejects(source.masterIds('Human Resources','Synthetic Manager','322'),{message:'MASTER_MATCH_NOT_UNIQUE'});
});

test('department fallback rejects another site, duplicate globals and ambiguous users',async()=>{
  let departments=[{id:'1202',name:'Human Resources',site:{id:'303'}}];
  let users=[{id:'3387',name:'Synthetic Manager'}];
  const source=createSource({baseUrl:'https://synthetic.invalid/api/v3/',token:'synthetic-token'},async url=>({ok:true,
    json:async()=>({response_status:{status_code:2000},list_info:{has_more_rows:false},
      ...(url.pathname.endsWith('/departments')?{departments}:{users})})}));
  await assert.rejects(source.masterIds('Human Resources','Synthetic Manager','322'));
  departments=[{id:'1802',name:'Human Resources',site:null},{id:'1803',name:'Human Resources',site:null}];
  await assert.rejects(source.masterIds('Human Resources','Synthetic Manager','322'));
  departments.pop();users.push({id:'3388',name:'Synthetic Manager'});
  await assert.rejects(source.masterIds('Human Resources','Synthetic Manager','322'));
});


test('native CREATE attachment audit preserves original revision and supports delivery replay',()=>{
  const e=fixture();
  const event={id:'135000',operation:'CREATE',request:{id:'7297'},time:{value:'1793592789071'},
    diff:[{field:{name:'ATTACHMENT'},previous_value:'',current_value:'MTI-SRF-7297-r134873-0123456789abcdef.pdf'}]};
  e.history.unshift(event);assert.equal(verifyApprovedHistory(e,config),134873);
  event.diff[0].current_value='MTI-SRF-7297-r134874-0123456789abcdef.pdf';
  assert.throws(()=>verifyApprovedHistory(e,config),{message:'ATTACHMENT_REVISION_MISMATCH'});
  event.diff[0].current_value='unrelated.pdf';assert.throws(()=>verifyApprovedHistory(e,config));
  event.diff[0].current_value='MTI-SRF-7297-r134873-0123456789abcdef.pdf';
  event.diff.push({field:{name:'udf_pick_2860'},current_value:'Desktop'});assert.throws(()=>verifyApprovedHistory(e,config));
});

test('attachment history cannot conceal request creation or predate final approval',()=>{
  const e=fixture();e.history=e.history.filter(h=>h.operation!=='CREATE');
  e.history.push({id:'135000',operation:'CREATE',request:{id:'7297'},time:{value:'1793592789071'},
    diff:[{field:{name:'ATTACHMENT'},previous_value:'',current_value:'MTI-SRF-7297-r134873-0123456789abcdef.pdf'}]});
  assert.throws(()=>verifyApprovedHistory(e,config),{message:'REVISION_UNRESOLVED'});
  const f=fixture();f.history.push({...e.history.at(-1),time:{value:'1793592689072'}});
  assert.throws(()=>verifyApprovedHistory(f,config));
});

test('decision stamps embed approved and rejected PNGs and refuse pending', async () => {
  const { drawApprovalStamp } = await import('./approval-stamp.js');
  for (const decision of ['approved', 'rejected']) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage();
    await drawApprovalStamp(pdf, page, decision, { x: 40, y: 40 });
    const reopened = await PDFDocument.load(await pdf.save());
    assert.equal(reopened.getPageCount(), 1);
    assert.ok((await pdf.save()).length > 1000);
  }
  const pdf = await PDFDocument.create();
  await assert.rejects(drawApprovalStamp(pdf, pdf.addPage(), 'pending', { x: 0, y: 0 }), /Unsupported stamp/);
});

test('selected HR role is bound to approved payload; legacy hashes remain unchanged', async () => {
  const e = fixture();
  const legacy = await mapApprovedRequest(e, config, masters);
  assert.equal(legacy.approvals[0].role, undefined);
  for (const [label, role] of [['HR Superintendent', 'hr_superintendent'], ['HR Manager', 'hr_manager']]) {
    e.request.udf_fields.udf_pick_test_role = label;
    const data = await mapApprovedRequest(e, { ...config, hrRoleField: 'udf_pick_test_role' }, masters);
    assert.equal(data.approvals[0].role, role);
    const pdf = await PDFDocument.load(await renderSrf(data));
    assert.equal(pdf.getPageCount(), 1);
    await assert.rejects(renderSrf(data, { hrRole: role === 'hr_manager' ? 'hr_superintendent' : 'hr_manager' }), /conflicts/);
  }
  e.request.udf_fields.udf_pick_test_role = 'Other';
  await assert.rejects(mapApprovedRequest(e, { ...config, hrRoleField: 'udf_pick_test_role' }, masters));
});
