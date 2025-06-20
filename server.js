const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = config.port || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});

// Middleware
app.use(limiter);
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API routes
app.use('/api', apiRoutes);

// Main page route
app.get('*', (req, res) => {
  res.render('index', {
    title: 'Markdown Server',
    rootPath: config.rootPath
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Frisbatron Command Center running on http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${config.rootPath}`);
});

module.exports = app;