# Merdeka Services frontend template

## Scope and evidence
Source: https://services.merdekacoppergold.com/Account/Login. Login and authenticated `/Dashboard/DashboardV2` observed 2026-10-21. The initial capture covered login/dashboard; later revisions below added representative authenticated menu patterns. The root component gallery is a separate demonstration.

## Visual intent
Preserve observed Tabler PMS CSS, Inter typography, original image assets, blue primary controls, neutral surfaces and observed split login composition. No redesign.

## Runtime token ownership
`assets/remote/services.merdekacoppergold.com/assets/css/tabler.pms.min.css` owns original `--tblr-*` values. `theme.css` imports the local Inter font CSS and original stylesheet, applies the observed font override, and aliases tokens as `--template-*`. Gallery and reusable components use the original Tabler classes.

## Observed light tokens
Primary #206bc4; secondary #667382; success #2fb344; info #4299e1; warning #f76707; danger #d63939; body #f6f8fb; text #182433; border #dadfe5; base radius 4px. Login overrides card radius to 20px and adds a darkened photograph background.

## Preview behavior
No authentication, SSO, CAPTCHA, external form actions or persistence. Login fields/actions are disabled. Gallery controls operate locally. Preserve labels, visible focus, mobile stacking and reduced motion.

## Dashboard extension (observed v2)
The authenticated dashboard uses a distinct `/assets/v2/` stylesheet tree. Preserve separate theme entry points; the login stylesheet is not the dashboard source. Model B ownership remains: captured CSS variables own values, this document mirrors observations. `dashboard/dashboard-theme.css` imports the observed styles in order; `custom.css` imports `constant.css` and its `--mdka-*` palette. `dashboard/inline-observed.css` preserves inline overrides. Computed body typography: Inter, 13px; body background #f6f8fb; page wrapper white; sidebar #f8fafc. Summary cards use 16px radius and light shadow; source base card radius remains 4px. Desktop sidebar, top bar, summary cards and charts are reconstructed for reuse with synthetic values. The original chart SVG/data are excluded.

Dashboard behavior is a single offline demo, not a CRUD application. `demo.js` owns local disclosure navigation, native period selection (platform popup accepted), sample chart updates and a shared status region. `demo.css` owns the demo layout adaptation only; original vendor CSS remains archived unchanged in `originals/`. No product data or permissions are inferred.

## Revision 3: source structure replaces approximation
The user requested maximum visual fidelity for every element. The dashboard now uses sanitized source `.page` DOM rather than the earlier independently authored layout. Source `#sidebarLogo`/`.sidebar-header`, full sidebar navigation, topbar, breadcrumbs, all summary-card decoration, SVG map, chart-card hierarchy and footer are retained. Original large and small logos and source expand/collapse functions are used. Chart option blocks are adapted from inspected source, with the observed Helvetica chart text and library defaults; data remains synthetic. Measured desktop anchors match exactly at 1280x900. This is not proof of pixel identity for all elements or states. Mobile removes captured desktop margins intentionally. `faithful.css`/`faithful.js` own template-only changes; `demo.*` is historical.

## Representative pattern library
The user narrowed the scope from all menu pages to one example per repeated UI pattern. `patterns/` packages four source-markup examples: tabbed table/filter/detail, long request form with subtable modals, standalone transport form/passenger modal, and master table/edit modal. The existing dashboard is the fifth pattern. Each `page.css` owns its observed source stylesheet order and inline blocks; source CSS remains canonical. `runtime.js` owns fixture data interaction and local-only adapters; the helper bar/gallery are deliberate preview additions. Source business workflows and API-driven modal states are not reproduced or claimed equivalent.

## Fidelity revision 4
Source geometry remains canonical. Shared adapters now preserve original numbered pager styling and input-icon DOM structure, source Select2 border tokens, empty initial create/master tables, modal field visibility and the measured header account width. Default views hide template-only help overlays; `?tools=1` restores them. `patterns/fidelity-review.json` records paired source/local anchors; column widths and first-row density match, while fixture content and pager totals intentionally differ. Original textarea resize handles are retained because the explicit fidelity request overrides the premium default. No source vendor assets or tokens were changed.

## Employee Master application example
`employee-master/` extends the captured master shell with an original employee-directory workflow. The palette, source classes, Inter font, logos and vendor styles remain canonical; `app.css` owns table density, toolbar layout, local status badges and responsive form composition. Application behavior lives in `employee-master/UX-CONTRACT.md`; source pattern adapters are not loaded on this route. Data and schema are mock assumptions. The app reuses Bootstrap overlays and native selects/date controls with the source theme.
