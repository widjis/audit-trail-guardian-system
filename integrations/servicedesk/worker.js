import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { payloadHash } from '../../src/server/services/servicedesk-contract.js';
import { Hold, mapApprovedRequest, sha256 } from './source.js';
import { renderSrf } from './srf.js';

export async function processRequest(id, { source, store, config, render = renderSrf }) {
  const evidence = await source.read(id);
  const payload = await mapApprovedRequest(evidence, config, source);
  if (!await store.gradeActive(payload.employee.position_grade)) throw new Hold('GRADE_NOT_ACTIVE');
  const hash = payloadHash(payload);
  if (config.mode !== 'process') return { request_id: id, status: 'OBSERVED_READY', persisted: false };
  let job = await store.prepare(payload, hash, evidence);
  if (job.processing_status === 'COMPLETE') return { request_id: id, status: 'COMPLETE', duplicate: true };
  const name = `MTI-SRF-${id}-r${payload.revision}-${hash.slice(0,16)}.pdf`;
  const directory = path.join(config.uploadRoot, 'srf', 'servicedesk');
  await mkdir(directory, { recursive: true, mode: 0o750 });
  const file = path.join(directory,name).replaceAll('\\','/');
  let bytes;
  try { bytes = await readFile(file); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if(job.document_hash) throw new Hold('DOCUMENT_MISSING');
    bytes = await render(payload, { requestedAt: Number(evidence.request.created_time?.value) });
    // Immutable file: concurrent writers may not overwrite a previous artifact.
    try { await writeFile(file,bytes,{flag:'wx',mode:0o640}); }
    catch (writeError) { if(writeError.code!=='EEXIST') throw writeError;bytes=await readFile(file); }
  }
  const documentHash=sha256(bytes);
  if(job.document_hash && job.document_hash!==documentHash) throw new Hold('DOCUMENT_HASH_MISMATCH');
  if(!job.document_hash) {await store.document(id,file,documentHash);job=await store.lookup(id);}
  // Re-read approvals, history and source values immediately before external mutation.
  const latest=await mapApprovedRequest(await source.read(id),config,source);
  if(payloadHash(latest)!==hash) throw new Hold('SOURCE_CHANGED_BEFORE_DELIVERY');
  if(!job.attachment_id) {
    const attachments=await source.attachments(id);
    const candidates=attachments.filter(a=>a.name===name);
    if(candidates.length>1) throw new Hold('DUPLICATE_ATTACHMENT_REQUIRES_REVIEW');
    if(candidates.length===1) {
      if(sha256(await source.download(id,String(candidates[0].id)))!==documentHash) throw new Hold('REMOTE_DOCUMENT_HASH_MISMATCH');
      await store.attachment(id,String(candidates[0].id));
    } else {
      // Once a PUT is attempted, absence in a subsequent list is not proof it failed.
      // Hold ambiguous timeouts; never automatically upload a second copy.
      if(job.processing_status==='UPLOAD_IN_FLIGHT') throw new Hold('UPLOAD_OUTCOME_REQUIRES_RECONCILIATION');
      if(!await store.claimUpload(id)) throw new Hold('UPLOAD_ALREADY_CLAIMED');
      const attachmentId=await source.upload(id,name,bytes);
      if(sha256(await source.download(id,attachmentId))!==documentHash) throw new Hold('REMOTE_DOCUMENT_HASH_MISMATCH');
      await store.attachment(id,attachmentId);
    }
  } else if(sha256(await source.download(id,job.attachment_id))!==documentHash) throw new Hold('REMOTE_DOCUMENT_HASH_MISMATCH');
  const finalEvidence=await source.read(id);
  const business=q=>({id:q.id,template:q.template,requester:q.requester,site:q.site,
    udf_fields:q.udf_fields,resources:q.resources,description:q.description,is_trashed:q.is_trashed,cancel_requested:q.cancel_requested});
  if(payloadHash(business(finalEvidence.request))!==payloadHash(business(evidence.request)) ||
    payloadHash(finalEvidence.approvals)!==payloadHash(evidence.approvals) ||
    payloadHash(finalEvidence.levels)!==payloadHash(evidence.levels) ||
    finalEvidence.request.approval_status?.name!=='Approved') throw new Hold('SOURCE_CHANGED_BEFORE_PROMOTION');
  // SQL transaction links one hire only after both copies exist and are acknowledged.
  await store.promote(payload,hash,file,documentHash);
  return { request_id:id,status:'COMPLETE',duplicate:false };
}
