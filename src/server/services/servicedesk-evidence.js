import { payloadHash } from './servicedesk-contract.js';

const id = value => {
  if (!/^[1-9][0-9]{0,19}$/.test(String(value))) throw new Error('Invalid source identifier');
  return String(value);
};

// Read-only, bounded client. Redirects must not forward the authtoken elsewhere.
export function createServiceDeskEvidenceClient({ baseUrl, token, fetchImpl = fetch }) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash ||
      !base.pathname.endsWith('/api/v3/')) throw new Error('Invalid ServiceDesk API URL');
  if (typeof token !== 'string' || !token.trim()) throw new Error('Missing ServiceDesk API credential');
  async function get(path) {
    try {
      const response = await fetchImpl(new URL(path, base), {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { authtoken: token, Accept: 'application/vnd.manageengine.sdp.v3+json' },
      });
      if (!response.ok) throw new Error();
      const body = await response.json();
      const statuses = Array.isArray(body.response_status) ? body.response_status : [body.response_status];
      if (!statuses.length || statuses.some(s => s?.status_code !== 2000)) throw new Error();
      return body;
    } catch { throw new Error('ServiceDesk evidence unavailable'); }
  }
  async function list(path, key) {
    const values = [];
    for (let page = 0; page < 20; page++) {
      const query = encodeURIComponent(JSON.stringify({ list_info: { row_count: 100, start_index: page * 100 + 1 } }));
      const body = await get(`${path}?input_data=${query}`);
      if (!Array.isArray(body[key]) || typeof body.list_info?.has_more_rows !== 'boolean')
        throw new Error('Incomplete ServiceDesk evidence');
      values.push(...body[key]);
      if (!body.list_info.has_more_rows) return values;
    }
    throw new Error('ServiceDesk evidence exceeds page limit');
  }
  return {
    async read(requestId) {
      const path = `requests/${id(requestId)}`;
      const first = (await get(path)).request;
      if (String(first?.id) !== String(requestId)) throw new Error('Mismatched ServiceDesk evidence');
      const levels = await list(`${path}/approval_levels`, 'approval_levels');
      const approvals = [];
      for (const level of levels) {
        approvals.push({ level_id: id(level.id), decisions: await list(
          `${path}/approval_levels/${id(level.id)}/approvals`, 'approvals') });
      }
      const last = (await get(path)).request;
      // Compare approved-data candidates, not volatile counters such as is_read.
      const snapshot = q => ({ id: q?.id, template: q?.template, requester: q?.requester,
        udf_fields: q?.udf_fields, resources: q?.resources, site: q?.site,
        description: q?.description, approval_status: q?.approval_status,
        last_updated_time: q?.last_updated_time, workflow: q?.workflow, flow_instance: q?.flow_instance,
        is_trashed: q?.is_trashed, cancel_requested: q?.cancel_requested, status: q?.status });
      if (payloadHash(snapshot(first)) !== payloadHash(snapshot(last)))
        throw new Error('ServiceDesk changed during evidence read');
      return { request: last, levels, approvals, snapshot_hash: payloadHash(snapshot(last)) };
    },
  };
}

// Diagnostic gate only. The approved revision must be bound to a data snapshot
// by a future trusted adapter; neither webhook claims nor this hash prove that.
export function assessServiceDeskEvidence(evidence, policy) {
  const hold = reason => ({ eligible: false, reason });
  const q = evidence?.request;
  if (!q || !Array.isArray(evidence.levels) || !Array.isArray(evidence.approvals)) return hold('INCOMPLETE_EVIDENCE');
  if (!policy?.templateIds?.includes(String(q.template?.id)) || String(q.workflow?.id) !== policy.workflowId)
    return hold('SOURCE_NOT_ALLOWED');
  if (q.is_trashed || q.cancel_requested || ['Cancelled', 'Closed'].includes(q.status?.name)) return hold('REQUEST_INACTIVE');
  if (q.approval_status?.name !== 'Approved') return hold('FINAL_APPROVAL_PENDING');
  // Preserve deleted history, but do not mistake old approval cycles for a new one.
  if (evidence.levels.length !== 2 || evidence.levels.some(l => l.deleted)) return hold('APPROVAL_CYCLE_UNRESOLVED');
  const ordered = [...evidence.levels].sort((a, b) => a.level - b.level);
  const times = [];
  for (let index = 0; index < 2; index++) {
    const level = ordered[index];
    if (level.level !== index + 1 || level.status?.name !== 'Approved') return hold('LEVEL_NOT_APPROVED');
    const decisions = evidence.approvals.filter(a => a.level_id === String(level.id));
    if (decisions.length !== 1) return hold('INCOMPLETE_EVIDENCE');
    const all = decisions[0].decisions;
    if (!Array.isArray(all) || all.some(a => a.deleted || a.status?.name === 'Rejected')) return hold('APPROVAL_CYCLE_UNRESOLVED');
    const approved = all.filter(a => a.status?.name === 'Approved');
    if (!approved.length) return hold('MISSING_INDIVIDUAL_DECISION');
    for (const decision of approved) {
      if (String(decision.approval_level?.id) !== String(level.id) ||
          String(decision.approval_level?.request?.id) !== String(q.id) ||
          !policy.approverIds?.[index]?.includes(String(decision.action_by?.id))) return hold('APPROVER_NOT_ALLOWED');
      const time = Number(decision.action_taken_on?.value);
      if (!Number.isSafeInteger(time) || time <= 0) return hold('INVALID_DECISION_TIME');
      times.push({ index, time });
    }
  }
  if (Math.max(...times.filter(t => t.index === 0).map(t => t.time)) >
      Math.min(...times.filter(t => t.index === 1).map(t => t.time))) return hold('APPROVAL_ORDER_INVALID');
  return hold('APPROVED_SNAPSHOT_BINDING_REQUIRED');
}
