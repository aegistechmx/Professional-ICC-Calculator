#!/usr/bin/env node
const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');

const port = parseInt(process.argv[2], 10) || 3002;
const rootDir = process.argv[3] ? path.resolve(process.argv[3]) : process.cwd();

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/octet-stream'
};

function sendResponse(res, statusCode, content, contentType) {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(content);
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendResponse(res, 404, '404 Not Found', 'text/plain');
      } else {
        sendResponse(res, 500, '500 Internal Server Error', 'text/plain');
      }
      return;
    }
    sendResponse(res, 200, data, contentType);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = path.join(rootDir, pathname);
  if (!filePath.startsWith(rootDir)) {
    sendResponse(res, 403, '403 Forbidden', 'text/plain');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (pathname === '/index.html' || pathname === '/index.htm') {
        sendResponse(res, 404, '404 Not Found', 'text/plain');
      } else {
        const fallback = path.join(rootDir, 'index.html');
        fs.access(fallback, fs.constants.R_OK, (fallbackErr) => {
          if (!fallbackErr) {
            serveFile(res, fallback);
          } else {
            sendResponse(res, 404, '404 Not Found', 'text/plain');
          }
        });
      }
      return;
    }

    if (stats.isDirectory()) {
      serveFile(res, path.join(filePath, 'index.html'));
    } else {
      serveFile(res, filePath);
    }
  });
});

server.listen(port, () => {
  console.log(`Static server running at http://localhost:${port}`);
  console.log(`Serving folder: ${rootDir}`);
});

server.on('error', (err) => {
  console.error(`Failed to start static server: ${err.message}`);
  process.exit(1);
});