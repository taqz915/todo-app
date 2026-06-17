# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A vanilla JavaScript Todo List application with priority management and drag-and-drop functionality. Built with HTML, CSS, and JavaScript (no frameworks), featuring Material Design UI and Supabase backend for data persistence.

## Architecture

### Core Components

**TodoApp Class** (`script.js`)
- Single class managing all application state and behavior
- Main properties:
  - `todos`: Array of todo objects with `{id, text, completed, priority, position, createdAt}`
  - `userName`: User's name for personalization
  - `currentUser`: Current user object from Supabase with `{id, name}`
  - `selectedPriority`: Currently selected priority for new todos ('high' | 'medium' | 'low')
  - `draggedItem`: Reference to the currently dragged DOM element
  - `isInitialized`: Boolean flag for async initialization completion

**Priority System**
- Three priority levels: `high`, `medium`, `low`
- Each priority has its own list section with color coding:
  - High: Red gradient (#f44336)
  - Medium: Orange gradient (#ff9800)
  - Low: Green gradient (#4caf50)
- Todos are stored in a single array, filtered by priority for rendering

**Drag and Drop**
- Native HTML5 Drag and Drop API
- Supports reordering within same priority
- Supports moving between different priorities (auto-updates priority on drop)
- Event listeners attached at two levels:
  - Drop zones (`.todo-list`): Set up once in `setupDragAndDropZones()`
  - Todo items: Set up per item in `setupTodoItemDrag()`
- Visual feedback: opacity changes, scale transforms, dashed borders

### Data Flow

1. **User Input** → `addTodo()` → Insert to Supabase → Append to `todos` array → `render()`
2. **Toggle Complete** → Find todo by ID → Update Supabase → Toggle local `completed` flag → Re-render
3. **Delete** → Delete from Supabase → Filter out by ID → Re-render
4. **Drag & Drop** → Calculate new position → Splice and reinsert → `updateTodoPositions()` (batch update to Supabase) → Re-render

### Storage

**Supabase Database**
- `users` table: Stores user information
- `todos` table: Stores todo items with foreign key to users
- Data persists across sessions and devices
- See `SUPABASE.md` for detailed schema

**localStorage** (fallback)
- `currentUserName`: Cached username for quick load
- `todoApp_backup`: Backup of migrated localStorage data

## Development

### Running the Application

Simply open `index.html` in a browser. No build step or server required.

```bash
# Quick local server (recommended for testing)
python3 -m http.server 8000
# or
npx serve
```

Then open http://localhost:8000 in your browser.

### File Structure

- `index.html` - DOM structure with Material Icons CDN and Supabase CDN
- `styles.css` - Material Design styling with CSS custom properties, responsive breakpoints at 768px and 480px
- `script.js` - All application logic in a single `TodoApp` class with async Supabase integration
- `SUPABASE.md` - Supabase setup and migration guide
- `CLAUDE.md` - This file

### Testing Protocol

**IMPORTANT**: After every source code modification, you MUST:

1. **Start local server** (if not already running):
   ```bash
   python3 -m http.server 8000 &
   ```

2. **Open browser and test manually**:
   - Open http://localhost:8000
   - Open Developer Tools Console (F12) to check for errors
   - Test the modified functionality step by step

3. **Verify core functionality**:
   - [ ] User name input works (type name and click login button or press Enter)
   - [ ] Login button triggers user creation/lookup (not on every keystroke)
   - [ ] Greeting message displays after login
   - [ ] Priority button selection works (active class toggles)
   - [ ] Todo input accepts text
   - [ ] Add button creates new todo (requires user login first)
   - [ ] Todos appear in correct priority section
   - [ ] Toggle complete/incomplete works
   - [ ] Delete button removes todo
   - [ ] Drag and drop reordering works within same priority
   - [ ] Drag and drop between different priorities works
   - [ ] Stats (completed/pending count) update correctly
   - [ ] Page refresh preserves data (Supabase persistence)

4. **Check console for errors**:
   - Supabase connection errors
   - Async/await errors
   - Database query failures
   - Permission/CORS errors

5. **Test database operations** (via browser console):
   ```javascript
   // Check if Supabase is connected
   console.log(supabase);
   
   // Check current user
   console.log(app.currentUser);
   
   // Check todos array
   console.log(app.todos);
   ```

6. **Report results**:
   - If test passes: Confirm working functionality
   - If test fails: Report exact error message from console and describe what didn't work

**Never skip testing after code changes.** Even small changes can break async flows or database operations.

### Key Implementation Details

**Event Listener Management**
- Drop zone listeners attached once in `init()` via `setupDragAndDropZones()`
- Todo item drag listeners attached per render via `setupTodoItemDrag()`
- This prevents duplicate listener registration on re-renders

**Drag and Drop Position Calculation**
- `getDragAfterElement()` uses `getBoundingClientRect()` to find insertion point
- When dropping in empty list, calculates index based on priority order
- When changing priority, moves item to end of target priority group

**XSS Prevention**
- `escapeHtml()` sanitizes user input before rendering
- Uses `textContent` assignment instead of `innerHTML` for user data

**Async/Await Architecture**
- All Supabase operations are async and must use `await`
- `init()` method is async and called from constructor (runs without blocking)
- Event handlers call async methods but don't await (fire and forget pattern)
- Error handling with try-catch in critical paths
- Debug logging enabled for development (console.log statements throughout)

## Git Workflow

**Important**: This repository uses **merge commits**, not rebase.

```bash
# When pulling changes
git pull origin main

# When creating commits
git add <files>
git commit -m "message"

# Avoid using rebase commands
# ❌ git pull --rebase
# ❌ git rebase main
```

## Working Directory Scope

This CLAUDE.md applies only to the `todo` directory:
```
/home/ubuntu/work/kosa-vibecoding-2026-3rd/src/exercise/taqz915/day02/todo/
```

When using git commands, only read/modify files within this directory. Parent directories contain separate projects.
