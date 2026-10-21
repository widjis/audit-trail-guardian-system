---
version: alpha
name: MTI Onboarding — Merdeka
colors:
  primary: '#2563eb'
  background: '#f6f8fb'
  sidebar: '#f8fafc'
  text: '#1e293b'
  border: '#e2e8f0'
typography:
  sans:
    fontFamily: 'Inter, system-ui, sans-serif'
rounded:
  DEFAULT: '0.25rem'
  md: '0.5rem'
spacing:
  sidebar: '240px'
  sidebarCollapsed: '80px'
  contentInset: '16px'
components:
  shell:
    source: 'Merdeka dashboard v2'
  table:
    source: 'Employee Master / room-facilities'
  dialog:
    source: 'Existing Radix primitives with Merdeka typography'
---

# MTI Onboarding design

## Intent and scope

Product/admin interface for ICT support managing new hires, provisioning and onboarding readiness.
The user approved the local New Hires preview and requested the same Merdeka shell in the existing
React application. English UI and existing domain terminology are retained. Primary context is
MTI staff in Indonesia; no Japan-market or Japanese-locale requirement is established.

The reference is the captured Merdeka Services dashboard v2 and Employee Master, rather than a
new visual identity. Original large/small logos, Inter, Tabler icon font, neutral sidebar, blue
controls and source tab gradient are reused. Login retains its existing independent theme.
Legacy page bodies, existing forms and shared Tailwind controls explicitly stop vendor selector matching through `.merdeka-legacy`, so Tabler utility sizes cannot override Tailwind utilities such as `h-8`. Only the authenticated shell and New Hires list are migrated; other screens keep their page content.

## Canonical token ownership

`public/merdeka/template/` holds unchanged source assets. `manifest.json` records source hashes.
The captured `constant.css` and Tabler styles own `--mdka-*` and `--tblr-*` values; the frontmatter
mirrors a small observed subset, not a second token generator.

`tools/merdeka/build-theme.cjs` flattens the room-facilities stylesheet in source import order,
rebases URLs and prefixes selectors with `.merdeka-surface`, excluding `.merdeka-legacy` boundaries, into `public/merdeka/scoped.css`.
It derives the existing shadcn primary/ring HSL adapter and portal scrollbar palette from the
canonical source values. Rebuild using an extracted skill template directory:

```sh
node tools/merdeka/build-theme.cjs /absolute/path/to/extracted-merdeka-template
```

`src/styles/merdeka.css` owns application geometry and component variants. Never edit vendor CSS.
Source login styles are not loaded. MUI's existing theme and CssBaseline remain for legacy screens;
scoped vendor rules and application classes isolate the new shell. No theme-switching workflow is added.

## Layout and components

Sidebar is 240px expanded / 80px collapsed, changes original logo and preserves the server-side
`sidebarCollapsed` preference. At widths below 992px a temporary MUI Drawer owns navigation focus,
Escape and backdrop behavior; desktop margins disappear. Content uses a 16px inset, 8px on phones.
Topbar shows actual username/role, fixed account width and working logout, with no simulated company
switching, language selector or notifications.

New Hires uses the preview heading, search, department control, account-status tabs, avatar rows,
status badges, source-style pager and sticky action column. All existing operational columns and
filters remain accessible by scrolling the table panel; no columns are removed on phones. The body
scrolls naturally; the table alone has a bounded internal scroller. Pagination is client-side over
the existing get-all API; the table frame retains a minimum footprint. Date-only values show YYYY-MM-DD
without timezone conversion. Data values and existing validation remain application-owned.

## Interaction and accessibility

Reuse existing Button, Checkbox, FilterPopover, RadioGroup, progress calculator, toast and dialog
primitives. Existing Radix overlays remain the canonical focus/Escape/portal engine to preserve
nested operational dialogs; Merdeka typography/shape adapters style them. This deliberate integration
retains the user's existing functional contract rather than loading a second overlay engine over it.
New controls use original Bootstrap/Tabler classes without loading the template demo runtime.

Use semantic buttons for details, current-route links, labeled controls, visible focus and a skip
link. Mobile navigation remains modal. Table selection explicitly covers all matching records
across pages. Single-delete browser confirmation becomes the existing AlertDialog. Status text
is always visible; color is supplementary. API errors show retry, distinct from empty/no-results.
Scrollbar tokens include Firefox and WebKit; reduced motion and forced colors are respected.

## Boundaries

The preview's fixture schema and localStorage CRUD are not imported. API clients, backend,
authentication, role guards, form validation and integrations remain the existing implementation.
`Active` is the actual account state, so the preview's Account Created tab is labeled Account Active.
Tests against a local fixture API prove UI behavior only, not production integration or physical AD changes.

## Dashboard and detail revision

Dashboard uses business variants of the shared Card primitives inside the legacy utility boundary, with canonical Merdeka tokens, 16px summary-card radius, 14px panel titles, compact headers and consistent gutters. Summary cards precede insights. Recharts, metrics calculations, Overview/Detailed, refresh/export and API ownership remain existing application behavior. Sidebar links explicitly align left; shell stacking stays below Radix overlays. The approved header layout is retained.

HireDetailModal retains Radix, existing tabs and integration actions. Its responsive layout is adapted; WhatsApp content mounts only when its own dialog opens. Add New Hire remains deferred pending user review.

## Add New Hire form

New-mode HireForm follows patterns/travel-request-create: neutral section headers, paired horizontal label/control rows on wide desktop, a single field column at intermediate widths, stacked labels on phones, source token borders and compact Create/Cancel footer. Shared React inputs, Radix selects/switches/confirmation and existing generator/submit handlers remain canonical; source demo JS is not loaded. Edit mode uses the same presentation as Add New Hire, including the existing SRF document section. AD disclosure uses a single keyboard-operable shared Button through CollapsibleTrigger.

## View and Import Merdeka continuation

View retains the existing detail modal, Radix tabs and integration actions. A persistent onboarding summary displays the existing weighted percentage and stored account/laptop/license/SRF states; compact definition lists and neutral section headers match Add/Edit. Import retains FileImporter and its API/file validation owners, with upload/template/column reference as the main panel and process guidance alongside. Its business variant lives in src/styles/merdeka-import.css.

## Welcome Email and HRIS Sync

Both routes reuse Merdeka section-header/card/field/tab density through scoped business stylesheets: merdeka-onboard.css and merdeka-hris.css. Welcome Email separates hire selection/CV analysis from email/card composition; hire selection is keyboard-operable with local search and empty results. Generated welcome-card artwork remains outside the visual adapters. HRIS uses responsive tabs, paired sync/schedule panels and scroll-contained result tables; unverified connection-success wording is replaced by guidance. Existing operational API, validation, thresholds and schedule owners remain.

## Settings Merdeka layout

Settings retains all twelve existing category components and their data/validation/actions. A compact 220px secondary category navigation replaces the full-height internal layout. Below1100px the existing MUI Drawer owns category focus/Escape. merdeka-settings.css adapts card headers, control density, tabs and table scroll without editing vendor/shared primitives.

## MBM branding

Application shell uses official MBM horizontal SVG from merdekabattery.com. Original retained at public/merdeka/branding/mbm-logo-source.svg; light-background derivative changes white wordmark to slate, preserving symbol geometry/colors. Collapsed variant clips the source viewBox to the symbol. Desktop/mobile/drawer and watermark use MBM assets; vendor archives remain unchanged.

## Login Merdeka adaptation

Login follows the source login-specific split card, 20px radius, darkened background and white/blue outlined submit control. Existing application images /blurry.png and /image.png remain unchanged, as explicitly requested; MBM logo matches the authenticated shell. merdeka-login.css is isolated from dashboard vendor selectors. Existing LoginForm and local/LDAP/hybrid configuration and submit handlers remain. Source demo authentication/SSO/CAPTCHA are not introduced.
