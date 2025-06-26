
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
      
      extractVariables(fscss) {
        const varRegex = /\$([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
        let match;
        
        while ((match = varRegex.exec(fscss)) !== null) {
          const varName = match[1];
          const varValue = match[2].trim();
          this.variables[varName] = varValue;
        }
      }
      
      extractStores(fscss) {
        const storeRegex = /(?:str|store|re)\s*\(\s*([a-zA-Z0-9_-]+)\s*,\s*"([\s\S]*?)"\s*\)/g;
        let match;
        
        while ((match = storeRegex.exec(fscss)) !== null) {
          const storeName = match[1];
          const storeValue = match[2];
          this.stores[storeName] = storeValue;
        }
      }
      
      extractKeyframes(fscss) {
        const keyframeRegex = /\$\(@keyframes\s+([a-zA-Z0-9_-]+)\s*,\s*([^,]+)\s*(?:,\s*&\[([^\]]+)\])?\)\s*\{([\s\S]*?)\}/g;
        let match;
        
        while ((match = keyframeRegex.exec(fscss)) !== null) {
          this.keyframes.push({
            name: match[1],
            selector: match[2].trim(),
            timing: match[3] ? match[3].trim() : '',
            content: match[4].trim()
          });
        }
      }
      
      processFSCSS(fscss) {
        // Remove variable definitions
        let css = fscss.replace(/\$([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g, '');
        
        // Remove store definitions
        css = css.replace(/(?:str|store|re)\s*\(\s*([a-zA-Z0-9_-]+)\s*,\s*"([\s\S]*?)"\s*\)/g, '');
        
        // Remove keyframe definitions
        css = css.replace(/\$\(@keyframes\s+([a-zA-Z0-9_-]+)\s*,\s*([^,]+)\s*(?:,\s*&\[([^\]]+)\])?\)\s*\{([\s\S]*?)\}/g, '');
        
        // Replace store references
        for (const storeName in this.stores) {
          const regex = new RegExp(`\\b${storeName}\\b`, 'g');
          css = css.replace(regex, this.stores[storeName]);
        }
        
        // Replace variable references
        for (const varName in this.variables) {
          const regex = new RegExp(`\\$${varName}!`, 'g');
          css = css.replace(regex, this.variables[varName]);
        }
        
        // Process copy function
        css = css.replace(/copy\s*\(\s*(\d+)\s*,\s*([a-zA-Z0-9_-]+)\s*\)/g, (match, index, varName) => {
          if (this.variables[varName]) {
            const values = this.variables[varName].split(',');
            const idx = parseInt(index) - 1;
            return idx >= 0 && idx < values.length ? values[idx].trim() : '';
          }
          return '';
        });
        
        // Process mxs mixin
        css = css.replace(/mxs\s*\(\s*([^)]+),\s*"([^"]+)"\s*\)/g, (match, properties, value) => {
          const propList = properties.split(',').map(p => p.trim());
          return propList.map(prop => `${prop}: ${value};`).join('\n');
        });
        
        // Process vendor prefixes
        css = css.replace(/-(\*)-([a-zA-Z-]+)\s*:\s*([^;]+);/g, (match, prefix, property, value) => {
          return `
            -webkit-${property}: ${value};
            -moz-${property}: ${value};
            -ms-${property}: ${value};
            -o-${property}: ${value};
            ${property}: ${value};
          `.trim();
        });
        
        // Remove empty lines and trim
        css = css.split('\n')
          .filter(line => line.trim() !== '')
          .map(line => line.trim())
          .join('\n');
        
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
