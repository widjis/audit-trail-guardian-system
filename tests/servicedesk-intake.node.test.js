import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServiceDeskRouter } from '../src/server/routes/servicedesk-integration.js';
import { newHireSchema, payloadHash } from '../src/server/services/servicedesk-contract.js';

const token = 'test-only-credential-never-use-in-production-1234';
const payload = () => ({
  schema_version: 1, request_id: '7297', template_id: '905', revision: 1,
  requester: { id: '100', name: 'Synthetic TA' },
  employee: { name: 'Synthetic Employee', employee_id: 'TEST-001', title: 'Test',
    position_grade: 'Staff', department_id: '1', department_name: 'Test',
    direct_manager_id: '200', direct_manager_name: 'Synthetic Manager',
    site_id: '1', site_name: 'MTI', join_date: '2026-11-10' },
  requirements: { equipment: 'Notebook', ad_login: true, email_account: true,
    mailing_lists: ['test@example.invalid'], shared_folders: [{ path: '\\\\test\\share', access: 'Read' }] },
  approvals: [
    { stage: 'hr', approver_id: '300', approver_name: 'Synthetic HR', decision: 'approved', decided_at: '2026-11-02T01:00:00Z' },
    { stage: 'site_it_head', approver_id: '400', approver_name: 'Synthetic IT', decision: 'approved', decided_at: '2026-11-02T02:00:00Z' },
  ],
});

test('contract rejects missing grade, invalid date, rejected/missing/reversed approvals, unknown fields', () => {
  assert.equal(newHireSchema.safeParse(payload()).success, true);
  const variants = [];
  let p = payload(); delete p.employee.position_grade; variants.push(p);
  p = payload(); p.employee.join_date = '2026-02-30'; variants.push(p);
  p = payload(); p.approvals[1].decision = 'rejected'; variants.push(p);
  p = payload(); p.approvals.pop(); variants.push(p);
  p = payload(); p.approvals.reverse(); variants.push(p);
  p = payload(); p.approvals[1].decided_at = '2026-11-01T00:00:00Z'; variants.push(p);
  p = payload(); p.employee.password = 'must-not-enter-contract'; variants.push(p);
  p = payload(); p.requirements.shared_folders[0].access = 'Full Control'; variants.push(p);
  for (const value of variants) assert.equal(newHireSchema.safeParse(value).success, false);
});

test('hash ignores JSON property ordering and includes approved requirements', () => {
  const p = newHireSchema.parse(payload());
  assert.equal(payloadHash(p), payloadHash(Object.fromEntries(Object.entries(p).reverse())));
  const changed = structuredClone(p); changed.requirements.equipment = 'Desktop';
  assert.notEqual(payloadHash(p), payloadHash(changed));
});

test('HTTP boundary, dry run, live grade validation, duplicate and conflict behavior', async t => {
  let env = { SDP_INTAKE_ENABLED: 'true', SDP_INTAKE_TOKEN: token, SDP_INTAKE_TEMPLATE_IDS: '905' };
  let reads = 0, writes = 0;
  const records = new Map();
  const store = {
    async activeGrades() { reads++; return ['Staff', 'Manager']; },
    async accept(p, hash) {
      writes++;
      const key = `${p.request_id}:${p.revision}`, old = records.get(key);
      if (old) return { id: old.id, duplicate: true, conflict: old.hash !== hash };
      const row = { id: `receipt-${records.size + 1}`, hash }; records.set(key, row);
      return { ...row, duplicate: false };
    },
  };
  const app = express(); app.use(express.json({ limit: '100kb' }));
  app.use('/api/integrations/servicedesk', createServiceDeskRouter({ store, config: () => env }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/api/integrations/servicedesk/new-hires`;
  const post = (p = payload(), suffix = '', auth = `Bearer ${token}`) => fetch(url + suffix, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth }, body: JSON.stringify(p),
  });
  env.SDP_INTAKE_ENABLED = 'false'; assert.equal((await post()).status, 503);
  env.SDP_INTAKE_ENABLED = 'true';
  assert.equal((await post(payload(), '', 'Bearer fake')).status, 401);
  // A base64 app session is never accepted as the machine credential.
  assert.equal((await post(payload(), '', `Bearer ${Buffer.from('{"role":"admin"}').toString('base64')}`)).status, 401);
  assert.equal(reads, 0); assert.equal(writes, 0);
  let p = payload(); p.template_id = '903'; assert.equal((await post(p)).status, 422);
  assert.equal((await post(payload(), '?dry_run=false')).status, 400);
  p = payload(); p.employee.position_grade = 'Not An Active Grade'; assert.equal((await post(p)).status, 422);
  let res = await post(payload(), '?dry_run=true'); assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { valid: true, persisted: false }); assert.equal(writes, 0);
  res = await post(); assert.equal(res.status, 201);
  const created = await res.json(); assert.equal(created.hire_created, false);
  assert.equal(created.provisioning_started, false); assert.equal(created.status, 'RECEIVED_PENDING_VERIFICATION');
  res = await post(); assert.equal(res.status, 200); assert.equal((await res.json()).receipt_id, created.receipt_id);
  p = payload(); p.requirements.equipment = 'Desktop'; assert.equal((await post(p)).status, 409);
  const duplicates = await Promise.all(Array.from({ length: 8 }, () => post()));
  assert.ok(duplicates.every(r => r.status === 200)); assert.equal(records.size, 1);
  p = payload(); p.revision = 2; assert.equal((await post(p)).status, 201);
  store.activeGrades = async () => { throw new Error('private-database-error'); };
  res = await post(); assert.equal(res.status, 503);
  assert.equal((await res.text()).includes('private-database-error'), false);
});
