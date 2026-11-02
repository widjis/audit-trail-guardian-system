# ServiceDesk New Hire Integration

## Approved direction — 2 November 2026

TA submits in ServiceDesk. HR makes the first decision, then Site IT Head approves.
Only the final approved revision may progress to onboarding. Preserve all approval history.
Position Grade must match the active onboarding master, not a hardcoded UI fallback.
No AD creation, licensing, group membership, email, or WhatsApp is triggered by intake.
The target hire state after independent verification and PDF completion is Ready for ICT Processing.

## Implemented milestone I1: authenticated intake foundation

POST /api/integrations/servicedesk/new-hires accepts normalized JSON.
The route is mounted before the legacy user middleware and uses its own machine credential.
It is disabled by default. SDP_INTAKE_ENABLED=true, SDP_INTAKE_TOKEN (minimum 32 characters),
and SDP_INTAKE_TEMPLATE_IDS (explicit comma-separated IDs) are required for activation.
Never reuse the ServiceDesk outbound API token as the inbound integration credential.
Use HTTPS and keep the credential in a server-side secret store or deployment environment.

Append ?dry_run=true to validate against the live position_grades table without persistence.
Normal intake writes only to servicedesk_new_hire_inbox, NOT hires.
The receipt state is RECEIVED_PENDING_VERIFICATION. The supplied approval data is a claim,
not proof: a later worker must independently verify the complete approval history in ServiceDesk.
An HTTP 201 means an inbox receipt exists; it does not mean an onboarding hire or SRF exists.

The additive MSSQL migration is src/server/data/migrations/20261102-servicedesk-inbox.sql.
It is manual and has NOT been executed. No automatic schema changes occur on application import.
The dedicated lazy MSSQL pool avoids legacy SQL logging of HR payloads. Connections validate
the database certificate unless DB_TRUST_SERVER_CERTIFICATE=true is explicitly configured.
Review the existing deployment certificate configuration before enabling; no runtime setting was changed.

## Idempotency and revisions

The fixed source is this MTI ServiceDesk instance. Unique key: request_id + revision.
Normalized payload SHA-256 ignores JSON object key ordering.
Same revision and identical payload returns 200 and the original receipt ID.
Same revision with different payload returns 409. New approved revisions get new immutable receipts.
MSSQL SERIALIZABLE plus indexed UPDLOCK/HOLDLOCK prevents parallel duplicate inserts.
Deadlock/storage failures return 503 and callers retry the SAME revision and payload.
Runtime SQL concurrency remains to be verified against a disposable MSSQL database.

## Payload contract

See openapi-servicedesk.yaml and the executable Zod schema in servicedesk-contract.js.
Required: schema_version=1, request_id, template_id, positive integer revision,
requester{id,name}, employee{name,title,position_grade,department_id,department_name,
direct_manager_id,direct_manager_name,site_id,site_name,join_date}, requirements,
and approvals with exactly HR then Site IT Head (both approved with identity and timestamp).
employee.employee_id is optional until issued by HR. notes and approval comments are optional.
equipment: Desktop, Notebook, or null when no equipment requested. Account booleans are explicit.
Mailing list names/addresses are an array; folders are {path,access: Read|Modify} objects.
Reject unknown properties, invalid calendar dates, invalid grades, unsupported templates,
missing approval levels, rejection decisions, or reversed approval times.
The list schema cannot prove current approval state; independent verification is mandatory before processing.

## ServiceDesk mapping verified

Test template 905, category 1201. New dropdown Position Grade (Onboarding): udf_pick_2880.
It is required, visible/editable for requester, immediately before Join Date.
Old udf_sline_2879 is removed from test template layouts; the global field was not deleted.
Master read from onboarding GET /api/settings on 2 November 2026:
General Management, Manager, Superintendent, Supervisor, Staff, Non-Staff.
This is a snapshot, not an automatic dropdown synchronization.
Employee Name udf_sline_19; Employee ID udf_sline_2858; Job Title udf_sline_22;
Department udf_pick_2865; Direct Manager udf_pick_2866; Join Date udf_date_2857.
Resources are the shared New Hire Requirements resource 301. Detailed option IDs and
the authoritative approval-revision identifier still require live read-only mapping.
No grade change has been applied to main hidden template 903 in this milestone.

## Remaining milestones — not implemented or activated

I2: independently fetch ticket, template, final approval history and current approved snapshot;
verify sender event revision, reject changed/rejected/pending requests. Resolve authoritative revision IDs.
I3: reconcile actual production hires schema (bootstrap first_name/last_name conflicts with route name),
define explicit field allowlist and transactionally link receipt to one hire; expose Ready for ICT Processing.
I4: use the supplied universal SRF PDF as the visual base, render synthetic samples and compare to original;
preserve document versions and approved data snapshots. Never overwrite old SRFs/approval history.
I5: attach versioned PDF to the ServiceDesk ticket and onboarding record with retry/outbox tracking;
complete only when both attachments are acknowledged. Avoid duplicate attachments on timeout retries.
I6: deploy additive migration and disabled service through the normal reviewed release process;
run test-only final-approval UAT on 905, then enable a restricted test webhook. No production trigger yet.

## Verification and limits

Run node --test tests/servicedesk-intake.node.test.js. Tests use synthetic payloads, in-memory persistence,
and local loopback only. They never import the legacy app or connect to real DB/AD/Graph/ServiceDesk.
Route auth, disabled/config failure, validation, grade allowlist, dry run, duplicate replay, conflict,
revision handling, and sanitized errors are covered. SQL migration/concurrency and deployment are pending.
The existing weak legacy application auth remains a separate hardening issue; this endpoint does not use it.
This milestone is a foundation, not an end-to-end onboarding integration.


## I2 read-only evidence foundation — 2 November 2026

Implemented a standalone read-only client and diagnostic gate in servicedesk-evidence.js.
It is NOT mounted, scheduled, or connected to hire creation. It follows no redirects,
uses HTTPS, bounded pagination/timeouts, sanitizes upstream errors, and rereads request
data to detect edits during evidence collection. No external response bodies are logged.
The gate validates allowlisted template/workflow/actual decision-maker IDs, both levels,
individual decisions, order, and unresolved old/deleted cycles. It ALWAYS holds processing
until a trusted approved-data snapshot binding exists. Current Approved status and a hash
of current values do not establish that those values were approved. I2 remains incomplete.

Live GET observations on request 7297: HR level 304 approved; IT level 307 pending.
Approval levels expose System as action_taken_by, so use individual approval action_by
for human identity. GET requests/{id}/approval_levels and each level's /approvals work
with the configured on-prem API credential. Never use cloud API assumptions for this host.
Department udf_pick_2865 and manager udf_pick_2866 currently return display strings,
not reference IDs. Resolve uniquely against a trusted master; ambiguous/missing matches
must hold intake. Resource detail mapping, date timezone semantics, and approved-revision
binding remain pending. Do not invent a numeric revision from last_updated_time.

The supplied SRF is one completed page, including personal data and handwritten signatures.
Use its geometry/branding as a reference; never reuse it as an unchanged background.
Generate clean fields and electronic approval evidence from verified records. The original
paper's direct-manager/conditional HR labels differ from the agreed TA > HR > IT workflow;
retain truthful role labels in the digital derivative. No PDF or signatures have been sent.

Validation: node --test tests/servicedesk-intake.node.test.js tests/servicedesk-evidence.node.test.js.
All tests use synthetic data. Live reads were read-only; no approval or request was changed.

Read-only runtime evidence: the new client successfully read actual request 7297 and both approval decision lists. Diagnostic result FINAL_APPROVAL_PENDING (HR 304 Approved, IT 307 Pending Approval).
SRF synthetic visual prototype: C:/Scripts/Projects/snipeit-project/output/pdf/MTI-New-Hire-SRF-synthetic-preview.pdf. It is a layout review artifact, not a reusable production generator, not an attachment, and not an approved SRF. No source handwritten signatures were retained.


## Authorized scoped server test implementation - 2 November 2026

The user instructed continuation through server-side test preparation. Runtime inspection
found the active backend on Material-UI-LDAPTS / 286b867 with a local Dockerfile edit.
Do not replace or update that checkout. Build a separate exact-commit bridge image from
codex/merdeka-ui and add only a standalone integration Compose service. Existing backend,
frontend, mounts and runtime env remain retained. No provisioning or notifications.

Implementation scope: independent approval plus full paginated history verification,
exact site-scoped master matching, Asia/Makassar date normalization, clean versioned SRF,
durable idempotent jobs, attachment acknowledgment, and explicit allowlisted SQL promotion.
Deploy observation first, restricted to template 905 / workflow 2 / requester 18621 /
HR actor 18622 / IT actor 18623 / MTI site 322. Mutating processing remains off until
live filled-resource and final-approval UAT evidence exists. Polling avoids editing the
ServiceDesk workflow and does not send or decide any approval.

History proof rule for the first approval cycle: complete history through CREATE and
both individual decisions, no unrecognized operations or business field edits after
the first HR decision. A concurrent source change or unavailable history must hold.
Preserve all old approval history. Multiple/deleted approval cycles and revisions of an
already-linked hire require manual review, never automatic approval-record deletion.
The bridge targets the observed live hires.name/audit_logs.new_hire_id schema, not the
stale bootstrap schema. Keep a dedicated job state and preserve every generated file.


## Current candidate after I2/I3/I4/I5 implementation

See servicedesk-bridge-runbook.md for the current authoritative scoped profile and
limits. The earlier foundation sections are implementation history. The standalone
bridge now includes history-based first-cycle verification, actual field mapping,
clean PDF rendering, immutable job state, attachment acknowledgment/reconciliation,
and explicit transactional hire linkage. Only observation is being released; process
mode, migration, real attachment delivery and end-to-end acceptance remain pending.
13 synthetic tests passed and seven exact SQL batches passed against temporary copies
of actual live schema with rollback. No legacy app authentication/provisioning path is used.
The manual bridge migration is separate from I1 inbox SQL; neither has been applied.
