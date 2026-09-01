import { useRef, useState } from "react";
import {
  Stage,
  Layer,
  Line,
  Rect,
  Circle,
  Text,
} from "react-konva";

function CanvasBoard() {
  const [tool, setTool] = useState("freehand");

  const [lines, setLines] = useState([]);
  const [rectangles, setRectangles] = useState([]);
  const [circles, setCircles] = useState([]);
  const [triangles, setTriangles] = useState([]);
  const [texts, setTexts] = useState([]);

  const isDrawing = useRef(false);
  const startPoint = useRef(null);

  // =========================
  // MOUSE DOWN
  // =========================
  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    // FREEHAND
    if (tool === "freehand") {
      isDrawing.current = true;

      setLines((prev) => [
        ...prev,
        {
          points: [pointer.x, pointer.y],
        },
      ]);
    }

    // RECTANGLE
    if (tool === "rectangle") {
      isDrawing.current = true;

      startPoint.current = {
        x: pointer.x,
        y: pointer.y,
      };

      setRectangles((prev) => [
        ...prev,
        {
          x: pointer.x,
          y: pointer.y,
          width: 0,
          height: 0,
        },
      ]);
    }

    // CIRCLE
    if (tool === "circle") {
      isDrawing.current = true;

      startPoint.current = {
        x: pointer.x,
        y: pointer.y,
      };

      setCircles((prev) => [
        ...prev,
        {
          x: pointer.x,
          y: pointer.y,
          radius: 0,
        },
      ]);
    }

    // TRIANGLE
    if (tool === "triangle") {
      isDrawing.current = true;

      startPoint.current = {
        x: pointer.x,
        y: pointer.y,
      };

      setTriangles((prev) => [
        ...prev,
        {
          points: [
            pointer.x,
            pointer.y,
            pointer.x,
            pointer.y,
            pointer.x,
            pointer.y,
          ],
        },
      ]);
    }

    // TEXT
    if (tool === "text") {
      const userText = window.prompt("Enter your text:");

      if (!userText || !userText.trim()) {
        return;
      }

      setTexts((prev) => [
        ...prev,
        {
          x: pointer.x,
          y: pointer.y,
          text: userText.trim(),
        },
      ]);
    }
  };

  // =========================
  // MOUSE MOVE
  // =========================
  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;

    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const start = startPoint.current;

    // FREEHAND
    if (tool === "freehand") {
      setLines((prev) => {
        if (prev.length === 0) return prev;

        const lastLine = prev[prev.length - 1];

        const updatedLine = {
          ...lastLine,
          points: [
            ...lastLine.points,
            pointer.x,
            pointer.y,
          ],
        };

        return [
          ...prev.slice(0, -1),
          updatedLine,
        ];
      });
    }

    // RECTANGLE
    if (tool === "rectangle") {
      if (!start) return;

      const x = Math.min(start.x, pointer.x);
      const y = Math.min(start.y, pointer.y);

      const width = Math.abs(pointer.x - start.x);
      const height = Math.abs(pointer.y - start.y);

      setRectangles((prev) => {
        if (prev.length === 0) return prev;

        const updated = {
          ...prev[prev.length - 1],
          x,
          y,
          width,
          height,
        };

        return [
          ...prev.slice(0, -1),
          updated,
        ];
      });
    }

    // CIRCLE
    if (tool === "circle") {
      if (!start) return;

      const dx = pointer.x - start.x;
      const dy = pointer.y - start.y;

      const radius = Math.sqrt(
        dx * dx + dy * dy
      );

      setCircles((prev) => {
        if (prev.length === 0) return prev;

        const updated = {
          ...prev[prev.length - 1],
          radius,
        };

        return [
          ...prev.slice(0, -1),
          updated,
        ];
      });
    }

    // TRIANGLE
    if (tool === "triangle") {
      if (!start) return;

      const width = pointer.x - start.x;
      const height = pointer.y - start.y;

      const x1 = start.x;
      const y1 = start.y;

      const x2 = start.x + width;
      const y2 = start.y;

      const x3 = start.x + width / 2;
      const y3 = start.y + height;

      setTriangles((prev) => {
        if (prev.length === 0) return prev;

        const updated = {
          ...prev[prev.length - 1],
          points: [
            x1,
            y1,
            x2,
            y2,
            x3,
            y3,
          ],
        };

        return [
          ...prev.slice(0, -1),
          updated,
        ];
      });
    }
  };

  // =========================
  // MOUSE UP
  // =========================
  const handleMouseUp = () => {
    isDrawing.current = false;
    startPoint.current = null;
  };

  // =========================
  // CLEAR EVERYTHING
  // =========================
  const clearBoard = () => {
    setLines([]);
    setRectangles([]);
    setCircles([]);
    setTriangles([]);
    setTexts([]);
  };

  return (
    <div className="canvas-board">

      {/* =========================
          TOOLBAR
      ========================= */}
      <div className="canvas-toolbar">

        <div className="toolbar-title">
          🎨 Whiteboard Tools
        </div>

        <div className="toolbar-buttons">

          <button
            className={
              tool === "freehand"
                ? "tool-button active"
                : "tool-button"
            }
            onClick={() => setTool("freehand")}
          >
            ✏️ Freehand
          </button>

          <button
            className={
              tool === "rectangle"
                ? "tool-button active"
                : "tool-button"
            }
            onClick={() => setTool("rectangle")}
          >
            ▭ Rectangle
          </button>

          <button
            className={
              tool === "circle"
                ? "tool-button active"
                : "tool-button"
            }
            onClick={() => setTool("circle")}
          >
            ⭕ Circle
          </button>

          <button
            className={
              tool === "triangle"
                ? "tool-button active"
                : "tool-button"
            }
            onClick={() => setTool("triangle")}
          >
            🔺 Triangle
          </button>

          <button
            className={
              tool === "text"
                ? "tool-button active"
                : "tool-button"
            }
            onClick={() => setTool("text")}
          >
            T Text
          </button>

          <button
            className="clear-button"
            onClick={clearBoard}
          >
            🗑️ Clear
          </button>

        </div>

        {/* TOOL DESCRIPTION */}
        <div className="tool-info">

          {tool === "freehand" &&
            "✏️ Click and drag to draw freely"}

          {tool === "rectangle" &&
            "▭ Click and drag to create a rectangle"}

          {tool === "circle" &&
            "⭕ Click and drag to create a circle"}

          {tool === "triangle" &&
            "🔺 Click and drag to create a triangle"}

          {tool === "text" &&
            "T Click anywhere and type your text"}

        </div>

      </div>


      {/* =========================
          CANVAS
      ========================= */}
      <div className="canvas-container">

        <Stage
          width={800}
          height={450}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >

          <Layer>

            {/* FREEHAND LINES */}
            {lines.map((line, index) => (
              <Line
                key={`line-${index}`}
                points={line.points}
                stroke="#111827"
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
              />
            ))}


            {/* RECTANGLES */}
            {rectangles.map((rect, index) => (
              <Rect
                key={`rect-${index}`}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                stroke="#2563eb"
                strokeWidth={3}
                cornerRadius={8}
              />
            ))}


            {/* CIRCLES */}
            {circles.map((circle, index) => (
              <Circle
                key={`circle-${index}`}
                x={circle.x}
                y={circle.y}
                radius={circle.radius}
                stroke="#9333ea"
                strokeWidth={3}
              />
            ))}


            {/* TRIANGLES */}
            {triangles.map((triangle, index) => (
              <Line
                key={`triangle-${index}`}
                points={triangle.points}
                stroke="#ef4444"
                strokeWidth={3}
                closed={true}
                lineJoin="round"
              />
            ))}


            {/* TEXT */}
            {texts.map((text, index) => (
              <Text
                key={`text-${index}`}
                x={text.x}
                y={text.y}
                text={text.text}
                fontSize={22}
                fontStyle="bold"
                fill="#111827"
              />
            ))}

          </Layer>

        </Stage>

      </div>

    </div>
  );
}

export default CanvasBoard;