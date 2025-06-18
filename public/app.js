class MarkdownApp {
  constructor() {
    this.currentFile = null;
    this.fileTree = null;
    this.searchTimeout = null;
    this.expandedFolders = new Set();
    this.theme = localStorage.getItem('theme') || 'light';
    this.sidebarWidth = parseInt(localStorage.getItem('sidebarWidth')) || 280;
    this.isResizing = false;
    this.watcherActive = false;
    
    this.init();
  }

  async init() {
    this.setupTheme();
    this.setupSidebarWidth();
    this.setupEventListeners();
    await this.loadFileTree();
    this.setupKeyboardShortcuts();
    await this.checkWatcherStatus();
    this.handleInitialRoute();
  }

  setupTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
      themeSelect.value = this.theme;
    }
  }

  setupSidebarWidth() {
    document.documentElement.style.setProperty('--sidebar-width', `${this.sidebarWidth}px`);
  }

  setupSidebarResize() {
    const resizeHandle = document.getElementById('sidebarResizeHandle');
    if (!resizeHandle) return;

    resizeHandle.addEventListener('mousedown', (e) => {
      this.isResizing = true;
      resizeHandle.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      const startX = e.clientX;
      const startWidth = this.sidebarWidth;

      const handleMouseMove = (e) => {
        if (!this.isResizing) return;
        
        const deltaX = e.clientX - startX;
        const newWidth = Math.max(200, Math.min(500, startWidth + deltaX));
        
        this.sidebarWidth = newWidth;
        this.setupSidebarWidth();
      };

      const handleMouseUp = () => {
        this.isResizing = false;
        resizeHandle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // Save to localStorage
        localStorage.setItem('sidebarWidth', this.sidebarWidth.toString());
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });
  }

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          this.handleSearch(e.target.value);
        }, 300);
      });
      
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.handleSearch('');
          e.target.value = '';
        }
      });
    }

    // Sidebar resize functionality
    this.setupSidebarResize();

    // Window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Popstate (browser back/forward)
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.file) {
        this.loadFile(e.state.file, false);
      } else {
        this.showWelcomeScreen();
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      
      // Escape to close modals/panels
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
      
      // Ctrl/Cmd + B for sidebar toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        this.toggleSidebar();
      }
    });
  }

  async loadFileTree() {
    const loading = document.getElementById('sidebarLoading');
    const fileTree = document.getElementById('fileTree');
    
    if (loading) loading.style.display = 'flex';
    if (fileTree) fileTree.style.display = 'none';
    
    try {
      const response = await fetch('/api/tree');
      const data = await response.json();
      
      if (data.success) {
        this.fileTree = data.data;
        this.renderFileTree();
      } else {
        this.showError('Failed to load file tree: ' + data.error);
      }
    } catch (error) {
      console.error('Error loading file tree:', error);
      this.showError('Failed to load file tree');
    } finally {
      if (loading) loading.style.display = 'none';
      if (fileTree) fileTree.style.display = 'block';
    }
  }

  renderFileTree() {
    const container = document.getElementById('fileTree');
    if (!container || !this.fileTree) return;
    
    container.innerHTML = this.renderTreeItems(this.fileTree);
  }

  renderTreeItems(items, level = 0) {
    return items.map(item => {
      const itemId = `tree-item-${item.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
      const isExpanded = this.expandedFolders.has(item.path);
      const isActive = this.currentFile === item.path;
      
      if (item.type === 'directory') {
        return `
          <div class="tree-item directory" data-path="${item.path}">
            <div class="tree-label" onclick="app.toggleDirectory('${item.path}')">
              <span class="toggle ${isExpanded ? 'expanded' : ''}">▶</span>
              <span class="icon">📁</span>
              ${item.hasMarkdown ? '<span class="markdown-indicator"></span>' : ''}
              <span class="name" title="${item.name}">${item.name}</span>
            </div>
            <div class="tree-children ${isExpanded ? 'expanded' : ''}" id="${itemId}-children">
              ${isExpanded ? this.renderTreeItems(item.children, level + 1) : ''}
            </div>
          </div>
        `;
      } else {
        return `
          <div class="tree-item file ${isActive ? 'active' : ''}" 
               data-path="${item.path}" 
               onclick="app.loadFile('${item.path}')">
            <span class="icon">📄</span>
            <span class="name" title="${item.name}">${item.name}</span>
          </div>
        `;
      }
    }).join('');
  }

  toggleDirectory(path) {
    const isExpanded = this.expandedFolders.has(path);
    
    if (isExpanded) {
      this.expandedFolders.delete(path);
    } else {
      this.expandedFolders.add(path);
    }
    
    this.renderFileTree();
  }

  async loadFile(filePath, updateHistory = true) {
    if (!filePath) return;
    
    const welcomeScreen = document.getElementById('welcomeScreen');
    const fileContent = document.getElementById('fileContent');
    const contentLoading = document.getElementById('contentLoading');
    const markdownContent = document.getElementById('markdownContent');
    
    // Show loading state
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (fileContent) fileContent.style.display = 'block';
    if (contentLoading) contentLoading.style.display = 'flex';
    if (markdownContent) markdownContent.innerHTML = '';
    
    try {
      const response = await fetch(`/api/file/${filePath}`);
      const data = await response.json();
      
      if (data.success) {
        this.currentFile = filePath;
        
        if (markdownContent) {
          markdownContent.innerHTML = data.data.html;
        }
        
        // Update active file in sidebar
        this.updateActiveFile(filePath);
        
        // Update browser history
        if (updateHistory) {
          history.pushState({ file: filePath }, '', `#${filePath}`);
        }
        
        // Update document title
        const fileName = filePath.split('/').pop() || 'Markdown Server';
        document.title = `${fileName} - Markdown Server`;
        
        // Setup table of contents if available
        if (data.data.tableOfContents && data.data.tableOfContents.length > 0) {
          this.setupTableOfContents(data.data.tableOfContents);
        }
        
        // Scroll to top
        const contentContainer = document.querySelector('.content-container');
        if (contentContainer) {
          contentContainer.scrollTop = 0;
        }
        
      } else {
        this.showError('Failed to load file: ' + data.error);
      }
    } catch (error) {
      console.error('Error loading file:', error);
      this.showError('Failed to load file');
    } finally {
      if (contentLoading) contentLoading.style.display = 'none';
    }
  }

  updateActiveFile(filePath) {
    // Remove previous active states
    const activeItems = document.querySelectorAll('.tree-item.file.active');
    activeItems.forEach(item => item.classList.remove('active'));
    
    // Add active state to current file
    const currentItem = document.querySelector(`.tree-item.file[data-path="${filePath}"]`);
    if (currentItem) {
      currentItem.classList.add('active');
      
      // Expand parent directories
      this.expandToFile(filePath);
    }
  }

  expandToFile(filePath) {
    const pathParts = filePath.split('/');
    let currentPath = '';
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];
      this.expandedFolders.add(currentPath);
    }
    
    this.renderFileTree();
  }

  async handleSearch(query) {
    const searchResults = document.getElementById('searchResults');
    const fileTree = document.getElementById('fileTree');
    
    if (!query || query.trim().length < 2) {
      if (searchResults) searchResults.style.display = 'none';
      if (fileTree) fileTree.style.display = 'block';
      return;
    }
    
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        this.renderSearchResults(data.data.results);
        if (searchResults) searchResults.style.display = 'block';
        if (fileTree) fileTree.style.display = 'none';
      }
    } catch (error) {
      console.error('Search error:', error);
    }
  }

  renderSearchResults(results) {
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    if (results.length === 0) {
      container.innerHTML = '<div class="no-results">No files found</div>';
      return;
    }
    
    container.innerHTML = results.map(item => `
      <div class="search-result-item" onclick="app.loadFile('${item.path}')">
        <span class="icon">${item.type === 'directory' ? '📁' : '📄'}</span>
        <div>
          <div class="name">${item.name}</div>
          <div class="path">${item.path}</div>
        </div>
      </div>
    `).join('');
  }

  setupTableOfContents(headings) {
    const tocContent = document.getElementById('tocContent');
    if (!tocContent) return;
    
    tocContent.innerHTML = headings.map(heading => `
      <a href="#${heading.id}" class="toc-item level-${heading.level}" onclick="app.scrollToHeading('${heading.id}')">
        ${heading.text}
      </a>
    `).join('');
  }

  scrollToHeading(headingId) {
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed');
    }
  }

  toggleTableOfContents() {
    const tocContainer = document.getElementById('tocContainer');
    if (tocContainer) {
      tocContainer.style.display = tocContainer.style.display === 'none' ? 'block' : 'none';
    }
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.setupTheme();
    localStorage.setItem('theme', this.theme);
  }

  changeTheme(theme) {
    this.theme = theme;
    this.setupTheme();
    localStorage.setItem('theme', theme);
  }

  toggleSettings() {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.style.display = settingsModal.style.display === 'none' ? 'block' : 'none';
    }
  }

  closeSettings() {
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.style.display = 'none';
    }
  }

  closeAllModals() {
    this.closeSettings();
    const tocContainer = document.getElementById('tocContainer');
    if (tocContainer) {
      tocContainer.style.display = 'none';
    }
  }

  async refreshFileTree() {
    await this.loadFileTree();
  }

  showWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const fileContent = document.getElementById('fileContent');
    
    if (welcomeScreen) welcomeScreen.style.display = 'flex';
    if (fileContent) fileContent.style.display = 'none';
    
    this.currentFile = null;
    this.updateActiveFile('');
    document.title = 'Markdown Server';
    history.pushState({}, '', location.pathname);
  }

  showError(message) {
    // Simple error display - you could enhance this with a toast system
    console.error(message);
    alert(message);
  }

  handleResize() {
    // Handle responsive behavior
    if (window.innerWidth <= 768) {
      const sidebar = document.getElementById('sidebar');
      if (sidebar && !sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
      }
    }
  }

  async checkWatcherStatus() {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      // For now, assume watcher is inactive on startup
      // We could enhance the health endpoint to include watcher status
      this.watcherActive = false;
      this.updateWatcherButton();
    } catch (error) {
      console.error('Error checking watcher status:', error);
      this.watcherActive = false;
      this.updateWatcherButton();
    }
  }

  async toggleFileWatcher() {
    const button = document.getElementById('watchToggleBtn');
    if (!button) return;

    button.classList.add('loading');
    
    try {
      const endpoint = this.watcherActive ? '/api/watch/stop' : '/api/watch/start';
      const response = await fetch(endpoint, { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        this.watcherActive = !this.watcherActive;
        this.updateWatcherButton();
        
        // Show feedback
        const action = this.watcherActive ? 'started' : 'stopped';
        console.log(`File watching ${action}`);
      } else {
        this.showError(`Failed to toggle file watcher: ${data.error}`);
      }
    } catch (error) {
      console.error('Error toggling file watcher:', error);
      this.showError('Failed to toggle file watcher');
    } finally {
      button.classList.remove('loading');
    }
  }

  updateWatcherButton() {
    const button = document.getElementById('watchToggleBtn');
    const activeIcon = button?.querySelector('.watch-icon-active');
    const inactiveIcon = button?.querySelector('.watch-icon-inactive');
    
    if (!button || !activeIcon || !inactiveIcon) return;

    if (this.watcherActive) {
      button.classList.add('active');
      button.title = 'Live file watching active - Click to stop';
      activeIcon.style.display = 'block';
      inactiveIcon.style.display = 'none';
    } else {
      button.classList.remove('active');
      button.title = 'Live file watching inactive - Click to start';
      activeIcon.style.display = 'none';
      inactiveIcon.style.display = 'block';
    }
  }

  handleInitialRoute() {
    const hash = window.location.hash.slice(1); // Remove # symbol
    if (hash && hash.trim() !== '') {
      // Validate file exists in tree before loading
      if (this.validateFilePath(hash)) {
        this.loadFile(hash, false); // Don't update history since we're loading from URL
        this.expandToFile(hash);
      } else {
        console.warn(`File not found in tree: ${hash}`);
        // Clear invalid hash
        history.replaceState({}, '', location.pathname);
      }
    }
  }

  validateFilePath(filePath) {
    if (!this.fileTree || !filePath) return false;
    
    // Recursively search for file in tree
    const findFile = (items, targetPath) => {
      for (const item of items) {
        if (item.path === targetPath && item.type === 'file') {
          return true;
        }
        if (item.type === 'directory' && item.children) {
          if (findFile(item.children, targetPath)) {
            return true;
          }
        }
      }
      return false;
    };
    
    return findFile(this.fileTree, filePath);
  }
}

// Global utility functions
function toggleSidebar() {
  if (window.app) {
    window.app.toggleSidebar();
  }
}

function toggleTheme() {
  if (window.app) {
    window.app.toggleTheme();
  }
}

function toggleSettings() {
  if (window.app) {
    window.app.toggleSettings();
  }
}

function closeSettings() {
  if (window.app) {
    window.app.closeSettings();
  }
}

function changeTheme(theme) {
  if (window.app) {
    window.app.changeTheme(theme);
  }
}

function toggleTableOfContents() {
  if (window.app) {
    window.app.toggleTableOfContents();
  }
}

function refreshFileTree() {
  if (window.app) {
    window.app.refreshFileTree();
  }
}

function toggleFileWatcher() {
  if (window.app) {
    window.app.toggleFileWatcher();
  }
}

function performSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput && window.app) {
    window.app.handleSearch(searchInput.value);
  }
}

function loadHome() {
  if (window.app) {
    window.app.showWelcomeScreen();
  }
}

function loadFile(filePath) {
  if (window.app) {
    window.app.loadFile(filePath);
  }
}

// Code copy functionality
function copyCodeToClipboard(button) {
  const codeBlock = button.closest('.code-block');
  const code = codeBlock.querySelector('code');
  
  if (code) {
    const text = code.textContent;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        showCopyFeedback(button);
      });
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showCopyFeedback(button);
    }
  }
}

function showCopyFeedback(button) {
  const originalText = button.innerHTML;
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    Copied!
  `;
  
  setTimeout(() => {
    button.innerHTML = originalText;
  }, 2000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new MarkdownApp();
  });
} else {
  window.app = new MarkdownApp();
}