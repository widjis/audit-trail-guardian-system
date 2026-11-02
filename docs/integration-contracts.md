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
