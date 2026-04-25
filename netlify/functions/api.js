const serverless = require('serverless-http');

// Simple Express app for Netlify Functions
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/.netlify/functions/api', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Placeholder for API routes - in production, these would be connected to the actual backend
app.get('/.netlify/functions/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

module.exports.handler = serverless(app);
