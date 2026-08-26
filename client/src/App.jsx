import { useState } from "react";

function App() {
  const [message, setMessage] = useState("");
  const [roomId, setRoomId] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8);

    setRoomId(newRoomId);
    setMessage("New SyncSpace room created!");
    setShowJoin(false);
  };

  const joinRoom = () => {
    setShowJoin(true);
    setMessage("");
  };

  const joinExistingRoom = () => {
    if (joinRoomId.trim() === "") {
      setMessage("Please enter a Room ID.");
      return;
    }

    setMessage(`Successfully joined room: ${joinRoomId}`);
  };

  return (
    <div>
      <header>
        <h1>SyncSpace</h1>

        <nav>
          <button>Home</button>
          <button>Whiteboard</button>
          <button>Code Editor</button>
          <button onClick={joinRoom}>Join Room</button>
        </nav>
      </header>

      <main>
        <h2>Collaborate in Real Time</h2>

        <p>
          Create, share, and collaborate using a real-time whiteboard
          and code editor.
        </p>

        <button onClick={createRoom}>Create Room</button>
        <button onClick={joinRoom}>Join Room</button>

        {roomId && (
          <p>
            Your Room ID: <strong>{roomId}</strong>
          </p>
        )}

        {showJoin && (
          <div>
            <br />

            <input
              type="text"
              placeholder="Enter Room ID"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
            />

            <button onClick={joinExistingRoom}>Join</button>
          </div>
        )}

        {message && <h3>{message}</h3>}
      </main>
    </div>
  );
}

export default App;