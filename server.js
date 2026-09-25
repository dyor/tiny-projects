#!/usr/bin/env node
/*
 * Serves index.html and puts the task data in a JSON file instead of
 * localStorage, so the MCP server and the browser share one store.
 *
 *   node server.js [--port 8777] [--data ~/.tiny-projects/data.json]
 *
 * The data file lives outside the repo on purpose: dyor/tiny-projects is a
 * public repo and this is a personal task list.
 *
 * No dependencies.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { DATA_FILE, DEFAULT_DATA, readStore, writeStore } = require('./lib/store');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const PORT = parseInt(arg('port', process.env.TINY_PROJECTS_PORT || '8777'), 10);
const ROOT = __dirname;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJSON(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 5_000_000) reject(new Error('payload too large'));
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/data') {
    if (req.method === 'GET') {
      return sendJSON(res, 200, readStore());
    }
    if (req.method === 'PUT') {
      let incoming;
      try {
        incoming = JSON.parse(await readBody(req));
      } catch (err) {
        return sendJSON(res, 400, { error: 'invalid JSON' });
      }
      const current = readStore();
      // Optimistic concurrency: if the file moved under the browser (the MCP
      // server wrote to it), hand back the current state rather than clobber.
      if (incoming.version != null && incoming.version !== current.version) {
        return sendJSON(res, 409, current);
      }
      const saved = writeStore({
        projects: incoming.projects || [],
        tasks: incoming.tasks || [],
      });
      return sendJSON(res, 200, { version: saved.version });
    }
    res.writeHead(405).end();
    return;
  }

  // Static files, confined to this directory.
  const rel = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, 'index.html')) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(buf);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TinyProjects  http://localhost:${PORT}`);
  console.log(`data          ${DATA_FILE}`);
});
