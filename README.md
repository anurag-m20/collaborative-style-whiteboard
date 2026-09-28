# 🖊️ React Canvas Whiteboard

A feature-rich **single-user digital whiteboard** built with **React and HTML5 Canvas**.

The application provides an interactive canvas where users can draw, create shapes, add text and sticky notes, move and resize elements, manage layers, group objects, undo/redo actions, save work locally, and export the whiteboard as a PNG image.

> 🚀 Built as a hands-on React project to understand Canvas API, state management, coordinate systems, event handling, and interactive UI development.

---

## ✨ Features

### 🎨 Drawing & Shapes

* Freehand drawing
* Rectangle tool
* Circle tool
* Line tool
* Text tool
* Sticky notes
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

| Technology       | Purpose                             |
| ---------------- | ----------------------------------- |
| React            | UI and application state management |
| JavaScript       | Application logic                   |
| HTML5 Canvas API | Drawing and rendering               |
| CSS              | Styling and layout                  |
| Vite             | Development and build tool          |
| localStorage     | Local data persistence              |

---

## 🧠 Core Concepts Implemented

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

Examples include:

* Canvas reference
* Current elements reference
* Selection reference
* Zoom reference
* Pan position
* Current interaction state
* Temporary drawing state

### Canvas Rendering

The canvas is redrawn whenever the relevant application state changes.

```text
React State
     ↓
Elements Array
     ↓
Canvas Redraw
     ↓
Individual Elements
     ↓
Canvas Rendering
```

### Coordinate Transformation

The project converts between screen coordinates and canvas/world coordinates while handling zoom and pan.

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

When the user interacts with the canvas, the application determines which element is being targeted.

```text
Mouse Position
      ↓
Check Elements
      ↓
Hit Testing
      ↓
Target Element
```

Different element types use appropriate geometric and bounding-box calculations.

### Undo / Redo

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

Undo restores a previous state while moving the current state into the redo stack.

When a new action is performed after undo, the redo stack is cleared.

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

---

## 🚀 Getting Started

### Prerequisites

Make sure you have **Node.js** and **npm** installed.

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

Vite will provide a local development URL, usually:

```text
http://localhost:5173
```

---

## 🎯 Learning Objectives

This project was developed to gain practical experience with:

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
* Client-side image export
* Interactive UI development

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
* Better touch and mobile support
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
* The current implementation is primarily designed for desktop interaction.

---

## 📌 Project Status

**Status: Completed**

The current version includes the core whiteboard functionality, editing tools, object management, persistence, export, and interactive canvas features.

---

## 👨‍💻 Author

**Anurag Mishra**

B.Tech — Computer Science & Engineering

Interested in:

* Web Development
* React
* JavaScript
* Problem Solving
* Interactive Web Applications

---

## ⭐ Acknowledgements

Built as a learning and portfolio project while exploring **React, JavaScript, and the HTML5 Canvas API**.
