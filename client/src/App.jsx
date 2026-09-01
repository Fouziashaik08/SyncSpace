import { useState } from "react";
import CanvasBoard from "./CanvasBoard";
import "./App.css";

function App() {
  const [roomId, setRoomId] = useState("");

  const createRoom = () => {
    const id = Math.random().toString(36).substring(2, 8);
    setRoomId(id);
  };

  return (
    <div className="app">

      {/* NAVBAR */}
      <header className="navbar">
        <div className="logo">
          SyncSpace
        </div>

        <nav className="nav-links">
          <button>Home</button>
          <button>Whiteboard</button>
          <button>Code Editor</button>
          <button>Join Room</button>
        </nav>
      </header>


      {/* HERO */}
      <section className="hero">

        <div className="hero-content">

          <div className="badge">
            ✦ Real-Time Collaborative Workspace
          </div>

          <h1>
            Collaborate.
            <br />
            <span>Create Together.</span>
          </h1>

          <p>
            Draw ideas, write code, and collaborate
            with your team in real time.
          </p>

          <div className="hero-buttons">

            <button
              className="primary-btn"
              onClick={createRoom}
            >
              🚀 Create a Room
            </button>

            <button className="secondary-btn">
              Join a Room →
            </button>

          </div>

          {roomId && (
            <div className="room-id">
              Your Room ID: <strong>{roomId}</strong>
            </div>
          )}

        </div>

      </section>


      {/* WORKSPACE */}
      <section className="workspace">

        <div className="workspace-card">

          <h2>
            🎨 Whiteboard
          </h2>

          <p className="workspace-subtitle">
            Draw, create shapes and add text
          </p>

          <CanvasBoard />

        </div>


        <div className="workspace-card">

          <h2>
            💻 Code Editor
          </h2>

          <p className="workspace-subtitle">
            Write and share code with your team
          </p>

          <textarea
            className="code-editor"
            placeholder="Write your code here..."
          />

        </div>

      </section>

    </div>
  );
}

export default App;