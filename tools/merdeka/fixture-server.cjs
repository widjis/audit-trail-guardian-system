// Local-only UI regression fixture. No upstream connection, persistent data or real accounts.
const http = require('node:http');
let role = 'admin',
  failList = false,
  delay = 0,
  empty = false;
let preferences = { sidebarCollapsed: false };
const names = [
  'Aditya Pratama',
  'Nadia Putri',
  'Rizky Saputra',
  'Dewi Lestari',
  'Bagas Wijaya',
  'Citra Maharani',
  'Fajar Ramadhan',
  'Intan Permata',
  'Galih Setiawan',
  'Maya Kartika',
];
const departments = ['Information Technology', 'Human Resources', 'Operations'];
let hires = Array.from({ length: 27 }, (_, i) => ({
  id: `fixture-${i + 1}`,
  name: names[i % names.length] + (i >= 10 ? ` ${i + 1}` : ''),
  title: ['System Support Analyst', 'HR Officer', 'Operations Supervisor'][
    i % 3
  ],
  position_grade: 'Staff',
  department: departments[i % 3],
  email: `hire.${i + 1}@example.invalid`,
  direct_report: 'Fixture Supervisor',
  phone_number: '',
  mailing_list: [],
  remarks: '',
  account_creation_status: i % 4 === 0 ? 'Active' : 'Pending',
  license_assigned: i % 4 === 0,
  status_srf: i % 3 !== 0,
  username: `fixture.${i + 1}`,
  password: '',
  on_site_date: `2026-10-${String((i % 27) + 1).padStart(2, '0')}`,
  microsoft_365_license: i % 4 === 0 ? 'E3' : 'None',
  laptop_ready: i % 3 === 0 ? 'Pending' : 'Ready',
  note: '',
  ict_support_pic: 'Fixture Support',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  audit_logs: [],
}));
const events = [];
http
  .createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:18876');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,DELETE,OPTIONS',
    );
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    let body = '';
    for await (const chunk of req) body += chunk;
    let data = {};
    try {
      data = JSON.parse(body || '{}');
    } catch {
      /* fixture rejects malformed input below */
    }
    const send = (value, code = 200) => {
      res.writeHead(code);
      res.end(JSON.stringify(value));
    };
    if (pathname === '/__fixture/control' && req.method === 'POST') {
      if (data.role) role = data.role;
      if (data.failList !== undefined) failList = data.failList;
      if (data.empty !== undefined) empty = data.empty;
      if (data.delay !== undefined) delay = data.delay;
      send({ role, failList, empty, delay });
      return;
    }
    if (pathname === '/__fixture/events') {
      send(events);
      return;
    }
    events.push({
      method: req.method,
      path: pathname,
      ids: data.ids,
      updateData: data.updateData,
    });
    if (pathname === '/api/auth/config')
      return send({ authMode: 'local', ldapFallbackEnabled: false });
    if (pathname === '/api/auth/login')
      return send({
        token: 'ui-fixture-only',
        user: { id: 'fixture-user', username: 'demo@example.invalid', role },
      });
    if (pathname === '/api/auth/verify-token') return send({ valid: true });
    if (pathname === '/api/user-preferences') {
      if (req.method === 'POST') Object.assign(preferences, data.preferences);
      return send({ preferences });
    }
    if (pathname === '/api/settings/license-types')
      return send([
        { id: 'e3', name: 'E3' },
        { id: 'f3', name: 'F3' },
      ]);
    if (pathname === '/api/settings/microsoft-graph')
      return send({ enabled: false });
    if (pathname === '/api/settings')
      return send({
        accountStatuses: ['Pending', 'Active', 'Inactive'],
        positionGrades: ['Staff', 'Supervisor'],
        departments: departments.map((name, i) => ({
          id: String(i),
          name,
          code: `D${i}`,
        })),
        mailingLists: [],
        activeDirectorySettings: { enabled: false },
        exchangeOnlineSettings: { enabled: false },
        microsoftGraphSettings: { enabled: false },
        whatsappSettings: { defaultRecipient: 'testNumber' },
      });
    if (pathname === '/api/hires/bulk-update' && req.method === 'POST') {
      hires = hires.map((h) =>
        data.ids.includes(h.id) ? { ...h, ...data.updateData } : h,
      );
      return send({ success: true });
    }
    if (pathname === '/api/hires/bulk-delete' && req.method === 'POST') {
      hires = hires.filter((h) => !data.ids.includes(h.id));
      return send({ success: true });
    }
    if (pathname === '/api/hires') {
      if (req.method === 'POST') {
        const hire = {
          ...data,
          id: `fixture-created-${Date.now()}`,
          audit_logs: [],
        };
        hires.push(hire);
        return send(hire);
      }
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      return failList
        ? send({ message: 'Fixture list failure' }, 503)
        : send(empty ? [] : hires);
    }
    const match = pathname.match(/^\/api\/hires\/([^/]+)(?:\/logs)?$/);
    if (match) {
      const hire = hires.find((h) => h.id === match[1]);
      if (!hire) return send({ message: 'Not found' }, 404);
      if (pathname.endsWith('/logs')) return send([]);
      if (req.method === 'DELETE') {
        hires = hires.filter((h) => h.id !== hire.id);
        return send({ success: true });
      }
      if (req.method === 'PUT') Object.assign(hire, data);
      return send(hire);
    }
    return send(
      {
        message:
          'Unsupported fixture route; no external requests are forwarded',
      },
      404,
    );
  })
  .listen(18877, '127.0.0.1', () =>
    console.log('Local UI fixture API: http://127.0.0.1:18877/api'),
  );
