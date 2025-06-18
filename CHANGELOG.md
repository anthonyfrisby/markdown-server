# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-18

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