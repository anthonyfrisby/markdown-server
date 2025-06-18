const path = require('path');

module.exports = {
  // Hardcoded path to serve markdown files from
  // Change this to your desired directory
  rootPath: '/Users/antfris/command',
  
  // Server configuration
  port: 5001,
  
  // File watching options
  watchOptions: {
    ignored: /node_modules|\.git/,
    persistent: true,
    ignoreInitial: false
  },
  
  // Markdown processing options
  markdown: {
    gfm: true,
    breaks: true,
    headerIds: true,
    mangle: false
  },
  
  // Supported file extensions
  supportedExtensions: ['.md', '.markdown', '.mdown', '.mkd'],
  
  // Cache settings
  cache: {
    maxAge: 5 * 60 * 1000, // 5 minutes in milliseconds
    maxSize: 100 // maximum number of cached files
  }
};
