/* Generate an isolated adapter; retained source assets are never edited. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const postcss = require('postcss');
const source = path.resolve(process.argv[2] || '');
const output = path.resolve(process.argv[3] || 'public/merdeka');
if (!process.argv[2] || !fs.existsSync(path.join(source, 'DESIGN.md'))) {
  throw new Error('Pass the extracted merdeka-frontend template directory.');
}
const files = new Map();
function asset(file) {
  file = path.resolve(file);
  const relative = path.relative(source, file).split(path.sep).join('/');
  if (relative.startsWith('..'))
    throw new Error(`Asset outside template: ${relative}`);
  const destination = path.join(output, 'template', relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(file, destination);
  files.set(
    relative,
    crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  );
  return `/merdeka/template/${relative}`;
}
function css(file, parents = []) {
  if (parents.includes(file)) throw new Error(`Circular CSS import: ${file}`);
  asset(file);
  const tree = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
  tree.walkAtRules('import', (rule) => {
    const match = rule.params.match(/(?:url\(\s*)?["']([^"']+)["']/);
    if (!match) throw new Error(`Unsupported import: ${rule.params}`);
    const child = css(path.resolve(path.dirname(file), match[1]), [
      ...parents,
      file,
    ]);
    rule.replaceWith(child.nodes);
  });
  tree.walkDecls((decl) => {
    // Imported nodes have already been rebased by their owning stylesheet.
    if (decl.source?.input.file !== file) return;
    decl.value = decl.value.replace(
      /url\(\s*(["']?)([^"')]+)\1\s*\)/g,
      (whole, quote, value) => {
        if (/^(?:data:|#)/.test(value)) return whole;
        if (/^(?:https?:|\/\/)/.test(value))
          throw new Error(`Remote resource: ${value}`);
        const [name, suffix = ''] = value.split(/(?=[?#])/);
        return `url("${asset(path.resolve(path.dirname(file), name))}${suffix}")`;
      },
    );
  });
  return tree;
}
const tree = css(path.join(source, 'patterns/room-facilities/page.css'));
tree.walkRules((rule) => {
  let parent = rule.parent;
  while (parent) {
    if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return;
    parent = parent.parent;
  }
  rule.selectors = rule.selectors.map((selector) => {
    const root = /^(?::root|html|body)(?=[\s.#[:>+~]|$)/;
    let scoped = root.test(selector)
      ? selector.replace(root, '.merdeka-surface')
      : `.merdeka-surface ${selector}`;
    scoped = scoped.replace(
      /\.merdeka-surface\s+(?:html|body)(?=[\s.#[:>+~]|$)/g,
      '.merdeka-surface',
    );
    // Existing Tailwind/MUI surfaces keep their own utility meanings and sizing.
    const boundary = ':not(:where(.merdeka-legacy, .merdeka-legacy *))';
    const pseudo = scoped.search(
      /::[a-zA-Z-]+|:(?:before|after|first-letter|first-line)(?![a-zA-Z-])/,
    );
    return pseudo < 0
      ? scoped + boundary
      : scoped.slice(0, pseudo) + boundary + scoped.slice(pseudo);
  });
});
for (const name of ['mcg-logo.png', 'mcg-logo-small.png', 'sidebar-background.png']) {
  asset(
    path.join(
      source,
      'dashboard/assets/services.merdekacoppergold.com/assets/v2/img/branding',
      name,
    ),
  );
}
asset(path.join(source, 'DESIGN.md'));
fs.mkdirSync(output, { recursive: true });
const cssText = tree.toString();
const token = (name) => {
  const value = cssText
    .match(new RegExp(`--mdka-${name}\\s*:\\s*([^;}]+)`))?.[1]
    ?.trim();
  if (!value) throw new Error(`Missing canonical token ${name}`);
  return value;
};
function hsl(hex) {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  const light = (max + min) / 2;
  const saturation = d === 0 ? 0 : d / (1 - Math.abs(2 * light - 1));
  let hue =
    d === 0
      ? 0
      : max === r
        ? ((g - b) / d) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;
  return `${hue.toFixed(2)} ${(saturation * 100).toFixed(2)}% ${(light * 100).toFixed(2)}%`;
}
const aliases = ['blue-600', 'gray-50', 'gray-400', 'gray-500', 'gray-600']
  .map((name) => `--mdka-${name}:${token(name)}`)
  .join(';');
const portalTokens = `body[data-merdeka-ui]{${aliases};--primary:${hsl(token('blue-600'))};--primary-foreground:0 0% 100%;--ring:${hsl(token('blue-600'))};}`;
fs.writeFileSync(
  path.join(output, 'scoped.css'),
  `/* Generated from the Merdeka room-facilities source CSS, in original import order. */\n${cssText}\n${portalTokens}`,
);
fs.writeFileSync(
  path.join(output, 'manifest.json'),
  JSON.stringify(
    {
      source: 'merdeka-frontend/assets/frontend-template.zip',
      entry: 'patterns/room-facilities/page.css',
      adapter:
        'scoped.css prefixes selectors with .merdeka-surface and rebases resource URLs; originals are unchanged.',
      ownership:
        'Brand and third-party assets retain their original ownership and licenses.',
      files: Object.fromEntries(files),
    },
    null,
    2,
  ),
);
console.log(`Generated scoped theme with ${files.size} original assets.`);
