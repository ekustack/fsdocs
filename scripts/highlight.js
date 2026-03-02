function fscssCodeHl() {
  // Broaden selector to catch common ways to mark FSCSS blocks
  const selectors = [
    '.code-block pre', 
    'pre code[lang="fscss"]',
    'pre code.lang-fscss',
    'pre[data-lang="fscss"]',
    'pre.lang-fscss',
    'code[lang="fscss"]',
    'code.lang-fscss', 
    '.code-container pre',
    '.fscss',
    'pre.fscss',
    'code.fscss'
  ].join(',');

  // Enhanced token regex to match all FSCSS features
  const tokenRE = new RegExp(
    // Combined regex for all FSCSS patterns
    '(' + [
      // Comments
      '\\/\\*[\\s\\S]*?\\*\\/',
      '\\/\\/[^\\n]*',
      
      // Strings (single, double, backtick)
      '"(?:\\\\.|[^"\\\\])*"',
      "'(?:\\\\.|[^'\\\\])*'",
      '`(?:\\\\.|[^`\\\\])*`',
      
      // FSCSS Arrays (@arr, @arr.name!, @arr.name[1], @arr.name!.method)
      '@arr\\.[a-zA-Z_][a-zA-Z0-9_]*!?(?:\\.[a-zA-Z_]+)?(?:\\[\\d*\\])?',
      '@arr\\s+[a-zA-Z_][a-zA-Z0-9_]*\\[[^\\]]*\\]',
      
      // FSCSS Functions (@fun, @fun.name.prop.value)
      '@fun\\.[a-zA-Z_][a-zA-Z0-9_]*\\.[a-zA-Z_][a-zA-Z0-9_]*\\.value',
      '@fun\\([a-zA-Z_][a-zA-Z0-9_]*\\)\\s*\\{[^}]*\\}',
      
      // Directives (@import, @media, @event, @ext, @random)
      '@(?:import|media|event|ext|random|keyframes)\\b',
      
      // Share functions (%1 - %6, %i, %n)
      '%(?:[1-6]|i|n)\\([^)]*\\)',
      
      // mx and mxs functions
      'mx(?:s?)\\([^)]*\\)',
      
      // String storage (str)
      'str\\([^)]*\\)',
      
      // Utility functions (copy, rpt, count, length, num, exec)
      '(?:copy|rpt|count|length|num|exec)\\([^)]*\\)',
      
      // Attribute selector shortcut $(...)
      '\\$\\([^)]*\\)',
      
      // Vendor prefix
      '-\\*-',
      
      // Variables ($var, $var!)
      '\\$[a-zA-Z_][a-zA-Z0-9_-]*!?',
      
      // Property names with colon
      '[a-zA-Z-]+(?=\\s*:)',
      
      // Numbers with units
      '\\b\\d+(?:\\.\\d+)?(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|turn)?\\b',
      
      // Colors (hex, rgb, rgba, hsl, hsla)
      '#[0-9a-fA-F]{3,8}\\b',
      '(?:rgb|rgba|hsl|hsla)\\([^)]*\\)',
      
      // Operators and punctuation
      '[\\[\\]\\(\\)\\{\\}:;,]'
    ].join('|') + ')', 'g'
  );

  const escapeHtml = s => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function classifyToken(token) {
    // Comments
    if (token.startsWith('/*') || token.startsWith('//')) {
      return 'fscss-comment';
    }
    
    // Strings
    if (/^['"`]/.test(token)) {
      return 'fscss-string';
    }
    
    // FSCSS Arrays
    if (token.startsWith('@arr')) {
      if (token.includes('!')) return 'fscss-array-method';
      if (token.includes('[')) return 'fscss-array-access';
      return 'fscss-keyword';
    }
    
    // FSCSS Functions
    if (token.startsWith('@fun')) {
      return 'fscss-function';
    }
    
    // Directives
    if (token.startsWith('@')) {
      return 'fscss-directive';
    }
    
    // Share functions
    if (/^%[1-6in]/.test(token)) {
      return 'fscss-share';
    }
    
    // mx/mxs functions
    if (/^mx(?:s?)\(/.test(token)) {
      return 'fscss-merge';
    }
    
    // str function
    if (/^str\(/.test(token)) {
      return 'fscss-storage';
    }
    
    // Utility functions
    if (/^(?:copy|rpt|count|length|num|exec)\(/.test(token)) {
      return 'fscss-utility';
    }
    
    // Attribute selector
    if (/^\$\(/.test(token)) {
      return 'fscss-attribute';
    }
    
    // Vendor prefix
    if (token === '-*-') {
      return 'fscss-vendor';
    }
    
    // Variables
    if (/^\$[a-zA-Z_]/.test(token)) {
      return 'fscss-variable';
    }
    
    // Property names
    if (/^[a-zA-Z-]+:$/.test(token)) {
      return 'fscss-property';
    }
    
    // Numbers
    if (/^\d+(\.\d+)?(px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|turn)?$/.test(token)) {
      return 'fscss-number';
    }
    
    // Colors
    if (/^#[0-9a-fA-F]{3,8}$/.test(token) || /^(rgb|rgba|hsl|hsla)\(/.test(token)) {
      return 'fscss-color';
    }
    
    // Operators
    if (/^[\[\]\{\}:;,]$/.test(token)) {
      return 'fscss-operator';
    }
    
    return null;
  }

  document.querySelectorAll(selectors).forEach(block => {
    // Skip if already highlighted
    if (block.classList.contains('fscss-highlighted')) return;
    
    const text = block.textContent || '';
    let out = '';
    let last = 0;
    let m;
    
    while ((m = tokenRE.exec(text)) !== null) {
      // Append text between matches
      out += escapeHtml(text.slice(last, m.index));
      
      const token = m[0];
      const cls = classifyToken(token);
      
      if (cls) {
        out += `<span class="${cls}">${escapeHtml(token)}</span>`;
      } else {
        out += escapeHtml(token);
      }
      
      last = tokenRE.lastIndex;
    }
    
    out += escapeHtml(text.slice(last));
    block.innerHTML = out;
    block.classList.add('fscss-code', 'fscss-highlighted');
  });
}

document.addEventListener("DOMContentLoaded", () => fscssCodeHl());

// Re-run after dynamic content loads
setTimeout(fscssCodeHl, 500);

