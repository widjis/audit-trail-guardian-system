# ServiceDesk SRF layout from the supplied DOCX

## Authority and scope - 3 November 2026

User requested that the SRF generator match MTI-HRM-ICT-FRM-002_Rev.000 -
Service Request Form (3).docx as closely as possible. Source SHA-256:
400db55ee1c0af0e2d3d038b40cb88cf33e367fd5030ee5797e78c1d523bce00.
The source remains unchanged. Native Microsoft Word fixed-format export is the
reference because the packaged LibreOffice renderer is not installed here.

The runtime now uses assets/srf-layout-base.pdf and srf-continuation-base.pdf
with hash verification against srf-layout.json. These are vector PDF layouts,
not screenshots of completed forms. Existing logos, A4 dimensions, frame,
Calibri/Arial labels, checkboxes, notes and footer are preserved. Word content
control placeholder text is actually removed, not hidden behind white rectangles.
The continuation body is also redacted rather than visually obscured. PDF metadata
is sanitized and the source contains no employee entries or handwritten signatures.
Runtime filled values use built-in Helvetica; no licensed Windows font is copied
into the source/container. Dynamic values may therefore have a slight font difference.

## Slots and workflow truth

Preserve the original form layout and its printed universal choices. Mark New Request,
Desktop/Notebook, AD, Email, Shared Folder, and Others for a requested Mailing List.
No unrequested Mobile/SIM/Desk Phone/VPN option is checked. Equipment specifications
remain determined by ICT. Unknown employment status, expiry and cost code remain blank.
The original printed Morowali location is retained as template content; this does
not introduce a Work Location field or infer one from request data.

Employee name/department/title fill the original slots. Known MTI site name displays
MTI under Business Unit. Position Grade, Join Date and optional Employee ID use the
justification area; Join Date is never written into the source Expiry Date field.
Requested by is TA. Requested date uses independently fetched source created_time,
passed by the worker as render metadata; no date is invented if absent.

The paper Direct Manager approval row remains N/A for the approved New Hire route;
manager name is displayed as information only and its approval boxes remain blank.
The middle HR row is labelled HR Manager / Superintendent and the final row Site IT
Head / Superintendent. Only real supplied HR/IT approved decisions get their approved
boxes marked. Date/time is shown in Asia/Makassar (UTC+8). No signature images are used.
This is a layout change only: no approver selection, approval decision or API contract
was changed. Existing approval verification remains mandatory before real generation.

## Long values and evidence

Values that cannot fit refer to a numbered detail; full content is retained on A4
continuation pages. Do not shrink names or overwrite adjacent captions. Folder paths
are one per line, normal words wrap at spaces, continued details repeat their heading.
Header/frame/notes/footer remain the same and the continuation artwork is reused to
avoid duplicating its fonts/logos per page. Unsupported characters still fail instead
of being silently replaced. Source IDs and normalized payload SHA-256 remain traceable.

## Verification

- 13 node:test tests passed on final source, including delivery replay and timeout.
- Normal synthetic sample: one page. A 70-folder, long-name, long-justification sample:
  four pages, every folder and all 45 justification repetitions found in extracted text.
- Every generated page visually inspected; no overlap, clipping or lost detail found.
- Main preview header and notes/footer: zero changed pixels against the Word reference.
- Detail-page notes/footer: zero changed pixels; header has 16 antialiased edge pixel
  differences per page from reusing PDF form artwork, with no layout change.
- No Click or tap / Choose an item placeholder text remains in the generated documents.
- Source DOCX hash unchanged. Verification evidence: local outputs/srf-docx-reference.

Implementation changes: integrations/servicedesk/srf.js, worker.js (source submission
date), bridge.node.test.js (expanded long-content coverage), and three layout assets.
Current edits are local only and are not in the previously prepared server image
90e5be9. No deployment, credentials, database data or ServiceDesk request was changed.
