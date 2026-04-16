import { initCodeEditor } from './code.js';
import { initChat } from './chat.js';
import { initTasksAndResearch } from './tasks.js';

// Elements
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');

// ── Mobile Sidebar Elements ──
const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function openSidebar() {
  if (!sidebar) return;
  sidebar.classList.add('open');
  if (sidebarOverlay) sidebarOverlay.classList.add('visible');
  document.body.classList.add('sidebar-open');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  if (!sidebar) return;
  sidebar.classList.remove('open');
  if (sidebarOverlay) sidebarOverlay.classList.remove('visible');
  document.body.classList.remove('sidebar-open');
  document.body.style.overflow = '';
}

function isMobile() {
  return window.innerWidth <= 768;
}

// Hamburger toggle
if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });
}

// Overlay click to close
if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSidebar();
  });
}

// Swipe to close sidebar (touch gesture)
let touchStartX = 0;
let touchCurrentX = 0;
let isSwiping = false;

if (sidebar) {
  sidebar.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    isSwiping = true;
  }, { passive: true });

  sidebar.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    touchCurrentX = e.touches[0].clientX;
  }, { passive: true });

  sidebar.addEventListener('touchend', () => {
    if (!isSwiping) return;
    const swipeDistance = touchStartX - touchCurrentX;
    if (swipeDistance > 80) { // Swiped left more than 80px
      closeSidebar();
    }
    isSwiping = false;
  }, { passive: true });
}

// Auto-close sidebar on resize to desktop
window.addEventListener('resize', () => {
  if (!isMobile() && sidebar && sidebar.classList.contains('open')) {
    closeSidebar();
  }
});

// Close sidebar when pressing Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
    closeSidebar();
  }
});

// Router Logic
function navigateTo(pageId) {
  // Update nav links
  navLinks.forEach(link => {
    if (link.dataset.page === pageId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update pages
  pages.forEach(page => {
    if (page.id === pageId) {
      page.classList.add('active');
    } else {
      page.classList.remove('active');
    }
  });
  
  // Page specific initializations
  if (pageId === 'code-page') {
    initCodeEditor();
  }

  // Scroll to top of the newly active page on mobile
  if (isMobile()) {
    const activePage = document.getElementById(pageId);
    if (activePage) {
      activePage.scrollTop = 0;
    }
  }
}

// Event Listeners
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const pageId = e.currentTarget.dataset.page;
    navigateTo(pageId);
    
    // Update URL hash without jumping
    history.pushState(null, null, `#${pageId.replace('-page', '')}`);

    // Close sidebar on mobile after navigation
    if (isMobile()) {
      closeSidebar();
    }
  });
});

// Handle browser back/forward
window.addEventListener('popstate', () => {
  let hash = window.location.hash.substring(1);
  if (!hash) hash = 'chat';
  const targetPage = hash + '-page';
  if (document.getElementById(targetPage)) {
    navigateTo(targetPage);
  }
});

// Handle initial load based on hash
window.addEventListener('DOMContentLoaded', () => {
  let hash = window.location.hash.substring(1);
  if (!hash) hash = 'chat';
  const targetPage = hash + '-page';
  if (document.getElementById(targetPage)) {
    navigateTo(targetPage);
  } else {
    navigateTo('chat-page');
  }

  // Initialize modules
  initChat();
  initTasksAndResearch();

  // Ensure sidebar is closed on mobile initial load
  if (isMobile()) {
    closeSidebar();
  }
});
