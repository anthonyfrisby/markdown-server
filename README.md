# Markdown Server

A local Node.js server for viewing markdown files with a beautiful, collapsible sidebar interface.

## Features

- 📁 **Directory Tree Navigation** - Collapsible sidebar showing all directories and markdown files
- 📄 **Markdown Rendering** - GitHub-flavored markdown with syntax highlighting
- 🔍 **Search Functionality** - Search through file names and paths
- 🌙 **Dark/Light Theme** - Toggle between themes with persistent storage
- 📋 **Copy Code Blocks** - One-click copying of code snippets
- 🔗 **Table of Contents** - Auto-generated navigation for long documents
- ⚡ **Fast Performance** - Caching and optimized file scanning
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure root path** (edit `config.js`):
   ```javascript
   rootPath: '/path/to/your/markdown/files'
   ```

3. **Start the server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:3000
   ```

## Configuration

Edit `config.js` to customize:

- `rootPath` - Directory to serve markdown files from
- `port` - Server port (default: 3000)
- `supportedExtensions` - Markdown file extensions to recognize
- `cache` settings - Cache configuration for performance

## Keyboard Shortcuts

- `Ctrl/Cmd + K` - Focus search
- `Ctrl/Cmd + B` - Toggle sidebar
- `Escape` - Close modals/panels

## API Endpoints

- `GET /api/tree` - Get directory structure
- `GET /api/file/*` - Get rendered markdown file
- `GET /api/search?q=query` - Search files
- `GET /api/health` - Health check

## Development

```bash
# Install dependencies
npm install

# Start with auto-reload
npm run dev

# Production start
npm start
```

## File Structure

```
markdown-server/
├── server.js              # Main Express server
├── config.js              # Configuration
├── lib/
│   ├── fileScanner.js     # Directory scanning logic
│   └── markdownRenderer.js # Markdown processing
├── routes/
│   └── api.js             # API endpoints
├── views/
│   └── index.ejs          # Main HTML template
├── public/
│   ├── styles.css         # Styling
│   └── app.js             # Frontend JavaScript
└── package.json
```

## License

MIT