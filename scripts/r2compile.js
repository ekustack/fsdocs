    // Store for log messages
    const logEntries = [];
    
    // DOM elements
    const logContainer = document.getElementById('log-container');
    const errorCount = document.getElementById('error-count');
    
    // Function to add log entry
    function addLogEntry(message) {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.textContent = message;
      logContainer.prepend(entry);
      
      // Update error count
      logEntries.push(message);
      errorCount.textContent = logEntries.length;
    }
    
    // Clear log function
    function clearLog() {
      logContainer.innerHTML = '<div class="log-entry">Log cleared. No errors to display.</div>';
      logEntries.length = 0;
      errorCount.textContent = '0';
    }
    
    // Syntax highlighting function
    function highlightCSS(css) {
      // Simple highlighting rules
      const rules = [
        // Comments
        { regex: /(\/\*[\s\S]*?\*\/)/g, klass: 'comment' },
        // Selectors
        { regex: /([^{}]+)(?=\{)/g, klass: 'selector' },
        // Properties
        { regex: /([a-zA-Z-]+)(?=\s*:)/g, klass: 'property' },
        // Values
        { regex: /:\s*([^;]+);/g, klass: 'value', replace: ': $1;' },
        // Braces
        { regex: /([{}])/g, klass: 'brace' },
        // At-rules
        { regex: /(@[\w-]+\b)/g, klass: 'at-rule' }
      ];
      
      let highlighted = css;
      
      // Apply each highlighting rule
      rules.forEach(rule => {
        highlighted = highlighted.replace(rule.regex, (match, p1) => {
          const content = rule.replace ? rule.replace.replace('$1', p1) : p1;
          return `<span class="${rule.klass}">${content}</span>`;
        });
      });
      
      return highlighted;
    }
    
    // Enhanced flattenNestedCSS function with error logging
    function flattenNestedCSS(css, options = {}) {
      const {
        preserveComments = false,
        indent = '  ',
        validate = true,
        errorHandler = (msg) => {
          console.warn(msg);
          addLogEntry(msg);
        },
      } = options;

      // Remove comments unless preserved
      if (!preserveComments) {
        css = css.replace(/\/\*[\s\S]*?\*\//g, '').trim();
      }

      function isValidSelector(selector) {
        // Allow modern CSS features (:has(), > selector, etc.)
        const valid = selector && selector.trim() !== '' && 
               !/[^a-zA-Z0-9\-_@*.\#:,\s>&~+()\[\]'"]|\/\//.test(selector);
        
        if (!valid && validate) {
          errorHandler(`Invalid selector: ${selector}`);
        }
        return valid;
      }

      function isValidProperty(prop) {
        const [name, ...rest] = prop.split(':').map(s => s.trim());
        const valid = !validate || /^(--|[\w-]+)$/.test(name);
        
        if (!valid && validate) {
          errorHandler(`Invalid property: ${name}`);
        }
        return valid;
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
              
              if (!isValidSelector(block.selector)) {
                current = '';
                pos++;
                continue;
              }
              
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
          }
        }
        
        return result;
      }

      const result = parseBlock(css, 0);
      return result.output;
    }

    function procP(text) {
      return text.replace(/%(\d+)\(([^[]+)\[\s*([^\]]+)\]\)/g, (match, number, properties, value) => {
        const propList = properties.split(',').map(p => p.trim());
        if (propList.length != number) {
          addLogEntry(`Warning: Number of properties ${propList.length} does not match %${number}`);
          return match;
        }
        return propList.map(prop => `${prop}${value}`).join("");
      });
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
        const rootBlock = `:root{${Array.from(customProperties).join('\n')}\n}`;
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
        addLogEntry('Maximum iterations reached. Possible circular dependency.');
      }

      return current;
    }

    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}|[\]\\]/g, '\\$&');
    }

    // Applies all FSCSS transformations to CSS content
    function applyFscssTransformations(css) {
        // Handle mx/mxs padding shorthands
        css = css.replace(/(?:mxs|\$p)\((([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,)?(([^\,]*)\,\s*)?("([^"]*)"|'([^']*)')\)/gi, '$2:$14$15;$4:$14$15;$6:$14$15;$8:$14$15;$10:$14$15;$12:$14$15;')
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
      .replace(/%i\((([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\]\[]*)\,)?(([^\,\]\[]*)\,)?(([^\,\]\[]*)\,)?(([^\,\]\[]*)\,)?(([^\,\[\]]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$21$4$21$6$21$8$21$10$21$12$21$14$21$16$21$18$21$20$21')
        .replace(/%6\((([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\]\[]*)\,)?(([^\,\]\[]*)\,)?(([^\,\[\]]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$13$4$13$6$13$8$13$10$13$12$13')
        .replace(/%5\((([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\]\[]*)\,)?(([^\,\]\[]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$11$4$11$6$11$8$11$10$11')
        .replace(/%4\((([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$9$4$9$6$9$8$9')
        .replace(/%3\((([^\,\[\]]*)\,)?(([^\,\[\]]*)\,)?(([^\,\[\]]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$7$4$7$6$7')
        .replace(/%2\((([^\,\[\]]*)\,)?(([^\,\]\[]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$5$4$5')
        .replace(/%1\((([^\,\]\[]*))?\s*\[([^\]\[]*)\]\)/gi, '$2$3');
      css = procP(css);
        css=css.replace(/@import\(\s*\exec\((.*)(.{5})\)\s*\)/gi, '@import url("$1css")')
        
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
      return css;
    }

    // Processes all <style> elements in document
    function processStyles() {
      clearLog(); // Clear previous logs
      
      const fscssBox = document.getElementById("fscssBox");
      const cssBox = document.getElementById("cssBox");
        let css = fscssBox.value;
        css = transformCssValues(css);      // Process copy() functions
        css = applyFscssTransformations(css); // Apply all other transformations
        css = replaceRe(css);
        
        // Flatten nested CSS with error logging
        
        
        // Apply syntax highlighting
        const highlighted = highlightCSS(css);
        cssBox.innerHTML = highlighted;
    }

    // Event listeners
    document.getElementById("run").addEventListener("click", e => {
      try {
        processStyles();
      } catch (error) {
        addLogEntry(`Error processing styles: ${error.message}`);
      }
    });

    document.getElementById("upload").addEventListener("change", function(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const fvalue = e.target.result;
          document.getElementById("fscssBox").value = fvalue;
          addLogEntry(`File loaded: ${file.name}`);
        };
        reader.readAsText(file);
      }
    });

    document.getElementById('download').addEventListener('click', function () {
        const textContent = document.getElementById("cssBox").textContent;
        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const fileName = document.getElementById("fileName").value || "download";
        a.download = `${fileName}.css`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addLogEntry(`Downloaded: ${fileName}.css`);
    });
    
    document.getElementById('clear-log-btn').addEventListener('click', clearLog);
    
    document.getElementById('copy-btn').addEventListener('click', function() {
      const cssBox = document.getElementById("cssBox");
      const text = cssBox.textContent;
      navigator.clipboard.writeText(text)
        .then(() => {
          addLogEntry('CSS copied to clipboard!');
        })
        .catch(err => {
          addLogEntry('Failed to copy CSS: ' + err);
        });
    });
    
    document.getElementById('upload-btn').addEventListener('click', function() {
      document.getElementById('upload').click();
    });
    
    // Initialize with sample CSS
    window.onload = function() {
      // Auto-run with the sample CSS
      setTimeout(() => {
        document.getElementById("run").click();
      }, 500);
    };
