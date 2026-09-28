# 🖊️ React Canvas Whiteboard

A feature-rich **single-user digital whiteboard** built with **React and HTML5 Canvas**.

The project provides an interactive canvas where users can draw, create shapes, add text and sticky notes, move and resize elements, manage layers, group objects, undo/redo actions, save work locally, and export the whiteboard as a PNG image.

> 🚀 Built as a hands-on React project to understand Canvas API, state management, coordinate systems, event handling, and interactive UI design.

---

## ✨ Features

### 🎨 Drawing & Shapes

* ✏️ Freehand drawing
* ▭ Rectangle tool
* ◯ Circle tool
* 📏 Line tool
* 📝 Text tool
* 🟨 Sticky notes
* Automatic text wrapping inside sticky notes
* Manual line breaks in sticky notes

### 🖱️ Selection & Editing

* Single element selection
* Multi-element selection
* Selection box
* Move elements
* Resize elements
* Delete selected elements
* Eraser functionality
* Sticky note editing
* Escape key to cancel active editing

### 📋 Clipboard Operations

* Copy
* Cut
* Paste
* Duplicate
* Multi-element copy/paste

### 🔄 History Management

* Undo
* Redo
* Custom history stack
* Redo stack reset after a new action

### 🗂️ Object Management

* Group elements
* Ungroup elements
* Bring element to front
* Send element to back
* Layer management
* Multi-element movement

### 🔍 Canvas Navigation

* Zoom in/out
* Canvas panning
* Coordinate conversion between screen and canvas space
* Object interaction after zooming and panning

### 💾 Persistence & Export

* Automatic saving using `localStorage`
* Restore whiteboard state after page refresh
* Export whiteboard as PNG
* Preserve canvas content while exporting

### ⌨️ Keyboard Shortcuts

The application supports keyboard shortcuts for common operations such as:

* Undo
* Redo
* Copy
* Cut
* Paste
* Delete
* Escape / cancel active operation

---

## 🛠️ Tech Stack

| Technology           | Purpose                             |
| -------------------- | ----------------------------------- |
| **React**            | UI and application state management |
| **JavaScript**       | Application logic                   |
| **HTML5 Canvas API** | Drawing and rendering               |
| **CSS**              | Styling and layout                  |
| **Vite**             | Development and build tool          |
| **localStorage**     | Local persistence                   |

---

## 🧠 Core Concepts Implemented

This project focuses on understanding how interactive graphical applications work internally.

### React State Management

React state is used to manage:

* Canvas elements
* Selected elements
* Active tool
* Undo/redo history
* Zoom level
* Canvas pan position
* Text and sticky note editing state

### `useRef`

`useRef` is used for values that need to persist between renders without triggering unnecessary re-renders.

Examples:

* Canvas reference
* Current elements reference
* Selection reference
* Zoom reference
* Pan reference
* Current interaction state
* Temporary drawing state

### Canvas Rendering

The canvas is redrawn whenever the application state changes.

The rendering process:

```text
React State
     ↓
Elements Array
     ↓
Canvas Redraw
     ↓
Individual Elements
     ↓
Pixels on Canvas
```

### Coordinate Transformation

The project converts between screen coordinates and world/canvas coordinates while handling zoom and pan.

Conceptually:

```text
Screen Coordinates
        ↓
Remove Pan Offset
        ↓
Divide by Zoom
        ↓
Canvas / World Coordinates
```

This allows objects to remain interactive even after zooming and panning.

### Hit Testing

When the user clicks on the canvas, the application determines which element was clicked.

Different element types use different bounding or geometric checks:

```text
Mouse Position
      ↓
Check Elements
      ↓
Hit Test
      ↓
Selected Element
```

### Custom Undo / Redo

The application maintains custom history and redo stacks.

```text
Current State
     ↓
Save History
     ↓
User Action
     ↓
New State
```

Undo moves the current state into the redo stack and restores the previous state.

A new action after undo clears the redo stack.

---

## 📂 Project Structure

```text
collaborative-style-whiteboard/
│
├── public/
│
├── src/
│   ├── App.jsx
│   ├── App.css
│   └── ...
│
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

> The exact contents of `src/` may change as the project evolves.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
```

### 2. Navigate into the project

```bash
cd collaborative-style-whiteboard
```

### 3. Install dependencies

```bash
npm install
```

### 4. Start the development server

```bash
npm run dev
```

### 5. Open the application

Vite will provide a local development URL, usually similar to:

```text
http://localhost:5173
```

---

## 🎯 Learning Objectives

This project was built to gain practical experience with:

* React component-based development
* React Hooks
* `useState`
* `useRef`
* `useEffect`
* HTML5 Canvas API
* Mouse event handling
* Keyboard event handling
* Coordinate transformations
* Geometric calculations
* Hit testing
* State synchronization
* Undo/redo architecture
* Local storage
* Client-side file/image export
* Interactive UI design

---

## 🔮 Future Improvements

Possible future improvements include:

* Real-time multi-user collaboration
* WebSocket-based synchronization
* User authentication
* Cloud persistence
* Multiple boards
* Custom colors and brush sizes
* Advanced text formatting
* Better touch/mobile support
* Real-time cursors for multiple users
* Backend-based board storage
* Collaborative conflict resolution

---

## ⚠️ Current Limitations

This version is designed as a **single-user local whiteboard**.

* Board data is stored locally in the browser.
* There is currently no real-time multi-user collaboration.
* Data is not synchronized between different devices.
* Advanced text formatting is limited.
* Canvas rendering is currently focused on desktop interaction.

---

## 📌 Project Status

**Status: Completed — Portfolio Ready**

The current version includes the core whiteboard functionality, editing tools, object management, persistence, export, and interaction features.

---

## 👨‍💻 Author

**Siddharth Darindat**

B.Tech — Computer Science & Engineering

Interested in:

* Web Development
* React
* JavaScript
* Problem Solving
* Interactive Web Applications

---

## ⭐ Acknowledgements

Built as a learning and portfolio project while exploring **React, JavaScript, a**
