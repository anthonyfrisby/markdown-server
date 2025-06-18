const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const config = require('../config');

class FileScanner {
  constructor() {
    this.cache = new Map();
    this.watcher = null;
    this.listeners = new Set();
  }

  isMarkdownFile(filename) {
    return config.supportedExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext)
    );
  }

  async scanDirectory(rootPath, currentPath = '') {
    const fullPath = path.join(rootPath, currentPath);
    const items = [];

    try {
      const entries = await fs.promises.readdir(fullPath);
      
      for (const entry of entries) {
        // Skip hidden files and common ignore patterns
        if (entry.startsWith('.') || entry === 'node_modules') continue;
        
        const entryPath = path.join(fullPath, entry);
        const relativePath = path.join(currentPath, entry);
        const stats = await fs.promises.stat(entryPath);

        if (stats.isDirectory()) {
          const children = await this.scanDirectory(rootPath, relativePath);
          items.push({
            type: 'directory',
            name: entry,
            path: relativePath,
            children: children,
            hasMarkdown: this.hasMarkdownInTree(children),
            lastModified: stats.mtime
          });
        } else if (this.isMarkdownFile(entry)) {
          items.push({
            type: 'file',
            name: entry,
            path: relativePath,
            size: stats.size,
            lastModified: stats.mtime
          });
        }
      }

      // Sort: directories first, then alphabetical
      return items.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });

    } catch (error) {
      console.error(`Error scanning directory ${fullPath}:`, error.message);
      return [];
    }
  }

  hasMarkdownInTree(items) {
    return items.some(item => 
      item.type === 'file' || 
      (item.type === 'directory' && item.hasMarkdown)
    );
  }

  async getDirectoryTree() {
    const cacheKey = 'directory-tree';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < config.cache.maxAge) {
      return cached.data;
    }

    try {
      const tree = await this.scanDirectory(config.rootPath);
      
      this.cache.set(cacheKey, {
        data: tree,
        timestamp: Date.now()
      });
      
      // Cleanup old cache entries
      if (this.cache.size > config.cache.maxSize) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
      
      return tree;
    } catch (error) {
      console.error('Error getting directory tree:', error.message);
      throw error;
    }
  }

  async searchFiles(query) {
    if (!query || query.trim().length < 2) return [];
    
    const searchTerm = query.toLowerCase();
    const results = [];
    
    const tree = await this.getDirectoryTree();
    this.searchInTree(tree, searchTerm, results);
    
    return results.slice(0, 50); // Limit results
  }

  searchInTree(items, searchTerm, results) {
    for (const item of items) {
      if (item.type === 'file' && item.name.toLowerCase().includes(searchTerm)) {
        results.push(item);
      } else if (item.type === 'directory') {
        if (item.name.toLowerCase().includes(searchTerm)) {
          // Add directory itself if name matches
          results.push({
            ...item,
            children: undefined // Don't include children in search results
          });
        }
        // Search in children
        this.searchInTree(item.children, searchTerm, results);
      }
    }
  }

  startWatching() {
    if (this.watcher) return;
    
    this.watcher = chokidar.watch(config.rootPath, config.watchOptions);
    
    this.watcher.on('change', (filePath) => {
      if (this.isMarkdownFile(path.basename(filePath))) {
        this.invalidateCache();
        this.notifyListeners('fileChanged', { path: filePath });
      }
    });
    
    this.watcher.on('add', (filePath) => {
      if (this.isMarkdownFile(path.basename(filePath))) {
        this.invalidateCache();
        this.notifyListeners('fileAdded', { path: filePath });
      }
    });
    
    this.watcher.on('unlink', (filePath) => {
      if (this.isMarkdownFile(path.basename(filePath))) {
        this.invalidateCache();
        this.notifyListeners('fileDeleted', { path: filePath });
      }
    });
  }

  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in file watcher listener:', error);
      }
    });
  }

  invalidateCache() {
    this.cache.clear();
  }
}

module.exports = new FileScanner();