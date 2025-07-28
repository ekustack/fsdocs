    // DOM Elements
    const fscssBox = document.getElementById('fscssBox');
    const cssBox = document.getElementById('cssBox');
    const runBtn = document.getElementById('run');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download');
    const downloadFscssBtn = document.getElementById('download-fscss');
    const clearLogBtn = document.getElementById('clear-log-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const uploadInput = document.getElementById('upload');
    const fileNameInput = document.getElementById('fileName');
    const logContainer = document.getElementById('log-container');
    const errorCount = document.getElementById('error-count');
    const themeToggle = document.getElementById('theme-toggle');
    const formatBtn = document.getElementById('format-btn');
    const saveBtn = document.getElementById('save-btn');
    const autocompleteContainer = document.getElementById('autocomplete');
    const fontSizeSelect = document.getElementById('font-size');
    const tabSizeSelect = document.getElementById('tab-size');
    const autoCompleteSelect = document.getElementById('auto-complete');
    const errorReportingSelect = document.getElementById('error-reporting');
    
    // FSCSS Keywords for autocomplete
    const fscssKeywords = [
      'str(', 're(', 'store(', 'rpt(', 'copy(', 'mx(', 'mxs(', 
      '%1', '%2', '%3', '%4', '%5', '%6', '%i',
      '$(@keyframes', '$(',
      '-*-', '$var:', '$var!',
      '@event', '@random', 'num(', 'if', 'el-if', 'el', 'return'
    ];
    
    // Theme management
    let isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    function applyTheme() {
      if (isDarkMode) {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>';
      } else {
        document.body.classList.remove('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i><span>Dark Mode</span>';
      }
    }
    
    themeToggle.addEventListener('click', () => {
      isDarkMode = !isDarkMode;
      localStorage.setItem('darkMode', isDarkMode);
      applyTheme();
    });
    
    // Apply saved theme
    applyTheme();
    
    // Settings
    fontSizeSelect.value = localStorage.getItem('fontSize') || '14';
    tabSizeSelect.value = localStorage.getItem('tabSize') || '2';
    autoCompleteSelect.value = localStorage.getItem('autoComplete') || 'on';
    errorReportingSelect.value = localStorage.getItem('errorReporting') || 'verbose';
    
    fontSizeSelect.addEventListener('change', () => {
      fscssBox.style.fontSize = `${fontSizeSelect.value}px`;
      cssBox.style.fontSize = `${fontSizeSelect.value}px`;
      localStorage.setItem('fontSize', fontSizeSelect.value);
    });
    
    tabSizeSelect.addEventListener('change', () => {
      fscssBox.style.tabSize = tabSizeSelect.value;
      localStorage.setItem('tabSize', tabSizeSelect.value);
    });
    
    autoCompleteSelect.addEventListener('change', () => {
      localStorage.setItem('autoComplete', autoCompleteSelect.value);
    });
    
    errorReportingSelect.addEventListener('change', () => {
      localStorage.setItem('errorReporting', errorReportingSelect.value);
    });
    
    // Apply initial settings
    fscssBox.style.fontSize = `${fontSizeSelect.value}px`;
    cssBox.style.fontSize = `${fontSizeSelect.value}px`;
    fscssBox.style.tabSize = tabSizeSelect.value;
    
    // Log management
    function addLogEntry(message, type = 'error') {
      const logEntry = document.createElement('div');
      logEntry.className = `log-entry ${type}`;
      logEntry.textContent = message;
      logContainer.appendChild(logEntry);
      
      // Scroll to bottom
      logContainer.scrollTop = logContainer.scrollHeight;
      
      // Update error count
      if (type === 'error') {
        const count = parseInt(errorCount.textContent);
        errorCount.textContent = count + 1;
      }
    }
    
    function clearLog() {
      logContainer.innerHTML = '';
      errorCount.textContent = '0';
      addLogEntry('Log cleared.', 'success');
    }
    
    // Autocomplete functionality
    let currentAutocompleteItems = [];
    let selectedAutocompleteIndex = -1;
    
    function showAutocomplete(str, cursorPos) {
      if (autoCompleteSelect.value === 'off') return;
      
      const filtered = fscssKeywords.filter(keyword => 
        keyword.toLowerCase().includes(str.toLowerCase())
      );
      
      if (filtered.length === 0) {
        autocompleteContainer.style.display = 'none';
        return;
      }
      
      currentAutocompleteItems = filtered;
      selectedAutocompleteIndex = 0;
      
      // Position autocomplete under cursor
      const textareaRect = fscssBox.getBoundingClientRect();
      const lineHeight = parseInt(getComputedStyle(fscssBox).lineHeight);
      const lines = fscssBox.value.substr(0, cursorPos).split('\n');
      const currentLine = lines[lines.length - 1];
      const currentLineIndex = lines.length - 1;
      
      autocompleteContainer.innerHTML = '';
      filtered.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        if (index === 0) div.classList.add('active');
        div.textContent = item;
        div.addEventListener('click', () => {
          selectAutocompleteItem(index);
        });
        autocompleteContainer.appendChild(div);
      });
      
      autocompleteContainer.style.display = 'block';
      autocompleteContainer.style.top = `${textareaRect.top + (currentLineIndex + 1) * lineHeight + 5}px`;
      autocompleteContainer.style.left = `${textareaRect.left + currentLine.length * 8}px`;
    }
    
    function selectAutocompleteItem(index) {
      if (index < 0 || index >= currentAutocompleteItems.length) return;
      
      // Get current cursor position
      const start = fscssBox.selectionStart;
      const end = fscssBox.selectionEnd;
      const value = fscssBox.value;
      
      // Find the start of the current word
      let wordStart = start;
      while (wordStart > 0 && !/\s/.test(value[wordStart - 1])) {
        wordStart--;
      }
      
      // Replace the current word with the autocomplete item
      fscssBox.value = value.substring(0, wordStart) + 
                      currentAutocompleteItems[index] + 
                      value.substring(end);
      
      // Set cursor position after the inserted text
      fscssBox.selectionStart = fscssBox.selectionEnd = wordStart + currentAutocompleteItems[index].length;
      
      // Hide autocomplete
      autocompleteContainer.style.display = 'none';
      fscssBox.focus();
    }
    
    fscssBox.addEventListener('input', (e) => {
      autocompleteContainer.style.display = 'none';
    });
    
    fscssBox.addEventListener('keydown', (e) => {
      if (autocompleteContainer.style.display === 'block') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedAutocompleteIndex = Math.min(selectedAutocompleteIndex + 1, currentAutocompleteItems.length - 1);
          updateAutocompleteSelection();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedAutocompleteIndex = Math.max(selectedAutocompleteIndex - 1, 0);
          updateAutocompleteSelection();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          selectAutocompleteItem(selectedAutocompleteIndex);
        } else if (e.key === 'Escape') {
          autocompleteContainer.style.display = 'none';
        }
      } else if (e.key === '.' || e.key === '$' || e.key === '@' || e.key === '%') {
        const cursorPos = fscssBox.selectionStart;
        const value = fscssBox.value;
        
        // Get current word
        let wordStart = cursorPos - 1;
        while (wordStart > 0 && !/\s/.test(value[wordStart - 1])) {
          wordStart--;
        }
        
        const currentWord = value.substring(wordStart, cursorPos);
        showAutocomplete(currentWord, cursorPos);
      }
    });
    
    function updateAutocompleteSelection() {
      const items = autocompleteContainer.querySelectorAll('.autocomplete-item');
      items.forEach((item, index) => {
        if (index === selectedAutocompleteIndex) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }
    
    // Format code
    formatBtn.addEventListener('click', () => {
      const formatted = fscssBox.value
        .replace(/\{/g, ' {\n')
        .replace(/\}/g, '\n}\n')
        .replace(/;/g, ';\n')
        .replace(/\n\s*\n/g, '\n');
      
      fscssBox.value = formatted;
      addLogEntry('Code formatted successfully.', 'success');
    });
    
    // Save session
    saveBtn.addEventListener('click', () => {
      localStorage.setItem('fscssCode', fscssBox.value);
      addLogEntry('Session saved successfully.', 'success');
    });
    
    // Load saved session
    window.addEventListener('DOMContentLoaded', () => {
      const savedCode = localStorage.getItem('fscssCode');
      if (savedCode) {
        fscssBox.value = savedCode;
        addLogEntry('Previous session restored.', 'success');
      }
    });
    
    // Compile function (simplified for demo)
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
        { regex: /:\s*([^;]+);/g, klass: 'value', replace: ':$1;' },
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
function procExt(css) {
  let extractedVariables = {};
  let tempCSS = css;

  // Step 1: Process string literals
  tempCSS = tempCSS.replace(/("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')/g, function(fullMatch) {
    let quote = fullMatch[0];
    let content = fullMatch.slice(1, -1);
    const directiveRegex = /@ext\((-?\d+),(\d+):\s*([^)]+)\)/g;
    let match;
    let directivesToProcess = [];

    while ((match = directiveRegex.exec(content)) !== null) {
      directivesToProcess.push({
        fullMatch: match[0],
        start: parseInt(match[1]),
        length: parseInt(match[2]),
        varName: match[3].trim(),
        index: match.index
      });
    }

    for (let i = directivesToProcess.length - 1; i >= 0; i--) {
      let d = directivesToProcess[i];
      let s = d.start < 0 ? content.length + d.start : d.start;
      s = Math.max(0, s);
      let extracted = content.substring(s, s + d.length);

      if (s + d.length > content.length || s < 0) {
        addLogEntry(`fscss:[@ext]Warning: @ext directive for variable '${d.varName}' in string literal specifies an out-of-bounds range. Extraction may be incomplete or incorrect.`);
      }

      if (extractedVariables[d.varName] !== undefined) {
        addLogEntry(`fscss:[@ext]Warning: Duplicate variable name '${d.varName}' found in string literal. The last extracted value will be used.`);
      }
      extractedVariables[d.varName] = extracted;

      // Remove @ext from content
      content = content.slice(0, d.index) + content.slice(d.index + d.fullMatch.length);
    }

    return quote + content + quote;
  });

  // Step 2: Outside strings
  tempCSS = tempCSS.replace(/([#.\w-]+)\s*@ext\((-?\d+),(\d+):\s*([^)]+)\)/g, function(match, token, start, len, varName) {
    start = parseInt(start);
    len = parseInt(len);
    varName = varName.trim();
    let s = start < 0 ? token.length + start : start;
    s = Math.max(0, s);
    let extracted = token.substring(s, s + len);

    if (s + len > token.length || s < 0) {
      addLogEntry(`fscss[@ext]Warning: @ext directive for variable '${varName}' on token '${token}' specifies an out-of-bounds range. Extraction may be incomplete or incorrect.`);
    }

    if (extractedVariables[varName] !== undefined) {
      addLogEntry(`fscss[@ext]Warning: Duplicate variable name '${varName}' found outside string literals. The last extracted value will be used.`);
    }
    extractedVariables[varName] = extracted;
    return token;
  });

  // Step 3: Replace @ext.varName references
  tempCSS = tempCSS.replace(/@ext\.(\w+)\!?/g, function(match, varName) {
    if (extractedVariables[varName] === undefined) {
      addLogEntry(`fscss[@ext]Warning: Reference to undefined variable '@ext.${varName}'. It will not be replaced.`);
      return match;
    }
    return extractedVariables[varName];
  });

  return tempCSS;
}

function procVar(vcss){
function processSCSS(scssCode) {
  const globalVars = {};
  let currentScopeVars = globalVars; // Initially global scope
  const processedLines = [];
  const lines = scssCode.split('\n');

  // To manage nested scopes (simplified: just track if we're inside a block)
  let inBlock = false;
  const blockVars = {}; // Variables declared within the current block

  // Step 1: Process lines to extract variables and build up processed CSS
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Check for block entry
    if (line.includes('{')) {
      inBlock = true;
      // When entering a block, any variables declared within it will go into blockVars
      // The blockVars will be cleared when the block is exited
      processedLines.push(line); // Add the curly brace to processed lines
      continue; // Move to next line
    }

    // Check for block exit
    if (line.includes('}')) {
      inBlock = false;
      // Clear block-level variables when exiting a block
      for (const varName in blockVars) {
        delete blockVars[varName]; // Remove block-scoped variables
      }
      processedLines.push(line); // Add the curly brace to processed lines
      continue; // Move to next line
    }

    // Regex to match variable declarations (e.g., $primary-color: midnightblue;)
    const varDeclarationRegex = /^\s*\$([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/;
    const varMatch = line.match(varDeclarationRegex);

    if (varMatch) {
      const [, varName, varValue] = varMatch;
      if (inBlock) {
        blockVars[varName] = varValue.trim();
      } else {
        globalVars[varName] = varValue.trim();
      }
      // This line is a declaration, so don't include it in the final CSS output
      continue; // Move to next line
    }

    // Regex to match variable usage (e.g., $primary-color or $primary-color!)
    const varUsageRegex = /\$\/?([a-zA-Z0-9_-]+)(!)?/g;

    // Replace variable references in the current line
    line = line.replace(varUsageRegex, (match, varName) => {
      // Prioritize block-scoped variables, then global variables
      if (blockVars[varName] !== undefined) {
        return blockVars[varName];
      } else if (globalVars[varName] !== undefined) {
        return globalVars[varName];
      }
      return match; // If variable not found, return original match (e.g., for non-existent variables)
    });

    processedLines.push(line);
  }

  // Step 2: Function to access variable values (for external access)
  function getVariable(varName) {
    // This function will only return global variables for external access,
    // as local variables are transient during processing.
    // If you need to expose local variables, you'd need a more complex
    // data structure to store them along with their scope.
    return globalVars[varName] || null;
  }

  // Join the processed lines back into a single CSS string
  const finalCss = processedLines.join('\n');

  return {
    css: finalCss,
    getVariable
  };
}


const result = processSCSS(vcss);
// Output the processed CSS
 return result.css
} 
function procEv(css) {
  function extractBlock(str, start) {
    if (str[start] !== '{') return null;
    let count = 1;
    let current = start + 1;
    while (current < str.length && count > 0) {
      if (str[current] === '{') count++;
      else if (str[current] === '}') count--;
      current++;
    }
    if (count !== 0) {
      addLogEntry(`fscss[@event] Warning: Unbalanced curly braces starting at index ${start}.`);
      return null;
    }
    return {
      content: str.substring(start + 1, current - 1),
      endIndex: current
    };
  }

  function parseConditionBlocks(block) {
    const regex = /(if|el-if|el)\s*(.*?){/g;
    const blocks = [];
    let match;

    while ((match = regex.exec(block)) !== null) {
      const type = match[1];
      const condition = match[2].trim();
      const blockStart = match.index + match[0].length - 1;

      const innerBlock = extractBlock(block, blockStart);
      if (!innerBlock) {
        addLogEntry(`fscss[@event] Warning: Could not extract inner block for condition '${condition}' starting at index ${blockStart}.`);
        continue;
      }

      blocks.push({
        type,
        condition,
        block: innerBlock.content
      });

      regex.lastIndex = blockStart + innerBlock.content.length + 2;
    }

    return blocks;
  }

  const functionMap = {};
  const funcDefRegex = /@event\s+([\w-]+)\(([^)]+)\)\s*:?{/g;
  let funcMatch;
  let modifiedCSS = css;
  let offset = 0; // To adjust for string manipulations

  // First pass: extract function definitions and remove them from the CSS
  while ((funcMatch = funcDefRegex.exec(css)) !== null) {
    const [fullMatch, funcName, args] = funcMatch;
    const arg = args.trim();
    const startIdx = funcMatch.index + fullMatch.length - 1;

    const blockData = extractBlock(css, startIdx);
    if (!blockData) {
      console.warn(`fscss[@event] Warning: Could not extract block for event definition '${funcName}' starting at index ${startIdx}.`);
      continue;
    }

    const conditionBlocks = parseConditionBlocks(blockData.content);
    functionMap[funcName] = { arg, conditionBlocks };

    // Remove the processed @event definition from the CSS
    const replacementStart = funcMatch.index + offset;
    const replacementEnd = blockData.endIndex + offset;
    modifiedCSS = modifiedCSS.substring(0, replacementStart) +
                   modifiedCSS.substring(replacementEnd);

    // Adjust the offset for subsequent regex matches in the original string
    offset -= (blockData.endIndex - funcMatch.index);
  }

  // Second pass: replace @event calls with their evaluated values
  modifiedCSS = modifiedCSS.replace(/@event\.([\w-]+)\(([^)]*)\)/g, (match, funcName, argValue) => {
    argValue = argValue.trim();
    const func = functionMap[funcName];
    if (!func) {
      addLogEntry(`fscss[@event] Warning: Event function '${funcName}' not found.`);
      return match; // Return original match if function not found
    }

    let result = '';
    let matched = false;

    for (const block of func.conditionBlocks) {
      if (matched) break; // If a condition has already matched, stop

      const parts = block.condition.split(':').map(s => s.trim());
      const condVar = parts[0];
      const condVal = parts.length > 1 ? parts[1] : '';

      if (block.type === 'if' || block.type === 'el-if') {
        if (condVar === func.arg && condVal === argValue) {
          matched = true;
        }
      } else if (block.type === 'el') {
        matched = true;
      }

      if (matched) {
        // Look for `e: value;` or any variable name followed by colon and value
        const assignMatch = block.block.match(/(?:[a-zA-Z_]\w*)\s*:\s*([^;]+);/);
        if (assignMatch) {
          result = assignMatch[1].trim();
        } else {
          addLogEntry(`fscss[@event] Warning: No assignment found in block for condition '${block.condition}' in function '${funcName}'.`);
        }
        break; // A condition matched, so we stop
      }
    }

    if (!matched) {
      addLogEntry(`fscss[@event] Warning: No condition matched for event call '${funcName}(${argValue})'.`);
    }

    return result || match; // Return the result or the original match if no result was found
  });

  return modifiedCSS;
}
function initlibraries(css){
  css = css.replace(/exec\(\s*_init\sisjs\s*\)/g, "exec(https://cdn.jsdelivr.net/gh/fscss-ttr/FSCSS@main/xf/styles/isjs.fscss)");
  css = css.replace(/exec\(\s*_init\sthemes\s*\)/g, "exec(https://cdn.jsdelivr.net/gh/fscss-ttr/FSCSS@main/xf/styles/trshapes.fthemes.fscss)")
  css = css.replace(/exec\(_init\sarray1to500\s*\)/g, "exec(https://cdn.jsdelivr.net/gh/fscss-ttr/FSCSS@main/xf/styles/1to500.fscss)");
   return css;
}
function procNum(css){
const regex = /num\((.*?)\)/g;
function evaluateExpression(expression) {
  try {
    return eval(expression);
  } catch (e) {
    addLogEntry('Invalid expression:', expression);
    return expression;
  }
}

const processedCSS = css.replace(regex, (match, expression) => {
  
  return evaluateExpression(expression);
});

return (processedCSS);
  }
const orderedxFscssRandom = {};

function procRan(input) {
  return input.replace(/@random\(\[([^\]]+)\](?:, *ordered)?\)/g, (match, valuesStr) => {
    const isOrdered = /, *ordered\)/.test(match);
    const values = valuesStr.split(',').map(v => v.trim());
    
    if (values.length === 0) {
      addLogEntry("fscss[@random] Warning: Empty array provided for @random. Returning empty string.");
      return '';
    }
    
    if (isOrdered) {
      // Create consistent key for value sequences
      const sequenceKey = values.join(':');
      
      if (!orderedxFscssRandom[sequenceKey]) {
        orderedxFscssRandom[sequenceKey] = {
          values,
          index: 0,
        };
        addLogEntry(`fscss[@random] Warning: New ordered sequence created for [${valuesStr}].`);
      }
      
      const store = orderedxFscssRandom[sequenceKey];
      const val = store.values[store.index % store.values.length];
      
      if (store.index >= store.values.length && store.index % store.values.length === 0) {
        addLogEntry(`fscss[@random] Warning: Ordered sequence [${valuesStr}] is looping back to the beginning.`);
      }
      
      store.index++;
      return val;
    } else {
      // Regular random selection
      const randIndex = Math.floor(Math.random() * values.length);
      return values[randIndex];
    }
  });
}
function procFun(code) {
  const variables = {};

  function parseStyle(styleStr) {
    const props = {};
    const lines = styleStr.split(';');
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) {
        const emsg=(`fscss[@fun] Invalid style line (missing colon): "${line}"`);
        console.warn(emsg);
addLogEntry(emsg);

        continue;
      }
      const prop = line.substring(0, colonIdx).trim();
      const value = line.substring(colonIdx + 1).trim();
      if (prop) {
        props[prop] = value;
      } else {
        const epmsg=(`fscss[@fun] Empty property name in line: "${line}"`);
          console.warn(epmsg);
addLogEntry(epmsg);
      }
    }
    return props;
  }

  const funRegex = /@fun\(\s?([\w\-\_\—0-9]+)\)\s*\{([\s\S]*?)\}\s*/g;
  let funMatch;
  while ((funMatch = funRegex.exec(code)) !== null) {
    const varName = funMatch[1];
    const rawStyles = funMatch[2].trim();
    if (variables[varName]) {
      const evmsg=(`fscss[@fun] Duplicate @fun variable declaration: "${varName}". The last one will overwrite previous declarations.`);
        console.warn(evmsg);
addLogEntry(evmsg);
    }
    variables[varName] = {
      raw: rawStyles,
      props: parseStyle(rawStyles)
    };
  }

  let processedCode = code;
  processedCode = processedCode.replace(/@fun\.([\w\-\_\—0-9]+)\.([\w\-\_\—0-9]+)\.value\!?/g, (match, varName, prop) => {
    if (variables[varName] && variables[varName].props[prop]) {
      return variables[varName].props[prop];
    } else {
      const evnmsg=(`fscss[@fun] Value extraction failed for "@fun.${varName}.${prop}.value". Variable or property not found.`);
        console.warn(evnmsg);
addLogEntry(evnmsg);
    }
    return match;
  });
  processedCode = processedCode.replace(/@fun\.([\w\-\_\—0-9]+)\.([\w\-\_\—0-9]+)\!?/g, (match, varName, prop) => {
    if (variables[varName] && variables[varName].props[prop]) {
      return `${prop}: ${variables[varName].props[prop]};`;
    } else {
      const epnmsg=(`fscss[@fun] Single property rule failed for "@fun.${varName}.${prop}". Variable or property not found.`);
        console.warn(epnmsg);
addLogEntry(epnmsg);
    }
    return match;
  });
  processedCode = processedCode.replace(/@fun\.([\w\-\_\—0-9]+)(?=[\s;}])\!?/g, (match, varName) => {
    if (variables[varName]) {
      return variables[varName].raw;
    } else {
      const efmsg=(`fscss[@fun] Full variable block replacement failed for "@fun.${varName}". Variable not found.`);
        console.warn(efmsg);
addLogEntry(efmsg);
    }
    return match;
  });
  processedCode = processedCode.replace(/@fun\(([\w\-\_\d\—]+)\s*\{[\s\S]*?\}\s*/g, '');
  processedCode = processedCode.replace(/^\s*[\r\n]/gm, '');
  processedCode = processedCode.trim();
return processedCode;
}
const arraysExfscss = {}; 
function procArr(input) {
    for (const key in arraysExfscss) delete arraysExfscss[key];
    const arrayRegex = /@arr\(?\s*([\w\-\_\—0-9]+)\[([^\]]+)\]\s?\)?/g;
    let match;
    while ((match = arrayRegex.exec(input)) !== null) {
        const arrayName = match[1];
        const arrayValues = match[2].split(',').map(item => item.trim());
        arraysExfscss[arrayName] = arrayValues;
    }
    let output = input.replace(/([^{}]*?)\{([^}]*?@arr\.([\w\-\_\—0-9]+)\[][^}]*?)\}/g,
        (fullMatch, selector, content, arrayName) => {
            if (!arraysExfscss[arrayName]) {
                const eamsg=(`fscss[@arr] Warning: Array '${arrayName}' not found for loop processing.`);
                console.warn(eamsg);
addLogEntry(eamsg);
                return fullMatch;
            }

            return arraysExfscss[arrayName].map((value, index) => {
                const replacedSelector = selector.replace(`@arr.${arrayName}[]`, index + 1);
                const replacedContent = content.replace(
                    new RegExp(`@arr\\.${arrayName}\\[\\]`, 'g'),
                    value
                );
                return `${replacedSelector} {${replacedContent}}`;
            }).join('\n');
        });
    output = output.replace(/@arr\.([\w\-\_\—0-9]+)\[(\d+)\]/g,
        (fullMatch, arrayName, index) => {
            const idx = parseInt(index) - 1;
            if (!arraysExfscss[arrayName]) {
                const evnmsg=(`fscss[@arr] Warning: Array '${arrayName}' not found for specific accessor.`);
                console.warn(evnmsg);
addLogEntry(evnmsg);
            } else if (arraysExfscss[arrayName]?.[idx] === undefined) {
                const eomsg=(`fscss[@arr] Warning: Index ${index} out of bounds for array '${arrayName}'.`);
                console.warn(eomsg);
addLogEntry(eomsg);
            }
            return arraysExfscss[arrayName]?.[idx] || fullMatch;
        });
    return output
        .replace(/@arr\(?\s*([\w\-\_\—0-9]+)\[([^\]]+)\]\s?\)?/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
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
const exfMAX_DEPTH = 10;
async function processImports(cssText, depth = 0, baseURL = window.location.href) { // Mark as async
  if (depth > exfMAX_DEPTH) {
    addLogEntry('Maximum import depth exceeded. Skipping further imports.');
    return cssText;
  }

  const importRegex = /@import\s*\(\s*exec\s*\(\s*((?:'[^']*'|"[^"]*"|[^'")]\S*)\s*)\)\s*\)/g;
  const matches = Array.from(cssText.matchAll(importRegex));

  if (matches.length === 0) return cssText;

  // Await the resolution of all import promises
  const fetchedContents = await Promise.all(
    matches.map(async (match) => {
      const [fullMatch, urlSpec] = match;
      try {
        const cleanUrl = urlSpec.replace(/^['"](.*)['"]$/, '$1').trim();
        const absoluteUrl = new URL(cleanUrl, baseURL).href;

        const response = await fetch(absoluteUrl); // Await fetch
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${absoluteUrl}`);

        const importedText = await response.text(); // Await text()
        return processImports(importedText, depth + 1, absoluteUrl); // Recursive call should also be awaited if it were directly used, but here it's fine as it returns a Promise
      } catch (error) {
        addLogEntry(`Failed to import "${urlSpec}" from "${baseURL}":`, error);
        return `/* Error importing "${urlSpec}": ${error.message} */`;
      }
    })
  );

  // Now, fetchedContents holds the actual processed CSS strings
  let lastIndex = 0;
  let result = '';
  matches.forEach((match, i) => {
    result += cssText.slice(lastIndex, match.index);
    result += fetchedContents[i]; // Use the resolved content
    lastIndex = match.index + match[0].length;
  });
  result += cssText.slice(lastIndex);

  return result;
}

// Fixed version: Proper async handling
async function procImp(css) {
  try {
    const processedCSS = await processImports(css);
    return processedCSS;
  } catch (error) {
    addLogEntry('Processing failed:', error);
    addLogEntry(`fscss[@import] Warning: can't resolve imports`);
    return css; // Return original CSS as fallback
  }
}

    // Processes all <style> elements in document
async function processStyles() {
      clearLog(); // Clear previous logs
      
      const fscssBox = document.getElementById("fscssBox");
      const cssBox = document.getElementById("cssBox");
        let css = fscssBox.value;
    css = css.replace(/</gi, "&lt;").replace(/>/gi, "&gt;");
    css = initlibraries(css);
        css = await procImp(css);
    
    css = replaceRe(css);
    css = procExt(css);
    css = procVar(css);
    css = procFun(css);
    css = procRan(css);
    css = procArr(css);
    css = procEv(css);
    css = transformCssValues(css);
    css = replaceRe(css);
    css = procNum(css);
    css=procExt(css);
    css = applyFscssTransformations(css);

    
        
        
        // Flatten nested CSS with error logging
        
        
        // Apply syntax highlighting
        const highlighted = highlightCSS(css);
        cssBox.innerHTML = highlighted;
    }

    // Event listeners
    runBtn.addEventListener("click", e => {
      (async () => { // Use an IIFE to await the top-level call
  try {
    await processStyles();
addLogEntry('Compilation successful!', 'success');
  } catch (error) {
    addLogEntry('Error processing styles or draw elements:', error);
  }
})();
    });
    
    
    
    // Copy CSS
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(cssBox.textContent)
        .then(() => {
          addLogEntry('CSS copied to clipboard!', 'success');
        })
        .catch(err => {
          addLogEntry('Failed to copy CSS: ' + err, 'error');
        });
    });
    
    // Download CSS
    downloadBtn.addEventListener('click', () => {
      const fileName = fileNameInput.value || 'stylesheet';
      const blob = new Blob([cssBox.textContent], { type: 'text/css' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.css`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addLogEntry(`CSS downloaded as ${fileName}.css`, 'success');
    });
    
    // Download FSCSS
    downloadFscssBtn.addEventListener('click', () => {
      const fileName = fileNameInput.value || 'fscss-code';
      const blob = new Blob([fscssBox.value], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.fscss`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addLogEntry(`FSCSS downloaded as ${fileName}.fscss`, 'success');
    });
    
    // Upload FSCSS
    uploadBtn.addEventListener('click', () => {
      uploadInput.click();
    });
    
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        fscssBox.value = event.target.result;
        addLogEntry(`File "${file.name}" loaded successfully.`, 'success');
      };
      reader.readAsText(file);
    });
    
    // Clear log
    clearLogBtn.addEventListener('click', clearLog);
