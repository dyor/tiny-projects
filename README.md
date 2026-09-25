# ⚡ TinyProjects

The smallest, cleanest little website in the world to manage a handful of projects and tasks with dual-view priority sorting and drag-and-drop rank swapping.

---

## 🌟 Features

- **📁 View 1: By Project**:
  - Organized by project cards in order of project priority.
  - **Drag and drop project headers** (via the `⋮⋮` grab handle) onto any other project card to swap project priority!
  - **Collapsible project cards**: Smooth collapse/expand toggle with smart default states (automatically collapsed when all tasks in a project are done, and kept open for active or newly created projects).
  - Tasks inside each project are automatically sorted by relative priority.
  - Drag and drop tasks onto any other task **within the same project** to swap their priorities.
  - Collapsible task segments (Pending, Snoozed, and Completed) — snoozed tasks stay collapsed by default to save vertical space.
  - Flexible snooze options (1 day, 2 days, 1 week, or custom date).
  - Inline `+ Add a task` input directly on each project card (press <kbd>Enter</kbd> to add instantly, with continuous focus retention).
  - Editable project names and project delete protection.

- **⚡ View 2: By Priority**:
  - Unified flat global list of all tasks across all projects, sorted from highest priority (top) to lowest.
  - Collapsible Pending, Snoozed, and Completed segments.
  - Clear color-coded project pills for each task.
  - Drag and drop tasks across the entire list to swap priorities globally.

- **🎯 Priority & Rank Mechanics**:
  - Newly added items are automatically assigned the lowest priority rank (placed cleanly at the **bottom** of the list).
  - Dragging item A onto item B swaps their ranks directly.
  - Raw rank numbers are completely hidden from the UI for a clean, distraction-free view.
  - Focus is automatically retained in the task input box after submitting so you can rapidly enter multiple tasks consecutively without clicking.

- **✨ Micro & Modern UX**:
  - **Zero dependencies**: 100% self-contained single file (`index.html`) that works completely offline.
  - **Instant Local Storage**: All projects, tasks, and state are automatically persisted in your browser.
  - **Dark & Light Mode**: Seamless toggle with system default detection.
  - **Backup & Restore**: Export and Import JSON data anytime.

---

## 🚀 How to Run

Simply open `index.html` in your web browser!

### On macOS:
```bash
open /Users/mattdyor/DyorProjects/local/tiny-projects/index.html
```

The published copy lives at **https://dyor.github.io/tiny-projects/** (GitHub Pages,
served from `main`). Note that data is kept in `localStorage`, which is scoped to the
origin: what you add on the Pages URL is not visible to a local copy, and vice versa.

Or serve it with any local static server:
```bash
npx serve /Users/mattdyor/DyorProjects/local/tiny-projects
# or
python3 -m http.server 8080 --directory /Users/mattdyor/DyorProjects/local/tiny-projects
```

---

## 🔌 Local file backend + MCP server

By default TinyProjects keeps everything in `localStorage`, which is per-origin and
unreachable from outside the browser. Run it through `server.js` instead and the store
becomes a JSON file that both the page and an MCP server can read and write:

```bash
node server.js            # http://localhost:8777
```

The page detects the backend (`GET api/data`), shows `· local file` next to the subtitle,
and polls every 3 seconds — so a task added by the MCP server appears in an open tab
without a refresh. On GitHub Pages that request 404s and it falls back to `localStorage`,
so the published copy is unchanged.

Data lives at `~/.tiny-projects/data.json`, deliberately outside this repo, which is
public. Override with `TINY_PROJECTS_DATA`.

### MCP server

```bash
claude mcp add -s user tiny-projects -- node /path/to/tiny-projects/mcp/server.js
```

Then: *"add these to tiny projects"*. Tools: `list`, `add_project`, `add_tasks`,
`complete_task`, `update_task`, `delete_task`. Tasks are addressed by id or by a unique
substring of the title; an ambiguous substring returns the candidates rather than
guessing.

No dependencies — it speaks MCP's JSON-RPC over stdio directly, and `lib/store.js` is the
single place that touches the file, so the server and the MCP tools cannot disagree about
its shape. Writes are atomic (temp file + rename) and the browser's `PUT` carries the
version it loaded, so a save that would clobber an MCP write gets a `409` and reloads
instead.
