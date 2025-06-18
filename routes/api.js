const express = require('express');
const path = require('path');
const fileScanner = require('../lib/fileScanner');
const markdownRenderer = require('../lib/markdownRenderer');
const config = require('../config');

const router = express.Router();

// Get directory tree structure
router.get('/tree', async (req, res) => {
  try {
    const tree = await fileScanner.getDirectoryTree();
    res.json({
      success: true,
      data: tree,
      rootPath: config.rootPath
    });
  } catch (error) {
    console.error('Error getting directory tree:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan directory structure'
    });
  }
});

// Get rendered markdown file
router.get('/file/*', async (req, res) => {
  try {
    const filePath = req.params[0]; // Get everything after /file/
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    // Security check: prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Invalid file path'
      });
    }

    const html = await markdownRenderer.renderFile(filePath);
    const toc = markdownRenderer.extractTableOfContents(html);
    
    res.json({
      success: true,
      data: {
        html,
        filePath,
        tableOfContents: toc
      }
    });
    
  } catch (error) {
    console.error('Error rendering file:', error);
    
    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to render markdown file'
      });
    }
  }
});

// Search files and content
router.get('/search', async (req, res) => {
  try {
    const { q: query, type = 'all' } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    const results = await fileScanner.searchFiles(query.trim());
    
    res.json({
      success: true,
      data: {
        query: query.trim(),
        results,
        total: results.length
      }
    });
    
  } catch (error) {
    console.error('Error searching files:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// Get file metadata
router.get('/metadata/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const fullPath = path.join(config.rootPath, filePath);
    const fs = require('fs').promises;
    
    const stats = await fs.stat(fullPath);
    
    res.json({
      success: true,
      data: {
        path: filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile()
      }
    });
    
  } catch (error) {
    console.error('Error getting file metadata:', error);
    res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: {
        rootPath: config.rootPath,
        supportedExtensions: config.supportedExtensions
      },
      cache: {
        scanner: fileScanner.cache?.size || 0,
        renderer: markdownRenderer.getCacheStats()
      }
    }
  });
});

// Clear cache endpoint (useful for development)
router.post('/cache/clear', (req, res) => {
  try {
    fileScanner.invalidateCache();
    markdownRenderer.invalidateCache();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

// Start file watching
router.post('/watch/start', (req, res) => {
  try {
    fileScanner.startWatching();
    res.json({
      success: true,
      message: 'File watching started'
    });
  } catch (error) {
    console.error('Error starting file watcher:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start file watching'
    });
  }
});

// Stop file watching
router.post('/watch/stop', (req, res) => {
  try {
    fileScanner.stopWatching();
    res.json({
      success: true,
      message: 'File watching stopped'
    });
  } catch (error) {
    console.error('Error stopping file watcher:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop file watching'
    });
  }
});

// Error handling middleware for this router
router.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

module.exports = router;