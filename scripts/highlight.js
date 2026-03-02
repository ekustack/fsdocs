function fscssCodeHl(){
  // broaden selector so it catches common ways to mark FSCSS blocks
  const selectors = [
    '.code-block pre', 
    'pre code[lang="fscss"]',
    'pre code.lang-fscss',
    'pre[data-lang="fscss"]',
    'pre.lang-fscss',
    'code[lang="fscss"]',
    'code.lang-fscss', 
    '.code-container pre' 
  ].join(',');

  // Token regex: block comments, line comments, strings, function-like identifiers,
  // @directives, variables like %2 or $var, numbers.
  const tokenRE = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|[-a-zA-Z_][-\w]*\s*:|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[a-zA-Z_]\w*(?=\s*\()|@[\w.-]+\b|%[0-9]+|\$[a-zA-Z_]\w*|\b\d+(\.\d+)?\b/g;

  const escapeHtml = s => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  document.querySelectorAll(selectors).forEach(block => {
    // use textContent to get raw text (preserves exact characters)
    const text = block.textContent || '';

    let out = '';
    let last = 0;
    let m;
    while ((m = tokenRE.exec(text)) !== null) {
      // append the raw text between previous match and this match (escaped)
      out += escapeHtml(text.slice(last, m.index));

      const token = m[0];

      // decide class
      let cls = '';
      if (token.startsWith('/*') || token.startsWith('//')) {
        cls = 'fscss-comment';
      } else if (/^['"`]/.test(token)) {
        cls = 'fscss-string';
      } else if (token.startsWith('@')) {
        cls = 'fscss-keyword';
      } 
      else if (/^[-a-zA-Z_][-\w]*\s*:$/.test(token)) {
  cls = 'fscss-var'; // or maybe new class like fscss-prop
}
      else if (/^[a-zA-Z_]\w*$/.test(token)) {
        cls = 'fscss-method';
      } else if (/^%[0-9]+$/.test(token) || /^\$[a-zA-Z_][\w\-]*$/.test(token)){
        cls = 'fscss-var';
      } else if (/^\d+(\.\d+)?$/.test(token)) {
        cls = 'fscss-number';
      }

      if (cls) out += `<span class="${cls}">${escapeHtml(token)}</span>`;
      else out += escapeHtml(token);

      last = tokenRE.lastIndex;
    }

    out += escapeHtml(text.slice(last)); // remaining text
    block.innerHTML = out;
    block.classList.add('fscss-code'); // apply styling
  });
}

document.addEventListener("DOMContentLoaded", (e) =>fscssCodeHl());

