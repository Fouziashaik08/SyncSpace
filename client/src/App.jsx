import { useRef, useState } from "react";

function App() {
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8);

    setRoomId(newRoomId);
    setMessage("New SyncSpace room created!");
  };

  const startDrawing = (event) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    isDrawing.current = true;

    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (event) => {
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    context.lineTo(x, y);
    context.strokeStyle = "black";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  return (
    <div>
      <header>
        <h1>SyncSpace</h1>

        <nav>
          <button>Home</button>
          <button>Whiteboard</button>
          <button>Code Editor</button>
          <button>Join Room</button>
        </nav>
      </header>

      <main>
        <h2>Collaborate in Real Time</h2>

        <p>
          Create, share, and collaborate using a real-time whiteboard
          and code editor.
        </p>

        <button onClick={createRoom}>Create Room</button>

        {roomId && (
          <div>
            <p>
              Your Room ID: <strong>{roomId}</strong>
            </p>

            <div className="workspace">
              <div className="whiteboard">
                <h2>Whiteboard</h2>

                <canvas
                  ref={canvasRef}
                  width="500"
                  height="300"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{
                    background: "white",
                    width: "100%",
                    height: "300px",
                    borderRadius: "6px",
                    cursor: "crosshair",
                  }}
                />
              </div>

              <div className="code-editor">
                <h2>Code Editor</h2>

                <textarea
                  placeholder="Write your code here..."
                  rows="15"
                  cols="50"
                />
              </div>
            </div>
          </div>
        )}

        {message && <h3>{message}</h3>}
      </main>
    </div>
  );
}

export default App;