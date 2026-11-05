import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { drawApprovalStamp } from './approval-stamp.js';
import { newHireSchema, payloadHash } from '../../src/server/services/servicedesk-contract.js';

// The supplied DOCX is the layout authority. Runtime values are overlaid on a
// sanitized native-Word PDF, retaining the source's vectors, logos and fonts.
export async function renderSrf(input, { requestedAt, hrRole } = {}) {
  const data = newHireSchema.parse(input);
  if (hrRole && data.approvals[0].role && hrRole !== data.approvals[0].role) throw new Error('HR presentation role conflicts with approved selection');
  hrRole = data.approvals[0].role || hrRole || 'hr_superintendent';
  if (!['hr_superintendent', 'hr_manager'].includes(hrRole)) throw new Error('Explicit HR role required');
  const [baseBytes, continuationBytes, manifestBytes] = await Promise.all([
    readFile(new URL('./assets/srf-layout-base.pdf', import.meta.url)),
    readFile(new URL('./assets/srf-continuation-base.pdf', import.meta.url)),
    readFile(new URL('./assets/srf-layout.json', import.meta.url)),
  ]);
  const manifest = JSON.parse(manifestBytes);
  if (createHash('sha256').update(baseBytes).digest('hex') !== manifest.base_pdf_sha256)
    throw new Error('SRF layout asset integrity check failed');
  if (createHash('sha256').update(continuationBytes).digest('hex') !== manifest.continuation_pdf_sha256)
    throw new Error('SRF continuation asset integrity check failed');
  const base = await PDFDocument.load(baseBytes);
  const continuationBase = await PDFDocument.load(continuationBytes);
  if (base.getPageCount() !== 1 || continuationBase.getPageCount() !== 1) throw new Error('SRF layout must have one base page');
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Service Request Form - ${data.request_id} revision ${data.revision}`);
  pdf.setAuthor('MTI ICT - ServiceDesk integration');
  pdf.setSubject('New Hire ICT requirements and retained electronic approval evidence');
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [first] = await pdf.copyPages(base, [0]);
  pdf.addPage(first);
  const { width, height } = first.getSize();
  const details = [];
  function validText(value) {
    const text = String(value).replaceAll('\t', '    ');
    // Never silently replace characters in employee names or approved paths.
    normal.encodeText(text.replace(/[\r\n]/g, ''));
    return text;
  }
  function draw(page, x, baseline, value, size = 10, strong = false) {
    page.drawText(validText(value), { x, y: height - baseline, size, font: strong ? bold : normal, color: rgb(0, 0, 0) });
  }
  function detail(label, value) {
    const n = details.push({ label, value: validText(value) });
    return `See detail ${n}`;
  }
  function slot(label, value, x, baseline, capacity, size = 10, center = false, strong = false) {
    if (value == null || value === '') return;
    let text = validText(value);
    const font = strong ? bold : normal;
    if (/[\r\n]/.test(text) || font.widthOfTextAtSize(text, size) > capacity) text = detail(label, text);
    if (font.widthOfTextAtSize(text, size) > capacity) throw new Error('SRF reference does not fit the slot');
    draw(first, center ? x + (capacity - font.widthOfTextAtSize(text, size)) / 2 : x, baseline, text, size, strong);
  }
  function center(value, baseline, size = 10, strong = false) {
    const font = strong ? bold : normal;
    draw(first, 309 - font.widthOfTextAtSize(value, size) / 2, baseline, value, size, strong);
  }
  function mark(x, baseline) { draw(first, x + 2.2, baseline - 0.7, 'X', 7.8, true); }
  const localDate = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Makassar', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
  const localTime = value => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
  const employee = data.employee, requirements = data.requirements;
  slot('Employee name', employee.name, 162.62, 163.70, 146, 10.3);
  slot('Department', employee.department_name, 162.62, 178.10, 146, 10.3);
  slot('Title / Position', employee.title, 162.62, 193.34, 146, 10.3);
  const unit = employee.site_name === 'Merdeka Tsingshan Indonesia' ? 'MTI' : employee.site_name;
  slot('Business Unit / source site', unit, 391.85, 163.70, 130, 10.3);
  // Source printed Location stays intact. No employment status, expiry or cost
  // code is inferred from unrelated New Hire data. Join Date is not Expiry Date.
  mark(178.34, 237.74);
  if (requirements.equipment === 'Desktop') mark(93.38, 297.53);
  if (requirements.equipment === 'Notebook') mark(284.69, 297.53);
  draw(first, 93.38, 343.01, 'Equipment specifications are determined by ICT.', 7.7);
  if (requirements.ad_login) mark(93.38, 372.77);
  if (requirements.email_account) mark(93.38, 388.13);
  if (requirements.shared_folders.length) {
    mark(320.23, 372.77);
    slot('Shared folders and approved access', requirements.shared_folders.map(f => `${f.path} (${f.access})`).join('\n'), 400.97, 372.77, 121, 8.5);
  }
  if (requirements.mailing_lists.length) {
    mark(93.38, 403.49);
    slot('Mailing lists', `Mailing list: ${requirements.mailing_lists.join('; ')}`, 211, 403.49, 310, 9);
  }
  slot('Justification', data.notes || 'New Hire ICT setup.', 93.38, 447.19, 428, 9);
  const meta = `Position Grade: ${employee.position_grade} | Join Date: ${employee.join_date} | Employee ID: ${employee.employee_id || 'Not yet assigned'}`;
  slot('Additional onboarding information', meta, 93.38, 460, 428, 8);
  // Requester names belong in the authorization block, not an appendix.
  let requesterSize = 10;
  while (normal.widthOfTextAtSize(data.requester.name, requesterSize) > 184.7 && requesterSize > 7) requesterSize -= 0.25;
  if (normal.widthOfTextAtSize(data.requester.name, requesterSize) <= 184.7) {
    slot('Requested by - Talent Acquisition', data.requester.name, 217.25, 490.63, 184.7, requesterSize, true);
  } else {
    const words = data.requester.name.split(/\s+/); let line = ''; const lines = [];
    for (const word of words) {
      if (normal.widthOfTextAtSize(line ? `${line} ${word}` : word, 7) > 184.7 && line) { lines.push(line); line = word; }
      else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    if (lines.length > 2 || lines.some(v => normal.widthOfTextAtSize(v, 7) > 184.7)) throw new Error('Requester name exceeds two-line authorization area');
    lines.forEach((v, i) => slot('Requested by - Talent Acquisition', v, 217.25, 482 + i * 9, 184.7, 7, true));
  }
  const submission = Number(requestedAt);
  if (Number.isSafeInteger(submission) && submission > 0) slot('Request submission date', localDate(submission), 443, 490.63, 78, 9.3);
  center('HR Superintendent', 558, 10, true);
  center('HR Manager', 598.03, 10, true);
  center('Electronic approval recorded in ServiceDesk', 607.51, 6.5);
  center('Site IT Head / Superintendent', 665.26, 10, true);
  for (const approval of data.approvals) {
    const hr = approval.stage === 'hr';
    const supt = hr && hrRole === 'hr_superintendent';
    const nameY = !hr ? 646 : supt ? 539 : 579;
    const commentY = !hr ? 632 : supt ? 527 : 567;
    slot(`${approval.stage} approval comment`, approval.comment || 'Approved electronically', 217.25, commentY, 184.7, 7.2, true);
    slot(`${approval.stage} approver`, approval.approver_name, 217.25, nameY, 184.7, 10, true);
    mark(190.13, !hr ? 638.26 : supt ? 530.83 : 584.47);
    const y = !hr ? 645.10 : supt ? 537.67 : 591.31;
    slot(`${approval.stage} approval date`, localDate(approval.decided_at), 443, y, 78, 9.3);
    slot(`${approval.stage} approval time`, `${localTime(approval.decided_at)} UTC+8`, 443, y + 10, 78, 7);
    // Overlay after text: translucent ink crosses the name and role caption.
    await drawApprovalStamp(pdf, first, approval.decision, { x: 236, y: height - (!hr ? 674 : supt ? 566 : 606), width: 145, opacity: 0.3 });
  }
  draw(first, 72.02, 687, `ServiceDesk #${data.request_id} | Revision ${data.revision} | HR user ${data.approvals[0].approver_id} | IT user ${data.approvals[1].approver_id}`, 6.5);
  draw(first, 72.02, 697, `Approved data SHA-256: ${payloadHash(data)}`, 6.1);

  if (details.length) {
    // Reuse one embedded form across detail pages instead of duplicating the
    // original fonts/logos for each page in a large approved access list.
    const [continuationArtwork] = await pdf.embedPdf(continuationBytes, [0]);
    let page, y, activeLabel;
    async function nextPage(continuedLabel) {
      page = pdf.addPage([width, height]);
      page.drawPage(continuationArtwork);
      // Continuation base has the old body text removed, not hidden behind white.
      draw(page, 72.02, 152, 'New Hire request details', 12, true);
      draw(page, 72.02, 168, `ServiceDesk #${data.request_id} | Revision ${data.revision} | Page ${pdf.getPageCount()}`, 8);
      y = 191;
      if (continuedLabel) { draw(page, 93.38, y, `${continuedLabel} (continued)`, 9.5, true); y += 18; }
    }
    async function row(text, strong = false) {
      if (y > 678) await nextPage(activeLabel);
      draw(page, 93.38, y, text, strong ? 9.5 : 9, strong);
      y += strong ? 15 : 12;
    }
    function wrap(value) {
      const result = [];
      for (const paragraph of validText(value).split(/\r?\n/)) {
        let current = '';
        for (const word of paragraph.split(/\s+/).filter(Boolean)) {
          const candidate = current ? `${current} ${word}` : word;
          if (normal.widthOfTextAtSize(candidate, 9) <= 428) { current = candidate; continue; }
          if (current) { result.push(current); current = ''; }
          // Only a single unbroken token may split; ordinary words stay intact.
          for (const character of word) {
            if (normal.widthOfTextAtSize(current + character, 9) > 428 && current) { result.push(current); current = ''; }
            current += character;
          }
        }
        result.push(current);
      }
      return result;
    }
    await nextPage();
    for (let i = 0; i < details.length; i++) {
      if (y > 650) await nextPage();
      activeLabel = `Detail ${i + 1} - ${details[i].label}`;
      await row(activeLabel, true);
      for (const line of wrap(details[i].value)) await row(line);
      y += 10;
    }
  }
  return Buffer.from(await pdf.save());
}
