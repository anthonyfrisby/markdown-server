const { marked } = require('marked');
const hljs = require('highlight.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class MarkdownRenderer {
  constructor() {
    this.setupMarked();
    this.cache = new Map();
  }

  setupMarked() {
    // Configure marked options
    marked.setOptions({
      ...config.markdown,
      highlight: (code, language) => {
        if (language && hljs.getLanguage(language)) {
          try {
            return hljs.highlight(code, { language }).value;
          } catch (err) {
            console.warn(`Syntax highlighting failed for language: ${language}`);
          }
        }
        return hljs.highlightAuto(code).value;
      }
    });

    // Custom renderer for enhanced features
    const renderer = new marked.Renderer();

    // Enhanced heading renderer with anchor links
    renderer.heading = (text, level) => {
      const escapedText = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
      
      return `
        <h${level} id="${escapedText}" class="heading-with-anchor">
          <a href="#${escapedText}" class="anchor-link" aria-label="Link to section">
            <span class="anchor-icon">#</span>
          </a>
          ${text}
        </h${level}>
      `;
    };

    // Enhanced code block renderer with copy functionality
    renderer.code = (code, language, escaped) => {
      const validLanguage = language && hljs.getLanguage(language) ? language : 'plaintext';
      const highlighted = hljs.highlight(code, { language: validLanguage }).value;
      
      return `
        <div class="code-block">
          <div class="code-header">
            <span class="language-tag">${validLanguage}</span>
            <button class="copy-btn" onclick="copyCodeToClipboard(this)" title="Copy code">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="m5 15-2-2 2-2"></path>
                <path d="m1 9 2-2 2 2"></path>
              </svg>
              Copy
            </button>
          </div>
          <pre><code class="hljs ${validLanguage}">${highlighted}</code></pre>
        </div>
      `;
    };

    // Enhanced table renderer
    renderer.table = (header, body) => {
      return `
        <div class="table-wrapper">
          <table class="markdown-table">
            <thead>${header}</thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      `;
    };

    // Enhanced blockquote renderer
    renderer.blockquote = (quote) => {
      return `<blockquote class="markdown-blockquote">${quote}</blockquote>`;
    };

    // Enhanced link renderer with external link detection
    renderer.link = (href, title, text) => {
      const isExternal = href.startsWith('http') || href.startsWith('//');
      const titleAttr = title ? ` title="${title}"` : '';
      const externalAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
      const externalIcon = isExternal ? ' <span class="external-link-icon">↗</span>' : '';
      
      return `<a href="${href}"${titleAttr}${externalAttrs} class="${isExternal ? 'external-link' : 'internal-link'}">${text}${externalIcon}</a>`;
    };

    marked.use({ renderer });
  }

  async renderFile(filePath) {
    const fullPath = path.join(config.rootPath, filePath);
    
    // Check cache first
    const cacheKey = `file:${filePath}`;
    const cached = this.cache.get(cacheKey);
    
    try {
      const stats = await fs.promises.stat(fullPath);
      
      if (cached && cached.mtime >= stats.mtime.getTime()) {
        return cached.html;
      }

      // Read and process file
      const content = await fs.promises.readFile(fullPath, 'utf8');
      const html = await this.renderMarkdown(content, filePath);
      
      // Cache the result
      this.cache.set(cacheKey, {
        html,
        mtime: stats.mtime.getTime(),
        timestamp: Date.now()
      });
      
      // Cleanup old cache entries
      this.cleanupCache();
      
      return html;
      
    } catch (error) {
      console.error(`Error rendering file ${filePath}:`, error.message);
      throw new Error(`Failed to render markdown file: ${error.message}`);
    }
  }

  async renderMarkdown(content, filePath = '') {
    try {
      // Add metadata to the rendered content
      const html = marked(content);
      
      return this.wrapWithMetadata(html, filePath);
      
    } catch (error) {
      console.error('Error rendering markdown:', error.message);
      return `<div class="error">Error rendering markdown: ${error.message}</div>`;
    }
  }

  wrapWithMetadata(html, filePath) {
    const fileName = path.basename(filePath);
    const breadcrumbs = this.generateBreadcrumbs(filePath);
    
    return `
      <div class="markdown-content" data-file-path="${filePath}">
        <div class="content-header">
          <nav class="breadcrumbs" aria-label="File location">
            ${breadcrumbs}
          </nav>
          <div class="content-actions">
            <button onclick="toggleTableOfContents()" class="toc-toggle" title="Toggle table of contents">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              TOC
            </button>
          </div>
        </div>
        <div class="content-body">
          ${html}
        </div>
      </div>
    `;
  }

  generateBreadcrumbs(filePath) {
    if (!filePath) return '<span class="breadcrumb-item">Home</span>';
    
    const parts = filePath.split(path.sep).filter(part => part);
    const breadcrumbs = ['<a href="#" onclick="loadHome()" class="breadcrumb-link">Home</a>'];
    
    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      currentPath = path.join(currentPath, parts[i]);
      const isLast = i === parts.length - 1;
      
      if (isLast) {
        breadcrumbs.push(`<span class="breadcrumb-item current">${parts[i]}</span>`);
      } else {
        breadcrumbs.push(`<a href="#" onclick="loadFile('${currentPath}')" class="breadcrumb-link">${parts[i]}</a>`);
      }
    }
    
    return breadcrumbs.join('<span class="breadcrumb-separator">/</span>');
  }

  extractTableOfContents(html) {
    const headings = [];
    const headingRegex = /<h([1-6])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h[1-6]>/gi;
    let match;
    
    while ((match = headingRegex.exec(html)) !== null) {
      headings.push({
        level: parseInt(match[1]),
        id: match[2],
        text: match[3].replace(/<[^>]*>/g, '').trim()
      });
    }
    
    return headings;
  }

  cleanupCache() {
    if (this.cache.size <= config.cache.maxSize) return;
    
    // Remove oldest entries
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = entries.slice(0, entries.length - config.cache.maxSize);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  invalidateCache(filePath = null) {
    if (filePath) {
      this.cache.delete(`file:${filePath}`);
    } else {
      this.cache.clear();
    }
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: config.cache.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = new MarkdownRenderer();