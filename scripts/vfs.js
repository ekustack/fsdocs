/* vfs.js
   Workspace file system for the FSCSS IDE.
   - path resolving (relative, absolute, ../, extension fallback) and a route table
   - FSCSS / CSS imports: local paths rewritten to data: URIs so impFrom/procImp
     handle selective aliases, *, and exec themselves (no VFS inlining)
   - HTML links (css, js, svg images, page links) and JS module imports for the preview
   - reference updates when a file is renamed or moved
   Pure functions over the IDE state S. No DOM access.

   Import matching mirrors lip/functions/impFrom.js + procImp.js:
   - Selective: @import((print as say, hello as hl) from "./hello.fscss")
   - Selective *: @import((*) from "./mod.fscss")
   - Classic:    @import(exec("file.fscss")) / @import(exec(file.fscss))
   - Registry:   @import((x) from flex-control)  → remote (not local)
   - CSS:        @import "x.css";  @import url(...)

   Note: FSCSS readSource must treat data: as remote (fetch works):
     const isRemote = (s) => /^(?:https?:|data:)/i.test(s);
*/

/* ---- exact patterns from impFrom.js / procImp.js, combined ---- */

// impFrom: @import( [exec] (blocks) from "url"|'url'|`url` )
// blocks allow aliases: "print as say, hello as hl"
const RE_FROM = /@import\((?:\s+)?(?:exec)?\(([\w\d.\@\—\-_*\#\$\s,]+)\)(?:\s+)?from(?:\s+)?(?:"([^"]+)"|'([^']+)'|`([^`]+)`|([^\s)"'`]+))(?:\s+)?\)/gi;

// procImp: @import(exec( "url"|'url'|`url`|bare ))
const RE_EXEC = /@import\((?:\s+)?exec\((?:\s+)?(?:"([^"]+)"|'([^']+)'|`([^`]+)`|([^\s)"'`]+))(?:\s+)?\)(?:\s+)?\)/gi;

// Standard CSS @import
const RE_CSS = /@import\s+(?:url\(\s*)?(?:"([^"]+)"|'([^']+)'|([^\s"')(;]+))\s*\)?\s*;?/gi;

// Combined for replace / scan (order: selective, classic exec, css)
const IMPORT_RE = new RegExp(
  RE_FROM.source + '|' + RE_EXEC.source + '|' + RE_CSS.source,
  'gi'
);

const HTML_REF = /(\b(?:href|src)\s*=\s*)(["'])(.*?)\2/gi;
const JS_IMP = /(\bimport\b[^;'"`()]*?\bfrom\s*|\bexport\b[^;'"`()]*?\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])([^"'\n]+)\2/g;
const EXTS = ['.fscss', '.xfscss', '.css', '.html', '.js'];
const CSS_TYPES = ['css', 'fscss', 'xfscss'];

const mk = re => new RegExp(re.source, re.flags);
const ext = n => (String(n).split('.').pop() || '').toLowerCase();
const base = n => String(n).split('/').pop();
const dirname = f => f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '';
const isF = n => ext(n) === 'fscss' || ext(n) === 'xfscss';
const isExternal = r => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(r);
const enc = s => encodeURIComponent(s).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
const safe = s => String(s).replace(/<\/(style|script)/gi, '<\\/$1');
const norm = p => {
  const out = [];
  for (const s of String(p).replace(/\\/g, '/').split('/')) {
    if (!s || s === '.') continue;
    if (s === '..') { out.pop(); continue; }
    out.push(s);
  }
  return out.join('/');
};
const rel = (from, to) => {
  const a = dirname(from).split('/').filter(Boolean), b = to.split('/');
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return [...Array(a.length - i).fill('..'), ...b.slice(i)].join('/');
};

/** True when the specifier looks like a workspace path (relative or absolute). */
function isPathLike(ref) {
  if (!ref) return false;
  if (isExternal(ref)) return false;
  if (/^\.{0,2}\//.test(ref) || ref.startsWith('/') || ref.includes('/')) return true;
  if (/\.(x?fscss|css|html|js)$/i.test(ref)) return true;
  return false;
}

/**
 * Parse one IMPORT_RE match into { form, tgt, blocks }.
 * Capture layout (1-based) after combining RE_FROM | RE_EXEC | RE_CSS:
 *   FROM:  1=blocks, 2="url", 3='url', 4=`url`, 5=bare
 *   EXEC:  6="url", 7='url', 8=`url`, 9=bare
 *   CSS:  10="url", 11='url', 12=bare
 */
function groups(m) {
  const form = m[1] !== undefined; // selective / from form
  const tgt =
    m[2] ?? m[3] ?? m[4] ?? m[5] ??
    m[6] ?? m[7] ?? m[8] ?? m[9] ??
    m[10] ?? m[11] ?? m[12];
  return { form, tgt: tgt != null ? String(tgt).trim() : undefined, blocks: m[1] };
}

export function createVFS(S) {
  const has = p => Object.hasOwn(S.files, p);
  const names = () => Object.keys(S.files);

  /* ---------- lookup: path to file ---------- */
  function resolve(from, ref) {
    ref = String(ref || '').split(/[?#]/)[0].trim();
    if (!ref || isExternal(ref)) return null;
    const dir = dirname(from || '');
    const p = norm(ref[0] === '/' ? ref : (dir ? dir + '/' : '') + ref);
    if (!p) return null;
    return [p, ...EXTS.map(e => p + e), p + '/index.html', p + '/index.fscss'].find(has) || null;
  }

  /**
   * Local workspace target only when path-like.
   * Bare registry names (flex-control, fscss:micros, st-core@v2) stay remote.
   */
  function target(file, ref, kind) {
    if (!ref) return null;
    if ((kind === 'fscss' || kind === 'css') && !isPathLike(ref)) return null;
    return resolve(file, ref);
  }

  function importDep(file, tgt) {
    const d = target(file, tgt, 'fscss');
    return d && CSS_TYPES.includes(ext(d)) && d !== file ? d : null;
  }

  /* ---------- routes ---------- */
  const pages = () => names().filter(f => ext(f) === 'html').sort();
  const isPage = f => has(f) && ext(f) === 'html';
  function routes() {
    const r = pages().map(f => ({ route: '/' + f, file: f }));
    if (has('index.html')) r.unshift({ route: '/', file: 'index.html' });
    return r;
  }
  function pickPage(pref) {
    if (pref && isPage(pref)) return pref;
    if (has('index.html')) return 'index.html';
    return pages()[0] || null;
  }

  /* ---------- reference scanning (one place for all file types) ---------- */
  function mapRefs(file, text, fn) {
    const t = ext(file);
    if (CSS_TYPES.includes(t)) {
      return String(text).replace(mk(IMPORT_RE), (...a) => {
        const m = a.slice(0, 13);
        const g = groups(m);
        if (g.tgt === undefined) return m[0];
        const r = fn(g.tgt, g.form ? 'fscss' : 'css');
        return r == null ? m[0] : m[0].replace(g.tgt, r);
      });
    }
    if (t === 'html') {
      return String(text).replace(mk(HTML_REF), (m, a, q, v) => {
        const r = fn(v, 'html');
        return r == null ? m : a + q + r + q;
      });
    }
    if (t === 'js') {
      return String(text).replace(mk(JS_IMP), (m, pre, q, spec) => {
        const r = fn(spec, 'js');
        return r == null ? m : pre + q + r + q;
      });
    }
    return text;
  }

  function deps(file) {
    const list = [];
    if (!has(file)) return list;
    mapRefs(file, S.files[file], (ref, kind) => {
      if (isF(file) && (kind === 'css' || kind === 'fscss')) kind = 'fscss';
      const to = target(file, ref, kind);
      if ((kind === 'fscss' || kind === 'css') && !to && !isPathLike(ref)) kind = 'remote';
      list.push({ ref, kind, to });
      return null;
    });
    return list;
  }

  function refsTo(t) {
    const by = new Set();
    for (const f of names()) {
      if (f === t) continue;
      mapRefs(f, S.files[f], (ref, kind) => {
        if (target(f, ref, kind) === t) by.add(f);
        return null;
      });
    }
    return [...by];
  }

  function importedSet() {
    const s = new Set();
    for (const f of names()) {
      if (!CSS_TYPES.includes(ext(f))) continue;
      const re = mk(IMPORT_RE);
      const text = S.files[f] || '';
      let m;
      while ((m = re.exec(text))) {
        const g = groups(m);
        const d = importDep(f, g.tgt);
        if (d) s.add(d);
      }
    }
    return s;
  }

  /* root = FSCSS file that no other file imports (or the entry file). */
  function roots() {
    const imp = importedSet();
    const all = names().filter(isF);
    const r = all.filter(f => !imp.has(f) || f === S.settings?.entry);
    return r.length ? r : all;
  }
  const isPartial = f => isF(f) && !roots().includes(f);

  /* ---------- data-URI rewrite: local paths → data: so FSCSS runtime owns imports ----
     Keeps the full @import((aliases) from "…") / @import(exec("…")) shape intact.
     Nested local imports inside a target are also rewritten to data: URIs.
     Remote / registry specs are left unchanged. */
  function toDataUri(file, stack, warn) {
    if (stack.includes(file)) {
      warn.push('circular import: ' + [...stack, file].join(' > '));
      return null;
    }
    if (stack.length > 30) {
      warn.push('imports nested too deep at ' + file);
      return null;
    }
    const text = String(S.files[file] ?? '');
    // Recursively rewrite local import targets inside this file first
    const rewritten = text.replace(mk(IMPORT_RE), (...a) => {
      const m = a.slice(0, 13);
      const g = groups(m);
      if (g.tgt === undefined) return m[0];
      const d = importDep(file, g.tgt);
      if (!d) return m[0]; // remote / unresolved — leave as-is
      const nested = toDataUri(d, [...stack, file], warn);
      if (nested == null) {
        return m[0].replace(g.tgt, () => '/* circular or too deep: ' + d + ' */');
      }
      // Replace only the path/spec with a data: URI; keep blocks + aliases
      return m[0].replace(g.tgt, () => nested);
    });
    return 'data:text/plain;charset=utf-8,' + enc(rewritten);
  }

  /**
   * bundle(name): rewrite local workspace imports to data: URIs.
   * FSCSS (impFrom / procImp) then resolves selective aliases, * , and exec itself.
   * Returns { text, map, deps, warnings } — map is a single-chunk line map for the root.
   */
  function bundle(name) {
    const warnings = [], dep = [];
    const text = String(S.files[name] ?? '');
    const seen = new Set();

    // Collect deps for graph (same as before)
    function collect(file, stack) {
      if (seen.has(file) || stack.includes(file)) return;
      seen.add(file);
      const re = mk(IMPORT_RE);
      const src = String(S.files[file] ?? '');
      let m;
      while ((m = re.exec(src))) {
        const g = groups(m);
        const d = importDep(file, g.tgt);
        if (!d) continue;
        if (!seen.has(d)) {
          dep.push(d);
          collect(d, [...stack, file]);
        }
      }
    }
    collect(name, []);

    const rewritten = text.replace(mk(IMPORT_RE), (...a) => {
      const m = a.slice(0, 13);
      const g = groups(m);
      if (g.tgt === undefined) return m[0];
      const d = importDep(name, g.tgt);
      if (!d) return m[0];
      const uri = toDataUri(d, [name], warnings);
      if (uri == null) {
        return '/* circular or too deep: ' + d + ' */';
      }
      // Preserve @import((print as say, …) from "…") — only the path becomes a data: URI
      return m[0].replace(g.tgt, () => uri);
    });

    return {
      text: rewritten,
      map: [{ t: rewritten, file: name, line: 1 }],
      deps: dep,
      warnings
    };
  }

  /* ---------- JS modules: relative imports → data: URLs for sandboxed preview ---------- */
  function moduleSrc(file, stack, warn) {
    if (stack.includes(file)) {
      warn.push('circular js import: ' + [...stack, file].join(' > '));
      return null;
    }
    return String(S.files[file]).replace(mk(JS_IMP), (m, pre, q, spec) => {
      const d = resolve(file, spec);
      if (!d || ext(d) !== 'js') return m;
      const s = moduleSrc(d, [...stack, file], warn);
      return s == null ? m : pre + q + 'data:text/javascript;charset=utf-8,' + enc(s) + q;
    });
  }

  function jsRoots() {
    const imp = new Set();
    for (const f of names().filter(n => ext(n) === 'js')) {
      mapRefs(f, S.files[f], (ref) => {
        const d = resolve(f, ref);
        if (d && ext(d) === 'js') imp.add(d);
        return null;
      });
    }
    return names().filter(n => ext(n) === 'js' && !imp.has(n));
  }

  /* ---------- preview page ---------- */
  function linkedCss(page) {
    const html = page && has(page) ? S.files[page] : '';
    const list = [];
    for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
      if (!/(?:rel\s*=\s*["']?stylesheet|type\s*=\s*["'](?:\w*[\.\/])\s*x?fscss)/i.test(tag)) continue;
      const m = tag.match(/href\s*=\s*(["'])(.*?)\1/i);
      const f = m && resolve(page, m[2]);
      if (f && CSS_TYPES.includes(ext(f))) list.push(f);
    }
    return list;
  }
  const neededFscss = page => {
    const l = linkedCss(page);
    return l.length ? l.filter(isF) : roots();
  };

  function buildPage({ page, css, defaultHtml, bridge, bridgeJs }) {
    const warn = [], from = page || '';
    let html = page && has(page) ? S.files[page] : defaultHtml;
    let linkedC = 0, linkedJ = 0;

    const cssOf = f => {
      if (isF(f)) {
        if (css[f] === undefined) warn.push(f + ' is not compiled yet');
        return css[f] ?? '/* ' + f + ' not compiled */';
      }
      const b = bundle(f);
      b.warnings.forEach(w => warn.push(w));
      return b.text;
    };

    html = html.replace(/<link\b[^>]*>/gi, tag => {
      if (!/(?:rel\s*=\s*["']?stylesheet|type\s*=\s*["'](?:\w*[\.\/])\s*x?fscss)/.test(tag)) return tag;
      const m = tag.match(/href\s*=\s*(["'])(.*?)\1/i);
      const f = m && resolve(from, m[2]);
      if (!f || !CSS_TYPES.includes(ext(f))) return tag;
      linkedC++;
      return '<style data-src="' + f + '">\n' + safe(cssOf(f)) + '\n</style>';
    });

    html = html.replace(/<script\b([^>]*?)\bsrc\s*=\s*(["'])(.*?)\2([^>]*)>\s*<\/script>/gi, (tag, a1, q, src, a2) => {
      const f = resolve(from, src);
      if (!f || ext(f) !== 'js') return tag;
      linkedJ++;
      return '<script' + a1 + a2 + '>\n' + safe(moduleSrc(f, [], warn) ?? S.files[f]) + '\n</script>';
    });

    html = html.replace(/(<(?:img|source)\b[^>]*?\bsrc\s*=\s*)(["'])(.*?)\2/gi, (m, a, q, v) => {
      const f = resolve(from, v);
      return f && ext(f) === 'svg'
        ? a + q + 'data:image/svg+xml;charset=utf-8,' + enc(S.files[f]) + q
        : m;
    });

    const head = (h, add) => /<\/head>/i.test(h) ? h.replace(/<\/head>/i, () => add + '</head>') : add + h;

    if (!linkedC) {
      const imp = importedSet();
      const all = [
        ...roots().map(n => css[n]),
        ...names().filter(n => ext(n) === 'css' && !imp.has(n)).map(n => bundle(n).text)
      ].filter(Boolean).join('\n');
      html = head(html, '<style id="fscss-out">\n' + safe(all) + '\n</style>');
    }

    if (!linkedJ) {
      const sc = jsRoots()
        .map(f => '<script type="module" data-src="' + f + '">\n' + safe(moduleSrc(f, [], warn) ?? '') + '\n</script>')
        .join('\n');
      if (sc) {
        html = /<\/body>/i.test(html)
          ? html.replace(/<\/body>/i, () => sc + '</body>')
          : html + sc;
      }
    }

    if (bridge) {
      const b = '<script>' + bridgeJs + '</script>';
      html = /<head[^>]*>/i.test(html)
        ? html.replace(/<head[^>]*>/i, m => m + b)
        : b + html;
    }

    return { html, warnings: warn, page };
  }

  /* ---------- move or rename: fix references in every file ---------- */
  function moveRefs(oldName, newName) {
    const changed = [];
    const dest = f => (f === oldName ? newName : f);

    for (const f of names()) {
      const next = mapRefs(f, S.files[f], (ref, kind) => {
        const t = target(f, ref, kind);
        if (!t) return null;
        const f2 = dest(f), t2 = dest(t);
        if (f2 === f && t2 === t) return null;
        const suf = (ref.match(/[?#].*$/) || [''])[0];
        let r = ref[0] === '/' ? '/' + t2 : rel(f2, t2);
        if (!/\.\w+$/.test(base(ref.replace(/[?#].*$/, '')))) {
          r = r.replace(/\.[^./]+$/, '');
        }
        if (ref.startsWith('./') && !r.startsWith('.') && r[0] !== '/') r = './' + r;
        return r + suf;
      });
      if (next !== S.files[f]) {
        S.files[f] = next;
        changed.push(f);
      }
    }
    return changed;
  }

  return {
    resolve, norm, pages, isPage, routes, pickPage,
    deps, refsTo, roots, isPartial, bundle, buildPage,
    neededFscss, moveRefs, jsRoots,
    isPathLike, IMPORT_RE
  };
}
