    // Mobile menu toggle
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
      navToggle.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
      });
    }
    
    // Copy button functionality
    document.querySelectorAll('.copy-btn').forEach(button => {
      button.addEventListener('click', function() {
        const pre = this.closest('.code-container')?.querySelector('pre') ||
          this.closest('.editor-panel')?.querySelector('pre');
        const text = pre?.textContent;
        
        if (text) {
          navigator.clipboard.writeText(text).then(() => {
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-check"></i>';
            
            setTimeout(() => {
              this.innerHTML = originalText;
            }, 2000);
          });
        }
      });
    });
    
    // Tab functionality
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', function() {
        const tabId = this.getAttribute('data-tab');
        
        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        document.getElementById(tabId).classList.add('active');
      });
    });
    
    // Variables example interactivity
    const primaryColorInput = document.getElementById('primary-color');
    const borderRadiusInput = document.getElementById('border-radius');
    const boxShadowSelect = document.getElementById('box-shadow');
    const demoCard = document.getElementById('demo-card');
    const demoButton = document.getElementById('demo-button');
    
    function updateVariablesExample() {
      const primaryColor = primaryColorInput.value;
      const borderRadius = `${borderRadiusInput.value}px`;
      const boxShadow = boxShadowSelect.value;
      
      // Update FSCSS code display
      const fscssCode = document.getElementById('variables-fscss');
      fscssCode.innerHTML = fscssCode.textContent
        .replace(/\$primary: #3b82f6;/, `$primary: ${primaryColor};`)
        .replace(/\$radius: 8px;/, `$radius: ${borderRadius};`)
        .replace(/\$shadow: 0 4px 6px rgba\(0,0,0,0.1\);/, `$shadow: ${boxShadow};`);
      
      // Update CSS code display
      const cssCode = document.getElementById('variables-css');
      cssCode.innerHTML = cssCode.textContent
        .replace(/border-radius: 8px;/, `border-radius: ${borderRadius};`)
        .replace(/border-left: 4px solid #3b82f6;/, `border-left: 4px solid ${primaryColor};`)
        .replace(/background: #3b82f6;/, `background: ${primaryColor};`)
        .replace(/background: #2563eb;/, `background: ${darkenColor(primaryColor, 10)};`)
        .replace(/box-shadow: 0 4px 6px rgba\(0,0,0,0.1\);/, `box-shadow: ${boxShadow};`);
      
      // Update live demo
      demoCard.style.borderRadius = borderRadius;
      demoCard.style.boxShadow = boxShadow;
      demoCard.style.borderLeftColor = primaryColor;
      
      demoButton.style.background = primaryColor;
      demoButton.style.borderRadius = borderRadius;
      demoButton.style.boxShadow = boxShadow;
    }
    
    function darkenColor(color, percent) {
      // Simple darken function for demo purposes
      const num = parseInt(color.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) - amt;
      const G = (num >> 8 & 0x00FF) - amt;
      const B = (num & 0x0000FF) - amt;
      return '#' + (
        0x1000000 +
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)
      ).toString(16).slice(1);
    }
    
    primaryColorInput.addEventListener('input', updateVariablesExample);
    borderRadiusInput.addEventListener('input', updateVariablesExample);
    boxShadowSelect.addEventListener('change', updateVariablesExample);
    
    // Initialize variables example
    updateVariablesExample();
    
    // Functions example interactivity
    const gridColumnsInput = document.getElementById('grid-columns');
    const itemCountInput = document.getElementById('item-count');
    const randomizeColorsBtn = document.getElementById('randomize-colors');
    const dynamicGrid = document.getElementById('dynamic-grid');
    
    function updateFunctionsExample() {
      const columns = gridColumnsInput.value;
      const itemCount = itemCountInput.value;
      
      // Update grid layout
      dynamicGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
      
      // Update item count
      let currentItems = dynamicGrid.children.length;
      
      if (currentItems < itemCount) {
        // Add items
        for (let i = currentItems + 1; i <= itemCount; i++) {
          const newItem = document.createElement('div');
          newItem.className = 'grid-item';
          newItem.textContent = `Item ${i}`;
          dynamicGrid.appendChild(newItem);
        }
      } else if (currentItems > itemCount) {
        // Remove items
        for (let i = currentItems; i > itemCount; i--) {
          dynamicGrid.removeChild(dynamicGrid.lastChild);
        }
      }
    }
    
    function randomizeGridColors() {
      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
      const items = dynamicGrid.querySelectorAll('.grid-item');
      
      items.forEach(item => {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        item.style.background = randomColor;
      });
    }
    
    gridColumnsInput.addEventListener('input', updateFunctionsExample);
    itemCountInput.addEventListener('input', updateFunctionsExample);
    randomizeColorsBtn.addEventListener('click', randomizeGridColors);
    
    // Initialize functions example
    updateFunctionsExample();
    randomizeGridColors();
    
    // Interactive playground
    const fscssEditor = document.getElementById('fscss-editor');
    const compiledCss = document.getElementById('compiled-css');
    const playgroundOutput = document.getElementById('playground-output');
    const runFscssBtn = document.getElementById('run-fscss');
    const resetFscssBtn = document.getElementById('reset-fscss');
    
    // Simple FSCSS to CSS conversion for demo purposes
    function convertFscssToCss(fscssCode) {
      // This is a simplified conversion for demo purposes
      // In a real implementation, you would use the actual FSCSS compiler
      
      let css = fscssCode
        // Convert variables
        .replace(/\$([a-zA-Z0-9_-]+):\s*([^;]+);/g, '')
        .replace(/\$([a-zA-Z0-9_-]+)!/g, 'var(--$1)')
        
        // Convert %2, %3, etc.
        .replace(/%2\(([^,]+),\s*([^:]+)\[:([^;]+);\]\)/g, '$1: $3;\n  $2: $3;')
        .replace(/%3\(([^,]+),\s*([^,]+),\s*([^:]+)\[:([^;]+);\]\)/g, '$1: $4;\n  $2: $4;\n  $3: $4;')
        
        // Convert mx() and mxs()
        .replace(/mx\(([^)]+),\s*'?:([^;]+);'?\)/g, (match, props, value) => {
          return props.split(',').map(prop => `${prop.trim()}:${value};`).join('\n  ');
        })
        .replace(/mxs\(([^)]+),\s*'([^']+)'\)/g, (match, props, value) => {
          return props.split(',').map(prop => `${prop.trim()}: ${value};`).join('\n  ');
        })
        
        // Convert str() declarations (remove them from output)
        .replace(/str\([^)]+\);/g, '')
        
        // Convert nested selectors
        .replace(/&:([a-zA-Z-]+)/g, '&:$1')
        
        // Remove FSCSS-specific comments
        .replace(/\/\/[^\n]*/g, '');
      
      return css;
    }
    
    function runFscssCode() {
      const fscssCode = fscssEditor.value;
      const cssCode = convertFscssToCss(fscssCode);
      
      // Update compiled CSS display
      compiledCss.textContent = cssCode;
      
      // Apply styles to output
      playgroundOutput.innerHTML = '<div class="demo-box">Demo Box</div>';
      const styleElement = document.createElement('style');
      styleElement.textContent = cssCode;
      
      // Remove previous style
      const existingStyle = playgroundOutput.querySelector('style');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      playgroundOutput.appendChild(styleElement);
    }
    
    function resetFscssCode() {
      fscssEditor.value = `// FSCSS Playground
// Try writing FSCSS code here

$primary: #3b82f6;
$secondary: #8b5cf6;

.demo-box {
  %2(width, height[: 150px;])
  background: linear-gradient($primary!, $secondary!);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  transition: all 0.3s ease;
  
  &:hover {
    transform: rotate(5deg) scale(1.05);
    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
  }
}`;
      
      runFscssCode();
    }
    
    runFscssBtn.addEventListener('click', runFscssCode);
    resetFscssBtn.addEventListener('click', resetFscssCode);
    
    // Initialize playground
    runFscssCode();
    
    // Intersection Observer for animations
    const fadeElements = document.querySelectorAll('.card, .example-card, .feature-highlight');
    
    const fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    fadeElements.forEach(element => {
      element.classList.add('fade-in');
      fadeObserver.observe(element);
    });
    document.querySelector("footer .footer-bottom p:first-child").innerHTML=`&copy; ${new Date().getFullYear()} FSCSS. Made with 💡 for Web developers. MIT License.`;