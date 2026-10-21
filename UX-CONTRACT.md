# MTI Onboarding UI contract

## Sources and policy boundary

| Source                                                   | UI consequence                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| User request: preserve existing functions                | Keep API/service contracts and operational dialogs                                      |
| APIDOC.md; src/services/api.ts                           | Existing /hires list, create, update, single/bulk delete and bulk update endpoints      |
| src/App.tsx                                              | HRIS Sync requires admin/support; Settings requires admin                               |
| src/services/auth-service.ts; src/services/api-client.ts | Server token verification; expired sessions redirect to login; logout clears token/user |
| src/utils/progressCalculator.ts                          | Use existing weighted progress and exact account/laptop semantics                       |
| src/components/hires/HireForm.tsx                        | Keep existing create/edit validation and submit/navigation behavior                     |

The table above records observed contracts and does not introduce backend permission or deletion policy.

## Canonical UI map

| Capability      | Canonical owner                                                                                    | Source of truth                 | Allowed variants                                                                | Verification               |
| --------------- | -------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------- | -------------------------- |
| Table Selection | HiresTable + shared Checkbox                                                                       | DESIGN.md and existing services | All matching results across all pages; explicit label and count                 | Browser fixture regression |
| Select/Listbox  | Native source-themed select for department/page size; existing shared Select for operational forms | DESIGN.md and existing services | Platform popup accepted for the simple native controls                          | Browser fixture regression |
| Date            | Existing HireForm date control                                                                     | DESIGN.md and existing services | Existing validation; list renders stored date-only prefix                       | Browser fixture regression |
| Form            | HireForm, BulkUpdateDialog                                                                         | DESIGN.md and existing services | Existing fields, validation, service calls and destinations                     | Browser fixture regression |
| Scrollbar       | src/styles/merdeka.css, generated portal token adapter                                             | DESIGN.md and existing services | Body and table; table owns its scroll extent                                    | Browser fixture regression |
| Toast           | components/ui/use-toast and existing Toaster                                                       | DESIGN.md and existing services | Preserve operation feedback                                                     | Browser fixture regression |
| CRUD            | services/api.ts and existing routes                                                                | DESIGN.md and existing services | New /hires/new; edit /hires/:id; details existing HireDetailModal               | Browser fixture regression |
| Overlay         | Existing Dialog/AlertDialog; MUI Drawer for mobile navigation                                      | DESIGN.md and existing services | Focus, Escape, backdrop and nested operational dialogs retain library ownership | Browser fixture regression |

## Flow ledger

- Open shell: verify session before rendering content; load sidebar preference; failure to read preference
  uses expanded default. Role-filtered links mirror existing route guards; no new role is granted.
- Search/column/account filters: filter existing get-all results locally, reset page and clear selection.
  Department quick filter and column filter share one state. Sorting applies before pagination.
- Selection: header checkbox selects all matching records, not just the current page. Paging/sorting
  preserves selection; changing a filter clears it. Bulk actions always show the exact count.
- Load: visible pending state; list failure has persistent retry; empty dataset offers Import Data;
  no matching results offers clear filters. Retry uses the same endpoint.
- Create/edit: route to the existing HireForm. The preview's add/edit modal is not substituted for
  a production form or its integration workflows.
- Details: name/eye button opens the existing details modal, including its integration actions.
- Single delete: open shared AlertDialog naming the hire; Cancel initially safe; disable repeated
  submission; await API completion before closing; on failure keep the dialog and show existing toast.
- Bulk delete/update: retain existing endpoint payloads and selected objects used by the report and
  operational dialogs; refresh after completion. Never change delete scope to the current page.
- CSV: export all currently matching sorted records; escape quotes/newlines and neutralize formula
  prefixes. Existing Excel Report remains available for selected records and through Bulk Update.
- Mobile navigation: temporary drawer, focus isolation and Escape/backdrop dismissal; close on
  navigation. Desktop collapse preference continues through the existing preference service.

## Verification boundary

Use the separate localhost-only fixture API for UI regression testing. Do not connect automated
mutation tests to production. Fixture success is not AD, HRIS, Graph, WhatsApp, or deployment acceptance.
See docs/ui/merdeka-verification.md for the actual checks and known pre-existing failures.

## Dashboard/detail continuation

DashboardOverview owns the existing view/chart selectors and exports, using shared Button/Card primitives. Export menu ignores pointer events inside its own region and closes on Escape. Data failures show persistent Retry without replacing existing data. The existing metric definitions are retained; this visual revision does not validate their business accuracy. Detail overlay must cover the sidebar, remain within the viewport, preserve tab focus/Escape, and defer WhatsApp template retrieval until its dialog opens.

## Add New Hire visual adaptation

HireForm remains the canonical create/edit owner. New-mode style adaptation preserves input names/types/required attributes, username limit, field generation, settings-driven options, empty-mailing-list confirmation, existing submit payload, current-user PIC and return route. Shared Radix select/switch/AlertDialog and Collapsible retain behavior ownership; AD disclosure is keyboard-operable and is type=button inside the form.
