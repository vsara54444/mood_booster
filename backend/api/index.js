// Vercel Serverless entry point.
// Vercel calls this file and expects a Node.js HTTP handler.
// We just export the Express app - Vercel wraps it automatically.
const app = require('../src/server');
module.exports = app;
