# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-12-18

### Added
- **File Watcher Toggle Button**
  - Interactive eye icon button in sidebar header next to refresh button
  - Visual states: green eye (active watching) vs gray eye with slash (inactive)
  - Toggle file watching on/off with single click
  - Real-time directory change detection when enabled
  - Tooltip feedback showing current status and next action
  
- **Enhanced Directory Watching**
  - Added `addDir` and `unlinkDir` event handlers to chokidar file watcher
  - Automatic cache invalidation when directories are created/deleted
  - Fixes issue where new folders wouldn't appear until server restart
  
- **Improved User Experience**
  - File watcher status persists across app usage
  - Loading states and error handling for watcher toggle
  - Seamless integration with existing sidebar controls
  - User control over performance vs real-time updates trade-off

### Fixed
- Directory structure changes now reflect immediately when file watching is enabled
- Refresh button now works properly for newly created/deleted folders
- Cache invalidation properly triggered by directory changes

### Technical Details
- Enhanced `lib/fileScanner.js` with comprehensive directory event handling
- Added watcher status checking and toggle functionality to frontend
- New CSS styling for watch toggle button states and animations
- API endpoints `/api/watch/start` and `/api/watch/stop` now fully utilized

## [1.0.0] - 2024-12-18

### Added
- Initial release of Markdown Server
- **Core Features:**
  - Directory tree navigation with collapsible sidebar
  - GitHub-flavored markdown rendering with syntax highlighting
  - Real-time file search functionality
  - Dark/light theme toggle with persistence
  - Table of contents generation for long documents
  - Code block copy functionality
  - Responsive design for desktop and mobile
  
- **Technical Implementation:**
  - Node.js + Express server architecture
  - EJS templating engine
  - File system caching for performance
  - Real-time file watching with chokidar
  - Comprehensive API endpoints
  - Client-side SPA experience
  
- **UI/UX Features:**
  - Clean, modern interface design
  - Keyboard shortcuts (Ctrl+K search, Ctrl+B sidebar toggle)
  - Breadcrumb navigation
  - Loading states and error handling
  - Settings modal
  - Mobile-responsive layout
  
- **Configuration:**
  - Configurable root path for serving files
  - Customizable port and cache settings
  - Support for multiple markdown extensions (.md, .markdown, .mdown, .mkd)
  
- **Developer Features:**
  - Hot reload in development mode
  - Health check endpoint
  - Cache management API
  - File watching start/stop controls

### Configuration Required
- Update `config.js` with your preferred markdown files directory path
- Default server runs on http://localhost:3001

### Dependencies
- express: ^4.18.2
- marked: ^9.1.6  
- highlight.js: ^11.9.0
- chokidar: ^3.5.3
- ejs: ^3.1.9
- express-rate-limit: ^7.1.5