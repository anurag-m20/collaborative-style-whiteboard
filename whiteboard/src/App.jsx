import { useEffect, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "whiteboard-elements";

function App() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // -----------------------------
  // STATE
  // -----------------------------

  const [elements, setElements] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  const elementsRef = useRef(elements);

  const [tool, setTool] = useState("select");
  const [stickyInput, setStickyInput] = useState(null);
const [stickyValue, setStickyValue] = useState("");
const [editingStickyId, setEditingStickyId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const selectedRef = useRef([]);

  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);

  const [pan, setPan] = useState({
    x: 0,
    y: 0,
  });

  const panRef = useRef({
    x: 0,
    y: 0,
  });

  const [textInput, setTextInput] = useState(null);
  const [textValue, setTextValue] = useState("");

  const [copiedElements, setCopiedElements] = useState([]);

  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight - 60,
  });

  const spacePressed = useRef(false);

  // Current mouse interaction
  const interaction = useRef({
    mode: null,
    start: null,
    current: null,
    ids: [],
    originalElements: [],
    handle: null,
    originalElement: null,
  });

  // Temporary rectangle/circle/line/freehand
  const draft = useRef(null);

  // -----------------------------
  // BASIC HELPERS
  // -----------------------------

  const createId = () => {
    return (
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 9)
    );
  };

  const clone = (value) => {
    return JSON.parse(JSON.stringify(value));
  };

  const updateElements = (next) => {
    elementsRef.current = next;
    setElements(next);
  };

  const updateSelection = (ids) => {
    selectedRef.current = ids;
    setSelectedIds(ids);
  };

  const saveHistory = () => {
    setHistory((prev) => [
      ...prev,
      clone(elementsRef.current),
    ]);

    setRedoStack([]);
  };

  // -----------------------------
  // SCREEN -> WORLD COORDINATES
  // -----------------------------

  const getMousePosition = (e) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    return {
      x:
        (screenX - panRef.current.x) /
        zoomRef.current,

      y:
        (screenY - panRef.current.y) /
        zoomRef.current,
    };
  };

  const getScreenPosition = (e) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // -----------------------------
  // GROUP HELPERS
  // -----------------------------

  const expandGroups = (
    ids,
    source = elementsRef.current
  ) => {
    const result = new Set(ids);

    let changed = true;

    while (changed) {
      changed = false;

      source.forEach((element) => {
        if (!element.groupId) {
          return;
        }

        const groupSelected = source.some(
          (item) =>
            item.groupId === element.groupId &&
            result.has(item.id)
        );

        if (
          groupSelected &&
          !result.has(element.id)
        ) {
          result.add(element.id);
          changed = true;
        }
      });
    }

    return [...result];
  };

  // -----------------------------
  // ELEMENT BOUNDS
  // -----------------------------

  const getBounds = (element) => {
    if (element.type === "rectangle") {
      return {
        left: Math.min(
          element.x,
          element.x + element.width
        ),

        top: Math.min(
          element.y,
          element.y + element.height
        ),

        right: Math.max(
          element.x,
          element.x + element.width
        ),

        bottom: Math.max(
          element.y,
          element.y + element.height
        ),
      };
    }

    if (element.type === "circle") {
      return {
        left: element.x - element.radius,
        top: element.y - element.radius,
        right: element.x + element.radius,
        bottom: element.y + element.radius,
      };
    }

    if (element.type === "line") {
      return {
        left: Math.min(
          element.x1,
          element.x2
        ),

        top: Math.min(
          element.y1,
          element.y2
        ),

        right: Math.max(
          element.x1,
          element.x2
        ),

        bottom: Math.max(
          element.y1,
          element.y2
        ),
      };
    }

    if (element.type === "drawing") {
      if (
        !element.points ||
        element.points.length === 0
      ) {
        return {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        };
      }

      const xs = element.points.map(
        (point) => point.x
      );

      const ys = element.points.map(
        (point) => point.y
      );

      return {
        left: Math.min(...xs),
        top: Math.min(...ys),
        right: Math.max(...xs),
        bottom: Math.max(...ys),
      };
    }
if (element.type === "sticky") {
  return {
    left: element.x,
    top: element.y,
    right: element.x + element.width,
    bottom: element.y + element.height,
  };
}
    if (element.type === "text") {
      return {
        left: element.x,
        top: element.y - element.size,
        right:
          element.x +
          element.text.length *
            element.size *
            0.6,

        bottom: element.y + 5,
      };
    }

    return {
      left: element.x || 0,
      top: element.y || 0,
      right: element.x || 0,
      bottom: element.y || 0,
    };
  };

  const getSelectionBounds = (ids) => {
    const selected = elementsRef.current.filter(
      (element) => ids.includes(element.id)
    );

    if (selected.length === 0) {
      return null;
    }

    const bounds = selected.map(getBounds);

    return {
      left: Math.min(
        ...bounds.map((b) => b.left)
      ),

      top: Math.min(
        ...bounds.map((b) => b.top)
      ),

      right: Math.max(
        ...bounds.map((b) => b.right)
      ),

      bottom: Math.max(
        ...bounds.map((b) => b.bottom)
      ),
    };
  };

  // -----------------------------
  // DRAW ELEMENT
  // -----------------------------

  const drawElement = (ctx, element) => {
    ctx.save();

    ctx.strokeStyle =
      element.color || "#111";

    ctx.fillStyle =
      element.color || "#111";

    ctx.lineWidth =
      element.lineWidth || 3;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // FREEHAND
    if (element.type === "drawing") {
      if (
        !element.points ||
        element.points.length < 2
      ) {
        ctx.restore();
        return;
      }

      ctx.beginPath();

      ctx.moveTo(
        element.points[0].x,
        element.points[0].y
      );

      element.points
        .slice(1)
        .forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });

      ctx.stroke();
    }

    // RECTANGLE
    if (element.type === "rectangle") {
      ctx.strokeRect(
        element.x,
        element.y,
        element.width,
        element.height
      );
    }

    // CIRCLE
    if (element.type === "circle") {
      ctx.beginPath();

      ctx.arc(
        element.x,
        element.y,
        Math.abs(element.radius),
        0,
        Math.PI * 2
      );

      ctx.stroke();
    }

    // LINE
    if (element.type === "line") {
      ctx.beginPath();

      ctx.moveTo(
        element.x1,
        element.y1
      );

      ctx.lineTo(
        element.x2,
        element.y2
      );

      ctx.stroke();
    }

    // TEXT
    if (element.type === "text") {
      ctx.font = `${element.size}px Arial`;

      ctx.fillText(
        element.text,
        element.x,
        element.y
      );
    }

    
    if (element.type === "sticky") {
  // Yellow background
  ctx.fillStyle = element.color || "#fef08a";

  ctx.fillRect(
    element.x,
    element.y,
    element.width,
    element.height
  );

  // Border
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = element.lineWidth || 1;

  ctx.strokeRect(
    element.x,
    element.y,
    element.width,
    element.height
  );

 
  // Text
  ctx.fillStyle = "#111827";
  ctx.font = "16px Arial";

  const maxWidth = element.width - 24;
const paragraphs = element.text.split("\n");


const lines = [];
paragraphs.forEach((paragraph) =>{
  const words = paragraph.split(" ");
let currentLine = "";

words.forEach((word) => {
  const testLine = currentLine
    ? currentLine + " " + word
    : word;
const width = ctx.measureText(testLine).width;

if (width > maxWidth) {
  if (currentLine) {
    lines.push(currentLine);
    currentLine = "";
  }

  // Agar single word bhi bahut bada hai
  if (ctx.measureText(word).width > maxWidth) {
    let partialWord = "";

    for (const char of word) {
      const testPart = partialWord + char;

      if (
        ctx.measureText(testPart).width > maxWidth &&
        partialWord
      ) {
        lines.push(partialWord);
        partialWord = char;
      } else {
        partialWord = testPart;
      }
    }

    currentLine = partialWord;
  } else {
    currentLine = word;
  }
} else {
  currentLine = testLine;
}
});

if (currentLine) {
  lines.push(currentLine);
}
    });
const lineHeight = 20;
const maxLines = Math.floor(
  (element.height - 30) / lineHeight
);

lines.slice(0, maxLines).forEach((line, index) => {
  ctx.fillText(
    line,
    element.x + 12,
    element.y + 25 + index * lineHeight
  );
});
}
ctx.restore();
  };

  // -----------------------------
  // DRAW HANDLE
  // -----------------------------

  const drawHandle = (ctx, x, y) => {
    const size =
      8 / zoomRef.current;

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#2563eb";

    ctx.lineWidth =
      2 / zoomRef.current;

    ctx.fillRect(
      x - size / 2,
      y - size / 2,
      size,
      size
    );

    ctx.strokeRect(
      x - size / 2,
      y - size / 2,
      size,
      size
    );
  };

  // -----------------------------
  // DRAW SELECTION
  // -----------------------------

  const drawSelection = (ctx) => {
    const ids = selectedRef.current;

    if (ids.length === 0) {
      return;
    }

    const bounds =
      getSelectionBounds(ids);

    if (!bounds) {
      return;
    }

    ctx.save();

    ctx.strokeStyle = "#2563eb";

    ctx.lineWidth =
      1 / zoomRef.current;

    ctx.setLineDash([
      6 / zoomRef.current,
      4 / zoomRef.current,
    ]);

    ctx.strokeRect(
      bounds.left,
      bounds.top,
      bounds.right - bounds.left,
      bounds.bottom - bounds.top
    );

    ctx.setLineDash([]);

    // Resize handles only for
    // exactly one non-group element
    if (ids.length === 1) {
      const element =
        elementsRef.current.find(
          (item) => item.id === ids[0]
        );

      if (
        element &&
        !element.groupId
      ) {
        // Rectangle / drawing
        if (
          element.type === "rectangle" ||
          element.type === "drawing"   ||
          element.type === "sticky"
        ) {
          drawHandle(
            ctx,
            bounds.left,
            bounds.top
          );

          drawHandle(
            ctx,
            bounds.right,
            bounds.top
          );

          drawHandle(
            ctx,
            bounds.left,
            bounds.bottom
          );

          drawHandle(
            ctx,
            bounds.right,
            bounds.bottom
          );
        }

        // Circle
        if (
          element.type === "circle"
        ) {
          drawHandle(
            ctx,
            bounds.right,
            element.y
          );
        }

        // Line
        if (
          element.type === "line"
        ) {
          drawHandle(
            ctx,
            element.x1,
            element.y1
          );

          drawHandle(
            ctx,
            element.x2,
            element.y2
          );
        }
      }
    }

    ctx.restore();
  };

  // -----------------------------
  // REDRAW CANVAS
  // -----------------------------

  const redraw = () => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx =
      canvas.getContext("2d");

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.save();

    // PAN
    ctx.translate(
      panRef.current.x,
      panRef.current.y
    );

    // ZOOM
    ctx.scale(
      zoomRef.current,
      zoomRef.current
    );

    // Existing elements
    elementsRef.current.forEach(
      (element) => {
        drawElement(ctx, element);
      }
    );

    // Temporary drawing/shape
    if (draft.current) {
      drawElement(
        ctx,
        draft.current
      );
    }

    // Selection
    drawSelection(ctx);

    // Selection rectangle
    if (
      interaction.current.mode ===
        "selectBox" &&
      interaction.current.start &&
      interaction.current.current
    ) {
      const start =
        interaction.current.start;

      const current =
        interaction.current.current;

      const x = Math.min(
        start.x,
        current.x
      );

      const y = Math.min(
        start.y,
        current.y
      );

      const width = Math.abs(
        current.x - start.x
      );

      const height = Math.abs(
        current.y - start.y
      );

      ctx.save();

      ctx.strokeStyle =
        "#2563eb";

      ctx.fillStyle =
        "rgba(37,99,235,0.08)";

      ctx.lineWidth =
        1 / zoomRef.current;

      ctx.setLineDash([
        5 / zoomRef.current,
        4 / zoomRef.current,
      ]);

      ctx.fillRect(
        x,
        y,
        width,
        height
      );

      ctx.strokeRect(
        x,
        y,
        width,
        height
      );

      ctx.restore();
    }

    ctx.restore();
  };

  // -----------------------------
  // RESIZE HANDLE DETECTION
  // -----------------------------

  const nearPoint = (
    x1,
    y1,
    x2,
    y2,
    threshold
  ) => {
    return (
      Math.hypot(
        x1 - x2,
        y1 - y2
      ) <= threshold
    );
  };

  const getResizeHandle = (
    x,
    y
  ) => {
    if (
      selectedRef.current.length !== 1
    ) {
      return null;
    }

    const element =
      elementsRef.current.find(
        (item) =>
          item.id ===
          selectedRef.current[0]
      );

    if (
      !element ||
      element.groupId
    ) {
      return null;
    }

    const threshold =
      12 / zoomRef.current;

    const bounds =
      getBounds(element);

    // Rectangle / Drawing
    if (
      element.type ===
        "rectangle" ||
      element.type ===
        "drawing" ||
        element.type ==="sticky"
    ) {
      if (
        nearPoint(
          x,
          y,
          bounds.left,
          bounds.top,
          threshold
        )
      ) {
        return "nw";
      }

      if (
        nearPoint(
          x,
          y,
          bounds.right,
          bounds.top,
          threshold
        )
      ) {
        return "ne";
      }

      if (
        nearPoint(
          x,
          y,
          bounds.left,
          bounds.bottom,
          threshold
        )
      ) {
        return "sw";
      }

      if (
        nearPoint(
          x,
          y,
          bounds.right,
          bounds.bottom,
          threshold
        )
      ) {
        return "se";
      }
    }

    // Circle
    if (
      element.type === "circle"
    ) {
      if (
        nearPoint(
          x,
          y,
          bounds.right,
          element.y,
          threshold
        )
      ) {
        return "circle";
      }
    }

    // Line
    if (
      element.type === "line"
    ) {
      if (
        nearPoint(
          x,
          y,
          element.x1,
          element.y1,
          threshold
        )
      ) {
        return "start";
      }

      if (
        nearPoint(
          x,
          y,
          element.x2,
          element.y2,
          threshold
        )
      ) {
        return "end";
      }
    }

    return null;
  };

  // -----------------------------
  // RESIZE ELEMENT
  // -----------------------------

  const resizeElement = (
    original,
    handle,
    x,
    y
  ) => {
    const element =
      clone(original);

    // RECTANGLE
    if (
      element.type ===
      "rectangle"
    ) {
      const right =
        original.x +
        original.width;

      const bottom =
        original.y +
        original.height;

      if (handle === "nw") {
        element.x = x;
        element.y = y;

        element.width =
          right - x;

        element.height =
          bottom - y;
      }

      if (handle === "ne") {
        element.y = y;

        element.width =
          x - original.x;

        element.height =
          bottom - y;
      }

      if (handle === "sw") {
        element.x = x;

        element.width =
          right - x;

        element.height =
          y - original.y;
      }

      if (handle === "se") {
        element.width =
          x - original.x;

        element.height =
          y - original.y;
      }

      return element;
    }

    // STICKY
if (element.type === "sticky") {
  const right = original.x + original.width;
  const bottom = original.y + original.height;

  if (handle === "nw") {
    element.x = x;
    element.y = y;
    element.width = right - x;
    element.height = bottom - y;
  }

  if (handle === "ne") {
    element.y = y;
    element.width = x - original.x;
    element.height = bottom - y;
  }

  if (handle === "sw") {
    element.x = x;
    element.width = right - x;
    element.height = y - original.y;
  }

  if (handle === "se") {
    element.width = x - original.x;
    element.height = y - original.y;
  }

  return element;
}

    // CIRCLE
    if (
      element.type ===
      "circle"
    ) {
      element.radius =
        Math.max(
          5,
          Math.abs(
            x - original.x
          )
        );

      return element;
    }

    // LINE
    if (
      element.type === "line"
    ) {
      if (
        handle === "start"
      ) {
        element.x1 = x;
        element.y1 = y;
      }

      if (
        handle === "end"
      ) {
        element.x2 = x;
        element.y2 = y;
      }

      return element;
    }

    // FREEHAND DRAWING
    if (
      element.type ===
      "drawing"
    ) {
      const oldBounds =
        getBounds(original);

      let newLeft =
        oldBounds.left;

      let newTop =
        oldBounds.top;

      let newRight =
        oldBounds.right;

      let newBottom =
        oldBounds.bottom;

      if (handle === "nw") {
        newLeft = x;
        newTop = y;
      }

      if (handle === "ne") {
        newRight = x;
        newTop = y;
      }

      if (handle === "sw") {
        newLeft = x;
        newBottom = y;
      }

      if (handle === "se") {
        newRight = x;
        newBottom = y;
      }

      const oldWidth =
        oldBounds.right -
          oldBounds.left || 1;

      const oldHeight =
        oldBounds.bottom -
          oldBounds.top || 1;

      const newWidth =
        newRight - newLeft;

      const newHeight =
        newBottom - newTop;

      element.points =
        original.points.map(
          (point) => ({
            x:
              newLeft +
              ((point.x -
                oldBounds.left) /
                oldWidth) *
                newWidth,

            y:
              newTop +
              ((point.y -
                oldBounds.top) /
                oldHeight) *
                newHeight,
          })
        );

      return element;
    }

    return element;
  };

  // -----------------------------
  // LINE HIT TEST
  // -----------------------------

  const isPointNearLine = (
    px,
    py,
    x1,
    y1,
    x2,
    y2,
    threshold
  ) => {
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (
      dx === 0 &&
      dy === 0
    ) {
      return (
        Math.hypot(
          px - x1,
          py - y1
        ) <= threshold
      );
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        (
          (px - x1) * dx +
          (py - y1) * dy
        ) /
          (dx * dx +
            dy * dy)
      )
    );

    const closestX =
      x1 + t * dx;

    const closestY =
      y1 + t * dy;

    return (
      Math.hypot(
        px - closestX,
        py - closestY
      ) <= threshold
    );
  };

  // -----------------------------
  // HIT TEST
  // -----------------------------

  const hitTest = (
    x,
    y
  ) => {
    const threshold =
      10 / zoomRef.current;

    for (
      let i =
        elementsRef.current.length -
        1;
      i >= 0;
      i--
    ) {
      const element =
        elementsRef.current[i];

      // Rectangle
      if (
        element.type ===
        "rectangle"
      ) {
        const bounds =
          getBounds(element);

        if (
          x >=
            bounds.left -
              threshold &&
          x <=
            bounds.right +
              threshold &&
          y >=
            bounds.top -
              threshold &&
          y <=
            bounds.bottom +
              threshold
        ) {
          return element;
        }
      }

      // Circle
      if (
        element.type ===
        "circle"
      ) {
        const distance =
          Math.hypot(
            x - element.x,
            y - element.y
          );

        if (
          Math.abs(
            distance -
              element.radius
          ) <= threshold
        ) {
          return element;
        }
      }

      // Line
      if (
        element.type === "line"
      ) {
        if (
          isPointNearLine(
            x,
            y,
            element.x1,
            element.y1,
            element.x2,
            element.y2,
            threshold
          )
        ) {
          return element;
        }
      }

      // Drawing
      if (
        element.type ===
        "drawing"
      ) {
        for (
          let j = 1;
          j <
          element.points.length;
          j++
        ) {
          const p1 =
            element.points[
              j - 1
            ];

          const p2 =
            element.points[j];

          if (
            isPointNearLine(
              x,
              y,
              p1.x,
              p1.y,
              p2.x,
              p2.y,
              threshold
            )
          ) {
            return element;
          }
        }
      }

      // Sticky
if (element.type === "sticky") {
  const bounds = getBounds(element);

  if (
    x >= bounds.left - threshold &&
    x <= bounds.right + threshold &&
    y >= bounds.top - threshold &&
    y <= bounds.bottom + threshold
  ) {
    return element;
  }
}
      // Text
      if (
        element.type ===
        "text"
      ) {
        const bounds =
          getBounds(element);

        if (
          x >=
            bounds.left -
              threshold &&
          x <=
            bounds.right +
              threshold &&
          y >=
            bounds.top -
              threshold &&
          y <=
            bounds.bottom +
              threshold
        ) {
          return element;
        }
      }
    }

    return null;
  };

  // -----------------------------
  // MOVE ELEMENT
  // -----------------------------

  const moveElement = (
    element,
    dx,
    dy
  ) => {
    const e = clone(element);

    if (
      e.type === "rectangle" ||
      e.type === "circle" ||
      e.type === "text" ||
      e.type === "sticky"
    ) {
      e.x += dx;
      e.y += dy;

      return e;
    }

    if (
      e.type === "line"
    ) {
      e.x1 += dx;
      e.y1 += dy;

      e.x2 += dx;
      e.y2 += dy;

      return e;
    }

    if (
      e.type === "drawing"
    ) {
      e.points =
        e.points.map(
          (point) => ({
            x: point.x + dx,
            y: point.y + dy,
          })
        );

      return e;
    }

    return e;
  };

  // -----------------------------
  // CREATE NEW ELEMENT
  // -----------------------------

  const finishDraft = () => {
    if (!draft.current) {
      return;
    }

    const d = draft.current;

    if (
      d.type ===
      "drawing"
    ) {
      if (
        d.points.length >= 2
      ) {
        updateElements([
          ...elementsRef.current,
          {
            id: createId(),
            type: "drawing",
            points: d.points,
            color: "#111111",
            lineWidth: 3,
          },
        ]);
      }
    }

    if (
      d.type ===
      "rectangle"
    ) {
      updateElements([
        ...elementsRef.current,
        {
          id: createId(),
          type: "rectangle",
          x: d.startX,
          y: d.startY,
          width:
            d.currentX -
            d.startX,
          height:
            d.currentY -
            d.startY,
          color: "#111111",
          lineWidth: 3,
        },
      ]);
    }

    if (
      d.type ===
      "circle"
    ) {
      const radius =
        Math.hypot(
          d.currentX -
            d.startX,
          d.currentY -
            d.startY
        );

      updateElements([
        ...elementsRef.current,
        {
          id: createId(),
          type: "circle",
          x: d.startX,
          y: d.startY,
          radius,
          color: "#111111",
          lineWidth: 3,
        },
      ]);
    }

    if (
      d.type === "line"
    ) {
      updateElements([
        ...elementsRef.current,
        {
          id: createId(),
          type: "line",
          x1: d.startX,
          y1: d.startY,
          x2: d.currentX,
          y2: d.currentY,
          color: "#111111",
          lineWidth: 3,
        },
      ]);
    }

    draft.current = null;
  };

  // -----------------------------
  // INTERSECTION
  // -----------------------------

  const boxesIntersect = (
    a,
    b
  ) => {
    return !(
      a.right < b.left ||
      a.left > b.right ||
      a.bottom < b.top ||
      a.top > b.bottom
    );
  };

  // -----------------------------
  // GROUP
  // -----------------------------

  const groupSelected = () => {
    const ids =
      selectedRef.current;

    if (ids.length < 2) {
      return;
    }

    saveHistory();

    const groupId =
      createId();

    const next =
      elementsRef.current.map(
        (element) => {
          if (
            ids.includes(
              element.id
            )
          ) {
            return {
              ...element,
              groupId,
            };
          }

          return element;
        }
      );

    updateElements(next);

    updateSelection(ids);
  };

  const ungroupSelected = () => {
    const ids =
      selectedRef.current;

    if (ids.length === 0) {
      return;
    }

    const groupIds =
      new Set();

    elementsRef.current.forEach(
      (element) => {
        if (
          ids.includes(
            element.id
          ) &&
          element.groupId
        ) {
          groupIds.add(
            element.groupId
          );
        }
      }
    );

    if (
      groupIds.size === 0
    ) {
      return;
    }

    saveHistory();

    const next =
      elementsRef.current.map(
        (element) => {
          if (
            element.groupId &&
            groupIds.has(
              element.groupId
            )
          ) {
            const copy =
              { ...element };

            delete copy.groupId;

            return copy;
          }

          return element;
        }
      );

    updateElements(next);
  };

  // -----------------------------
  // COPY HELPERS
  // -----------------------------

  const createCopies = (
    source
  ) => {
    const groupMap =
      new Map();

    source.forEach(
      (element) => {
        if (
          element.groupId &&
          !groupMap.has(
            element.groupId
          )
        ) {
          groupMap.set(
            element.groupId,
            createId()
          );
        }
      }
    );

    return source.map(
      (element) => {
        const copy =
          clone(element);

        copy.id =
          createId();

        if (
          copy.groupId
        ) {
          copy.groupId =
            groupMap.get(
              copy.groupId
            );
        }

        return moveElement(
          copy,
          20,
          20
        );
      }
    );
  };

  const copySelected = () => {
    const ids =
      expandGroups(
        selectedRef.current
      );

    const source =
      elementsRef.current.filter(
        (element) =>
          ids.includes(
            element.id
          )
      );

    if (
      source.length === 0
    ) {
      return;
    }

    setCopiedElements(
      clone(source)
    );
  };
const cutSelected = () => {
  const ids = expandGroups(
    selectedRef.current
  );

  const source =
    elementsRef.current.filter(
      (element) =>
        ids.includes(element.id)
    );

  if (source.length === 0) {
    return;
  }

  setCopiedElements(
    clone(source)
  );

  saveHistory();

  updateElements(
    elementsRef.current.filter(
      (element) =>
        !ids.includes(element.id)
    )
  );

  updateSelection([]);
};
  const pasteElements = () => {
    if (
      copiedElements.length === 0
    ) {
      return;
    }

    saveHistory();

    const newElements =
      createCopies(
        copiedElements
      );

    updateElements([
      ...elementsRef.current,
      ...newElements,
    ]);

    updateSelection(
      newElements.map(
        (element) =>
          element.id
      )
    );
  };

  const duplicateSelected = () => {
    const ids =
      expandGroups(
        selectedRef.current
      );

    const source =
      elementsRef.current.filter(
        (element) =>
          ids.includes(
            element.id
          )
      );

    if (
      source.length === 0
    ) {
      return;
    }

    saveHistory();

    const copies =
      createCopies(source);

    updateElements([
      ...elementsRef.current,
      ...copies,
    ]);

    updateSelection(
      copies.map(
        (element) =>
          element.id
      )
    );
  };
    // -----------------------------
  // DELETE SELECTED
  // -----------------------------

  const deleteSelected = () => {
    const ids = expandGroups(
      selectedRef.current
    );

    if (ids.length === 0) {
      return;
    }

    saveHistory();

    const next =
      elementsRef.current.filter(
        (element) =>
          !ids.includes(element.id)
      );

    updateElements(next);
    updateSelection([]);
  };

  // -----------------------------
  // UNDO
  // -----------------------------

  const undo = () => {
    if (history.length === 0) {
      return;
    }

    const previous =
      history[history.length - 1];

    setRedoStack((prev) => [
      ...prev,
      clone(elementsRef.current),
    ]);

    setHistory((prev) =>
      prev.slice(0, -1)
    );

    updateElements(
      clone(previous)
    );

    updateSelection([]);
  };

  // -----------------------------
  // REDO
  // -----------------------------

  const redo = () => {
    if (redoStack.length === 0) {
      return;
    }

    const next =
      redoStack[redoStack.length - 1];

    setHistory((prev) => [
      ...prev,
      clone(elementsRef.current),
    ]);

    setRedoStack((prev) =>
      prev.slice(0, -1)
    );

    updateElements(
      clone(next)
    );

    updateSelection([]);
  };

  // -----------------------------
  // CLEAR BOARD
  // -----------------------------

  const clearBoard = () => {
    if (
      elementsRef.current.length === 0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to clear the board?"
      );

    if (!confirmed) {
      return;
    }

    saveHistory();

    updateElements([]);
    updateSelection([]);
  };

  // -----------------------------
  // LAYER FUNCTIONS
  // -----------------------------

  const moveLayer = (direction) => {
    if (
      selectedRef.current.length !== 1
    ) {
      return;
    }

    const id =
      selectedRef.current[0];

    const current =
      elementsRef.current;

    const index =
      current.findIndex(
        (element) =>
          element.id === id
      );

    if (index === -1) {
      return;
    }

    let newIndex = index;

    if (direction === "front") {
      newIndex = current.length - 1;
    }

    if (direction === "back") {
      newIndex = 0;
    }

    if (direction === "forward") {
      newIndex = Math.min(
        current.length - 1,
        index + 1
      );
    }

    if (direction === "backward") {
      newIndex = Math.max(
        0,
        index - 1
      );
    }

    if (newIndex === index) {
      return;
    }

    saveHistory();

    const next = [...current];

    const [item] =
      next.splice(index, 1);

    next.splice(
      newIndex,
      0,
      item
    );

    updateElements(next);
  };

  // -----------------------------
  // SAVE / LOAD
  // -----------------------------

  const saveBoard = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        elementsRef.current
      )
    );

    alert("Board saved!");
  };

  const loadBoard = () => {
    try {
      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!saved) {
        alert("No saved board found.");
        return;
      }

      saveHistory();

      const parsed =
        JSON.parse(saved);

      updateElements(parsed);
      updateSelection([]);

      alert("Board loaded!");
    } catch {
      alert("Could not load board.");
    }
  };

  // -----------------------------
  // EXPORT PNG
  // -----------------------------

  const exportPNG = () => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const tempCanvas =
      document.createElement(
        "canvas"
      );

    tempCanvas.width =
      canvas.width;

    tempCanvas.height =
      canvas.height;

    const ctx =
      tempCanvas.getContext("2d");

   ctx.fillStyle = "white";
ctx.fillRect(
  0,
  0,
  tempCanvas.width,
  tempCanvas.height
);

    ctx.save();

    ctx.translate(
      panRef.current.x,
      panRef.current.y
    );

    ctx.scale(
      zoomRef.current,
      zoomRef.current
    );

    elementsRef.current.forEach(
      (element) => {
        drawElement(
          ctx,
          element
        );
      }
    );

    ctx.restore();

    const link =
      document.createElement("a");

    link.download =
      "whiteboard.png";
   
    link.href =
      tempCanvas.toDataURL(
        "image/png"
      );

    link.click();
  };

  // -----------------------------
  // ZOOM
  // -----------------------------

  const clampZoom = (value) => {
    return Math.min(
      4,
      Math.max(
        0.25,
        value
      )
    );
  };

  const zoomAroundPoint = (
    newZoom,
    screenX,
    screenY
  ) => {
    const oldZoom =
      zoomRef.current;

    const oldPan =
      panRef.current;

    const worldX =
      (screenX - oldPan.x) /
      oldZoom;

    const worldY =
      (screenY - oldPan.y) /
      oldZoom;

    const nextZoom =
      clampZoom(newZoom);

    const nextPan = {
      x:
        screenX -
        worldX * nextZoom,

      y:
        screenY -
        worldY * nextZoom,
    };

    zoomRef.current =
      nextZoom;

    panRef.current =
      nextPan;

    setZoom(nextZoom);
    setPan(nextPan);
  };

  const zoomIn = () => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    zoomAroundPoint(
      zoomRef.current * 1.2,
      canvas.width / 2,
      canvas.height / 2
    );
  };

  const zoomOut = () => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    zoomAroundPoint(
      zoomRef.current * 0.8,
      canvas.width / 2,
      canvas.height / 2
    );
  };

  const resetZoom = () => {
    zoomRef.current = 1;
    panRef.current = {
      x: 0,
      y: 0,
    };

    setZoom(1);

    setPan({
      x: 0,
      y: 0,
    });
  };

  // -----------------------------
  // WHEEL ZOOM
  // -----------------------------

  const handleWheel = (e) => {
    e.preventDefault();

    const screen =
      getScreenPosition(e);

    const factor =
      e.deltaY < 0
        ? 1.1
        : 0.9;

    zoomAroundPoint(
      zoomRef.current * factor,
      screen.x,
      screen.y
    );
  };

  // -----------------------------
  // TEXT
  // -----------------------------

// -----------------------------
// TEXT CLICK
// -----------------------------

const handleCanvasClick = (e) => {
  const screen = getScreenPosition(e);

  // -------------------------
  // TEXT
  // -------------------------

  if (tool === "text") {
    setTextInput({
      x: screen.x,
      y: screen.y,
    });

    setTextValue("");

    return;
  }

  // -------------------------
  // STICKY
  // -------------------------

  if (tool === "sticky") {
    setStickyInput({
      x: screen.x,
      y: screen.y,
    });

    setStickyValue("");

    return;
  }
};

const handleCanvasDoubleClick = (e) => {
  const point = getMousePosition(e);
  const sticky = hitTest(point.x, point.y);

  if (!sticky || sticky.type !== "sticky") {
    return;
  }

  const screen = {
  x:
    sticky.x * zoomRef.current +
    panRef.current.x,

  y:
    sticky.y * zoomRef.current +
    panRef.current.y,
};

setEditingStickyId(sticky.id);
setStickyValue(sticky.text);

setStickyInput({
  x: screen.x,
  y: screen.y,
});
};

 const finishText = () => {
  if (!textInput) return;

  const value = textValue.trim();

  if (value === "") {
    setTextInput(null);
    setTextValue("");
    return;
  }

  const worldX =
    (textInput.x - panRef.current.x) /
    zoomRef.current;

  const worldY =
    (textInput.y - panRef.current.y) /
    zoomRef.current;

  const newElement = {
    id: createId(),
    type: "text",
    x: worldX,
    y: worldY,
    text: value,
    size: 24,
    color: "#111111",
    lineWidth: 2,
  };

  saveHistory();

  updateElements([
    ...elementsRef.current,
    newElement,
  ]);

  updateSelection([newElement.id]);

  setTextInput(null);
  setTextValue("");
};
const finishSticky = () => {
  if (!stickyInput) return;

  const value = stickyValue.trim();

  // Empty sticky -> cancel
  if (value === "") {
    setStickyInput(null);
    setStickyValue("");
    setEditingStickyId(null);
    return;
  }

  const worldX =
    (stickyInput.x - panRef.current.x) /
    zoomRef.current;

  const worldY =
    (stickyInput.y - panRef.current.y) /
    zoomRef.current;

if (editingStickyId) {
  saveHistory();

  updateElements(
    elementsRef.current.map((element) =>
      element.id === editingStickyId
        ? { ...element, text: value }
        : element
    )
  );

  updateSelection([editingStickyId]);
  setEditingStickyId(null);
  setStickyInput(null);
  setStickyValue("");
  return;
}

  const newElement = {
    id: createId(),
    type: "sticky",
    x: worldX,
    y: worldY,
    width: 180,
    height: 120,
    text: value,
    color: "#fef08a",
    lineWidth: 1,
  };

  saveHistory();

  updateElements([
    ...elementsRef.current,
    newElement,
  ]);

  updateSelection([newElement.id]);

  setStickyInput(null);
  setStickyValue("");
  setEditingStickyId(null);
};
  // -----------------------------
  // MOUSE DOWN
  // -----------------------------

  const handleMouseDown = (e) => {
    // Middle mouse = PAN
    if (e.button === 1) {
      e.preventDefault();

      interaction.current = {
        mode: "pan",
        start: {
          x: e.clientX,
          y: e.clientY,
        },

        current: {
          x: e.clientX,
          y: e.clientY,
        },
      };

      return;
    }

    // Space + left click = PAN
    if (
      e.button === 0 &&
      spacePressed.current
    ) {
      interaction.current = {
        mode: "pan",
        start: {
          x: e.clientX,
          y: e.clientY,
        },

        current: {
          x: e.clientX,
          y: e.clientY,
        },
      };

      return;
    }

    if (e.button !== 0) {
      return;
    }

    const point =
      getMousePosition(e);

    // -------------------------
    // SELECT TOOL
    // -------------------------

    if (tool === "select") {
      const resizeHandle =
        getResizeHandle(
          point.x,
          point.y
        );

      if (resizeHandle) {
        const selectedElement =
          elementsRef.current.find(
            (element) =>
              element.id ===
              selectedRef.current[0]
          );

        if (selectedElement) {
          saveHistory();

          interaction.current = {
            mode: "resize",

            start: {
              x: point.x,
              y: point.y,
            },

            current: {
              x: point.x,
              y: point.y,
            },

            ids: [
              selectedElement.id,
            ],

            originalElements: [
              clone(
                selectedElement
              ),
            ],

            handle:
              resizeHandle,

            originalElement:
              clone(
                selectedElement
              ),
          };

          return;
        }
      }

      const clicked =
        hitTest(
          point.x,
          point.y
        );

      if (clicked) {
  let ids;

  // SHIFT + CLICK = Multi Select
  if (e.shiftKey) {
    if (
      selectedRef.current.includes(
        clicked.id
      )
    ) {
      // Already selected → remove it
      ids = selectedRef.current.filter(
        (id) => id !== clicked.id
      );
    } else {
      // Not selected → add it
      ids = [
        ...selectedRef.current,
        ...expandGroups([clicked.id]),
      ];
    }
  } else {
    // Normal click
    if (
      selectedRef.current.includes(
        clicked.id
      )
    ) {
      ids = selectedRef.current;
    } else {
      ids = expandGroups([
        clicked.id,
      ]);
    }
  }

  updateSelection(ids);

        saveHistory();

        interaction.current = {
          mode: "move",

          start: {
            x: point.x,
            y: point.y,
          },

          current: {
            x: point.x,
            y: point.y,
          },

          ids,

          originalElements:
            clone(
              elementsRef.current.filter(
                (element) =>
                  ids.includes(
                    element.id
                  )
              )
            ),
        };

        return;
      }

      // Empty area = selection box
      updateSelection([]);

      interaction.current = {
        mode: "selectBox",

        start: {
          x: point.x,
          y: point.y,
        },

        current: {
          x: point.x,
          y: point.y,
        },
      };

      return;
    }

    // -------------------------
    // ERASER
    // -------------------------

    if (tool === "eraser") {
      const clicked =
        hitTest(
          point.x,
          point.y
        );

      if (clicked) {
        saveHistory();

        const ids =
          expandGroups([
            clicked.id,
          ]);

        const next =
          elementsRef.current.filter(
            (element) =>
              !ids.includes(
                element.id
              )
          );

        updateElements(next);
        updateSelection([]);
      }

      return;
    }

    // -------------------------
    // TEXT TOOL
    // -------------------------

    

    // -------------------------
    // DRAWING
    // -------------------------

    if (tool === "drawing") {
      saveHistory();

      draft.current = {
        type: "drawing",

        points: [
          {
            x: point.x,
            y: point.y,
          },
        ],

        color: "#111111",
        lineWidth: 3,
      };

      interaction.current = {
        mode: "drawing",

        start: point,
        current: point,
      };

      return;
    }

    // -------------------------
    // RECTANGLE
    // -------------------------

    if (tool === "rectangle") {
      saveHistory();

      draft.current = {
        type: "rectangle",

        x: point.x,
        y: point.y,
        width: 0,
        height: 0,

        color: "#111111",
        lineWidth: 3,

        startX: point.x,
        startY: point.y,

        currentX: point.x,
        currentY: point.y,
      };

      interaction.current = {
        mode: "rectangle",

        start: point,
        current: point,
      };

      return;
    }

    // -------------------------
    // CIRCLE
    // -------------------------

    if (tool === "circle") {
      saveHistory();

      draft.current = {
        type: "circle",

        x: point.x,
        y: point.y,

        radius: 0,

        color: "#111111",
        lineWidth: 3,

        startX: point.x,
        startY: point.y,

        currentX: point.x,
        currentY: point.y,
      };

      interaction.current = {
        mode: "circle",

        start: point,
        current: point,
      };

      return;
    }

    // -------------------------
    // LINE
    // -------------------------

    if (tool === "line") {
      saveHistory();

      draft.current = {
        type: "line",

        x1: point.x,
        y1: point.y,

        x2: point.x,
        y2: point.y,

        color: "#111111",
        lineWidth: 3,

        startX: point.x,
        startY: point.y,

        currentX: point.x,
        currentY: point.y,
      };

      interaction.current = {
        mode: "line",

        start: point,
        current: point,
      };

      return;
    }
  };

  // -----------------------------
  // MOUSE MOVE
  // -----------------------------

  const handleMouseMove = (e) => {
    const current =
      interaction.current;

    if (!current.mode) {
      return;
    }

    // PAN
    if (
      current.mode === "pan"
    ) {
      const dx =
        e.clientX -
        current.start.x;

      const dy =
        e.clientY -
        current.start.y;

      const newPan = {
        x:
          panRef.current.x +
          dx,

        y:
          panRef.current.y +
          dy,
      };

      panRef.current =
        newPan;

      setPan(newPan);

      current.start = {
        x: e.clientX,
        y: e.clientY,
      };

      return;
    }

    const point =
      getMousePosition(e);

    current.current =
      point;

    // DRAWING
    if (
      current.mode ===
      "drawing"
    ) {
      draft.current.points.push({
        x: point.x,
        y: point.y,
      });

      redraw();
      return;
    }

    // RECTANGLE
    if (
      current.mode ===
      "rectangle"
    ) {
      draft.current.currentX =
        point.x;

      draft.current.currentY =
        point.y;

      draft.current.width =
        point.x -
        draft.current.startX;

      draft.current.height =
        point.y -
        draft.current.startY;

      redraw();
      return;
    }

    // CIRCLE
    if (
      current.mode ===
      "circle"
    ) {
      draft.current.currentX =
        point.x;

      draft.current.currentY =
        point.y;

      draft.current.radius =
        Math.hypot(
          point.x -
            draft.current.startX,

          point.y -
            draft.current.startY
        );

      redraw();
      return;
    }

    // LINE
    if (
      current.mode === "line"
    ) {
      draft.current.currentX =
        point.x;

      draft.current.currentY =
        point.y;

      draft.current.x2 =
        point.x;

      draft.current.y2 =
        point.y;

      redraw();
      return;
    }

    // MOVE
    if (
      current.mode === "move"
    ) {
      const dx =
        point.x -
        current.start.x;

      const dy =
        point.y -
        current.start.y;

      const originalMap =
        new Map(
          current.originalElements.map(
            (element) => [
              element.id,
              element,
            ]
          )
        );

      const ids =
        current.ids;

      const next =
        elementsRef.current.map(
          (element) => {
            if (
              !ids.includes(
                element.id
              )
            ) {
              return element;
            }

            const original =
              originalMap.get(
                element.id
              );

            return moveElement(
              original,
              dx,
              dy
            );
          }
        );

      updateElements(next);
      redraw();

      return;
    }

    // RESIZE
    if (
      current.mode ===
      "resize"
    ) {
      const original =
        current.originalElement;

      if (!original) {
        return;
      }

      const resized =
        resizeElement(
          original,
          current.handle,
          point.x,
          point.y
        );

      const next =
        elementsRef.current.map(
          (element) =>
            element.id ===
            original.id
              ? resized
              : element
        );

      updateElements(next);

      redraw();

      return;
    }

    // SELECTION BOX
    if (
      current.mode ===
      "selectBox"
    ) {
      redraw();
      return;
    }
  };

  // -----------------------------
  // MOUSE UP
  // -----------------------------

  const handleMouseUp = () => {
    const current =
      interaction.current;

    // Finish drawing / shape
    if (
      current.mode ===
        "drawing" ||
      current.mode ===
        "rectangle" ||
      current.mode ===
        "circle" ||
      current.mode ===
        "line"
    ) {
      finishDraft();

      interaction.current = {
        mode: null,
      };

      redraw();

      return;
    }

    // Finish move
    if (
      current.mode === "move"
    ) {
      interaction.current = {
        mode: null,
      };

      redraw();

      return;
    }

    // Finish resize
    if (
      current.mode === "resize"
    ) {
      interaction.current = {
        mode: null,
      };

      redraw();

      return;
    }

    // Finish selection box
    if (
      current.mode ===
      "selectBox"
    ) {
      const start =
        current.start;

      const end =
        current.current;

      if (start && end) {
        const box = {
          left: Math.min(
            start.x,
            end.x
          ),

          top: Math.min(
            start.y,
            end.y
          ),

          right: Math.max(
            start.x,
            end.x
          ),

          bottom: Math.max(
            start.y,
            end.y
          ),
        };

        const ids = [];

        elementsRef.current.forEach(
          (element) => {
            const bounds =
              getBounds(element);

            if (
              boxesIntersect(
                box,
                bounds
              )
            ) {
              ids.push(
                element.id
              );
            }
          }
        );

        updateSelection(
          expandGroups(ids)
        );
      }

      interaction.current = {
        mode: null,
      };

      redraw();

      return;
    }

    // Finish pan
    if (
      current.mode === "pan"
    ) {
      interaction.current = {
        mode: null,
      };

      redraw();

      return;
    }

    interaction.current = {
      mode: null,
    };
  };

  // -----------------------------
  // CANVAS RESIZE
  // -----------------------------

  useEffect(() => {
    const resizeCanvas =
      () => {
        setCanvasSize({
          width:
            containerRef.current
              ?.clientWidth ||
            window.innerWidth,

          height:
            containerRef.current
              ?.clientHeight ||
            window.innerHeight -
              60,
        });
      };

    resizeCanvas();

    window.addEventListener(
      "resize",
      resizeCanvas
    );

    return () => {
      window.removeEventListener(
        "resize",
        resizeCanvas
      );
    };
  }, []);

  // -----------------------------
  // KEEP REFS UPDATED
  // -----------------------------

  useEffect(() => {
    elementsRef.current =
      elements;
  }, [elements]);

  useEffect(() => {
    selectedRef.current =
      selectedIds;
  }, [selectedIds]);

  // -----------------------------
  // AUTO SAVE
  // -----------------------------

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(elements)
    );
  }, [elements]);

  // -----------------------------
  // REDRAW WHEN STATE CHANGES
  // -----------------------------

  useEffect(() => {
    redraw();
  }, [
    elements,
    selectedIds,
    zoom,
    pan,
    canvasSize,
  ]);

  // -----------------------------
  // KEYBOARD SHORTCUTS
  // -----------------------------

  useEffect(() => {
    const handleKeyDown =
      (e) => {
        const tag =
          e.target?.tagName;

        const typing =
          tag === "INPUT" ||
          tag === "TEXTAREA";



        // Space for pan
        if (
          e.code === "Space" &&
          !typing
        ) {
          e.preventDefault();
          spacePressed.current =
            true;
        }

        if (typing) {
          return;
        }

        // Delete
        if (
          e.key === "Delete" ||
          e.key === "Backspace"
        ) {
          deleteSelected();
        }

        // Undo
        if (
          e.ctrlKey &&
          !e.shiftKey &&
          e.key.toLowerCase() ===
            "z"
        ) {
          e.preventDefault();
          undo();
        }

        // Redo
        if (
          e.ctrlKey &&
          e.key.toLowerCase() ===
            "y"
        ) {
          e.preventDefault();
          redo();
        }

        // Copy
        if (
          e.ctrlKey &&
          e.key.toLowerCase() ===
            "c"
        ) {
          e.preventDefault();
          copySelected();
        }

        // Cut
if (
  e.ctrlKey &&
  e.key.toLowerCase() === "x"
) {
  e.preventDefault();
  cutSelected();
}
        // Paste
        if (
          e.ctrlKey &&
          e.key.toLowerCase() ===
            "v"
        ) {
          e.preventDefault();
          pasteElements();
        }

        // Duplicate
        if (
          e.ctrlKey &&
          e.key.toLowerCase() ===
            "d"
        ) {
          e.preventDefault();
          duplicateSelected();
        }

        // Group
        if (
          e.ctrlKey &&
          !e.shiftKey &&
          e.key.toLowerCase() ===
            "g"
        ) {
          e.preventDefault();
          groupSelected();
        }

        // Ungroup
        if (
          e.ctrlKey &&
          e.shiftKey &&
          e.key.toLowerCase() ===
            "g"
        ) {
          e.preventDefault();
          ungroupSelected();
        }

        // Reset zoom
        if (
          e.ctrlKey &&
          e.key === "0"
        ) {
          e.preventDefault();
          resetZoom();
        }

        // Escape
        if (e.key === "Escape") {
          updateSelection([]);

          draft.current = null;

          interaction.current = {
            mode: null,
          };

          setTextInput(null);
          setTextValue("");

          setStickyInput(null);
setStickyValue("");

          redraw();
        }
      };

    const handleKeyUp =
      (e) => {
        if (
          e.code === "Space"
        ) {
          spacePressed.current =
            false;
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    window.addEventListener(
      "keyup",
      handleKeyUp
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

      window.removeEventListener(
        "keyup",
        handleKeyUp
      );
    };
  });

  // -----------------------------
  // TOOL CHANGE
  // -----------------------------

  const changeTool = (
    newTool
  ) => {
    setTool(newTool);
    
    setStickyInput(null);
setStickyValue("");
setEditingStickyId(null);
    draft.current = null;

    interaction.current = {
      mode: null,
    };

    if (
      newTool !== "select"
    ) {
      updateSelection([]);
    }

    redraw();
  };

  // -----------------------------
  // GROUP STATUS
  // -----------------------------

  const canGroup =
    selectedRef.current.length >=
    2;

  const canUngroup =
    elementsRef.current.some(
      (element) =>
        selectedRef.current.includes(
          element.id
        ) &&
        element.groupId
    );

  // -----------------------------
  // TOOL BUTTON
  // -----------------------------

  const ToolButton = ({
    name,
    label,
  }) => {
    return (
      <button
        className={
          tool === name
            ? "tool-btn active"
            : "tool-btn"
        }
        onClick={() =>
          changeTool(name)
        }
      >
        {label}
      </button>
      
    );
  };

  // -----------------------------
  // JSX
  // -----------------------------

  return (
    <div className="app">
      <div className="toolbar">

        <div className="toolbar-title">
          Whiteboard
        </div>

        <div className="toolbar-group">
          <ToolButton
            name="select"
            label="Select"
          />

          <ToolButton
            name="drawing"
            label="Draw"
          />

          <ToolButton
            name="rectangle"
            label="Rectangle"
          />

          <ToolButton
            name="circle"
            label="Circle"
          />

          <ToolButton
            name="line"
            label="Line"
          />

          <ToolButton
  name="text"
  label="Text"
/>

<ToolButton
  name="sticky"
  label="Sticky"
/>

<ToolButton
  name="eraser"
  label="Eraser"
/>
        </div>

        <div className="toolbar-group">
          <button
            onClick={undo}
            disabled={
              history.length === 0
            }
          >
            Undo
          </button>

          <button
            onClick={redo}
            disabled={
              redoStack.length === 0
            }
          >
            Redo
          </button>
        </div>

        <div className="toolbar-group">
          <button
            onClick={copySelected}
            disabled={
              selectedIds.length === 0
            }
          >
            Copy
          </button>

          <button
            onClick={pasteElements}
            disabled={
              copiedElements.length ===
              0
            }
          >
            Paste
          </button>

          <button
            onClick={duplicateSelected}
            disabled={
              selectedIds.length === 0
            }
          >
            Duplicate
          </button>

          <button
            onClick={deleteSelected}
            disabled={
              selectedIds.length === 0
            }
          >
            Delete
          </button>
        </div>

        <div className="toolbar-group">
          <button
            onClick={groupSelected}
            disabled={!canGroup}
          >
            Group
          </button>

          <button
            onClick={ungroupSelected}
            disabled={!canUngroup}
          >
            Ungroup
          </button>
        </div>

        <div className="toolbar-group zoom-controls">
          <button onClick={zoomOut}>
            −
          </button>

          <span className="zoom-value">
            {Math.round(zoom * 100)}%
          </span>

          <button onClick={zoomIn}>
            +
          </button>

          <button
            onClick={resetZoom}
          >
            Reset
          </button>
        </div>

        <div className="toolbar-group">
          <button
            onClick={() =>
              moveLayer("front")
            }
            disabled={
              selectedIds.length !==
              1
            }
          >
            Front
          </button>

          <button
            onClick={() =>
              moveLayer("forward")
            }
            disabled={
              selectedIds.length !==
              1
            }
          >
            Forward
          </button>

          <button
            onClick={() =>
              moveLayer("backward")
            }
            disabled={
              selectedIds.length !==
              1
            }
          >
            Backward
          </button>

          <button
            onClick={() =>
              moveLayer("back")
            }
            disabled={
              selectedIds.length !==
              1
            }
          >
            Back
          </button>
        </div>

        <div className="toolbar-group">
          <button onClick={saveBoard}>
            Save
          </button>

          <button onClick={loadBoard}>
            Load
          </button>

          <button onClick={exportPNG}>
            Export
          </button>

          <button onClick={clearBoard}>
            Clear
          </button>
        </div>
      </div>
            <div className="workspace">
        <div
          className="canvas-container"
          ref={containerRef}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onMouseDown={handleMouseDown}
            onClick={handleCanvasClick}
            onDoubleClick={handleCanvasDoubleClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (
                interaction.current.mode ===
                  "drawing" ||
                interaction.current.mode ===
                  "rectangle" ||
                interaction.current.mode ===
                  "circle" ||
                interaction.current.mode ===
                  "line"
              ) {
                handleMouseUp();
              }
            }}
            onWheel={handleWheel}
            style={{
              cursor:
                spacePressed.current
                  ? "grab"
                  : tool === "drawing"
                  ? "crosshair"
                  : tool === "eraser"
                  ? "not-allowed"
                  : tool === "text"
                  ? "text"
                  : tool === "select"
                  ? "default"
                  : "crosshair",
            }}
          />

          {textInput && (
            <input
            
              autoFocus
              className="canvas-text-input"
              value={textValue}
              onChange={(e) =>
                setTextValue(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  finishText();
                }

                if (e.key === "Escape") {
  setStickyInput(null);
  setStickyValue("");
  setEditingStickyId(null);
}
              }}
              onBlur={finishText}
              style={{
                left: textInput.x,
                top: textInput.y ,
              }}
            />
          )}
{stickyInput && (
  <textarea
    autoFocus
    className="sticky-input"
    value={stickyValue}
    onChange={(e) => setStickyValue(e.target.value)}
    onKeyDown={(e) => {
  if (e.key === "Escape") {
    setStickyInput(null);
    setStickyValue("");
    setEditingStickyId(null);
  }

  if (e.key === "Enter" && e.ctrlKey) {
    e.preventDefault();
    finishSticky();
  }
}}
  onBlur={finishSticky}
    style={{
      left: stickyInput.x,
      top: stickyInput.y,
    }}
  />
)}
          <div className="canvas-info">
            {Math.round(zoom * 100)}%
            &nbsp; • &nbsp;
            {elements.length} objects
          </div>

          <div className="pan-help">
            Space + Drag = Pan
            &nbsp; | &nbsp;
            Mouse Wheel = Zoom
          </div>
        </div>

        <aside className="layers-panel">
          <div className="layers-header">
            <h3>Layers</h3>

            <span>
              {elements.length}
            </span>
          </div>

          {elements.length === 0 ? (
            <div className="empty-layers">
              No elements yet
            </div>
          ) : (
            <div className="layers-list">
              {[...elements]
                .reverse()
                .map((element) => {
                  const isSelected =
                    selectedIds.includes(
                      element.id
                    );

                  return (
                    <button
                      key={element.id}
                      className={
                        isSelected
                          ? "layer-item selected"
                          : "layer-item"
                      }
                      onClick={() => {
                        const ids =
                          expandGroups([
                            element.id,
                          ]);

                        updateSelection(
                          ids
                        );
                      }}
                    >
                      <span className="layer-type">
                        {element.type}
                      </span>

                      {element.groupId && (
                        <span className="group-badge">
                          Group
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          )}

          <div className="layers-footer">
            <div>
              Selected:{" "}
              <strong>
                {selectedIds.length}
              </strong>
            </div>

            <div>
              Zoom:{" "}
              <strong>
                {Math.round(zoom * 100)}%
              </strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;