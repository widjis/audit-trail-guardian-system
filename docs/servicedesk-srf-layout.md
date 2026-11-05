## Role-dependent authorization layout - 5 November 2026

Requester names now use the full authorization name area, reduce font within a
bounded range and wrap to two lines if necessary. Names never move to an appendix;
oversized names fail rendering instead of truncating. HR Superintendent uses the
first row under Requestor; HR Manager uses the second; Site IT Head stays last.
The inactive HR row has no decision/name/date/stamp. Direct Manager remains employee
information, not a workflow approval. Original printed caption/parentheses were
redacted from the derived base asset, and its manifest hash/version updated.

Decision stamps overlay approver name and role caption at 30% opacity. Unknown or
pending decisions still cannot render a stamp. Intake still accepts approved only.
Future approved HR selections may include optional role hr_superintendent/hr_manager;
IT approvals cannot carry HR role. A configured source picklist field can map exact
labels HR Superintendent/HR Manager. Legacy snapshots omit the optional field, so
payload hashes stay stable; the agreed existing HR Approver/Superintendent uses
the first row. A rendering override cannot contradict the approved selection.

UI routing/role picker configuration is pending tester-account choice. Do not claim
two independent HR accounts are configured or tested before that choice is resolved.
Current draft variants use the same retained 7309 approval solely for layout review.

## Decision stamps and nullable edit fields — 5 November 2026

Approved electronic decisions now display a green APPROVED stamp in each approval
slot. Name and decision time remain readable text; short comments remain beside the stamp and longer comments use the
detail appendix. The reusable renderer includes a red REJECTED stamp and refuses
unknown/pending decisions. The intake contract still accepts approved requests
only: rejected requests must never create an onboarding record.

SVG masters and transparent PNGs are maintained in integrations/servicedesk/assets.
Artwork is native vector artwork, without a checkerboard or opaque background.
Existing archived PDFs/job hashes remain immutable; this layout applies to newly
generated artifacts. A restyled 7309 presentation copy is linked in onboarding and attached separately in
ServiceDesk; original PDF, attachment and bridge job hash remain intact.

HireForm now normalizes SQL NULL fields to existing empty form defaults on load.
In particular, an unprovisioned username is an empty editable string rather than
crashing on .length. Loading a form does not create an AD account or assign a license.

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

## Credential autofill regression

On 5 November the live edit form displayed a saved login username despite SQL/API
username and email remaining NULL. DOM reported webkit-autofill true. This was
browser credential autofill, not a mapping from Direct Manager to employee.
Employee account inputs now use dedicated names, explicit autocomplete hints,
password-manager ignore hints and remain read-only until the user focuses them.
Input handlers map the dedicated names back to the existing API fields. No account
credentials are generated from manager identity, and no hire Update was submitted
during verification.

## Imported hire account-name defaults

Loading an imported hire now applies the existing name-input helpers when email or
username is absent. First and final name words form firstname.lastname; username
is the email local part, limited to 20 characters. Test User PuraPura therefore
previews test.purapura and test.purapura@merdekabattery.com. Existing saved values
are preserved. Defaults are form state until Update, and do not provision accounts.
