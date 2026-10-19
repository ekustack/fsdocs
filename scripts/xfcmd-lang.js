/* xfcmd-lang.js
   Syntax highlighting, folding and completion for .xfcmd scripts in the FSCSS IDE.
   - sentences: verbs, keywords, quoted text, escapes, {variables}, numbers, paths, views
   - "create file <path> with:" blocks are highlighted in the language of the file being
     created (fscss, css, html, js, json, md) until the closing "end" line
   - unknown verbs are marked invalid, matching what the runner reports as "Unknown sentence"
   tokenizeLine() is pure, so it can be tested without Monaco.
   registerXfcmd(monaco) wires it into Monaco and is safe to call more than once. */

const VERBS = ['say', 'print', 'info', 'warn', 'error', 'toast', 'add', 'import', 'create', 'open', 'set', 'compile', 'preview', 'show', 'run', 'wait'];
const WORDS = new Set(['file', 'snippet', 'snippets', 'for', 'helpers', 'with', 'with:', 'as', 'all', 'entry', 'command', 'import']);
const VIEWS = new Set(['files', 'components', 'libs', 'snippets', 'tools', 'terminal', 'problems', 'css', 'preview']);
const VARS = ['name', 'version', 'author', 'description', 'license', 'repo', 'import', 'helpers', 'fscss', 'file'];
const VAR_RE = new RegExp('\\{(?:' + VARS.join('|') + ')\\}', 'g');
const TAB_RE = /\$\{\d+(?::[^}]*|\|[^}]*\|)?\}|\$\d/g;
const LANG_OF = { fscss: 'fscss', xfscss: 'fscss', css: 'css', html: 'html', js: 'javascript', json: 'json', md: 'markdown' };

const SENTENCES = [
  ['say', 'Print a line', 'say "${1:text}"'],
  ['warn', 'Print a warning', 'warn "${1:text}"'],
  ['error', 'Print an error', 'error "${1:text}"'],
  ['toast', 'Show a toast', 'toast "${1:text}" ${2|ok,warn,err|}'],
  ['add import', 'Insert an @import', 'add import ${1:name}'],
  ['create file (block)', 'Create a file from lines up to "end"', 'create file "${1:folder/name.fscss}" with:\n  ${2}\nend'],
  ['create file (inline)', 'Create a file from one string', 'create file "${1:name.fscss}" with "${2:text}"'],
  ['open file', 'Open a file in the editor', 'open file ${1:{file\\}}'],
  ['set entry', 'Set the entry file', 'set entry ${1:{file\\}}'],
  ['compile', 'Compile the active file', 'compile'],
  ['compile all', 'Compile every root file', 'compile all'],
  ['preview', 'Compile and show the preview', 'preview'],
  ['show', 'Show a panel or view', 'show ${1|files,components,snippets,tools,terminal,problems,css,preview|}'],
  ['add snippet', 'Add an editor snippet', 'add snippet ${1:key} "${2:title}" as "${3:body}"'],
  ['add snippets for helpers', 'One snippet per package helper', 'add snippets for helpers'],
  ['run command', 'Run an allowed terminal command', 'run command "${1|compile,run,all,preview,ls,open,new,libs,clear,theme,routes,deps,resolve|}"'],
  ['wait', 'Pause up to 3000 ms', 'wait ${1:300} ms']
];

const ext = p => (String(p).replace(/["']/g, '').split('.').pop() || '').toLowerCase();

/* scan a line into raw segments [start, end, scope] */
function scanSentence(line) {
  const segs = [];
  const push = (s, e, scope) => { if (e > s) segs.push([s, e, scope]) };
  const lead = line.match(/^\s*/)[0].length;
  if (/^(#|\/\/)/.test(line.slice(lead))) { push(lead, line.length, 'comment'); return { segs, opener: null } }
  const re = /"((?:[^"\\]|\\.)*)("?)|\S+/g;
  let m, idx = 0, prev = '', prevWord = '';
  const words = [];
  while ((m = re.exec(line))) {
    const start = m.index, text = m[0];
    if (text[0] === '"') {
      push(start, start + text.length, 'string');
      for (const e of text.matchAll(/\\./g)) push(start + e.index, start + e.index + 2, 'string.escape');
      for (const v of text.matchAll(VAR_RE)) push(start + v.index, start + v.index + v[0].length, 'variable');
      for (const t of text.matchAll(TAB_RE)) push(start + t.index, start + t.index + t[0].length, 'number');
      words.push({ q: true, v: m[1] });
      prev = '"';
    } else {
      const w = text.toLowerCase();
      let scope = '';
      if (idx === 0) scope = VERBS.includes(w) ? 'keyword' : 'invalid';
      else if (WORDS.has(w) && !(prevWord === 'file' || prevWord === 'entry' || prevWord === 'import')) scope = 'keyword';
      else if (/^\d+$/.test(w) || (w === 'ms' && /^\d+$/.test(prev))) scope = 'number';
      else if (prevWord === 'show' && VIEWS.has(w)) scope = 'type';
      else if (prevWord === 'file' || prevWord === 'entry' || (prevWord === 'import' && words[0] && words[0].v === 'add')) scope = 'type';
      else if (prevWord === 'snippet') scope = 'type';
      if (scope) push(start, start + text.length, scope);
      for (const v of text.matchAll(VAR_RE)) push(start + v.index, start + v.index + v[0].length, 'variable');
      words.push({ q: false, v: text });
      prev = text;
      prevWord = w;
    }
    idx++;
  }
  /* is this the opening line of a create file block? */
  const a = words.map(x => x.q ? '' : x.v.toLowerCase());
  let opener = null;
  if (a[0] === 'create' && a[1] === 'file' && words[2] && (a[3] === 'with:' || (a[3] === 'with' && words.length === 4))) {
    opener = LANG_OF[ext(words[2].v)] || 'plaintext';
  }
  return { segs, opener };
}

/* flatten overlapping segments into contiguous tokens; later (more specific) segments win */
function flatten(len, segs) {
  const scopes = new Array(len).fill('');
  for (const [s, e, scope] of segs) for (let i = s; i < e && i < len; i++) scopes[i] = scope;
  const out = [];
  for (let i = 0; i < len; i++) if (i === 0 || scopes[i] !== scopes[i - 1]) out.push({ startIndex: i, scopes: scopes[i] });
  return out.length ? out : [{ startIndex: 0, scopes: '' }];
}

/* make embedded tokens safe: start at 0, strictly increasing, inside the line */
function clean(toks, len) {
  const out = [];
  for (const t of toks || []) {
    if (!t || typeof t.startIndex !== 'number' || t.startIndex < 0 || (t.startIndex >= len && len > 0)) continue;
    if (out.length && t.startIndex <= out[out.length - 1].startIndex) { out[out.length - 1] = { startIndex: out[out.length - 1].startIndex, scopes: t.scopes || '' }; continue; }
    out.push({ startIndex: t.startIndex, scopes: t.scopes || '' });
  }
  if (!out.length || out[0].startIndex !== 0) out.unshift({ startIndex: 0, scopes: '' });
  return out;
}

/* put {variables} on top of tokens that came from an embedded language */
function overlayVars(line, toks) {
  const vars = [...line.matchAll(VAR_RE)].map(v => [v.index, v.index + v[0].length]);
  if (!vars.length) return toks;
  const typeAt = i => { let t = ''; for (const k of toks) { if (k.startIndex <= i) t = k.scopes; else break } return t };
  const cuts = new Set(toks.map(t => t.startIndex));
  vars.forEach(([s, e]) => { cuts.add(s); if (e < line.length) cuts.add(e) });
  const out = [];
  for (const c of [...cuts].sort((x, y) => x - y)) {
    const inVar = vars.some(([s, e]) => c >= s && c < e);
    const scopes = inVar ? 'variable' : typeAt(c);
    if (!out.length || out[out.length - 1].scopes !== scopes) out.push({ startIndex: c, scopes });
  }
  return out;
}

/**
 * tokenizeLine(line, block, embed) -> { tokens, block }
 *   block: null, or the language id of the create file block we are inside
 *   embed(line, langId) -> [{ startIndex, scopes }] | null, used for block bodies
 */
export function tokenizeLine(line, block, embed) {
  if (block) {
    if (line.trim().toLowerCase() === 'end') {
      const lead = line.match(/^\s*/)[0].length;
      return { tokens: flatten(line.length, [[lead, line.length, 'keyword']]), block: null };
    }
    let toks = block !== 'plaintext' && embed ? embed(line, block) : null;
    toks = clean(toks, line.length);
    return { tokens: overlayVars(line, toks), block };
  }
  const { segs, opener } = scanSentence(line);
  return { tokens: flatten(line.length, segs), block: opener };
}

class XState {
  constructor(block) { this.block = block }
  clone() { return new XState(this.block) }
  equals(o) { return o instanceof XState && o.block === this.block }
}

export function registerXfcmd(monaco) {
  if (!monaco || monaco.languages.getLanguages().some(l => l.id === 'xfcmd')) return;
  monaco.languages.register({ id: 'xfcmd', extensions: ['.xfcmd'], aliases: ['xfcmd', 'XFCMD'] });
  monaco.languages.setLanguageConfiguration('xfcmd', {
    comments: { lineComment: '#' },
    brackets: [['{', '}']],
    autoClosingPairs: [{ open: '"', close: '"', notIn: ['string'] }, { open: '{', close: '}', notIn: ['string'] }],
    surroundingPairs: [{ open: '"', close: '"' }, { open: '{', close: '}' }],
    folding: { markers: { start: /^\s*create\s+file\s+\S+\s+with:?\s*$/i, end: /^\s*end\s*$/i } }
  });
  const embed = (line, lang) => {
    try { return (monaco.editor.tokenize(line, lang)[0] || []).map(t => ({ startIndex: t.offset, scopes: t.type })) }
    catch { return null }
  };
  monaco.languages.setTokensProvider('xfcmd', {
    getInitialState: () => new XState(null),
    tokenize: (line, state) => {
      const r = tokenizeLine(line, state.block, embed);
      return { tokens: r.tokens, endState: new XState(r.block) };
    }
  });
  monaco.languages.registerCompletionItemProvider('xfcmd', {
    triggerCharacters: ['{'],
    provideCompletionItems(model, pos) {
      const w = model.getWordUntilPosition(pos);
      const range = { startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber, startColumn: w.startColumn, endColumn: w.endColumn };
      const before = model.getLineContent(pos.lineNumber).slice(0, w.startColumn - 1);
      const K = monaco.languages.CompletionItemKind;
      if (before.endsWith('{')) {
        return { suggestions: VARS.map(v => ({ label: v, kind: K.Variable, insertText: v, range, detail: 'package variable' })) };
      }
      if (!/^\s*$/.test(before)) return { suggestions: [] };
      return {
        suggestions: SENTENCES.map(([label, detail, body]) => ({
          label, detail, kind: K.Snippet, insertText: body, range,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        }))
      };
    }
  });
  /* models created before the language existed */
  monaco.editor.getModels().filter(m => /\.xfcmd$/i.test(m.uri.path)).forEach(m => monaco.editor.setModelLanguage(m, 'xfcmd'));
}

