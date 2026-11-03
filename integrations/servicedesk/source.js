import { createServiceDeskEvidenceClient, assessServiceDeskEvidence } from '../../src/server/services/servicedesk-evidence.js';
import { newHireSchema, payloadHash } from '../../src/server/services/servicedesk-contract.js';
import { createHash } from 'node:crypto';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export class Hold extends Error { constructor(code) { super(code); this.code = code; } }
const identifier = value => {
  if (!/^[1-9][0-9]{0,19}$/.test(String(value))) throw new Hold('INVALID_SOURCE_ID');
  return String(value);
};
export function createSource(config, fetchImpl = fetch) {
  const base = new URL(config.baseUrl);
  const evidence = createServiceDeskEvidenceClient({ baseUrl: config.baseUrl, token: config.token, fetchImpl });
  async function request(path, options = {}, raw = false) {
    try {
      const response = await fetchImpl(new URL(path, base), { ...options, redirect: 'error',
        signal: AbortSignal.timeout(20000), headers: { authtoken: config.token,
          Accept: 'application/vnd.manageengine.sdp.v3+json', ...options.headers } });
      if (!response.ok) throw new Error();
      if (raw) {
        if (Number(response.headers.get('content-length')) > 15 * 1024 * 1024) throw new Error();
        const data = Buffer.from(await response.arrayBuffer());
        if (data.length > 15 * 1024 * 1024) throw new Error();
        return data;
      }
      const body = await response.json();
      const statuses = Array.isArray(body.response_status) ? body.response_status : [body.response_status];
      if (!statuses.length || statuses.some(s => s?.status_code !== 2000)) throw new Error();
      return body;
    } catch { throw new Hold('SOURCE_API_UNAVAILABLE'); }
  }
  async function list(path, key, criteria) {
    const result = [];
    for (let page = 0; page < 30; page++) {
      const input = { list_info: { row_count: 100, start_index: page * 100 + 1,
        ...(criteria ? { search_criteria: criteria } : {}) } };
      const body = await request(`${path}?input_data=${encodeURIComponent(JSON.stringify(input))}`);
      if (!Array.isArray(body[key]) || typeof body.list_info?.has_more_rows !== 'boolean') throw new Hold('INCOMPLETE_SOURCE_LIST');
      result.push(...body[key]);
      if (!body.list_info.has_more_rows) return result;
    }
    throw new Hold('SOURCE_LIST_LIMIT');
  }
  const matches = async (path, key, name) => list(path, key, { field: 'name', condition: 'is', value: name });
  return {
    async discover() {
      const rows = await list('requests', 'requests', { field: 'template.id', condition: 'is', value: config.templateId });
      return rows.filter(q => String(q.template?.id) === config.templateId &&
        config.requesterIds.includes(String(q.requester?.id))).map(q => identifier(q.id));
    },
    async read(id) {
      // Source client rereads all relevant fields around approval collection.
      const first = await evidence.read(id);
      const history = await list(`requests/${identifier(id)}/history`, 'history');
      const second = await evidence.read(id);
      if (first.snapshot_hash !== second.snapshot_hash || payloadHash(first.levels) !== payloadHash(second.levels) ||
          payloadHash(first.approvals) !== payloadHash(second.approvals)) throw new Hold('SOURCE_CHANGED_DURING_READ');
      return { ...second, history };
    },
    async masterIds(department, manager, siteId) {
      const departments = (await matches('departments', 'departments', department)).filter(d => d.name === department);
      const scoped = departments.filter(d => String(d.site?.id) === siteId);
      const global = departments.filter(d => d.site == null);
      // A global department applies to all sites. Never select a department
      // belonging to another site or choose between duplicate global matches.
      const applicable = scoped.length ? scoped : global;
      const users = (await matches('users', 'users', manager)).filter(u => u.name === manager);
      if (applicable.length !== 1 || users.length !== 1) throw new Hold('MASTER_MATCH_NOT_UNIQUE');
      return { departmentId: identifier(applicable[0].id), managerId: identifier(users[0].id) };
    },
    attachments: id => list(`requests/${identifier(id)}/attachments`, 'attachments'),
    download: (requestId, attachmentId) => request(`requests/${identifier(requestId)}/attachments/${identifier(attachmentId)}/download`, {}, true),
    async upload(requestId, name, bytes) {
      const body = new FormData(); body.append('input_file', new Blob([bytes], { type: 'application/pdf' }), name);
      const result = await request(`requests/${identifier(requestId)}/upload`, { method: 'PUT', body });
      if (!result.attachment?.id || result.attachment.name !== name) throw new Hold('ATTACHMENT_ACK_MISSING');
      return identifier(result.attachment.id);
    },
  };
}

export function verifyApprovedHistory(e, config) {
  const q = e.request;
  if (!config.requesterIds.includes(String(q?.requester?.id)) ||
      (q?.site?.id ? String(q.site.id) !== config.siteId : !config.defaultSiteName))
    throw new Hold('REQUESTER_OR_SITE_NOT_ALLOWED');
  const assessment = assessServiceDeskEvidence(e, { templateIds: [config.templateId], workflowId: config.workflowId,
    approverIds: [config.hrIds, config.itIds] });
  if (assessment.reason !== 'APPROVED_SNAPSHOT_BINDING_REQUIRED') throw new Hold(assessment.reason);
  if (!Array.isArray(e.history) || !e.history.length) throw new Hold('HISTORY_UNAVAILABLE');
  const hr = e.approvals.find(a => a.level_id === String(e.levels.find(l => l.level === 1).id));
  const start = Math.min(...hr.decisions.filter(d => d.status?.name === 'Approved').map(d => Number(d.action_taken_on.value)));
  const safeUpdates = new Set(['assigned_time', 'status', 'technician', 'group', 'approval_status']);
  const safeOperations = new Set(['Approve', 'REQAPPROVAL']);
  const seen = new Set(); let revision = 0; let created = false;
  for (const event of e.history) {
    identifier(event.id);
    const time = Number(event.time?.value);
    if (seen.has(event.id) || String(event.request?.id) !== String(q.id) || !Number.isSafeInteger(time) || time <= 0 || !Array.isArray(event.diff))
      throw new Hold('HISTORY_INCOMPLETE');
    seen.add(event.id);
    if (event.operation === 'CREATE') { created = true; if (time > start) throw new Hold('HISTORY_INCOMPLETE'); }
    if (time >= start) {
      if (event.operation === 'UPDATE') {
        if (!event.diff.length || event.diff.some(d => !safeUpdates.has(d.field?.name))) throw new Hold('DATA_CHANGED_AFTER_HR_APPROVAL');
      } else if (!safeOperations.has(event.operation)) throw new Hold('UNRECOGNIZED_POST_APPROVAL_OPERATION');
    } else {
      // Revision comes from persisted history, never from a caller-provided counter.
      if (['CREATE', 'UPDATE'].includes(event.operation)) revision = Math.max(revision, Number(event.id));
    }
  }
  if (!created || !Number.isSafeInteger(revision) || revision < 1 || revision > 2147483647) throw new Hold('REVISION_UNRESOLVED');
  return revision;
}

function scalar(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (value.value == null && !value.name) return '';
    return scalar(value.name ?? value.value);
  }
  throw new Hold('UNSUPPORTED_FIELD_VALUE');
}
export function sourceFields(q) {
  const flat = q.udf_fields || {};
  const res = q.resources || {};
  if (Object.keys(res).some(k => k !== 'res_301')) throw new Hold('UNMAPPED_RESOURCE');
  const resource = res.res_301 || {};
  const supported = ['udf_pick_2860', 'udf_multiselect_2861', 'udf_sline_2862', 'udf_sline_2863'];
  if (Object.keys(resource).some(k => !supported.includes(k))) throw new Hold('UNMAPPED_RESOURCE_QUESTION');
  const result = { ...flat };
  for (const key of supported) {
    if (resource[key] !== undefined) {
      if (flat[key] != null && payloadHash(flat[key]) !== payloadHash(resource[key])) throw new Hold('CONFLICTING_RESOURCE_VALUES');
      result[key] = resource[key];
    }
  }
  return result;
}
export async function mapApprovedRequest(e, config, source) {
  const revision = verifyApprovedHistory(e, config), q = e.request, f = sourceFields(q);
  const department = scalar(f.udf_pick_2865), manager = scalar(f.udf_pick_2866);
  const { departmentId, managerId } = await source.masterIds(department, manager, config.siteId);
  const rawSelections = f.udf_multiselect_2861 ?? [];
  if (!Array.isArray(rawSelections)) throw new Hold('UNSUPPORTED_ACCESS_SELECTION');
  const selections = rawSelections.map(scalar);
  const names = ['User Login (AD)', 'Email Account', 'Mailing List (Email Group)', 'Shared Folder'];
  if (selections.some(s => !names.includes(s))) throw new Hold('UNKNOWN_ACCESS_OPTION');
  const mailingText = scalar(f.udf_sline_2862), folderText = scalar(f.udf_sline_2863);
  const mailing = mailingText ? mailingText.split(/[;,\n]+/).map(s => s.trim()).filter(Boolean) : [];
  const folders = [];
  if (selections.includes(names[3])) {
    for (const row of folderText.split(/[;\n]+/).filter(s => s.trim())) {
      const match = row.trim().match(/^(\\\\.+?)\s*(?:\|\s*(Read|Modify)|\((Read|Modify)\))$/i);
      if (!match) throw new Hold('FOLDER_ACCESS_MUST_BE_EXPLICIT');
      const access = match[2] || match[3]; folders.push({ path: match[1].trim(), access: access[0].toUpperCase() + access.slice(1).toLowerCase() });
    }
    if (!folders.length) throw new Hold('MISSING_FOLDER_DETAILS');
  } else if (folderText) throw new Hold('UNSELECTED_FOLDER_HAS_DETAILS');
  if (selections.includes(names[2]) !== Boolean(mailing.length)) throw new Hold('MAILING_LIST_SELECTION_MISMATCH');
  const timestamp = Number(f.udf_date_2857?.value);
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw new Hold('INVALID_JOIN_DATE');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(timestamp));
  const part = name => parts.find(p => p.type === name)?.value;
  const approvals = [...e.levels].sort((a,b) => a.level-b.level).map((level, index) => {
    const decisions = e.approvals.find(a => a.level_id === String(level.id)).decisions;
    const winner = [...decisions].filter(d => d.status?.name === 'Approved')
      .sort((a,b) => Number(a.action_taken_on.value)-Number(b.action_taken_on.value))[0];
    return { stage: index === 0 ? 'hr' : 'site_it_head', approver_id: String(winner.action_by.id),
      approver_name: winner.action_by.name, decision: 'approved', decided_at: new Date(Number(winner.action_taken_on.value)).toISOString(), comment: winner.comments || '' };
  });
  const employeeId = scalar(f.udf_sline_2858);
  const payload = { schema_version: 1, request_id: String(q.id), template_id: String(q.template.id), revision,
    requester: { id: String(q.requester.id), name: q.requester.name },
    employee: { name: scalar(f.udf_sline_19), ...(employeeId ? { employee_id: employeeId } : {}),
      title: scalar(f.udf_sline_22), position_grade: scalar(f.udf_pick_2880), department_id: departmentId, department_name: department,
      direct_manager_id: managerId, direct_manager_name: manager, site_id: String(q.site?.id || config.siteId), site_name: q.site?.name || config.defaultSiteName,
      join_date: `${part('year')}-${part('month')}-${part('day')}` },
    requirements: { equipment: scalar(f.udf_pick_2860) || null, ad_login: selections.includes(names[0]), email_account: selections.includes(names[1]),
      mailing_lists: mailing, shared_folders: folders }, approvals,
    // Keep original HTML in immutable evidence; do not strip/interpret arbitrary HTML as approved prose.
    notes: '' };
  const parsed = newHireSchema.safeParse(payload);
  if (!parsed.success) throw new Hold('SOURCE_FORM_INCOMPLETE');
  return parsed.data;
}
