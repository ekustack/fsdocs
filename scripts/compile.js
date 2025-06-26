
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
