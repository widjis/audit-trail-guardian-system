import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const text = z.string().trim().min(1).max(250);
const id = z.string().regex(/^[1-9][0-9]{0,19}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v;
}, 'Invalid calendar date');
const approval = z.object({
  stage: z.enum(['hr', 'site_it_head']), approver_id: id,
  approver_name: text, decision: z.literal('approved'),
  role: z.enum(['hr_superintendent', 'hr_manager']).optional(),
  decided_at: z.string().datetime({ offset: true }),
  comment: z.string().max(4000).default(''),
}).strict();

export const newHireSchema = z.object({
  schema_version: z.literal(1), request_id: id, template_id: id,
  revision: z.number().int().min(1).max(2147483647),
  employee: z.object({
    name: text, employee_id: text.optional(), title: text,
    position_grade: text, department_id: id, department_name: text,
    direct_manager_id: id, direct_manager_name: text,
    site_id: id, site_name: text, join_date: date,
  }).strict(),
  requester: z.object({ id, name: text }).strict(),
  requirements: z.object({
    equipment: z.enum(['Desktop', 'Notebook']).nullable(),
    ad_login: z.boolean(), email_account: z.boolean(),
    mailing_lists: z.array(text).max(100),
    shared_folders: z.array(z.object({
      path: z.string().trim().min(1).max(1000),
      access: z.enum(['Read', 'Modify']),
    }).strict()).max(100),
  }).strict(),
  approvals: z.array(approval).length(2),
  notes: z.string().max(8000).default(''),
}).strict().superRefine((v, ctx) => {
  if (v.approvals[1]?.role) ctx.addIssue({ code: 'custom', path: ['approvals', 1, 'role'], message: 'HR role only belongs to HR approval' });
  if (v.approvals[0]?.stage !== 'hr' || v.approvals[1]?.stage !== 'site_it_head') {
    ctx.addIssue({ code: 'custom', path: ['approvals'], message: 'Require HR then Site IT Head approval' });
  }
  if (Date.parse(v.approvals[0]?.decided_at) > Date.parse(v.approvals[1]?.decided_at)) {
    ctx.addIssue({ code: 'custom', path: ['approvals'], message: 'Approval times are out of order' });
  }
});

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map(k => [k, canonical(value[k])])
  );
  return value;
}

export function payloadHash(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

export function validIntegrationToken(header, secret) {
  if (typeof secret !== 'string' || secret.length < 32 || typeof header !== 'string') return false;
  if (!header.startsWith('Bearer ') || header.length > 1024) return false;
  const digest = v => createHash('sha256').update(v).digest();
  return timingSafeEqual(digest(header.slice(7)), digest(secret));
}
