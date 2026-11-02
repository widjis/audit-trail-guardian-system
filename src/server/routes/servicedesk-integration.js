import express from 'express';
import { newHireSchema, payloadHash, validIntegrationToken } from '../services/servicedesk-contract.js';

// Separate authentication boundary: never trust req.user or legacy base64 sessions.
// No provisioning, messages, PDF generation, or writes to hires are performed here.
export function createServiceDeskRouter({ store, config = () => process.env }) {
  const router = express.Router();
  router.post('/new-hires', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const env = config();
    if (env.SDP_INTAKE_ENABLED !== 'true') return res.status(503).json({ error: 'Integration disabled' });
    if (!env.SDP_INTAKE_TOKEN || env.SDP_INTAKE_TOKEN.length < 32) {
      return res.status(503).json({ error: 'Integration not configured' });
    }
    if (!validIntegrationToken(req.get('authorization'), env.SDP_INTAKE_TOKEN)) {
      return res.status(401).json({ error: 'Invalid integration credential' });
    }
    if (!req.is('application/json')) return res.status(415).json({ error: 'Use application/json' });
    const parsed = newHireSchema.safeParse(req.body);
    if (!parsed.success) return res.status(422).json({
      error: 'Invalid New Hire payload', fields: parsed.error.issues.map(i => ({
        path: i.path.join('.'), message: i.message,
      })),
    });
    const payload = parsed.data;
    const templates = (env.SDP_INTAKE_TEMPLATE_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!templates.includes(payload.template_id)) return res.status(422).json({ error: 'Template not allowed' });
    if (Object.keys(req.query).some(k => k !== 'dry_run') ||
        (req.query.dry_run !== undefined && req.query.dry_run !== 'true')) {
      return res.status(400).json({ error: 'Only dry_run=true is supported' });
    }
    try {
      const grades = await store.activeGrades();
      if (!grades.length) return res.status(503).json({ error: 'Position Grade master unavailable' });
      if (!grades.includes(payload.employee.position_grade)) {
        return res.status(422).json({ error: 'Position Grade is not active in onboarding' });
      }
      if (req.query.dry_run === 'true') return res.json({ valid: true, persisted: false });
      const result = await store.accept(payload, payloadHash(payload));
      if (result.conflict) return res.status(409).json({ error: 'Revision already received with different data' });
      return res.status(result.duplicate ? 200 : 201).json({
        receipt_id: result.id, duplicate: result.duplicate,
        status: 'RECEIVED_PENDING_VERIFICATION',
        hire_created: false, provisioning_started: false,
      });
    } catch {
      // Do not log payloads, credentials, SQL parameters, or HR information.
      return res.status(503).json({ error: 'Integration storage unavailable; retry with the same revision' });
    }
  });
  return router;
}
