import { readFile } from 'node:fs/promises';
import { degrees } from 'pdf-lib';

// Only explicit decisions render a stamp. Pending/unknown must never look approved.
export async function drawApprovalStamp(pdf, page, decision, { x, y, width = 145, opacity = 0.3 }) {
  if (!['approved', 'rejected'].includes(decision)) throw new Error('Unsupported stamp decision');
  const image = await pdf.embedPng(await readFile(new URL(`./assets/${decision}-stamp.png`, import.meta.url)));
  page.drawImage(image, { x, y, width, height: width * image.height / image.width, rotate: degrees(0), opacity });
}
