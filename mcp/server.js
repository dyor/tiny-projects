#!/usr/bin/env node
/*
 * MCP server for TinyProjects. CRUD over the same JSON file that server.js
 * serves to the browser, so "add these to tiny project" shows up in the open
 * page within a few seconds (it polls).
 *
 * Speaks MCP over stdio as plain JSON-RPC 2.0 — no SDK, no node_modules.
 *
 * Register it with:
 *   claude mcp add tiny-projects -- node <repo>/mcp/server.js
 */
'use strict';

const {
  DATA_FILE, readStore, writeStore, id, nextRank, findProject, COLORS,
} = require('../lib/store');

/* ---------------------------------------------------------------- tools -- */

const TOOLS = [
  {
    name: 'list',
    description:
      'List every project and its tasks. Use this first to see what exists and to get exact project names before adding to them.',
    inputSchema: {
      type: 'object',
      properties: {
        include_completed: { type: 'boolean', description: 'Include completed tasks (default false).' },
      },
    },
    handler(args) {
      const store = readStore();
      const showDone = args.include_completed === true;
      const lines = [];
      if (!store.projects.length) return 'No projects yet.';
      for (const p of [...store.projects].sort((a, b) => b.rank - a.rank)) {
        const tasks = store.tasks
          .filter((t) => t.projectId === p.id && (showDone || !t.completed))
          .sort((a, b) => b.rank - a.rank);
        lines.push(`${p.name}  (${tasks.filter((t) => !t.completed).length} pending)`);
        for (const t of tasks) {
          const mark = t.completed ? 'x' : ' ';
          const snoozed = t.snoozedUntil && t.snoozedUntil > Date.now() ? ' [snoozed]' : '';
          lines.push(`  [${mark}] ${t.title}${snoozed}   (${t.id})`);
        }
      }
      return lines.join('\n');
    },
  },
  {
    name: 'add_project',
    description: 'Create a project. Returns its id.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        color: { type: 'string', description: 'Hex colour; one is picked if omitted.' },
      },
      required: ['name'],
    },
    handler(args) {
      const store = readStore();
      const existing = findProject(store, args.name);
      if (existing) return `Project already exists: ${existing.name} (${existing.id})`;
      const project = {
        id: id('proj'),
        name: args.name,
        color: args.color || COLORS[store.projects.length % COLORS.length],
        rank: nextRank(store.projects),
      };
      store.projects.push(project);
      writeStore(store);
      return `Created project ${project.name} (${project.id})`;
    },
  },
  {
    name: 'add_tasks',
    description:
      'Add one or more tasks to a project, creating the project if it does not exist. This is the tool for "add these to tiny projects".',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name or id.' },
        titles: { type: 'array', items: { type: 'string' }, description: 'One task title per entry.' },
      },
      required: ['project', 'titles'],
    },
    handler(args) {
      const store = readStore();
      let project = findProject(store, args.project);
      const created = [];
      if (!project) {
        project = {
          id: id('proj'),
          name: args.project,
          color: COLORS[store.projects.length % COLORS.length],
          rank: nextRank(store.projects),
        };
        store.projects.push(project);
        created.push(`created project ${project.name}`);
      }
      const titles = Array.isArray(args.titles) ? args.titles : [args.titles];
      for (const title of titles) {
        if (!String(title).trim()) continue;
        store.tasks.push({
          id: id('task'),
          projectId: project.id,
          title: String(title).trim(),
          completed: false,
          snoozedUntil: null,
          completedAt: null,
          rank: nextRank(store.tasks),
        });
        created.push(`added "${title}"`);
      }
      writeStore(store);
      return `${created.join('; ')} — in ${project.name}`;
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task done by id, or by a unique substring of its title.',
    inputSchema: {
      type: 'object',
      properties: { task: { type: 'string' } },
      required: ['task'],
    },
    handler(args) {
      const store = readStore();
      const matches = matchTasks(store, args.task);
      if (matches.length !== 1) return describeMatch(matches, args.task);
      matches[0].completed = true;
      matches[0].completedAt = Date.now();
      writeStore(store);
      return `Completed "${matches[0].title}"`;
    },
  },
  {
    name: 'update_task',
    description: 'Rename a task, move it to another project, or reopen it.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task id or unique title substring.' },
        title: { type: 'string' },
        project: { type: 'string', description: 'Move to this project (must exist).' },
        completed: { type: 'boolean' },
      },
      required: ['task'],
    },
    handler(args) {
      const store = readStore();
      const matches = matchTasks(store, args.task);
      if (matches.length !== 1) return describeMatch(matches, args.task);
      const task = matches[0];
      const changes = [];
      if (args.title) { task.title = args.title; changes.push('title'); }
      if (args.project) {
        const p = findProject(store, args.project);
        if (!p) return `No such project: ${args.project}`;
        task.projectId = p.id;
        changes.push(`moved to ${p.name}`);
      }
      if (typeof args.completed === 'boolean') {
        task.completed = args.completed;
        task.completedAt = args.completed ? Date.now() : null;
        changes.push(args.completed ? 'completed' : 'reopened');
      }
      writeStore(store);
      return changes.length ? `Updated "${task.title}": ${changes.join(', ')}` : 'Nothing to change.';
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task permanently.',
    inputSchema: {
      type: 'object',
      properties: { task: { type: 'string' } },
      required: ['task'],
    },
    handler(args) {
      const store = readStore();
      const matches = matchTasks(store, args.task);
      if (matches.length !== 1) return describeMatch(matches, args.task);
      store.tasks = store.tasks.filter((t) => t.id !== matches[0].id);
      writeStore(store);
      return `Deleted "${matches[0].title}"`;
    },
  },
];

function matchTasks(store, needle) {
  const n = String(needle).toLowerCase();
  const byId = store.tasks.filter((t) => t.id.toLowerCase() === n);
  if (byId.length) return byId;
  return store.tasks.filter((t) => t.title.toLowerCase().includes(n));
}

function describeMatch(matches, needle) {
  if (!matches.length) return `No task matches "${needle}".`;
  return `"${needle}" matches ${matches.length} tasks; be more specific or use an id:\n` +
    matches.map((t) => `  ${t.title}  (${t.id})`).join('\n');
}

/* ----------------------------------------------------------- transport -- */

const SERVER_INFO = { name: 'tiny-projects', version: '1.0.0' };

function handle(msg) {
  const { id: reqId, method, params } = msg;
  const reply = (result) => ({ jsonrpc: '2.0', id: reqId, result });

  if (method === 'initialize') {
    return reply({
      protocolVersion: params?.protocolVersion || '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
  }
  if (method === 'tools/list') {
    return reply({
      tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
    });
  }
  if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === params?.name);
    if (!tool) {
      return { jsonrpc: '2.0', id: reqId, error: { code: -32602, message: `Unknown tool: ${params?.name}` } };
    }
    try {
      const text = tool.handler(params.arguments || {});
      return reply({ content: [{ type: 'text', text: String(text) }] });
    } catch (err) {
      return reply({ content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true });
    }
  }
  if (method === 'ping') return reply({});
  // Notifications carry no id and expect no response.
  if (reqId === undefined) return null;
  return { jsonrpc: '2.0', id: reqId, error: { code: -32601, message: `Unknown method: ${method}` } };
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (err) {
      continue;
    }
    const out = handle(msg);
    if (out) process.stdout.write(JSON.stringify(out) + '\n');
  }
});

process.stderr.write(`tiny-projects MCP ready; store: ${DATA_FILE}\n`);
