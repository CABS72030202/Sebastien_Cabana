document.addEventListener("DOMContentLoaded", () => {
  const langToggle = document.getElementById("lang-toggle");
  const menuToggle = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.main-nav');

  // Load saved language from localStorage, default to 'fr'
  let currentLang = localStorage.getItem("lang") || "fr";

  // Set the toggle button label
  langToggle.textContent = currentLang === "en" ? "FR" : "EN";

  // Apply the language to the page
  updateLanguage();

  // Language toggle functionality
  langToggle.addEventListener("click", () => {
    currentLang = currentLang === "en" ? "fr" : "en";
    localStorage.setItem("lang", currentLang); // Save the new language
    langToggle.textContent = currentLang === "en" ? "FR" : "EN";
    updateLanguage();
  });

  // Mobile menu toggle functionality
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      mainNav.classList.toggle('active');
    });
  }

  function updateLanguage() {
    document.querySelectorAll("[data-en]").forEach(el => {
      const newContent = el.getAttribute(`data-${currentLang}`);

      if (el.tagName === "A" && newContent.startsWith("./")) {
        el.setAttribute("href", newContent);
      } else {
        el.textContent = newContent;
      }
    });
    
    // Update links with data-en-href and data-fr-href
    document.querySelectorAll("[data-en-href]").forEach(el => {
      const newHref = el.getAttribute(`data-${currentLang}-href`);
      if (newHref) {
        el.setAttribute("href", newHref);
      }
    });
    
    // Update form placeholders
    document.querySelectorAll("[data-en-placeholder]").forEach(el => {
      const newPlaceholder = el.getAttribute(`data-${currentLang}-placeholder`);
      if (newPlaceholder) {
        el.setAttribute("placeholder", newPlaceholder);
      }
    });
  }
});
