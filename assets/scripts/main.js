// script.js
document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function() {
      navMenu.classList.toggle('active');
      navToggle.classList.toggle('active');
    });
  }
  
  // Copy code blocks
  const copyButtons = document.querySelectorAll('.copy-btn');
  
  copyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const pre = this.closest('.code-block').querySelector('pre');
      const text = pre.textContent;
      
      navigator.clipboard.writeText(text).then(() => {
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="fas fa-check"></i>';
        
        setTimeout(() => {
          this.innerHTML = originalText;
        }, 2000);
      });
    });
  });
  
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        // Close mobile menu if open
        if (navMenu && navMenu.classList.contains('active')) {
          navMenu.classList.remove('active');
          navToggle.classList.remove('active');
        }
        
        window.scrollTo({
          top: targetElement.offsetTop - 100,
          behavior: 'smooth'
        });
      }
    });
  });
  
  // Intersection Observer for fade-in animations
  const fadeElements = document.querySelectorAll('.card, .feature-item, .code-block');
  
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
  
  // Search functionality
  const searchInput = document.querySelector('.search-input');
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      
      sidebarLinks.forEach(link => {
        const text = link.textContent.toLowerCase();
        const parentList = link.closest('ul');
        
        if (text.includes(searchTerm)) {
          link.style.display = 'block';
          parentList.style.display = 'block';
        } else {
          link.style.display = 'none';
        }
        
        // Hide empty sections
        const section = parentList.closest('.sidebar-section');
        const visibleLinks = section.querySelectorAll('.sidebar-link[style="display: block"]');
        
        if (visibleLinks.length === 0 && searchTerm !== '') {
          section.style.display = 'none';
        } else {
          section.style.display = 'block';
        }
      });
    });
  }
  
  // Active sidebar link highlighting
  const sections = document.querySelectorAll('.docs-section');
  const sidebarLinksArray = Array.from(document.querySelectorAll('.sidebar-link'));
  
  function setActiveLink() {
    let currentSection = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      if (window.scrollY >= sectionTop - 150) {
        currentSection = section.getAttribute('id');
      }
    });
    
    sidebarLinksArray.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSection}`) {
        link.classList.add('active');
      }
    });
  }
  
  window.addEventListener('scroll', setActiveLink);
  setActiveLink(); // Set initial active link
});

document.querySelector("footer .footer-bottom p:first-child").innerHTML=`&copy; ${new Date().getFullYear()} FSCSS. Made with 💡 for Web developers. MIT License.`;
