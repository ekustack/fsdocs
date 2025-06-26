
    // Enhanced FSCSS Compiler
    class FSCSSCompiler {
      constructor() {
        this.variables = {};
        this.stores = {};
        this.keyframes = [];
        this.errors = [];
        this.warnings = [];
      }
      
      compile(fscss) {
        this.errors = [];
        this.warnings = [];
        this.variables = {};
        this.stores = {};
        this.keyframes = [];
        
        try {
          // Step 1: Extract variables
          this.extractVariables(fscss);
          
          // Step 2: Extract style stores
          this.extractStores(fscss);
          
          // Step 3: Extract keyframes
          this.extractKeyframes(fscss);
          
          // Step 4: Process FSCSS
          let css = this.processFSCSS(fscss);
          
          // Step 5: Add extracted keyframes
          css += this.processKeyframes();
          
          // Step 6: Format CSS
          return this.formatCSS(css);
        } catch (error) {
          this.errors.push(error.message);
          return `/* Compilation Error: ${error.message} */`;
        }
      }
      
      function flattenNestedCSS(css, options = {}) {
  const {
    preserveComments = false,
    indent = '  ',
    validate = true,
    errorHandler = (msg) => console.warn(msg),
  } = options;

  // Remove comments unless preserved
  if (!preserveComments) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '').trim();
  }

  function isValidSelector(selector) {
    // Allow modern CSS features (:has(), > selector, etc.)
    return selector && selector.trim() !== '' && 
           !/[^a-zA-Z0-9\-_@*.\#:,\s>&~+()\[\]'"]|\/\//.test(selector);
  }

  function isValidProperty(prop) {
    const [name, ...rest] = prop.split(':').map(s => s.trim());
    return !validate || /^(--|[\w-]+)$/.test(name);
  }

  function parseBlock(css, start, parentSelector = '') {
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
        current += char;
        pos++;
        if (pos < css.length) {
          current += css[pos];
        }
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
          stack.push({ selector, parent: parentSelector });
        } else {
          current += char;
        }
        depth++;
      } else if (char === '}' && !inString) {
        depth--;
        if (depth === 0) {
          const block = stack.pop();
          if (!block) continue;
          
          let fullSelector = '';
          if (block.selector.includes('&')) {
            fullSelector = block.selector.replace(/&/g, block.parent);
          } else {
            fullSelector = block.parent ? `${block.parent} ${block.selector}` : block.selector;
          }
          
          // Parse nested content
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
        // Handle at-rules at root level
        const atRuleEnd = findAtRuleEnd(css, pos);
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
  }

  function findAtRuleEnd(css, start) {
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

  function parseNestedContent(content, parentSelector) {
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
        current += char;
        pos++;
        if (pos < content.length) {
          current += content[pos];
        }
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
          // Found a complete nested block
          const block = parseBlock(current, 0, parentSelector).output;
          result.nestedBlocks += block;
          current = '';
        }
      } else if (char === ';' && !inString && depth === 0) {
        // Property handling
        const prop = current.trim();
        if (prop) {
          if (isValidProperty(prop)) {
            result.properties.push(prop);
          } else if (validate) {
            errorHandler(`Invalid property: ${prop}`);
          }
        }
        current = '';
      } else if (char === '@' && !inString && depth === 0) {
        // Handle keyframes inside blocks
        const atEnd = findAtRuleEnd(content, pos);
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
    
    // Handle trailing property
    const lastProp = current.trim();
    if (lastProp && depth === 0) {
      if (isValidProperty(lastProp)) {
        result.properties.push(lastProp);
      } else if (validate) {
        errorHandler(`Invalid property: ${lastProp}`);
      }
    }
    
    return result;
  }

  const result = parseBlock(css, 0);
  return result.output;
}

function transformCssValues(css) {
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

  // Append custom properties to :root if any were created
  if (customProperties.size > 0) {
    const rootBlock = `:root{\n${Array.from(customProperties).join('\n')}\n}`;
    return transformedCss + `\n${rootBlock}`;
  }

  return transformedCss;
}

// Repeats a string while handling quotes
function repeatString(str, count) {
  return str.replace(/^['"]|['"]$/g, '').repeat(Math.max(0, parseInt(count)));
}

// Processes recursive CSS patterns (re() function)
function replaceRe(css) {
  // Enhanced regex to capture re() declarations with flexibility
 const reRegex = /(?:store|str|re)\(\s*([^:,]+)\s*[,:]\s*(?:"([^"]*)"|'([^']*)')\s*\)/gi;
  const variableMap = new Map();
  
  // Step 1: Remove re() declarations and store variable-value mappings
  let cleanedCss = css.replace(reRegex, (match, variable, dqValue, sqValue) => {
    const value = dqValue || sqValue;
    variable = variable.trim();
    variableMap.set(variable, value);
    return ''; // Completely remove the re() call
  });

  // If no variables found, return cleaned CSS
  if (variableMap.size === 0) return cleanedCss;

  // Step 2: Replace variables throughout the CSS
  let changed;
  let iterations = 0;
  const maxIterations = 100;
  let current = cleanedCss;
  
  do {
    changed = false;
    for (const [variable, value] of variableMap.entries()) {
      // Use word boundaries to avoid partial replacements
      const varRegex = new RegExp(`\\b${escapeRegExp(variable)}\\b`, 'g');
      const newCss = current.replace(varRegex, value);
      
      if (newCss !== current) {
        changed = true;
        current = newCss;
      }
    }
    iterations++;
  } while (changed && iterations < maxIterations);

  if (iterations >= maxIterations) {
    console.warn('Maximum iterations reached. Possible circular dependency.');
  }

  return current;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}|[\]\\]/g, '\\$&');
}


// Applies all FSCSS transformations to CSS content
function applyFscssTransformations(css) {
    // Handle mx/mxs padding shorthands
    return css.replace(/(?:mxs|\$p)\((([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,\s*)?("([^"]*)"|'([^']*)')\)/gi, '$2:$14$15;$4:$14$15;$6:$14$15;$8:$14$15;$10:$14$15;$12:$14$15;')
    .replace(/(?:mx|\$m)\((([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,\s*)?("([^"]*)"|'([^']*)')\)/gi, '$2$14$15$4$14$15$6$14$15$8$14$15$10$14$15$12$14$15')
    
    // Handle string repetition (rpt)
    .replace(/rpt\((\d+)\,\s*("([^"]*)"|'([^']*)')\)/gi, (match, count, quotedStr) => repeatString(quotedStr, count))
    
    // Process CSS variable declarations and references
    .replace(/\$(([\_\-\d\w]+)\:(\"[^\"]*\"|\'[^\']*\'|[^\;]*)\;)/gi, ':root{--$1}')
    .replace(/\$([^\!\s]+)!/gi, 'var(--$1)')
    .replace(/\$([\w\-\_\d]+)/gi, 'var(--$1)')
    
    // Handle vendor prefix expansion
  .replace(/\-\*\-(([^\:]+)\:(\"[^\"]*\"|\'[^\']*\'|[^\;]*)\;)/gi, '-webkit-$1-moz-$1-ms-$1-o-$1')
  // Process list-based shorthands (%i, %6-%1)
  .replace(/%i\((([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\]\[]*)\,)?(([^\,\]\[]*)\,)?(([^\,\[\]]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$21$4$21$6$21$8$21$10$21$12$21$14$21$16$21$18$21$20$21')
    .replace(/%6\((([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\]\[]*)\,)?(([^\,\]\[]*)\,)?(([^\,\[\]]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$13$4$13$6$13$8$13$10$13$12$13')
    .replace(/%5\((([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\]\[]*)\,)?(([^\,\]\[]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$11$4$11$6$11$8$11$10$11')
    .replace(/%4\((([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$9$4$9$6$9$8$9')
    .replace(/%3\((([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$7$4$7$6$7')
    .replace(/%2\((([^\,\[\]]*)\,)?(([^\,\]\[]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$5$4$5')
    .replace(/%1\((([^\,\]\[]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$3')
    
    // Handle dynamic imports
    .replace(/@import\(\s*\exec\((.*)(.{5})\)\s*\)/gi, '@import url("$1css")')
    
    // Process animation shorthands
   .replace(/\$\(\s*@keyframes\s*(\S+)\)/gi, '$1{animation-name:$1;}@keyframes $1')
    .replace(/\$\(\s*(\@[\w\-\*]*)\s*([^\{\}\,&]*)(\s*,\s*[^\{\}&]*)?&?(\[([^\{\}]*)\])?\s*\)/gi, '$2$3{animation:$2 $5;}$1 $2')
    
    // Process property references
    .replace(/\$\(\s*--([^\{\}]*)\)/gi, '$1')
    .replace(/\$\(([^\:]*):\s*([^\)\:]*)\)/gi, '[$1=\'$2\']')
    
    // Handle grouping syntax (g)
    .replace(/g\(([^"'\s]*)\,\s*(("([^"]*)"|'([^']*)')\,\s*)?("([^"]*)"|'([^']*)')\s*\)/gi, '$1 $4$5$1 $7$8')
    .replace(/\$\(([^\:]*):\s*([^\)\:]*)\)/gi, '[$1=\'$2\']')
    .replace(/\$\(([^\:^\)]*)\)/gi, '[$1]');
}

      
      processFSCSS(fscss) {
        // Remove variable definitions
        let css = fscss.replace(/\$([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g, '');
        
        // Remove store definitions
        css = transformCssValues(css);      // Process copy() functions
    css = applyFscssTransformations(css); // Apply all other transformations
    css = replaceRe(css);
    css = flattenNestedCSS(css, {validate: true})
        return css;
      }
      
      processKeyframes() {
        if (this.keyframes.length === 0) return '';
        
        let keyframeCSS = '';
        
        for (const kf of this.keyframes) {
          // Add animation rule
          keyframeCSS += `${kf.selector} {\n`;
          keyframeCSS += `  animation: ${kf.name}${kf.timing ? ' ' + kf.timing : ''};\n`;
          keyframeCSS += `}\n\n`;
          
          // Add keyframes definition
          keyframeCSS += `@keyframes ${kf.name} {\n`;
          keyframeCSS += kf.content + '\n';
          keyframeCSS += `}\n\n`;
        }
        
        return keyframeCSS;
      }
      
      formatCSS(css) {
        // Simple CSS formatting (indentation)
        let indentLevel = 0;
        const formatted = [];
        const lines = css.split('\n');
        
        for (let line of lines) {
          line = line.trim();
          
          if (line.endsWith('}')) indentLevel--;
          if (line.endsWith('{')) indentLevel++;
          
          const indentation = '  '.repeat(Math.max(0, indentLevel - (line.endsWith('}') ? 1 : 0)));
          formatted.push(indentation + line);
          
          if (line.endsWith('{')) indentLevel++;
          if (line.endsWith('}')) indentLevel = Math.max(0, indentLevel);
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
      
      // Initial example output
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
      
      // Process button handler
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
        } catch (error) {
          // Show error message
          messageArea.className = 'message-area error';
          messageArea.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <div>
              <strong>Compilation Error:</strong> ${error.message}
            </div>
          `;
          console.error('Compilation error:', error);
        }
      });
      
      // Reset button handler
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
      
      // Example button handler
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
      
      // Copy CSS button
      copyBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(output.textContent).then(() => {
          const originalText = copyBtn.innerHTML;
          copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
          
          setTimeout(() => {
            copyBtn.innerHTML = originalText;
          }, 2000);
        });
      });
      
      // Format CSS button
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
      
      // Copy example button
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
