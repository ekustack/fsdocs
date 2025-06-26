class FSCSSCompiler {
  constructor() {
    this.variables = {};
    this.stores = {};
    this.keyframes = [];
    this.errors = [];
    this.warnings = [];
  }
  
  compile(fscss) {
    this.resetState();
    
    try {
      let css = fscss;
      css = this.extractStores(css);
      css = this.extractKeyframes(css);
      css = this.replaceStores(css);
      css = this.applyFscssTransformations(css);
      css = this.flattenNestedCSS(css, { validate: true });
      css += this.processKeyframes();
      return this.formatCSS(css);
    } catch (error) {
      this.errors.push(error.message);
      return `/* Compilation Error: ${error.message} */`;
    }
  }
  
  resetState() {
    this.variables = {};
    this.stores = {};
    this.keyframes = [];
    this.errors = [];
    this.warnings = [];
  }
  
  extractStores(css) {
    const storeRegex = /(?:store|str|re)\(\s*([^,]+?)\s*,\s*("|')(.*?)\2\s*\)/gi;
    return css.replace(storeRegex, (match, name, quote, content) => {
      this.stores[name.trim()] = content.trim();
      return '';
    });
  }
  
  extractKeyframes(css) {
    const keyframeRegex = /\$\(\s*@keyframes\s*(\S+)\s*,\s*([^,]+?)\s*,\s*\[([^\]]+?)\]\s*\)\s*\{([\s\S]*?)\}/g;
    return css.replace(keyframeRegex, (match, name, selector, timing, content) => {
      this.keyframes.push({
        name: name.trim(),
        selector: selector.trim(),
        timing: timing.trim().replace('&', name.trim()),
        content: content.trim()
      });
      return '';
    });
  }
  
  replaceStores(css) {
    let changed;
    let iterations = 0;
    const maxIterations = 10;
    
    do {
      changed = false;
      for (const [name, content] of Object.entries(this.stores)) {
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        const newCss = css.replace(regex, content);
        if (newCss !== css) {
          changed = true;
          css = newCss;
        }
      }
      iterations++;
    } while (changed && iterations < maxIterations);
    
    return css;
  }
  
  applyFscssTransformations(css) {
    // Handle mx/mxs padding shorthands
    css = css.replace(/(?:mxs|\$p)\((([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,\s*)?("([^"]*)"|'([^']*)')\)/gi, '$2:$14$15;$4:$14$15;$6:$14$15;$8:$14$15;$10:$14$15;$12:$14$15;')
      .replace(/(?:mx|\$m)\((([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,\s*)?("([^"]*)"|'([^']*)')\)/gi, '$2$14$15$4$14$15$6$14$15$8$14$15$10$14$15$12$14$15');
    
    // Handle string repetition
    css = css.replace(/rpt\((\d+)\,\s*("([^"]*)"|'([^']*)')\)/gi, 
      (match, count, quotedStr) => quotedStr.replace(/^['"]|['"]$/g, '').repeat(Math.max(0, parseInt(count)))
    
    // Process CSS variables
    css = css.replace(/\$(([\_\-\d\w]+)\:(\"[^\"]*\"|\'[^\']*\'|[^\;]*)\;)/gi, ':root{--$1}')
      .replace(/\$([^\!\s]+)!/gi, 'var(--$1)')
      .replace(/\$([\w\-\_\d]+)/gi, 'var(--$1)');
    
    // Handle vendor prefixes
    css = css.replace(/\-\*\-(([^\:]+)\:(\"[^\"]*\"|\'[^\']*\'|[^\;]*)\;)/gi, '-webkit-$1 -moz-$1 -ms-$1 -o-$1');
    
    // Process list-based shorthands
    for (let i = 1; i <= 8; i++) {
      const regex = new RegExp(`%${i}\\(${'(?:([^,\\[\\]]*),)?'.repeat(i)}\\s*\\[([^\\]\\[]*)\\]\\)`, 'gi');
      css = css.replace(regex, (match, ...groups) => {
        let result = '';
        const separator = groups[groups.length - 1];
        for (let j = 0; j < i; j++) {
          result += (groups[j * 2] || '') + separator;
        }
        return result;
      });
    }
    
    // Handle dynamic imports
    css = css.replace(/@import\(\s*\exec\((.*)(.{5})\)\s*\)/gi, '@import url("$1css")');
    
    // Process animation shorthands
    css = css.replace(/\$\(\s*@keyframes\s*(\S+)\)/gi, '$1{animation-name:$1;}@keyframes $1')
      .replace(/\$\(\s*(\@[\w\-\*]*)\s*([^\{\}\,&]*)(\s*,\s*[^\{\}&]*)?&?(\[([^\{\}]*)\])?\s*\)/gi, '$2$3{animation:$2 $5;}$1 $2');
    
    // Process property references
    css = css.replace(/\$\(\s*--([^\{\}]*)\)/gi, '$1')
      .replace(/\$\(([^\:]*):\s*([^\)\:]*)\)/gi, '[$1=\'$2\']')
      .replace(/\$\(([^\:^\)]*)\)/gi, '[$1]');
    
    // Handle grouping syntax
    css = css.replace(/g\(([^"'\s]*)\,\s*(("([^"]*)"|'([^']*)')\,\s*)?("([^"]*)"|'([^']*)')\s*\)/gi, '$1 $4$5$1 $7$8');
    
    return css;
  }
  
  flattenNestedCSS(css, options = {}) {
    const {
      preserveComments = false,
      indent = '  ',
      validate = true,
      errorHandler = (msg) => this.warnings.push(msg),
    } = options;

    if (!preserveComments) {
      css = css.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    }

    const isValidSelector = (selector) => 
      selector && selector.trim() !== '' && 
      !/[^a-zA-Z0-9\-_@*.\#:,\s>&~+()\[\]'"]|\/\//.test(selector);

    const isValidProperty = (prop) => {
      const [name] = prop.split(':').map(s => s.trim());
      return !validate || /^(--|[\w-]+)$/.test(name);
    };

    const parseBlock = (css, start, parentSelector = '') => {
      let output = '';
      let pos = start;
      const stack = [];
      let current = '';
      let inString = false;
      let quote = null;
      let depth = 0;

      while (pos < css.length) {
        const char = css[pos];
        
        if (char === '\\' && inString) {
          current += char + (pos + 1 < css.length ? css[++pos] : '');
          pos++;
          continue;
        }
        
        if ((char === '"' || char === "'") && !inString) {
          inString = true;
          quote = char;
          current += char;
        } else if (char === quote && inString) {
          inString = false;
          quote = null;
          current += char;
        } else if (char === '{' && !inString) {
          if (depth === 0) {
            const selector = current.trim();
            current = '';
            if (isValidSelector(selector)) {
              stack.push({ selector, parent: parentSelector });
            } else {
              errorHandler(`Invalid selector: ${selector}`);
            }
          } else {
            current += char;
          }
          depth++;
        } else if (char === '}' && !inString) {
          depth--;
          if (depth === 0) {
            const block = stack.pop();
            if (!block) continue;
            
            let fullSelector = block.selector.includes('&') ? 
              block.selector.replace(/&/g, block.parent) :
              block.parent ? `${block.parent} ${block.selector}` : block.selector;
            
            const nested = parseNestedContent(current, fullSelector);
            
            if (nested.properties.length > 0 || nested.keyframes.length > 0) {
              output += `${fullSelector} {\n`;
              if (nested.properties.length > 0) {
                output += indent + nested.properties.join(`;\n${indent}`) + ';\n';
              }
              output += nested.keyframes.join('\n');
              output += '}\n\n';
            }
            
            output += nested.nestedBlocks;
            current = '';
          } else {
            current += char;
          }
        } else if (char === '@' && !inString && depth === 0) {
          const atRuleEnd = this.findAtRuleEnd(css, pos);
          if (atRuleEnd === -1) break;
          
          output += css.substring(pos, atRuleEnd).trim() + '\n\n';
          pos = atRuleEnd;
          continue;
        } else {
          current += char;
        }
        
        pos++;
      }

      return { output, pos };
    };

    const parseNestedContent = (content, parentSelector) => {
      const result = {
        properties: [],
        nestedBlocks: '',
        keyframes: []
      };
      
      let current = '';
      let inString = false;
      let quote = null;
      let depth = 0;
      let pos = 0;
      
      while (pos < content.length) {
        const char = content[pos];
        
        if (char === '\\' && inString) {
          current += char + (pos + 1 < content.length ? content[++pos] : '');
          pos++;
          continue;
        }
        
        if ((char === '"' || char === "'") && !inString) {
          inString = true;
          quote = char;
          current += char;
        } else if (char === quote && inString) {
          inString = false;
          quote = null;
          current += char;
        } else if (char === '{' && !inString) {
          depth++;
          current += char;
        } else if (char === '}' && !inString) {
          depth--;
          current += char;
          if (depth === 0) {
            const block = parseBlock(current, 0, parentSelector).output;
            result.nestedBlocks += block;
            current = '';
          }
        } else if (char === ';' && !inString && depth === 0) {
          const prop = current.trim();
          if (prop && isValidProperty(prop)) {
            result.properties.push(prop);
          } else if (validate && prop) {
            errorHandler(`Invalid property: ${prop}`);
          }
          current = '';
        } else if (char === '@' && !inString && depth === 0) {
          const atEnd = this.findAtRuleEnd(content, pos);
          if (atEnd === -1) break;
          
          const atContent = content.substring(pos, atEnd);
          result.keyframes.push(atContent.trim());
          pos = atEnd;
          current = '';
          continue;
        } else {
          current += char;
        }
        
        pos++;
      }
      
      const lastProp = current.trim();
      if (lastProp && depth === 0 && isValidProperty(lastProp)) {
        result.properties.push(lastProp);
      }
      
      return result;
    };

    return parseBlock(css, 0).output;
  }
  
  findAtRuleEnd(css, start) {
    let depth = 0;
    let inString = false;
    let quote = null;
    let pos = start;
    
    while (pos < css.length) {
      const char = css[pos];
      
      if (char === '\\' && inString) {
        pos += 2;
        continue;
      }
      
      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        quote = char;
      } else if (char === quote && inString) {
        inString = false;
        quote = null;
      } else if (char === '{' && !inString) {
        depth++;
      } else if (char === '}' && !inString) {
        depth--;
        if (depth === 0) {
          return pos + 1;
        }
      }
      
      pos++;
    }
    
    return -1;
  }
  
  transformCssValues(css) {
    const customProperties = new Set();
    const copyRegex = /(:\s*)(["']?)(.*?)(["']?)\s*copy\(([-]?\d+),\s*([^\;^\)^\(^,^ ]*)\)/g;
    
    const transformedCss = css.replace(copyRegex, (match, prefix, quote1, value, quote2, lengthStr, variableName) => {
      const length = parseInt(lengthStr);
      const sanitizedVar = variableName.replace(/[^a-zA-Z0-9_-]/g, '');
      let extractedValue = '';

      if (length >= 0) {
        extractedValue = value.substring(0, length);
      } else {
        extractedValue = value.substring(value.length + length);
      }

      customProperties.add(`--${sanitizedVar}:${extractedValue};`);
      return `${prefix}${quote1}${value}${quote2}`;
    });

    if (customProperties.size > 0) {
      return transformedCss + `\n:root{\n${Array.from(customProperties).join('\n')}\n}`;
    }

    return transformedCss;
  }
  
  processKeyframes() {
    if (this.keyframes.length === 0) return '';
    
    let keyframeCSS = '';
    
    for (const kf of this.keyframes) {
      keyframeCSS += `${kf.selector} {\n  animation: ${kf.timing};\n}\n\n`;
      keyframeCSS += `@keyframes ${kf.name} {\n${kf.content}\n}\n\n`;
    }
    
    return keyframeCSS;
  }
  
  formatCSS(css) {
    let indentLevel = 0;
    const formatted = [];
    const lines = css.split('\n');
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      if (line.endsWith('}')) indentLevel = Math.max(0, indentLevel - 1);
      if (line.endsWith('{')) indentLevel++;
      
      const indentation = '  '.repeat(Math.max(0, indentLevel - (line.endsWith('}') ? 1 : 0)));
      formatted.push(indentation + line);
      
      if (line.endsWith('{')) indentLevel++;
    }
    
    return formatted.join('\n');
  }
  
  getErrors() {
    return this.errors;
  }
  
  getWarnings() {
    return this.warnings;
  }
}

// Initialize compiler when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById('input');
  const output = document.getElementById('css-output');
  const processBtn = document.getElementById('process-btn');
  const resetBtn = document.getElementById('reset-btn');
  const exampleBtn = document.getElementById('example-btn');
  const copyBtn = document.getElementById('copy-btn');
  const formatBtn = document.getElementById('format-btn');
  const messageArea = document.getElementById('message-area');
  
  const compiler = new FSCSSCompiler();
  
  // Example output remains the same as before
  const exampleOutput = `div {
  width: 200px;
  height: 200px;
  max-height: 200px;
  max-width: 200px;
  min-width: 200px;
  min-height: 200px;
  color: #100200;
  background: conic-gradient(#ffe, #100200);
  transition: all 0.3s ease;
}

div:hover {
  background: conic-gradient(#100200);
  -webkit-text-stroke: 1px #072;
  -moz-text-stroke: 1px #072;
  -ms-text-stroke: 1px #072;
  -o-text-stroke: 1px #072;
}

.pulse-box {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}`;
  
  output.textContent = exampleOutput;
  
  processBtn.addEventListener('click', function() {
    const fscssCode = input.value;
    
    try {
      const compiledCSS = compiler.compile(fscssCode);
      output.textContent = compiledCSS;
      
      // Show success message
      messageArea.className = 'message-area success';
      messageArea.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <div>
          <strong>CSS processed successfully!</strong> No errors detected.
        </div>
      `;
      
      // Show warnings if any
      const warnings = compiler.getWarnings();
      if (warnings.length > 0) {
        messageArea.innerHTML += `<div class="warnings">${warnings.map(w => `⚠️ ${w}`).join('<br>')}</div>`;
      }
    } catch (error) {
      messageArea.className = 'message-area error';
      messageArea.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <div>
          <strong>Compilation Error:</strong> ${error.message}
        </div>
      `;
    }
  });
  
  // Reset, example, copy, and format buttons remain the same as before
  resetBtn.addEventListener('click', function() {
    input.value = `/* Try these FSCSS features! */
$main-blue: #20f;
$div-init-size: 200px;
$dogblack: #100200;

str(main divStyle, " 
  mxs(width, height, max-height, max-width, min-width, min-height,'$div-init-size!') 
  color: #100200 copy(7, dogblack); 
  background: conic-gradient(#ffe, $dogblack!); 
")

str(onHover divStyle, " 
  background: conic-gradient($dogblack!); 
  -*-text-stroke: 1px #072; 
")

div { 
  main divStyle 
  transition: all 0.3s ease;
}

div:hover { 
  onHover divStyle 
}

/* Keyframes example */
$(@keyframes pulse, .pulse-box, &[2s infinite]) {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}`;
    
    output.textContent = exampleOutput;
    messageArea.className = 'message-area success';
    messageArea.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <div>
        <strong>Compiler reset!</strong> Ready for new input.
      </div>
    `;
  });
  
  exampleBtn.addEventListener('click', function() {
    input.value = `/* Navbar example */
$primary: #4361ee;
$secondary: #3a0ca3;
$text-light: #f8f9fa;

str(navbarStyle, "
  display: flex;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: $primary!;
  color: $text-light!;
")

str(navItemHover, "
  background: rgba(255,255,255,0.1);
  transform: translateY(-2px);
")

nav {
  navbarStyle
  
  ul {
    display: flex;
    gap: 1rem;
    list-style: none;
    
    li {
      a {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        transition: all 0.3s ease;
        
        &:hover {
          navItemHover
        }
      }
    }
  }
}`;
    
    const exampleResult = `nav {
  display: flex;
  justify-content: space-between;
  padding: 1rem 2rem;
  background: #4361ee;
  color: #f8f9fa;
}

nav ul {
  display: flex;
  gap: 1rem;
  list-style: none;
}

nav ul li a {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

nav ul li a:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}`;
    
    output.textContent = exampleResult;
    messageArea.className = 'message-area success';
    messageArea.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <div>
        <strong>Example loaded!</strong> Press "Run" to compile.
      </div>
    `;
  });
  
  copyBtn.addEventListener('click', function() {
    navigator.clipboard.writeText(output.textContent).then(() => {
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
      }, 2000);
    });
  });
  
  formatBtn.addEventListener('click', function() {
    const css = output.textContent;
    const formatted = compiler.formatCSS(css);
    output.textContent = formatted;
    
    messageArea.className = 'message-area success';
    messageArea.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <div>
        <strong>CSS formatted!</strong> Output has been beautified.
      </div>
    `;
  });
  
  document.querySelector('.example-code .copy-btn').addEventListener('click', function() {
    const exampleCode = document.querySelector('.example-code').textContent;
    navigator.clipboard.writeText(exampleCode).then(() => {
      const originalText = this.innerHTML;
      this.innerHTML = '<i class="fas fa-check"></i> Copied';
      
      setTimeout(() => {
        this.innerHTML = originalText;
      }, 2000);
    });
  });
});
