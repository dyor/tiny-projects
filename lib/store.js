'use strict';
/*
 * The one place that reads and writes the JSON store. Shared by server.js
 * (the browser's backend) and mcp/server.js (the MCP tools), so both agree
 * on the file location, the shape, and how ranks are assigned.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_FILE =
  process.env.TINY_PROJECTS_DATA ||
  path.join(os.homedir(), '.tiny-projects', 'data.json');

// Matches the DEFAULT_DATA in index.html, minus the sample rows.
const DEFAULT_DATA = { projects: [], tasks: [] };

function ensureDir() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

/** Returns { version, projects, tasks }. version is the file mtime in ms. */
function readStore() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      version: fs.statSync(DATA_FILE).mtimeMs,
      projects: parsed.projects || [],
      tasks: parsed.tasks || [],
    };
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    return { version: null, ...structuredClone(DEFAULT_DATA) };
  }
}

/** Writes atomically so a reader never sees a half-written file. */
function writeStore({ projects, tasks }) {
  ensureDir();
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ projects, tasks }, null, 2));
  fs.renameSync(tmp, DATA_FILE);
  return { version: fs.statSync(DATA_FILE).mtimeMs, projects, tasks };
}

function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/* index.html hides raw ranks and treats higher as more important; new items go
 * to the bottom, which means below the current minimum. */
function nextRank(items) {
  const ranks = items.map((i) => i.rank).filter((r) => typeof r === 'number');
  return ranks.length ? Math.min(...ranks) - 10 : 100;
}

function findProject(store, nameOrId) {
  const needle = String(nameOrId).toLowerCase();
  return (
    store.projects.find((p) => p.id.toLowerCase() === needle) ||
    store.projects.find((p) => p.name.toLowerCase() === needle) ||
    store.projects.find((p) => p.name.toLowerCase().includes(needle))
  );
}

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#a855f7'];

module.exports = {
  DATA_FILE,
  DEFAULT_DATA,
  readStore,
  writeStore,
  id,
  nextRank,
  findProject,
  COLORS,
};
