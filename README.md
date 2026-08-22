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
open /Users/mattdyor/Documents/tiny-projects/index.html
```

Or serve it with any local static server:
```bash
npx serve /Users/mattdyor/Documents/tiny-projects
# or
python3 -m http.server 8080 --directory /Users/mattdyor/Documents/tiny-projects
```
