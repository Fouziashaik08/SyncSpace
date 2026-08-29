import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Stage, Layer, Line, Rect, Text, Group } from "react-konva";

const socket = io("http://localhost:3001");

function App() {
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [inRoom, setInRoom] = useState(false);

  const [tool, setTool] = useState("freehand");
  const [lines, setLines] = useState([]);
  const [rectangles, setRectangles] = useState([]);
  const [texts, setTexts] = useState([]);
  const [code, setCode] = useState("");

  const [cursors, setCursors] = useState({});

  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);

  useEffect(() => {
    socket.on("whiteboard-object", (data) => {
      if (data.type === "line") {
        setLines((prev) => [...prev, data.object]);
      }

      if (data.type === "rect") {
        setRectangles((prev) => [...prev, data.object]);
      }

      if (data.type === "text") {
        setTexts((prev) => [...prev, data.object]);
      }
    });

    socket.on("clear-whiteboard", () => {
      setLines([]);
      setRectangles([]);
      setTexts([]);
    });

    socket.on("code-update", (newCode) => {
      setCode(newCode);
    });

    socket.on("cursor-move", (data) => {
      setCursors((prev) => ({
        ...prev,
        [data.id]: {
          name: data.name,
          x: data.x,
          y: data.y,
        },
      }));
    });

    socket.on("user-left", (userId) => {
      setCursors((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    });

    return () => {
      socket.off("whiteboard-object");
      socket.off("clear-whiteboard");
      socket.off("code-update");
      socket.off("cursor-move");
      socket.off("user-left");
    };
  }, []);

  const createRoom = () => {
    if (!name.trim()) {
      setMessage("Please enter your name first.");
      return;
    }

    const newRoomId = Math.random()
      .toString(36)
      .substring(2, 8);

    setRoomId(newRoomId);
    setInRoom(true);
    setMessage(`Room created: ${newRoomId}`);

    socket.emit("join-room", {
      roomId: newRoomId,
      name: name.trim(),
    });
  };

  const joinRoom = () => {
    if (!name.trim()) {
      setMessage("Please enter your name first.");
      return;
    }

    if (!joinRoomId.trim()) {
      setMessage("Please enter a Room ID.");
      return;
    }

    const id = joinRoomId.trim();

    setRoomId(id);
    setInRoom(true);
    setMessage(`Joined room: ${id}`);

    socket.emit("join-room", {
      roomId: id,
      name: name.trim(),
    });
  };

  const leaveRoom = () => {
    socket.emit("leave-room", roomId);

    setRoomId("");
    setJoinRoomId("");
    setInRoom(false);
    setMessage("");
    setLines([]);
    setRectangles([]);
    setTexts([]);
    setCode("");
    setCursors({});
  };

  const handleMouseDown = (e) => {
    if (tool !== "freehand") return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    setIsDrawing(true);
    setLastPoint(point);

    const newLine = {
      points: [point.x, point.y],
    };

    setLines((prev) => [...prev, newLine]);
  };

  const handleMouseMove = (e) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    // Send cursor position
    if (inRoom) {
      socket.emit("cursor-move", {
        roomId,
        x: point.x,
        y: point.y,
      });
    }

    if (!isDrawing || tool !== "freehand" || !lastPoint) {
      return;
    }

    setLines((prev) => {
      const lastLine = prev[prev.length - 1];

      if (!lastLine) return prev;

      const updatedLine = {
        ...lastLine,
        points: [
          ...lastLine.points,
          point.x,
          point.y,
        ],
      };

      return [
        ...prev.slice(0, -1),
        updatedLine,
      ];
    });

    setLastPoint(point);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    setLines((currentLines) => {
      const newLine =
        currentLines[currentLines.length - 1];

      if (newLine) {
        socket.emit("whiteboard-object", {
          roomId,
          type: "line",
          object: newLine,
        });
      }

      return currentLines;
    });

    setLastPoint(null);
  };

  const addRectangle = () => {
    const newRectangle = {
      x: 100,
      y: 100,
      width: 150,
      height: 100,
      stroke: "black",
      strokeWidth: 3,
    };

    setRectangles((prev) => [
      ...prev,
      newRectangle,
    ]);

    socket.emit("whiteboard-object", {
      roomId,
      type: "rect",
      object: newRectangle,
    });
  };

  const addText = () => {
    const newText = {
      x: 150,
      y: 150,
      text: "SyncSpace Text",
      fontSize: 24,
      fill: "black",
    };

    setTexts((prev) => [
      ...prev,
      newText,
    ]);

    socket.emit("whiteboard-object", {
      roomId,
      type: "text",
      object: newText,
    });
  };

  const clearWhiteboard = () => {
    setLines([]);
    setRectangles([]);
    setTexts([]);

    socket.emit("clear-whiteboard", roomId);
  };

  const handleCodeChange = (e) => {
    const newCode = e.target.value;

    setCode(newCode);

    socket.emit("code-update", {
      roomId,
      code: newCode,
    });
  };

  return (
    <div>
      <header>
        <h1>SyncSpace</h1>

        <p>
          Real-Time Collaborative Whiteboard and Code Editor
        </p>
      </header>

      {!inRoom ? (
        <main>
          <h2>Welcome to SyncSpace</h2>

          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
          />

          <br />
          <br />

          <button onClick={createRoom}>
            Create Room
          </button>

          <div>
            <br />

            <input
              type="text"
              placeholder="Enter Room ID"
              value={joinRoomId}
              onChange={(e) =>
                setJoinRoomId(e.target.value)
              }
            />

            <button onClick={joinRoom}>
              Join Room
            </button>
          </div>

          {message && <h3>{message}</h3>}
        </main>
      ) : (
        <main>
          <h2>SyncSpace Workspace</h2>

          <p>
            Room ID: <strong>{roomId}</strong>
          </p>

          <p>
            You are: <strong>{name}</strong>
          </p>

          <button onClick={leaveRoom}>
            Leave Room
          </button>

          <hr />

          <div>
            <button
              onClick={() => setTool("freehand")}
            >
              ✏️ Freehand
            </button>

            <button onClick={addRectangle}>
              ▭ Rectangle
            </button>

            <button onClick={addText}>
              T Text
            </button>

            <button onClick={clearWhiteboard}>
              Clear
            </button>
          </div>

          <div className="workspace">
            <div className="whiteboard">
              <h2>Whiteboard</h2>

              <Stage
                width={600}
                height={350}
                onMouseDown={handleMouseDown}
                onMousemove={handleMouseMove}
                onMouseup={handleMouseUp}
                style={{
                  border: "2px solid black",
                  background: "white",
                }}
              >
                <Layer>
                  {lines.map((line, index) => (
                    <Line
                      key={`line-${index}`}
                      points={line.points}
                      stroke="black"
                      strokeWidth={3}
                      lineCap="round"
                      lineJoin="round"
                    />
                  ))}

                  {rectangles.map(
                    (rect, index) => (
                      <Rect
                        key={`rect-${index}`}
                        {...rect}
                      />
                    )
                  )}

                  {texts.map(
                    (text, index) => (
                      <Text
                        key={`text-${index}`}
                        {...text}
                      />
                    )
                  )}

                  {Object.entries(cursors).map(
                    ([id, cursor]) => (
                      <Group
                        key={id}
                        x={cursor.x}
                        y={cursor.y}
                      >
                        <Text
                          text={`👤 ${cursor.name}`}
                          fontSize={14}
                          fill="blue"
                          padding={4}
                        />

                        <Text
                          text="▼"
                          y={18}
                          fontSize={16}
                          fill="blue"
                        />
                      </Group>
                    )
                  )}
                </Layer>
              </Stage>
            </div>

            <div className="code-editor">
              <h2>Code Editor</h2>

              <textarea
                placeholder="Write your code here..."
                rows="15"
                cols="60"
                value={code}
                onChange={handleCodeChange}
              />
            </div>
          </div>

          {message && <h3>{message}</h3>}
        </main>
      )}
    </div>
  );
}

export default App;