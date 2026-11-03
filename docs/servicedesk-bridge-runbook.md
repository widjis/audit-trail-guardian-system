# ServiceDesk bridge server test runbook

## Active restricted server deployment - 3 November 2026

User explicitly approved the existing env changes and DB access for test template 905.
Deployed bridge source commit: 65ea705c0c106662c85473f9a9fc70e088cfd73a.
Image: audit-trail-guardian-system-servicedesk:65ea705c0c10;
ID sha256:91a50f78ad990acf382b7044be90ed12d6f4078642ca97cc366eb8cc51b94dcc.
Compose project: audit-trail-guardian-system. Container: its servicedesk-bridge service.
Root: /root/audit-trail-guardian-system; override docker-compose.servicedesk.yml.
Configuration: existing .env.production, protected backup and mode 600. No separate DB
credential file was created. Only explicit DB and SDP environment keys reach the service.
State: .runtime/servicedesk; source: .releases/servicedesk/commit; protected evidence and
env recovery copies: .release-audit/servicedesk/commit, all below the same onboarding root.
The older standalone directory/image are historical preparations, not the active service.

Mode process is active only for template 905, workflow 2, requester 18621, HR actor 18622,
IT actor 18623 and MTI site 322. Poll interval 30 seconds. No public port/webhook listener
is exposed by this bridge. The separate I1 HTTP intake route is not deployed into the
retained old backend image; the active path independently polls ServiceDesk approvals.
The sanitized DOCX-based SRF layout is included in this deployed image.

Applied additive dbo.servicedesk_bridge_jobs migration: 12 expected columns and primary
key verified; no existing business table was altered. Health, source API and DB access
verified. At verification, source 7297/7302 both HELD FINAL_APPROVAL_PENDING; jobs=0,
linked hires=0. Neither is end-to-end acceptance. Both old requests also lack Position
Grade, so use a fresh complete tester request rather than assuming they can promote.
Frontend 9001 and backend settings 9002 returned HTTP 200, six active grades available.
Existing backend/frontend container IDs and images were retained unchanged.

13 local integration tests and 7 image tests passed. Complete user UAT is still pending:
TA tester submits synthetic New Hire, HR and IT testers make their own decisions,
then verify one SRF attachment on ticket, matching local SRF bytes, one linked onboarding
hire/audit record and replay without duplicates. Do not impersonate test approvers or
trigger AD/Exchange/Graph/WhatsApp fulfillment to prove the integration works.

Operational rollback: stop only servicedesk-bridge, or change SDP_BRIDGE_MODE to observe
and recreate only that service. Keep existing app containers and new additive job table,
documents and approval history. Restore the protected env backup only after reviewing
other subsequent env changes; never overwrite newer configuration blindly.
Documentation HEAD may be newer than the image SHA; docs-only updates need no rebuild.

## Historical preparation and design notes

Earlier not-deployed/pending-credential statements below describe previous milestones;
the active status above supersedes them. Full business UAT remains pending.


## Current scope

Standalone polling bridge, independent of the existing backend/frontend release.
Source branch codex/merdeka-ui, GitHub widjis/audit-trail-guardian-system.
Production app baseline inspected 2 November 2026: mtimrwcnt01 / 10.60.10.59,
/root/audit-trail-guardian-system, Material-UI-LDAPTS at 286b867, locally modified
Dockerfile.backend. Do not pull/reset/change that checkout or replace its services.
Backend image e86b02d9b899, frontend f77abb79dbe4. Upload mount remains
/root/audit-trail-guardian-system/uploads -> /app/uploads.

Build bridge only from an exact tracked commit archive with
integrations/servicedesk/Dockerfile. Node 22 is required by the locked dependencies;
this does not upgrade the active application runtime. Build candidate without secrets.
Run bridge.node.test.js inside the candidate image before activation. Record exact
image ID, source revision label and retained app IDs in protected server release audit.

## Restricted observation deployment

Use a separate Compose project mti-servicedesk-bridge and protected deployment directory
/home/mtiadmin/deployments/mti-servicedesk-bridge. This creates one new service, no host
ports and one private health volume. Observe mode mounts existing uploads read-only.
Use compose.example.yaml as the reviewed shape; never copy credentials into Git.
Set SDP_BRIDGE_IMAGE to the verified image, SDP_BRIDGE_ENV_FILE to a mode-600 raw env file.
That file carries only the existing DB connection and outbound ServiceDesk credential.
Compose raw env-file mode prevents interpretation of special characters in credentials.

Fixed test scope: template 905, workflow 2, requester 18621, HR actor 18622,
IT actor 18623, MTI site 322. Default context for an omitted optional Site is
Merdeka Tsingshan Indonesia (322); an explicitly different site is rejected.
No account names/credentials are inferred from the source requester. Never impersonate
an approver. Poll interval 60 seconds, minimum 30 seconds. The existing HTTP intake
endpoint is separate and remains disabled in the old application image.

Observe mode runs SELECTs only and writes only nonpersonal status codes to its private
health state. It creates no hire/job table, SRF, attachment, AD account, license,
membership or notification. No ServiceDesk template/workflow mutations are required.

## Readiness and source data

Full approval levels, individual decisions and history are paginated. Rereads detect
concurrent edits. Human identity comes from individual action_by, not the level's
System actor. The base evidence gate always holds; source.js adds the actual audit
history proof for a first-cycle approved request. Every business UPDATE after HR,
unrecognized operation, deleted/multiple cycle or incomplete history must hold.
Revision is the last persisted CREATE/UPDATE history ID before HR, with an INT bound.
This is intentionally conservative; revision/correction automation is not complete.

Department display name resolves exactly within MTI site 322. Manager display name
must resolve to one User. Ambiguity holds, never pick the first result. Join Date
uses Asia/Makassar (UTC+8), independent of an API user's display timezone.
Grade must match active SQL position_grades with no UI fallback.

Verified actual resource shape from tester request 7302: answers in udf_fields,
Notebook object name/id, and AD/Email/Mailing List objects in the multiselect.
udf_sline_2862 and udf_sline_2863 wrap a value. Nested resource aliases are accepted
only for the known question names; unknown question shapes hold for mapping review.
Shared-folder details must explicitly contain UNC path | Read/Modify or UNC path
(Read/Modify), one per line/semicolon. Mailing lists split on comma/semicolon/newline.
Missing selected details or stale unselected details hold instead of being discarded.
Employee ID is optional until HR issues it; retained in job/SRF because live hires has
no employee_id column. Optional Site does not reintroduce Work Location.

## Mutating processing candidate - NOT activated

process mode requires an explicit deployment change, writable uploads, manual additive
migration.sql, and completed controlled final-approval UAT. Do not turn it on merely
because a healthcheck is green. Existing 7297 and 7302 are incomplete/pending test
requests, not proof of end-to-end acceptance. No schema migration has run.

When authorized and validated: immutable job keyed by source request ID; hash conflict
or another revision holds for manual review. Store source evidence and clean versioned
PDF. File creation uses exclusive write, full SHA-256 is retained. PDF is regenerated
from clean geometry/branding; source employee data and signatures are never reused.
Long fields continue onto additional pages; unsupported glyphs fail rather than corrupt.
Description HTML is retained in evidence; this candidate uses a standard New Hire
justification in the PDF, not an unvalidated HTML-to-text conversion.

Before delivery reread approved data/history. Reconcile attachments by deterministic
name AND downloaded byte hash. Claim upload in SQL before PUT. An ambiguous upload
timeout is never automatically repeated. Unknown post-approval attachment history
operations can conservatively hold recovery and require manual reconciliation.
Do not delete/rewrite history or documents to resolve a hold.

Promote only after both local PDF and remote attachment bytes are acknowledged, with
one explicit SQL transaction inserting the observed live hires/audit_logs schema and
marking the source job COMPLETE. Recheck source data and actual decisions immediately
before promotion. New request changes after promotion are held for manual review.
No distributed transaction exists with ServiceDesk; the immutable approved evidence
and subsequent holds are retained for reconciliation.

The existing app uses workflow_status=approved and account_creation_status=Pending.
Ready for ICT Processing is recorded in remarks and audit, not a new invented enum.
No AD/Exchange/Graph/WhatsApp code is imported or invoked by the bridge.

## Verification evidence - 2 November 2026

- Node 22.14.0: 13 synthetic tests passed, 0 failed (intake, evidence, worker/PDF).
- Seven exact final SQL mutation batches executed against #temporary tables created
  from the actual live hires/audit_logs schema; one hire/log/completed job in temp
  state, transaction rolled back. No real hire/job/approval record was created.
- Actual API reads: 7297 HR approved, IT pending; 7302 pending and missing grade/site.
- Synthetic PDF rendered and visually checked; one-page and long-field pagination tested.
- Live end-to-end promotion, remote attachment upload, SQL concurrency, and recovery
  of an ambiguous real upload remain unverified. These are gates before process mode.

## Operations and rollback

Use docker compose -p mti-servicedesk-bridge -f <protected compose> up -d --no-build
--pull never --wait servicedesk-bridge after candidate verification. Check actual image
revision, /state/health.json and retained backend/frontend IDs. Health distinguishes
working observation from request holds; HELD is not an eligible onboarding request.
Rollback for first observation install: stop/remove only the new bridge container,
retain protected env/evidence and health volume. Never stop the active app/database.
No database rollback is required for observation because it does not migrate or write.


## Prepared release evidence - activation pending

Source image commit 90e5be94da4b32e407e87e629f7a925669b95c51 is pushed and verified
on origin/codex/merdeka-ui. Exact-archive SHA-256:
0e93ee840cb5b3184c91e81fcc1fc4c721a8137c15d47c52ba9f7b5fd0f1a9c3.
Server candidate mti-servicedesk-bridge:90e5be94da4b:
sha256:44359c9a0515e1fe7fabd2730dae5c4d6bef2eceaa67089b643ac2ec2c46054c.
Seven bridge tests passed inside this Node 22 image, network disabled/read-only.
TLS/DNS read without a credential reached ServiceDesk (HTTP 400), certificate verified.
Existing backend/frontend container IDs and images were retained.
Candidate audit/build/test logs are under the protected deployment candidates/commit
directory; concrete compose.json is prepared. No bridge container was activated.

Automatic approval review rejected copying the active application's DB credentials
into a new persistent bridge credential file because that expands secret access and
blast radius without explicit consent. The credential-copy action did not execute;
bridge.env was verified absent. User consent was requested and remains pending.
Do not retry that copy or activate the service until the user decides. A separate
observer without database credentials is the alternative offered. No migration ran.
The documentation commit may be newer than the prepared image; no source code changed.


## Revised deployment scope authorized 3 November 2026

User explicitly permits a separate container but requires one onboarding folder/repository.
Use docker-compose.servicedesk.yml alongside existing docker-compose.yml, the existing
audit-trail-guardian-system Compose project, and /root/audit-trail-guardian-system.
All new persistent configuration, runtime state and release evidence stay under that root.
Do NOT create the former standalone project or bridge.env. The service references only
explicit DB fields from the existing onboarding .env.production, plus the ServiceDesk
API settings added there. It does not inherit the full AD/Graph/WhatsApp environment.
No DB password is duplicated into a separate bridge credential file. This replaces the
previous proposal rejected by automatic review. Existing env gets a protected backup.

Use an exact-commit archive below .releases/ for the candidate build because the live
checkout is on an older application branch with local Dockerfile changes. Do not pull,
reset or replace the existing backend/frontend to deploy the added scoped service.
Record both application checkout HEAD and bridge image source revision. The old external
candidate preparation directory is historical, not the new deployment root.

Initial startup observe; after verified API/DB connectivity and additive bridge state
migration, process mode is allowed only for test template 905/requester 18621/HR 18622/
IT 18623. No real approver impersonation or operational template activation. Final HR/IT
decisions must be made through the tester identities. No AD/license/message dispatch.
