import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

function App() {
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [code, setCode] = useState("");

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef({ x: 0, y: 0 });

  useEffect(() => {
    socket.on("whiteboard-draw", (data) => {
      drawRemote(data);
    });

    socket.on("clear-whiteboard", () => {
      clearCanvas();
    });

    socket.on("code-update", (newCode) => {
      setCode(newCode);
    });

    return () => {
      socket.off("whiteboard-draw");
      socket.off("clear-whiteboard");
      socket.off("code-update");
    };
  }, []);

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8);

    setRoomId(newRoomId);
    setInRoom(true);
    setMessage(`Room created: ${newRoomId}`);

    socket.emit("join-room", newRoomId);
  };

  const joinRoom = () => {
    if (!joinRoomId.trim()) {
      setMessage("Please enter a Room ID.");
      return;
    }

    const id = joinRoomId.trim();

    setRoomId(id);
    setInRoom(true);
    setMessage(`Joined room: ${id}`);

    socket.emit("join-room", id);
  };

  const leaveRoom = () => {
    if (roomId) {
      socket.emit("leave-room", roomId);
    }

    setRoomId("");
    setJoinRoomId("");
    setInRoom(false);
    setMessage("");
    setCode("");
    clearCanvas();
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawing.current = true;
    lastPoint.current = { x, y };
  };

  const draw = (e) => {
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const prevX = lastPoint.current.x;
    const prevY = lastPoint.current.y;

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();

    socket.emit("whiteboard-draw", {
      roomId,
      x,
      y,
      prevX,
      prevY,
    });

    lastPoint.current = { x, y };
  };

  const drawRemote = (data) => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.moveTo(data.prevX, data.prevY);
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const clearWhiteboard = () => {
    clearCanvas();

    if (roomId) {
      socket.emit("clear-whiteboard", roomId);
    }
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

          <button onClick={leaveRoom}>
            Leave Room
          </button>

          <div className="workspace">
            <div className="whiteboard">
              <h2>Whiteboard</h2>

              <canvas
                ref={canvasRef}
                width={600}
                height={350}
                style={{
                  border: "2px solid black",
                  background: "white",
                  cursor: "crosshair",
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />

              <br />

              <button onClick={clearWhiteboard}>
                Clear Whiteboard
              </button>
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