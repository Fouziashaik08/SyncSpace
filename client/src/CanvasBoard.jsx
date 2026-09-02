import React, { useEffect, useRef, useState } from "react";

function CanvasBoard() {
  const canvasRef = useRef(null);

  const [tool, setTool] = useState("freehand");

  const [showTextBox, setShowTextBox] = useState(false);
  const [text, setText] = useState("");

  const textPosition = useRef({ x: 0, y: 0 });

  const isDrawing = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.fillStyle = "#1e293b";
    ctx.font = "20px Arial";
  }, []);

  // Get correct canvas coordinates
  const getMousePosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x:
        (event.clientX - rect.left) *
        (canvas.width / rect.width),

      y:
        (event.clientY - rect.top) *
        (canvas.height / rect.height),
    };
  };

  // =========================
  // MOUSE DOWN
  // =========================

  const handleMouseDown = (event) => {
    const { x, y } = getMousePosition(event);

    // TEXT TOOL
    if (tool === "text") {
      textPosition.current = {
        x,
        y,
      };

      setText("");
      setShowTextBox(true);

      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    isDrawing.current = true;

    startPoint.current = {
      x,
      y,
    };

    if (tool === "freehand") {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  // =========================
  // MOUSE MOVE
  // =========================

  const handleMouseMove = (event) => {
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const { x, y } = getMousePosition(event);

    if (tool === "freehand") {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  // =========================
  // MOUSE UP
  // =========================

  const handleMouseUp = (event) => {
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const { x, y } = getMousePosition(event);

    const startX = startPoint.current.x;
    const startY = startPoint.current.y;

    // RECTANGLE
    if (tool === "rectangle") {
      ctx.strokeRect(
        startX,
        startY,
        x - startX,
        y - startY
      );
    }

    // CIRCLE
    if (tool === "circle") {
      const radius = Math.sqrt(
        Math.pow(x - startX, 2) +
        Math.pow(y - startY, 2)
      );

      ctx.beginPath();

      ctx.arc(
        startX,
        startY,
        radius,
        0,
        Math.PI * 2
      );

      ctx.stroke();
    }

    // TRIANGLE
    if (tool === "triangle") {
      ctx.beginPath();

      ctx.moveTo(startX, y);

      ctx.lineTo(
        (startX + x) / 2,
        startY
      );

      ctx.lineTo(x, y);

      ctx.closePath();

      ctx.stroke();
    }

    isDrawing.current = false;
  };

  // =========================
  // ADD TEXT TO CANVAS
  // =========================

  const addTextToCanvas = () => {
    const cleanText = text.trim();

    if (!cleanText) {
      setShowTextBox(false);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.save();

    ctx.fillStyle = "#1e293b";
    ctx.font = "20px Arial";
    ctx.textBaseline = "top";

    ctx.fillText(
      cleanText,
      textPosition.current.x,
      textPosition.current.y
    );

    ctx.restore();

    setText("");
    setShowTextBox(false);
  };

  // =========================
  // ENTER KEY
  // =========================

  const handleTextKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      addTextToCanvas();
    }

    if (event.key === "Escape") {
      setShowTextBox(false);
      setText("");
    }
  };

  // =========================
  // CLEAR
  // =========================

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    setShowTextBox(false);
    setText("");
  };

  return (
    <div className="canvas-board">

      {/* TOOLBAR */}

      <div className="canvas-toolbar">

        <div className="toolbar-title">
          🎨 Whiteboard Tools
        </div>

        <div className="toolbar-buttons">

          <button
            className={`tool-button ${
              tool === "freehand" ? "active" : ""
            }`}
            onClick={() => {
              setTool("freehand");
              setShowTextBox(false);
            }}
          >
            🖊️ Freehand
          </button>

          <button
            className={`tool-button ${
              tool === "rectangle" ? "active" : ""
            }`}
            onClick={() => {
              setTool("rectangle");
              setShowTextBox(false);
            }}
          >
            ▭ Rectangle
          </button>

          <button
            className={`tool-button ${
              tool === "circle" ? "active" : ""
            }`}
            onClick={() => {
              setTool("circle");
              setShowTextBox(false);
            }}
          >
            ⭕ Circle
          </button>

          <button
            className={`tool-button ${
              tool === "triangle" ? "active" : ""
            }`}
            onClick={() => {
              setTool("triangle");
              setShowTextBox(false);
            }}
          >
            🔺 Triangle
          </button>

          <button
            className={`tool-button ${
              tool === "text" ? "active" : ""
            }`}
            onClick={() => {
              setTool("text");
            }}
          >
            T Text
          </button>

          <button
            className="clear-button"
            onClick={clearCanvas}
          >
            🗑️ Clear
          </button>

        </div>

        <div className="tool-info">
          {tool === "text"
            ? "📝 Click the canvas → type text → press Enter"
            : tool === "freehand"
            ? "🖊️ Click and drag to draw freely"
            : `Click and drag to create a ${tool}`}
        </div>

      </div>

      {/* CANVAS */}

      <div className="canvas-container">

        <div
          style={{
            position: "relative",
            width: "800px",
            maxWidth: "100%",
            margin: "0 auto",
          }}
        >

          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              cursor:
                tool === "text"
                  ? "text"
                  : "crosshair",
            }}
          />

          {/* TEXT BOX */}

          {showTextBox && (
            <div
              style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                background: "white",
                padding: "12px",
                borderRadius: "10px",
                boxShadow:
                  "0 5px 25px rgba(0,0,0,0.3)",
                zIndex: 100,
              }}
            >

              <input
                autoFocus
                type="text"
                value={text}
                onChange={(event) =>
                  setText(event.target.value)
                }
                onKeyDown={handleTextKeyDown}
                placeholder="Type your text..."
                style={{
                  width: "220px",
                  padding: "10px",
                  fontSize: "16px",
                  border: "2px solid #2563eb",
                  borderRadius: "6px",
                  outline: "none",
                  color: "#1e293b",
                }}
              />

              <button
                onClick={addTextToCanvas}
                style={{
                  marginLeft: "8px",
                  padding: "10px 14px",
                  border: "none",
                  borderRadius: "6px",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Add
              </button>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default CanvasBoard;