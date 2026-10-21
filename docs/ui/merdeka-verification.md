# Merdeka shell and New Hires verification

Branch: `codex/merdeka-ui`. This change migrates the authenticated shell and New Hires list.
Backend and API service modules, route guards, login, HireForm validation and integration handlers
remain the existing implementation. Other page bodies retain their Tailwind/MUI styles through
an explicit vendor-CSS boundary.

## Engineering checks

| Check                                                                       | Result                                                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `npm run build`                                                             | Passed; existing large-chunk advisory remains                                                                      |
| `npm run type-check`                                                        | Passed; also ran the actual app project check below                                                                |
| `node node_modules/typescript/bin/tsc --project tsconfig.app.json --noEmit` | Passed                                                                                                             |
| ESLint on changed application components                                    | Passed, including HireDetailModal                                                                                  |
| `npm test -- --runInBand`                                                   | Passed: 2 suites, 51 tests                                                                                         |
| `git diff --check`                                                          | Passed                                                                                                             |
| Changed-source formatting with explicit Prettier options                    | Passed                                                                                                             |
| `npm run lint`                                                              | Repository still fails: 52 existing errors and 12 warnings; baseline had 52 errors and 13 warnings                 |
| `npm run format:check`                                                      | Existing config fails: `.prettierrc.js` uses CommonJS in an ES-module package; this config was not changed         |
| Strict premium UI audit                                                     | 31 findings in unchanged source files; zero findings in changed application files; no unresolved ownership entries |
| Source resources                                                            | 78 retained files match their manifest SHA-256 hashes; 86 local CSS resource references resolve                    |

The strict audit JSON is `merdeka-audit.json`. It is static evidence, not a runtime accessibility or
backend acceptance result. No unrelated repository lint, form or native-dialog cleanup is claimed.
Vendor originals are excluded from application lint because the retained Google-font stylesheet has
an original `.js` filename despite containing CSS.

## Browser checks actually performed

All application browser checks used fictional records in a separate localhost fixture API.

- Existing login and logout; admin navigation contains HRIS Sync and Settings. A normal-user fixture
  session omits both; direct navigation to Settings redirects to Dashboard through the existing guard.
- Shared shell checked on Dashboard and the New Hires create/edit pages. Dashboard's legacy controls
  retain a 32px height instead of inheriting Tabler's conflicting `h-8` utility.
- Sidebar 240px expanded / 80px collapsed, original large/small logo exchange, preference retained
  after reload; desktop body has no horizontal overflow.
- Search no-results and clear; department filter; column name and license filters; sort state;
  client pagination boundary (page 3: records 21–27) and 25-row page size.
- Select-all covers 27 matching records across pages. Existing Bulk Update submits all 27 IDs and
  changes laptop status through `/hires/bulk-update`; the existing Excel Report dialog renders them.
- Existing detail modal, progress and operational actions remain available. Its obscured duplicate
  close control is hidden; the explicit header close is labeled and verified. Escape also works.
- Existing edit form updates a fictional hire and returns to the list. Existing create form creates a
  fictional hire. Both retain the original empty-mailing-list warning and Proceed Anyway path.
- Named single-delete confirmation, Cancel, successful deletion of the newly created disposable
  fixture record, refresh and list recovery. Production records were not deleted.
- CSV download filtered to Nadia contains a header and exactly 3 matching fictional records. New CSV
  export excludes passwords. Existing Excel report behavior is retained separately.
- Simulated list failure shows a persistent error and Try again; retry and empty dataset are distinct
  from search no-results. Empty data offers Import Data.
- Phone breakpoint 390×844: document width 390px; table scrolls inside its panel. Mobile navigation
  drawer opens, exposes existing links and closes with Escape. Desktop inspected at 1280×900.
- Snapshots: `merdeka-desktop.png`, `merdeka-mobile.png`, `merdeka-status-columns.png`.

The original app's form field set is preserved. The preview's simplified employee form, fixture data,
localStorage CRUD and Active/Inactive employee lifecycle were not imported. Account tabs use the
actual `Pending` and `Active` values. Business labels are not inferred from preview fixtures.

## Reproduce the isolated local check

From the repository, run in separate terminals:

```sh
node tools/merdeka/fixture-server.cjs
node node_modules/vite/bin/vite.js --config tools/merdeka/vite-fixture.config.ts --mode ui-fixture
```

Open `http://127.0.0.1:18876/hires`. Use `demo@example.invalid` and any nonempty fixture-only
password in the existing login form. The fixture login is a test stub, not real authentication.
The API binds to 127.0.0.1:18877, keeps mutations in memory and has no upstream connection.
The dedicated Vite test config forces both the API-client base URL and all legacy `/api` fetches
to this fixture. Unsupported routes return a fixture 404 instead of forwarding to a real backend.
Normal application Vite and production API configuration are unchanged.

The captured fixture mutation summary in `fixture-mutations.json` demonstrates endpoint/scope
preservation. Integration settings are disabled in this fixture. AD provisioning, HRIS sync,
Graph/Exchange, WhatsApp dispatch, real permission enforcement, production persistence and deployment
have not been live-validated by this UI migration. No commit, push or deployment was performed.

## Sidebar/header revision — 2026-10-21

Reused the source navbar-brand/container hierarchy, original collapse and dashboard SVGs, logout SVG, large/small brand assets and sidebar watermark. Retained React routes, role checks, sidebar preference persistence, authentication and logout handler. Company identity remains static because this app has no company switching. Dashboard body and hire forms were not edited.

Desktop 1280x900 measured: logo x24/y20, 102.765625x45; first link x8/y93, 221x36; header x240/y0, 1040x57. Source first-link width was 222, so this is anchor alignment, not a pixel-identical claim. Expanded/collapsed width240/80 verified; preference survived reload; New Hires route works; drawer390px opens and closes on Escape; watermark loaded. Browser checks used the local fictional API fixture at18876/18877, not the live backend.

App TypeScript, targeted component ESLint, production build and git diff --check passed. Build retains existing bundle-size/Browserslist warnings. Screenshot: /Users/widjis/Documents/ChatGPT/Widji/previews/merdeka-shell-stage1.png.

## Dashboard and View New Hire revision — 2026-10-21

Sidebar labels/icons now align left via a source-specific selector; the approved header is unchanged. Dashboard uses compact shared-card variants, summary-first hierarchy, consistent panel titles/padding, and a smaller department donut. All prior metric definitions and chart/API handlers remain. View detail now stacks above the sidebar (source navbar z1030 previously covered Radix z50); desktop/mobile bounds and title/tab layout fixed. WhatsApp child mounts only on explicit open, avoiding an unsolicited template request/error when viewing a hire.

App TypeScript, targeted ESLint (zero warnings/errors), production build and git diff --check passed. Build retains existing bundle-size/import/Browserslist warnings. Browser fixture verification: Overview/Detailed, Pie/Funnel, insights toggle, refresh, export menu CSV/JSON visibility and Escape; export file contents were not downloaded/revalidated. API failure Retry shown, recovered through Retry; empty-data state rendered, fixture then restored. Detail General/Progress/Documents/Audit tabs and close/Escape checked. Desktop1280x900 and phone390x844 checked; phone document width390 equals viewport390. No live AD/O365/WhatsApp dispatch or upload was performed. Existing dashboard math and previously inert Filter/Calendar controls are outside this visual revision.

Screenshots stored in /Users/widjis/Documents/ChatGPT/Widji/previews/: merdeka-dashboard-stage2.png, merdeka-dashboard-mobile-stage2.png, merdeka-hire-view-stage2.png, merdeka-hire-view-mobile-stage2.png. Add New Hire was not changed.

## Add New Hire revision — 2026-10-21

Adapted travel-request-create section-header and horizontal-field composition without changing validation or payload/service behavior. Added labels to password icon buttons and IDs to existing select triggers; AD disclosure remains Radix-owned and uses one semantic button.

Verified on local API fixture: empty required fields invalid; malformed email invalid; Position Grade warning; username maxLength20; settings dropdowns; password visibility; AD disclosure by pointer and Enter; empty mailing-list warning Cancel and Proceed Anyway; switches; create -> list -> reload -> search; values survived and edit/update returned to list. Test record was deleted after validation. Cancel returned to the list. No live directory provisioning, message dispatch or external integration was exercised. Copy handler is retained; OS clipboard contents were not read for verification.

Desktop1280x900 and phone390x844 screenshots saved; phone document width390 equals viewport390. App TypeScript, targeted HireForm ESLint and production build passed. Existing bundle-size/import/Browserslist warnings remain. git diff --check passed. Final CSS-only alignment refinement was inspected in browser after the build. Screenshots: /Users/widjis/Documents/ChatGPT/Widji/previews/merdeka-add-hire-stage3.png, merdeka-add-hire-setup-stage3.png, merdeka-add-hire-mobile-stage3.png.

## Edit Hire matching form — 2026-10-21

Removed new-mode styling gates so shared HireForm renders both modes with identical section headers, label alignment, field sizing and actions. Existing SRF document section and integration actions remain. HireDetail WhatsApp content now mounts only on explicit dialog open. No validation or save-payload changes. App TypeScript and targeted ESLint passed; desktop1280x900 and mobile390x844 inspected, no mobile document overflow. Required-name rejection, update confirmation, update/reload persistence and document-section presence verified with fixture-1. Fixture fields restored after testing. No real API provisioning/upload/message dispatch. View modal inspected for advice only, unchanged. Screenshot: /Users/widjis/Documents/ChatGPT/Widji/previews/merdeka-edit-hire-stage4.png and merdeka-edit-hire-mobile-stage4.png.

## View and Import parallel revision — 2026-10-21

View: compact semantic definition lists, neutral section headers and persistent onboarding status summary. Existing percentage calculation, data queries, tabs, document controls and operational actions preserved. Literal license None no longer receives an active badge color. Import: source-toned headers, upload/template/column-reference primary panel, side guidance, responsive stacking, accessible file remove. Existing extension validation, import payload, template/reset/results handlers preserved.

Real app8080 read-only inspection: View General/Progress/Documents/Audit selected successfully; Escape closes; phone390px dialog x8,width374 and no internal horizontal overflow. Import desktop and phone inspected; document width390 equals phone viewport390. Fixture18876 file tests: txt rejected, csv selected, remove clears selection. No Import Data submission, real record mutation, AD/O365/WhatsApp dispatch, document upload/delete or deploy. Import endpoint success and row-error result handling are retained by code review, not newly exercised against real data. TypeScript and targeted ESLint passed; diff check clean. Screenshots under /Users/widjis/Documents/ChatGPT/Widji/previews/: merdeka-view-live-stage5.png, merdeka-view-mobile-stage5.png, merdeka-import-live-stage5.png, merdeka-import-mobile-stage5.png.

## Welcome Email / HRIS parallel revision — 2026-10-21

Welcome Email: aligned heading and gray panel headers, consistent spacing, local hire search, semantic selectable buttons, empty-search and pre-generation guidance. Existing upload/analysis/generate/draft/send/card handlers preserved. Card rendering options retain runtime values while replacing pre-existing any casts/catches with explicit typing. HRIS: Merdeka panels/forms/tabs, responsive layout and initial result guidance; settings labels associated with controls, typed existing syncSummary. Operational handlers preserved.

Real app8080 read-only verification: Welcome Email search/no match and keyboard selection expose CV Analysis; no upload, AI analysis, draft save or email send performed. HRIS HRIS Table/Export/Sync tab switching verified; no Run Test/manual sync/schedule Update executed. Both phone390x844 document widths390; desktop1280x900 inspected. Existing HRIS Export is a simulated message without file download, unchanged. App TypeScript, targeted ESLint for all five touched TSX files, production build and diff check passed. Existing build bundle-size/import/Browserslist warnings remain. No deploy or real record mutations. Screenshots in /Users/widjis/Documents/ChatGPT/Widji/previews/: merdeka-onboard-stage6.png, merdeka-onboard-mobile-stage6.png, merdeka-hris-stage6.png, merdeka-hris-mobile-stage6.png.

## Settings revision — 2026-10-21

Reworked Settings navigation/layout; preserved all twelve category component owners and active-category state. Original settings values, save/test/delete handlers, dialogs and API contracts unchanged. Desktop1280x900 all12 categories loaded; mobile390x844 inspected AD, Graph, AI, ICT Support and Account Status. Drawer Escape and category selection close verified. Account Status edit mode entered and canceled without saving. ICT table scroll localized340px; final phone document width390 matches viewport390 after Settings-scoped shell overflow correction. No configuration values edited/saved, tests run, integrations dispatched or deploy. App TypeScript, page ESLint, production build and diff check passed; final CSS-only overflow refinement checked in browser after build. Existing build warnings remain. Screenshots: /Users/widjis/Documents/ChatGPT/Widji/previews/merdeka-settings-stage7.png and merdeka-settings-mobile-stage7.png.

## MBM logo replacement — 2026-10-21

Replaced expanded/collapsed sidebar, mobile header, drawer logo and decorative sidebar watermark. Official source/provenance and adaptation recorded in public/merdeka/branding/SOURCE.md. Expanded/collapsed toggle and mobile drawer verified in live app; visible MBM images loaded locally. TypeScript and targeted layout ESLint passed; diff check clean. No deploy. Screenshots: /Users/widjis/Documents/ChatGPT/Widji/previews/mbm-logo-expanded.png, mbm-logo-collapsed.png, mbm-logo-mobile.png.

## Login revision — 2026-10-21

Preserved /blurry.png outer background and /image.png panel image. Adapted source split login composition, MBM branding, Inter, compact MUI controls and source white/blue submit. LoginForm handler/configuration/required fields remain unchanged; selected method hides duplicate icon/caption only (options and explanatory alert retained). Session redirect remains; page effect cancels after unmount. Removed inert signup text from prior page.

Opened localhost8080/login separately from authenticated127.0.0.1 app session. Desktop1280x900 and phone390x844 inspected; phone document width390; image loaded. Hybrid dropdown Auto-detect/Local/Active Directory options shown; Escape closes. No credentials submitted, login/logout, reset or settings mutation executed during this visual check. Existing session remains available. App TypeScript, targeted login ESLint and diff check passed. Screenshots: /Users/widjis/Documents/ChatGPT/Widji/previews/merdeka-login-stage8.png and merdeka-login-mobile-stage8.png.
