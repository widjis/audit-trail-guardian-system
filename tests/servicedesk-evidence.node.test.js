import test from 'node:test';
import assert from 'node:assert/strict';
import { createServiceDeskEvidenceClient, assessServiceDeskEvidence } from '../src/server/services/servicedesk-evidence.js';

const policy = { templateIds: ['905'], workflowId: '2', approverIds: [['300'], ['400']] };
const evidence = () => ({
  request: { id: '7297', template: { id: '905' }, workflow: { id: '2' }, approval_status: { name: 'Approved' } },
  levels: [1, 2].map(level => ({ id: String(level), level, deleted: false, status: { name: 'Approved' } })),
  approvals: [1, 2].map(level => ({ level_id: String(level), decisions: [{
    deleted: false, status: { name: 'Approved' }, action_by: { id: level === 1 ? '300' : '400' },
    action_taken_on: { value: String(level * 1000) },
    approval_level: { id: String(level), request: { id: '7297' } },
  }] })),
});
test('gate never treats webhook or final status alone as approved snapshot proof', () => {
  assert.equal(assessServiceDeskEvidence(evidence(), policy).reason, 'APPROVED_SNAPSHOT_BINDING_REQUIRED');
  const changes = [
    [e => e.request.approval_status.name = 'Pending Approval', 'FINAL_APPROVAL_PENDING'],
    [e => e.request.workflow.id = '3', 'SOURCE_NOT_ALLOWED'],
    [e => e.levels.push(e.levels[0]), 'APPROVAL_CYCLE_UNRESOLVED'],
    [e => e.approvals[1].decisions[0].status.name = 'Rejected', 'APPROVAL_CYCLE_UNRESOLVED'],
    [e => e.approvals[1].decisions[0].action_by.id = '999', 'APPROVER_NOT_ALLOWED'],
    [e => e.approvals[1].decisions[0].action_taken_on.value = '500', 'APPROVAL_ORDER_INVALID'],
  ];
  for (const [change, reason] of changes) {
    const e = evidence(); change(e); assert.deepEqual(assessServiceDeskEvidence(e, policy), { eligible: false, reason });
  }
});
test('read client rejects redirects/configuration errors and sanitizes upstream failures', async () => {
  assert.throws(() => createServiceDeskEvidenceClient({ baseUrl: 'http://test/api/v3/', token: 'secret' }));
  const client = createServiceDeskEvidenceClient({ baseUrl: 'https://test/api/v3/', token: 'secret', fetchImpl: async (_url, options) => {
    assert.equal(options.redirect, 'error'); assert.equal(options.method, 'GET');
    throw new Error('secret upstream payload');
  } });
  await assert.rejects(client.read('7297'), { message: 'ServiceDesk evidence unavailable' });
  await assert.rejects(client.read('../users'), { message: 'Invalid source identifier' });
});
test('read client paginates and detects edits during approval fetch', async () => {
  let reads = 0;
  const client = createServiceDeskEvidenceClient({ baseUrl: 'https://test/api/v3/', token: 'secret', fetchImpl: async url => {
    const path = url.pathname;
    let data;
    if (path.endsWith('/7297')) data = { request: { id: '7297', udf_fields: { name: ++reads === 1 ? 'old' : 'edited' } } };
    else if (path.endsWith('/approval_levels')) data = { approval_levels: [], list_info: { has_more_rows: url.searchParams.get('input_data').includes('101') ? false : true } };
    else throw new Error('Unexpected path');
    return { ok: true, json: async () => ({ response_status: { status_code: 2000 }, ...data }) };
  } });
  await assert.rejects(client.read('7297'), { message: 'ServiceDesk changed during evidence read' });
});
