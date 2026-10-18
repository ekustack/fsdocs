
/* xfcmds.js
   Package checker, enable flow and .xfcmd sentence scripts for the FSCSS IDE.
   Loaded by ide.js through window.IDE. Adds terminal commands:
   libs, libck, libon, liboff, yes, no, xfcmd */
import { registerXfcmd } from './xfcmd-lang.js';

const I = window.IDE;
if (!I) throw new Error('xfcmds.js needs window.IDE (see the edit in ide.js)');
const { TERM, SNIPS, S, log, out } = I;

const REG_BASE = 'https://raw.githubusercontent.com/fscss-ttr/FSCSS/refs/heads/main/xfcmds/';
const FALLBACK_REG = {
  "xfcmds": 1,
  "about": "IDE command scripts for FSCSS packages, written in the .xfcmd sentence format.",
  "packages": {
    "st-core": {
      "enable": "st-core.xfcmd",
      "about": "Adds st-* helper snippets and a stats demo file"
    }
  },
  "commands": {
    "hello": {
      "script": "hello.xfcmd",
      "about": "Prints a greeting and lists your files"
    },
    "starter": {
      "script": "starter.xfcmd",
      "about": "Creates a small project (theme, page, script) and opens the preview"
    },
    "multipage": {
      "script": "multipage.xfcmd",
      "about": "Two page site with a shared partial, links and routes"
    },
    "imports-demo": {
      "script": "imports-demo.xfcmd",
      "about": "Workspace imports with a shared partial"
    },
    "snippets-pack": {
      "script": "snippets-pack.xfcmd",
      "about": "Adds card, flexc and grid3 snippets"
    }
  }
};
const FALLBACK_SCRIPTS = {
  "hello.xfcmd": "# hello.xfcmd\n# Runs when you type: xfcmd hello\nsay \"Hello from xfcmd.\"\nrun command \"ls\"\ntoast \"Hello from xfcmd\" ok\n",
  "imports-demo.xfcmd": "# imports-demo.xfcmd\n# Run with: xfcmd imports-demo\n# main.fscss imports colors.fscss and buttons.fscss. buttons.fscss imports colors.fscss too.\n# FSCSS resolves each import itself, so selective imports and aliases keep working.\nsay \"Creating demo-imports/\"\ncreate file demo-imports/colors.fscss with:\n  $brand: #0BCEAE;\n  $ink: #111;\nend\ncreate file demo-imports/buttons.fscss with:\n  @import((*) from ./colors.fscss)\n\n  .btn {\n    bg: $brand!;\n    color: $ink!;\n    px: 16px;\n    py: 8px;\n    rounded: 8px;\n  }\nend\ncreate file demo-imports/main.fscss with:\n  @import((*) from ./colors.fscss)\n  @import((*) from ./buttons.fscss)\n\n  .page {\n    padding: 24px;\n  }\nend\nset entry {file}\nopen file {file}\ncompile\nshow terminal\nrun command \"deps demo-imports/main.fscss\"\nsay \"colors.fscss and buttons.fscss are partials. Compile all only builds main.fscss.\"\n",
  "multipage.xfcmd": "# multipage.xfcmd\n# Run with: xfcmd multipage\n# A two page site with a shared partial. Shows imports, links and routes working together.\nsay \"Creating a two page site in site/\"\ncreate file site/styles/_base.fscss with:\n  $ink: #1b1b1f;\n  $accent: #0BCEAE;\n\n  body {\n    margin: 0;\n    font-family: system-ui, sans-serif;\n    color: $ink!;\n  }\n\n  a {\n    color: $accent!;\n  }\nend\ncreate file site/styles/site.fscss with:\n  @import((*) from ./_base.fscss)\n\n  nav {\n    display: flex;\n    gap: 16px;\n    padding: 16px 24px;\n    border-bottom: 1px solid #ddd;\n  }\n\n  main {\n    padding: 24px;\n  }\nend\nset entry {file}\ncreate file site/index.html with:\n  <!DOCTYPE html>\n  <html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Home</title>\n    <link rel=\"stylesheet\" href=\"styles/site.fscss\">\n  </head>\n  <body>\n    <nav><a href=\"index.html\">Home</a><a href=\"about.html\">About</a></nav>\n    <main><h1>Home</h1><p>Click About. The preview switches pages.</p></main>\n  </body>\n  </html>\nend\ncreate file site/about.html with:\n  <!DOCTYPE html>\n  <html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>About</title>\n    <link rel=\"stylesheet\" href=\"styles/site.fscss\">\n  </head>\n  <body>\n    <nav><a href=\"index.html\">Home</a><a href=\"about.html\">About</a></nav>\n    <main><h1>About</h1><p>Same stylesheet, one compile.</p></main>\n  </body>\n  </html>\nend\nopen file site/index.html\ncompile\nshow preview\nrun command \"routes\"\nrun command \"deps site/styles/site.fscss\"\nsay \"Try renaming site/styles/_base.fscss. The import updates by itself.\"\n",
  "snippets-pack.xfcmd": "# snippets-pack.xfcmd\n# Run with: xfcmd snippets-pack\n# Adds editor snippets. They last until you reload the page.\nadd snippet card \"Card block\" as \".card{\\n  padding: ${1:16px};\\n  rounded: ${2:8px};\\n}\"\nadd snippet flexc \"Flex center\" as \"display: flex;\\nalign-items: center;\\njustify-content: center;\"\nadd snippet grid3 \"Three column grid\" as \"display: grid;\\ngrid-template-columns: repeat(3, 1fr);\\ngap: ${1:16px};\"\nshow snippets\nsay \"Added card, flexc and grid3. Type a key in an .fscss file to use it.\"\n",
  "st-core.xfcmd": "# st-core.xfcmd\n# Runs when you type: libon st-core\nsay \"Setting up {name}@{version} by {author}\"\nsay \"Helpers: {helpers}\"\nadd snippets for helpers\ncreate file demos/{name}-demo.fscss with:\n  /* {name} demo, generated by xfcmd */\n  @import((*) from {import})\n\n  /* Helpers (type a helper name in the editor for a snippet):\n     {helpers} */\n\n  body{\n    margin: 0;\n    padding: 24px;\n    font-family: system-ui, sans-serif;\n  }\nend\nopen file {file}\ncompile\nshow terminal\nsay \"Done. Type a helper name such as st-root in the editor to insert it.\"\n",
  "starter.xfcmd": "# starter.xfcmd\n# Run with: xfcmd starter\n# Creates a small project in starter/ with a theme, a page and a script,\n# then compiles it and opens the preview.\nsay \"Creating the starter project in starter/\"\ncreate file starter/styles/theme.fscss with:\n  $primary: #0BCEAE;\n  $radius: 8px;\n\n  body {\n    margin: 0;\n    padding: 24px;\n    font-family: system-ui, sans-serif;\n  }\n\n  .btn {\n    bg: $primary!;\n    color: #111;\n    px: 16px;\n    py: 8px;\n    rounded: $radius!;\n    border: none;\n    fw: 600;\n  }\nend\nset entry {file}\ncreate file starter/app.js with:\n  console.log(\"starter ready\");\nend\ncreate file starter/index.html with:\n  <!DOCTYPE html>\n  <html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\">\n    <title>Starter</title>\n    <link rel=\"stylesheet\" href=\"styles/theme.fscss\">\n  </head>\n  <body>\n    <button class=\"btn\">Hello FSCSS</button>\n    <script src=\"app.js\"></script>\n  </body>\n  </html>\nend\nopen file {file}\ncompile\nshow preview\nsay \"Starter ready. Edit starter/styles/theme.fscss and press Ctrl+Enter.\"\n"
};

/* ---------- small helpers ---------- */
const bytes = n => n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB';
const reEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fill = (t, c) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k in c && k[0] !== '_') ? String(c[k]) : m);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pkgs = () => I.store.get('pkgs', {});
const savePkgs = p => I.store.set('pkgs', p);

/* ---------- tiny semver (^ ~ >= <= > < =, ||) ---------- */
const pv = s => String(s).replace(/^[^\d]*/, '').split('.').map(n => parseInt(n) || 0);
const cmp = (a, b) => { a = pv(a); b = pv(b); for (let i = 0; i < 3; i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d } return 0 };
function satisfies(v, range) {
  range = String(range || '').trim();
  if (!range || range === '*') return true;
  return range.split('||').some(part => part.trim().split(/\s+/).every(c => {
    const m = c.match(/^(>=|<=|>|<|\^|~|=)?v?(\d[\w.\-]*)$/);
    if (!m) return true;
    const op = m[1] || '=', r = m[2], rv = pv(r);
    if (op === '^') { const hi = rv[0] > 0 ? [rv[0] + 1, 0, 0] : rv[1] > 0 ? [0, rv[1] + 1, 0] : [0, 0, rv[2] + 1]; return cmp(v, r) >= 0 && cmp(v, hi.join('.')) < 0 }
    if (op === '~') return cmp(v, r) >= 0 && cmp(v, [rv[0], rv[1] + 1, 0].join('.')) < 0;
    const d = cmp(v, r);
    return op === '>=' ? d >= 0 : op === '<=' ? d <= 0 : op === '>' ? d > 0 : op === '<' ? d < 0 : d === 0;
  }));
}

/* ============================================================
   .xfcmd sentence format
   ============================================================
   say "text"                         print to terminal
   warn "text" | error "text"         log levels
   toast "text" [ok|warn|err]         toast message
   add import <name>                  insert @import into the active file
   create file <path> with:           multi line body, closed by a line: end
   create file <path> with "text"     inline body
   open file <path>                   open in editor ({file} = last created)
   set entry <path>                   set entry file
   compile | compile all | preview    run the compiler
   show files|components|snippets|tools|terminal|problems|css|preview
   add snippet <key> "<title>" as "<body>"
   add snippets for helpers           one snippet per package helper
   run command "<terminal command>"   allowed: compile run all preview ls open new libs clear theme
   wait <ms> ms
   Lines starting with # or // are comments. {name} {version} {author}
   {helpers} {import} {license} {file} are filled in.                 */
const tokenize = s => {
  const o = [], re = /"((?:[^"\\]|\\.)*)"|(\S+)/g; let m;
  while ((m = re.exec(s))) o.push(m[1] !== undefined
    ? { q: true, v: m[1].replace(/\\(.)/g, (_, c) => c === 'n' ? '\n' : c === 't' ? '\t' : c) }
    : { q: false, v: m[2] });
  return o;
};
const dedent = lines => {
  const ind = Math.min(99, ...lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length));
  return lines.map(l => l.slice(Math.min(ind, l.match(/^ */)[0].length))).join('\n').replace(/^\n+|\n+$/g, '') + '\n';
};
function parse(text) {
  const L = String(text).replace(/\r/g, '').split('\n'), steps = [], errors = [];
  for (let i = 0; i < L.length; i++) {
    const t = L[i].trim();
    if (!t || t[0] === '#' || t.startsWith('//')) continue;
    const tk = tokenize(t.replace(/"\.$/, '"')), a = tk.map(x => x.q ? '' : x.v.toLowerCase()), line = i + 1;
    const q = n => tk[n] && tk[n].q ? tk[n].v : null;
    let s = null;
    if (['say', 'print', 'info'].includes(a[0]) && q(1) !== null) s = { op: 'say', text: q(1) };
    else if (a[0] === 'warn' && q(1) !== null) s = { op: 'warn', text: q(1) };
    else if (a[0] === 'error' && q(1) !== null) s = { op: 'error', text: q(1) };
    else if (a[0] === 'toast' && q(1) !== null) s = { op: 'toast', text: q(1), type: a[2] || '' };
    else if (a[0] === 'add' && a[1] === 'import' && tk[2]) s = { op: 'import', name: tk[2].v };
    else if (a[0] === 'create' && a[1] === 'file' && tk[2] && (a[3] === 'with:' || a[3] === 'with')) {
      if (q(4) !== null) s = { op: 'create', path: tk[2].v, content: q(4) };
      else {
        const body = []; let j = i + 1;
        while (j < L.length && L[j].trim().toLowerCase() !== 'end') body.push(L[j++]);
        if (j >= L.length) { errors.push({ line, msg: 'create file block is missing "end"' }); break }
        s = { op: 'create', path: tk[2].v, content: dedent(body) }; i = j;
      }
    }
    else if (a[0] === 'open' && a[1] === 'file' && tk[2]) s = { op: 'open', path: tk[2].v };
    else if (a[0] === 'set' && a[1] === 'entry' && tk[2]) s = { op: 'entry', path: tk[2].v };
    else if (a[0] === 'compile') s = { op: 'compile', mode: a[1] === 'all' ? 'all' : '' };
    else if (a[0] === 'preview') s = { op: 'compile', mode: 'preview' };
    else if (a[0] === 'show' && a[1]) s = { op: 'show', what: a[1] };
    else if (a[0] === 'add' && a[1] === 'snippets' && a[2] === 'for' && a[3] === 'helpers') s = { op: 'snips' };
    else if (a[0] === 'add' && a[1] === 'snippet' && tk[2] && q(3) !== null && a[4] === 'as' && q(5) !== null) s = { op: 'snippet', key: tk[2].v, title: q(3), body: q(5) };
    else if (a[0] === 'run' && a[1] === 'command' && q(2) !== null) s = { op: 'run', cmd: q(2) };
    else if (a[0] === 'wait' && /^\d+$/.test(a[1] || '')) s = { op: 'wait', ms: Math.min(+a[1], 3000) };
    if (s) { s.line = line; steps.push(s) } else errors.push({ line, msg: 'Unknown sentence: ' + t.slice(0, 60) });
  }
  return { steps, errors };
}
function describe(steps, ctx) {
  const p = [], f = steps.filter(s => s.op === 'create').map(s => fill(s.path, ctx));
  if (f.length) p.push('creates ' + f.join(', '));
  if (steps.some(s => s.op === 'snips' || s.op === 'snippet')) p.push('adds snippets');
  if (steps.some(s => s.op === 'import')) p.push('inserts an import');
  if (steps.some(s => s.op === 'compile')) p.push('compiles');
  const r = steps.filter(s => s.op === 'run').map(s => s.cmd);
  if (r.length) p.push('runs: ' + r.join(', '));
  return p.join('; ') || 'only prints messages';
}

/* ---------- snippets from helper signatures ---------- */
function helperBody(raw) {
  const m = String(raw).trim().match(/^([\w-]+)\s*(?:\((.*)\))?$/);
  if (!m) return null;
  const ps = (m[2] || '').split(',').map(s => s.trim()).filter(Boolean);
  const ph = ps.map((p, i) => {
    const [n, ...d] = p.split(':'), def = (d.join(':').trim() || n.trim()).replace(/[\\$}]/g, '\\$&');
    return '${' + (i + 1) + ':' + def + '}';
  });
  return { name: m[1], body: '@' + m[1] + '(' + (ph.length ? ph.join(', ') : '$0') + ')' };
}
function addSnippet(ctx, k, t, d, b) {
  const i = SNIPS.findIndex(x => x.k === k && x.pkg === ctx.name);
  if (i >= 0) SNIPS.splice(i, 1);
  SNIPS.push({ k, t, d, b, pkg: ctx.name || 'xfcmd' });
  if (ctx._rec) { ctx._rec.snips = (ctx._rec.snips || []).filter(x => x.k !== k); ctx._rec.snips.push({ k, t, d, b }) }
}
const dropSnips = name => { for (let i = SNIPS.length - 1; i >= 0; i--) if (SNIPS[i].pkg === name) SNIPS.splice(i, 1); I.renderSnips() };

/* ---------- script runner ---------- */
const ALLOWED = ['compile', 'run', 'all', 'preview', 'ls', 'open', 'new', 'libs', 'clear', 'theme', 'routes', 'deps', 'resolve'];
const VIEWS = { files: 'files', components: 'libs', libs: 'libs', snippets: 'snips', tools: 'tools' };
const EXEC = {
  say: (s, c) => out(fill(s.text, c)),
  warn: (s, c) => log('warn', fill(s.text, c)),
  error: (s, c) => log('error', fill(s.text, c)),
  toast: (s, c) => I.toast(fill(s.text, c), s.type),
  import: (s, c) => I.insertImport(fill(s.name, c)),
  create: (s, c) => {
    const want = I.cleanName(fill(s.path, c));
    if (!want) throw new Error('empty file name');
    if (want in S.files) { c.file = want; return out('Kept existing ' + want) }
    const n = I.addFile(want, fill(s.content, c), false);
    c.file = n; c._rec?.files.push(n); out('Created ' + n);
  },
  open: (s, c) => { const p = fill(s.path, c); if (!(p in S.files)) throw new Error('no such file: ' + p); I.openFile(p) },
  entry: (s, c) => { const p = fill(s.path, c); if (!(p in S.files)) throw new Error('no such file: ' + p); S.settings.entry = p; I.renderAll(); I.persistSoon() },
  compile: async s => s.mode === 'all' ? I.compileAll() : I.compile({ preview: s.mode === 'preview' }),
  show: s => {
    if (VIEWS[s.what]) return I.setView(VIEWS[s.what], true);
    if (s.what === 'terminal') return I.setBottom('term', true);
    if (s.what === 'problems') return I.setBottom('probs', true);
    if (s.what === 'css' || s.what === 'preview') return I.setOut(s.what);
    throw new Error('cannot show "' + s.what + '"');
  },
  snippet: (s, c) => { addSnippet(c, s.key, s.title, (c.name || 'xfcmd') + ' snippet', fill(s.body, c)); I.renderSnips() },
  snips: (s, c) => {
    let n = 0;
    for (const raw of c.helperRaw || []) { const h = helperBody(raw); if (h) { addSnippet(c, h.name, '@' + h.name + '()', c.name + ' helper', h.body); n++ } }
    I.renderSnips(); out('Added ' + n + ' snippets');
  },
  run: async (s, c) => {
    const cmd = fill(s.cmd, c), w = cmd.trim().split(/\s+/)[0].toLowerCase();
    if (!ALLOWED.includes(w)) throw new Error('"' + w + '" is not allowed in scripts');
    await I.runTerm(cmd);
  },
  wait: s => sleep(s.ms)
};
async function runSteps(steps, ctx) {
  if (steps.length > 200) { log('error', 'xfcmd script is too long (max 200 sentences)'); return false }
  for (const s of steps) {
    try { await EXEC[s.op](s, ctx) } catch (e) { log('error', 'xfcmd line ' + s.line + ': ' + e.message); return false }
  }
  return true;
}
async function runText(text, ctx, label) {
  const p = parse(text);
  if (p.errors.length) { p.errors.forEach(e => log('error', label + ' line ' + e.line + ': ' + e.msg)); return false }
  return runSteps(p.steps, ctx);
}
const mkCtx = i => ({
  name: i?.name || '', version: i?.version || '', author: i?.author || '', description: i?.description || '',
  license: i?.license || '', import: i?.imp || '', helpers: (i?.helpers || []).join(', '), helperRaw: i?.helperRaw || [],
  fscss: i?.fscssRange || '', repo: i?.repo || '', file: ''
});

/* ---------- registry and scripts ---------- */
let regCache = null;
async function getRegistry(force) {
  if (regCache && !force) return regCache;
  try { const r = await fetch(REG_BASE + 'cmd.json'); if (r.ok) return regCache = { ...(await r.json()), _remote: true } } catch { }
  return regCache = { ...FALLBACK_REG, _remote: false };
}
async function getText(url) { try { const r = await fetch(url); if (r.ok) return await r.text() } catch { } return null }
async function registryScript(file) { return (await getText(REG_BASE + file)) ?? FALLBACK_SCRIPTS[file] ?? null }
const DEFAULT_ENABLE = 'say "Enabling {name}@{version} by {author}"\nadd snippets for helpers\nsay "Import it with: @import((*) from {import})"\n';
async function findScript(info, v, trigger) {
  if (info.xfcmd) {
    const rel = typeof info.xfcmd === 'string' ? (trigger === 'enable' ? info.xfcmd : null) : info.xfcmd[trigger];
    if (rel) { const t = await getText(v.base + encodeURI(String(rel).replace(/^\.\//, ''))); if (t) return { text: t, from: 'package.json' } }
  }
  const e = (await getRegistry()).packages?.[info.name];
  if (e?.[trigger]) { const t = await registryScript(e[trigger]); if (t) return { text: t, from: 'xfcmds/' + e[trigger] } }
  return trigger === 'enable' ? { text: DEFAULT_ENABLE, from: 'built-in default' } : null;
}

/* ---------- package.json ---------- */
const pkgCache = new Map(), modCache = new Map();
async function fetchPkg(repoUrl) {
  if (pkgCache.has(repoUrl)) return pkgCache.get(repoUrl);
  const p = I.parseGH(repoUrl);
  if (!p) throw new Error('Not a GitHub repo URL: ' + repoUrl);
  for (const br of ['main', 'master']) {
    const base = `https://raw.githubusercontent.com/${p.owner}/${p.repo}/${br}/`;
    let r; try { r = await fetch(base + 'package.json') } catch (e) { throw new Error('Network error: ' + e.message) }
    if (!r.ok) continue;
    let pkg; try { pkg = await r.json() } catch { throw new Error('package.json is not valid JSON') }
    const v = { repoUrl, owner: p.owner, repo: p.repo, branch: br, base, pkg };
    pkgCache.set(repoUrl, v); return v;
  }
  throw new Error('No package.json found on main or master of ' + repoUrl);
}
function norm(v) {
  const k = v.pkg, f = k.file || {}, u = f.usage || {};
  const str = x => typeof x === 'string' ? x : x?.name || x?.url || '';
  const mods = [...(Array.isArray(f.modules) ? f.modules : [])];
  if (f.remote && !mods.includes(f.remote)) mods.push(f.remote);
  const raw = Array.isArray(u.helpers) ? u.helpers.map(String) : [];
  const main = f.remote || mods[0] || '';
  return {
    name: k.name || v.repo, version: String(k.version ?? '?'), description: k.description || '', author: str(k.author) || v.owner,
    license: k.license || 'unknown', repo: str(k.repository) || v.repoUrl, bugs: str(k.bugs),
    keywords: Array.isArray(k.keywords) ? k.keywords : [], extension: k.extension || '', fscssRange: k.fscss_version || '',
    blocked: Array.isArray(k.blocked_methods) ? k.blocked_methods : [], directive: u.directive || '',
    helperRaw: raw, helpers: raw.map(h => h.split('(')[0].trim()), modules: mods, main,
    imp: main ? main.split('/').pop().replace(/\.x?fscss$/, '') : (k.name || v.repo), xfcmd: k.xfcmd || f.xfcmd || null
  };
}
async function loadModule(v, path) {
  
  const url = v.base + encodeURI(String(path).replace(/^\.\//, '').replace(/\b(?:[^\s\:]+)\:/, ''));
  if (modCache.has(url)) return modCache.get(url);
  const t0 = performance.now(), res = { url, path, ok: false };
  try { const r = await fetch(url); res.status = r.status; if (r.ok) { res.text = await r.text(); res.ok = true; res.size = new Blob([res.text]).size } }
  catch (e) { res.err = e.message }
  res.ms = performance.now() - t0; modCache.set(url, res); return res;
}
const helperFound = (src, h) => new RegExp('@define\\s+' + reEsc(h) + '(?![\\w-])').test(src) || new RegExp('(^|[^\\w-])' + reEsc(h) + '\\s*\\(').test(src);

/* ---------- resolve a name, URL or owner/repo ---------- */
async function resolve(q) {
  q = String(q).trim();
  /* if (/^fscss:/i.test(q)) return { builtin: q }; */
  if (/github\.com\//i.test(q)) return { repoUrl: q };
  if (/^[\w.-]+\/[\w.-]+$/.test(q)) return { repoUrl: 'https://github.com/' + q };
  const key = q.replace(/@.*$/, '').toLowerCase().replace(/\.fscss$/, '');
  if (!I.getLibs().length) await I.loadLibs();
  const l = I.getLibs().find(x => [x.name, x.repo].some(n => String(n || '').toLowerCase().replace(/\.fscss$/, '') === key));
  return l ? { repoUrl: l.repoUrl } : null;
}

/* ---------- inspect: load and check a package ---------- */
async function inspect(q) {
  const r = await resolve(q);
  if (!r) throw new Error('No component named "' + q + '". Run libs to see the list.');
  if (r.builtin) return { builtin: r.builtin };
  const v = await fetchPkg(r.repoUrl), info = norm(v), checks = [], add = (lvl, msg) => checks.push({ lvl, msg });
  v.pkg.name ? add('ok', 'name: ' + info.name) : add('warn', 'package.json has no "name", using the repo name');
  v.pkg.version != null ? add('ok', 'version: ' + info.version) : add('warn', 'package.json has no "version"');
  if (!info.description) add('warn', 'no description');
  info.extension === 'fscss' ? add('ok', 'extension: fscss') : add('warn', 'extension should be "fscss"' + (info.extension ? ', found "' + info.extension + '"' : ''));
  const cv = S.settings.version;
  if (info.fscssRange) satisfies(cv, info.fscssRange) ? add('ok', 'needs fscss ' + info.fscssRange + ', compiler is ' + cv) : add('warn', 'needs fscss ' + info.fscssRange + ' but the compiler is ' + cv);
  else add('warn', 'no fscss_version range');
  if (info.directive) {
    const pre = info.directive.replace('*', '');
    const bad = info.helpers.filter(h => !h.startsWith(pre));
    bad.length ? add('warn', 'helpers outside directive ' + info.directive + ': ' + bad.join(', ')) : add('ok', 'directive ' + info.directive + ' matches all helpers');
  }
  if (!info.modules.length) add('fail', 'file.modules and file.remote are missing');
  const mods = [];
  for (const p of info.modules) {
    const m = await loadModule(v, p); mods.push(m);
    m.ok ? add('ok', 'module ' + p + ': ' + bytes(m.size) + ' in ' + m.ms.toFixed(0) + ' ms') : add('fail', 'module ' + p + ': ' + (m.status ? 'HTTP ' + m.status : m.err));
  }
  const src = mods.filter(m => m.ok).map(m => m.text).join('\n');
  
  if (src && info.helpers.length) {
    const miss = info.helpers.filter(h => !helperFound(src, h));
    miss.length ? add('warn', 'helpers not found in modules: ' + miss.join(', ')) : add('ok', 'all ' + info.helpers.length + ' helpers found in modules');
  } else if (!info.helpers.length) add('warn', 'no helpers listed in file.usage.helpers');
  const used = src ? info.blocked.filter(b => new RegExp('(^|[^\\w-])' + reEsc(b) + '\\s*\\(').test(src)) : [];
  if (used.length) add('warn', 'modules use blocked method: ' + used.join(', '));
  const sc = await findScript(info, v, 'enable'), ps = parse(sc.text);
  ps.errors.forEach(e => add('fail', 'xfcmd (' + sc.from + ') line ' + e.line + ': ' + e.msg));
  if (!ps.errors.length) add('ok', 'xfcmd from ' + sc.from + ': ' + ps.steps.length + ' sentences');
  return { v, info, checks, steps: ps.steps, from: sc.from, failed: checks.some(c => c.lvl === 'fail') };
}
function printReport(d) {
  const i = d.info;
  out(i.name + '@' + i.version + '  by ' + i.author + '  (' + i.license + ')');
  if (i.description) out('  ' + i.description);
  out('  repo      ' + i.repo);
  if (i.bugs) out('  issues    ' + i.bugs);
  out('  import    @import((*) from ' + i.imp + ')');
  if (i.directive) out('  directive ' + i.directive);
  out('  helpers   ' + (i.helperRaw.length ? i.helperRaw.join(', ') : 'none listed'));
  if (i.keywords.length) out('  keywords  ' + i.keywords.join(', '));
  out('Checks:');
  for (const c of d.checks) c.lvl === 'ok' ? out('  [ok]   ' + c.msg) : c.lvl === 'warn' ? log('warn', '  [warn] ' + c.msg) : log('error', '  [fail] ' + c.msg);
  const n = l => d.checks.filter(c => c.lvl === l).length;
  out(n('ok') + ' passed, ' + n('warn') + ' warnings, ' + n('fail') + ' failed');
}

/* ---------- enable, disable ---------- */
let pending = null;
function ask(q, yes) { pending = { yes, t: Date.now() }; out(q + ' Type yes or no.') }
async function enableFrom(d) {
  const i = d.info, all = pkgs();
  const rec = { version: i.version, repoUrl: d.v.repoUrl, imp: i.imp, helpers: i.helpers, at: Date.now(), snips: [], files: [] };
  const ctx = mkCtx(i); ctx._rec = rec;
  out('Enabling ' + i.name + '@' + i.version + '...');
  if (!await runSteps(d.steps, ctx)) { dropSnips(i.name); return log('error', 'Enable stopped, ' + i.name + ' was not enabled.') }
  all[i.name] = rec; savePkgs(all);
  out('Enabled ' + i.name + '. Import it with @import((*) from ' + i.imp + ')');
  I.toast(i.name + ' enabled', 'ok');
}
const findOn = q => Object.keys(pkgs()).find(k => k.toLowerCase() === String(q).replace(/@.*$/, '').toLowerCase());

TERM.yes = TERM.y = async () => {
  if (!pending || Date.now() - pending.t > 120000) { pending = null; return out('Nothing to confirm.') }
  const p = pending; pending = null; await p.yes();
};
TERM.no = TERM.n = () => { if (pending) { pending = null; out('Skipped.') } else out('Nothing to confirm.') };

TERM.libck = async ([q]) => {
  if (!q) return log('error', 'Usage: libck <name | owner/repo | github url>');
  pending = null; out('Checking ' + q + '...');
  const d = await inspect(q);
  if (d.builtin) return out(d.builtin + ' is built into the compiler. Nothing to download or enable.');
  printReport(d);
  const on = findOn(d.info.name);
  if (on) return out('Status: enabled (' + pkgs()[on].version + '). Use liboff ' + on + ' to disable.');
  if (d.failed) return log('error', 'Fix the failed checks before enabling. Override with: libon ' + d.info.name + ' force');
  out('Status: not enabled. On enable it ' + describe(d.steps, mkCtx(d.info)) + '.');
  ask('Enable ' + d.info.name + '?', () => enableFrom(d));
};
TERM.libon = async ([q, flag]) => {
  if (!q) return log('error', 'Usage: libon <name> [force]');
  const d = await inspect(q);
  if (d.builtin) return out(d.builtin + ' is built in, nothing to enable.');
  if (findOn(d.info.name) && flag !== 'force') return out(d.info.name + ' is already enabled. Use: libon ' + d.info.name + ' force to run it again.');
  if (d.failed && flag !== 'force') { printReport(d); return log('error', 'Checks failed. Use: libon ' + d.info.name + ' force') }
  await enableFrom(d);
};
TERM.liboff = async ([q]) => {
  const key = q && findOn(q);
  if (!key) return log('error', q ? q + ' is not enabled' : 'Usage: liboff <name>');
  const all = pkgs(), rec = all[key];
  try {
    const v = await fetchPkg(rec.repoUrl), info = norm(v), sc = await findScript(info, v, 'disable');
    if (sc) await runText(sc.text, mkCtx(info), 'disable');
  } catch { }
  dropSnips(key); delete all[key]; savePkgs(all);
  out('Disabled ' + key + '. Files it created were kept' + (rec.files?.length ? ': ' + rec.files.join(', ') : '') + '.');
};
TERM.libs = async ([q]) => {
  const sub = (q || '').toLowerCase();
  if (sub === 'refresh') await I.loadLibs(true); else if (!I.getLibs().length) await I.loadLibs();
  const on = pkgs();
  if (sub === 'on' || sub === 'enabled') {
    const k = Object.keys(on);
    return k.length ? k.forEach(n => out('[on] ' + n + '@' + on[n].version + '  import ' + on[n].imp)) : out('No packages enabled. Try: libck <name>');
  }
  const term = sub && sub !== 'refresh' ? sub : '';
  const list = I.getLibs().filter(l => !term || [l.name, l.description, l.author, ...l.keywords].some(x => String(x || '').toLowerCase().includes(term)));
  if (!I.getLibs().length) return out('No components loaded yet. Try: libs refresh');
  list.forEach(l => out((l.name in on ? '[on] ' : '     ') + l.name + '@' + (l.version || '?') + '  ' + (l.description || '')));
  out(list.length + ' components. libck <name> checks one, libon <name> enables it.');
};

/* ---------- xfcmd command ---------- */
TERM.xfcmd = async (args, rest) => {
  const sub = (args[0] || '').toLowerCase();
  if (!sub || sub === 'help') return out('xfcmd list              list plugged commands and workspace .xfcmd files\nxfcmd <name>            run a registry command or a workspace file\nxfcmd run <name|file>   same as above\nxfcmd check <name|file> parse a script and show problems\nxfcmd eval <sentence>   run one sentence, e.g. xfcmd eval say "hi"\nxfcmd refresh           reload xfcmds/cmd.json');
  if (sub === 'refresh') { await getRegistry(true); return out('Registry reloaded (' + (regCache._remote ? 'github' : 'built-in') + ')') }
  if (sub === 'list') {
    const reg = await getRegistry();
    out('Registry: ' + (reg._remote ? 'github fscss-ttr/FSCSS/xfcmds/cmd.json' : 'built-in fallback (github registry not found)'));
    Object.entries(reg.commands || {}).forEach(([n, c]) => out('  ' + n + '  ' + (c.about || c.script)));
    Object.entries(reg.packages || {}).forEach(([n, c]) => out('  [package hook] ' + n + '  ' + (c.about || c.enable)));
    Object.keys(S.files).filter(n => n.endsWith('.xfcmd')).forEach(n => out('  [workspace] ' + n));
    return;
  }
  if (sub === 'eval') {
    const t = rest.slice(4).trim();
    return t ? void await runText(t, mkCtx(null), 'eval') : log('error', 'Usage: xfcmd eval <sentence>');
  }
  const check = sub === 'check', name = (sub === 'run' || check) ? args[1] : args[0];
  if (!name) return log('error', 'Usage: xfcmd ' + (check ? 'check' : 'run') + ' <name|file>');
  let text = S.files[name];
  if (text === undefined) {
    const e = (await getRegistry()).commands?.[name];
    if (!e) return log('error', 'No workspace file or registry command named "' + name + '". Try: xfcmd list');
    text = await registryScript(e.script);
    if (text == null) return log('error', 'Could not load ' + e.script);
  }
  if (check) {
    const p = parse(text);
    p.errors.forEach(e => log('error', 'line ' + e.line + ': ' + e.msg));
    return out(p.errors.length ? p.errors.length + ' problems' : 'OK, ' + p.steps.length + ' sentences. It ' + describe(p.steps, mkCtx(null)) + '.');
  }
  await runText(text, mkCtx(null), name);
};

/* ---------- help text, snippet restore, highlighting ---------- */
const baseHelp = TERM.help;
TERM.help = () => {
  baseHelp?.();
  out('\nPackages:\n  libs [query|on|refresh]  list or search components\n  libck <name>             load and check a package, then offer to enable it\n  libon <name> [force]     enable a package (runs its xfcmd script)\n  liboff <name>            disable a package\n  yes | no                 answer a prompt\n  xfcmd help               xfcmd scripts');
};
const saved = pkgs();
Object.entries(saved).forEach(([n, r]) => (r.snips || []).forEach(s => SNIPS.push({ ...s, pkg: n })));
I.renderSnips();

/* syntax highlighting for .xfcmd files (ide.js registers it too; this is a safe fallback) */
let tries = 0;
const mt = setInterval(() => {
  if (window.monaco) { clearInterval(mt); registerXfcmd(window.monaco); }
  else if (++tries > 100) clearInterval(mt);
}, 300);
