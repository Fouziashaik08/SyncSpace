import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  Stage,
  Layer,
  Line,
  Rect,
  Text,
  Group,
} from "react-konva";
import Login from "./Login";

const socket = io("http://localhost:3001");

function App() {
  // =========================
  // AUTH
  // =========================

  const [user, setUser] = useState(() => {
    const savedUser =
      localStorage.getItem("syncspace_user");

    return savedUser
      ? JSON.parse(savedUser)
      : null;
  });

  const token =
    localStorage.getItem("syncspace_token");

  // =========================
  // ROOM
  // =========================

  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [name, setName] = useState(
    user?.name || ""
  );

  const [message, setMessage] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // =========================
  // INVITATION
  // =========================

  const [inviteEmail, setInviteEmail] =
    useState("");

  const [inviteMessage, setInviteMessage] =
    useState("");

  // =========================
  // WHITEBOARD
  // =========================

  const [tool, setTool] =
    useState("freehand");

  const [lines, setLines] = useState([]);
  const [rectangles, setRectangles] =
    useState([]);
  const [texts, setTexts] = useState([]);

  // =========================
  // CODE EDITOR
  // =========================

  const [code, setCode] = useState("");

  // =========================
  // CURSORS
  // =========================

  const [cursors, setCursors] = useState(
    {}
  );

  // =========================
  // DRAWING
  // =========================

  const [isDrawing, setIsDrawing] =
    useState(false);

  const [lastPoint, setLastPoint] =
    useState(null);

  // =========================
  // LOGIN
  // =========================

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setName(loggedInUser.name);
    setMessage("Login successful!");
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = () => {
    if (inRoom) {
      socket.emit("leave-room", roomId);
    }

    localStorage.removeItem(
      "syncspace_token"
    );

    localStorage.removeItem(
      "syncspace_user"
    );

    setUser(null);
    setRoomId("");
    setJoinRoomId("");
    setInRoom(false);
    setIsOwner(false);
    setMessage("");
    setInviteEmail("");
    setInviteMessage("");

    setLines([]);
    setRectangles([]);
    setTexts([]);
    setCode("");
    setCursors({});
  };

  // =========================
  // SOCKET LISTENERS
  // =========================

  useEffect(() => {
    socket.on(
      "whiteboard-object",
      (data) => {
        if (data.type === "line") {
          setLines((prev) => [
            ...prev,
            data.object,
          ]);
        }

        if (data.type === "rect") {
          setRectangles((prev) => [
            ...prev,
            data.object,
          ]);
        }

        if (data.type === "text") {
          setTexts((prev) => [
            ...prev,
            data.object,
          ]);
        }
      }
    );

    socket.on(
      "clear-whiteboard",
      () => {
        setLines([]);
        setRectangles([]);
        setTexts([]);
      }
    );

    socket.on(
      "code-update",
      (newCode) => {
        setCode(newCode);
      }
    );

    socket.on(
      "cursor-move",
      (data) => {
        setCursors((prev) => ({
          ...prev,
          [data.id]: {
            name: data.name,
            x: data.x,
            y: data.y,
          },
        }));
      }
    );

    socket.on(
      "user-left",
      (userId) => {
        setCursors((prev) => {
          const updated = {
            ...prev,
          };

          delete updated[userId];

          return updated;
        });
      }
    );

    // =========================
    // ROOM JOIN SUCCESS
    // =========================

    socket.on(
      "room-joined",
      (data) => {
        setRoomId(data.roomId);
        setInRoom(true);
        setMessage(
          `Joined room: ${data.roomId}`
        );
      }
    );

    // =========================
    // AUTH ERROR
    // =========================

    socket.on(
      "auth-error",
      (data) => {
        setInRoom(false);
        setMessage(
          data.message ||
            "Unable to join room."
        );
      }
    );

    return () => {
      socket.off(
        "whiteboard-object"
      );

      socket.off(
        "clear-whiteboard"
      );

      socket.off("code-update");

      socket.off("cursor-move");

      socket.off("user-left");

      socket.off("room-joined");

      socket.off("auth-error");
    };
  }, []);

  // =========================
  // CREATE ROOM
  // =========================

  const createRoom = async () => {
    const currentToken =
      localStorage.getItem(
        "syncspace_token"
      );

    if (!currentToken) {
      setMessage(
        "Please login first."
      );

      return;
    }

    try {
      setMessage(
        "Creating room..."
      );

      const response = await fetch(
        "http://localhost:3001/rooms",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type":
              "application/json",
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Failed to create room."
        );

        return;
      }

      const newRoomId = data.roomId;

      setRoomId(newRoomId);
      setIsOwner(true);

      setMessage(
        `Room created: ${newRoomId}`
      );

      // Automatically join the room
      socket.emit("join-room", {
        roomId: newRoomId,
        name:
          user?.name ||
          name.trim(),
        token: currentToken,
      });
    } catch (error) {
      console.error(
        "Create room error:",
        error
      );

      setMessage(
        "Unable to connect to server."
      );
    }
  };

  // =========================
  // JOIN ROOM
  // =========================

  const joinRoom = async () => {
    const currentToken =
      localStorage.getItem(
        "syncspace_token"
      );

    if (!currentToken) {
      setMessage(
        "Please login first."
      );

      return;
    }

    if (!joinRoomId.trim()) {
      setMessage(
        "Please enter a Room ID."
      );

      return;
    }

    const id =
      joinRoomId.trim();

    try {
      setMessage(
        "Checking room access..."
      );

      const response = await fetch(
        `http://localhost:3001/rooms/${id}/access`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Unable to check room access."
        );

        return;
      }

      if (!data.hasAccess) {
        setMessage(
          "Access denied. You have not been invited to this room."
        );

        return;
      }

      // Save room information
      setRoomId(id);
      setIsOwner(
        data.isOwner === true
      );

      setMessage(
        "Access approved. Joining room..."
      );

      // Join Socket.IO room
      socket.emit("join-room", {
        roomId: id,
        name:
          user?.name ||
          name.trim(),
        token: currentToken,
      });
    } catch (error) {
      console.error(
        "Join room error:",
        error
      );

      setMessage(
        "Unable to connect to server."
      );
    }
  };

  // =========================
  // INVITE USER
  // =========================

  const inviteUser = async () => {
    const currentToken =
      localStorage.getItem(
        "syncspace_token"
      );

    if (!currentToken) {
      setInviteMessage(
        "Please login first."
      );

      return;
    }

    if (!roomId) {
      setInviteMessage(
        "No room selected."
      );

      return;
    }

    if (!inviteEmail.trim()) {
      setInviteMessage(
        "Please enter a user email."
      );

      return;
    }

    try {
      setInviteMessage(
        "Sending invitation..."
      );

      const response = await fetch(
        `http://localhost:3001/rooms/${roomId}/invite`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email:
              inviteEmail.trim(),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setInviteMessage(
          data.message ||
            "Failed to invite user."
        );

        return;
      }

      setInviteMessage(
        `${data.invitedUser.name} has been invited successfully.`
      );

      setInviteEmail("");
    } catch (error) {
      console.error(
        "Invite error:",
        error
      );

      setInviteMessage(
        "Unable to connect to server."
      );
    }
  };

  // =========================
  // LEAVE ROOM
  // =========================

  const leaveRoom = () => {
    socket.emit(
      "leave-room",
      roomId
    );

    setRoomId("");
    setJoinRoomId("");
    setInRoom(false);
    setIsOwner(false);

    setMessage("");

    setInviteEmail("");
    setInviteMessage("");

    setLines([]);
    setRectangles([]);
    setTexts([]);
    setCode("");
    setCursors({});
  };

  // =========================
  // WHITEBOARD MOUSE DOWN
  // =========================

  const handleMouseDown = (e) => {
    if (tool !== "freehand") {
      return;
    }

    const stage =
      e.target.getStage();

    const point =
      stage.getPointerPosition();

    setIsDrawing(true);
    setLastPoint(point);

    const newLine = {
      points: [
        point.x,
        point.y,
      ],
    };

    setLines((prev) => [
      ...prev,
      newLine,
    ]);
  };

  // =========================
  // WHITEBOARD MOUSE MOVE
  // =========================

  const handleMouseMove = (e) => {
    const stage =
      e.target.getStage();

    const point =
      stage.getPointerPosition();

    // Send cursor position
    if (inRoom) {
      socket.emit(
        "cursor-move",
        {
          roomId,
          x: point.x,
          y: point.y,
        }
      );
    }

    if (
      !isDrawing ||
      tool !== "freehand" ||
      !lastPoint
    ) {
      return;
    }

    setLines((prev) => {
      const lastLine =
        prev[prev.length - 1];

      if (!lastLine) {
        return prev;
      }

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

  // =========================
  // WHITEBOARD MOUSE UP
  // =========================

  const handleMouseUp = () => {
    if (!isDrawing) {
      return;
    }

    setIsDrawing(false);

    setLines((currentLines) => {
      const newLine =
        currentLines[
          currentLines.length - 1
        ];

      if (newLine) {
        socket.emit(
          "whiteboard-object",
          {
            roomId,
            type: "line",
            object: newLine,
          }
        );
      }

      return currentLines;
    });

    setLastPoint(null);
  };

  // =========================
  // ADD RECTANGLE
  // =========================

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

    socket.emit(
      "whiteboard-object",
      {
        roomId,
        type: "rect",
        object: newRectangle,
      }
    );
  };

  // =========================
  // ADD TEXT
  // =========================

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

    socket.emit(
      "whiteboard-object",
      {
        roomId,
        type: "text",
        object: newText,
      }
    );
  };

  // =========================
  // CLEAR WHITEBOARD
  // =========================

  const clearWhiteboard = () => {
    setLines([]);
    setRectangles([]);
    setTexts([]);

    socket.emit(
      "clear-whiteboard",
      roomId
    );
  };

  // =========================
  // CODE CHANGE
  // =========================

  const handleCodeChange = (e) => {
    const newCode =
      e.target.value;

    setCode(newCode);

    socket.emit(
      "code-update",
      {
        roomId,
        code: newCode,
      }
    );
  };

  // =========================
  // NOT LOGGED IN
  // =========================

  if (!user) {
    return (
      <div>
        <header>
          <h1>SyncSpace</h1>

          <p>
            Real-Time Collaborative
            Whiteboard and Code Editor
          </p>
        </header>

        <Login
          onLogin={handleLogin}
        />
      </div>
    );
  }

  // =========================
  // MAIN UI
  // =========================

  return (
    <div>
      <header>
        <h1>SyncSpace</h1>

        <p>
          Real-Time Collaborative
          Whiteboard and Code Editor
        </p>

        <p>
          Logged in as:{" "}
          <strong>
            {user.name}
          </strong>
        </p>

        <button
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      {!inRoom ? (
        <main>
          <h2>
            Welcome to SyncSpace
          </h2>

          <p>
            Create a new room or join
            a room you have been invited
            to.
          </p>

          <button
            onClick={createRoom}
          >
            Create Room
          </button>

          <div>
            <br />

            <input
              type="text"
              placeholder="Enter Room ID"
              value={joinRoomId}
              onChange={(e) =>
                setJoinRoomId(
                  e.target.value
                )
              }
            />

            <button
              onClick={joinRoom}
            >
              Join Room
            </button>
          </div>

          {message && (
            <h3>{message}</h3>
          )}
        </main>
      ) : (
        <main>
          <h2>
            SyncSpace Workspace
          </h2>

          <p>
            Room ID:{" "}
            <strong>
              {roomId}
            </strong>
          </p>

          <p>
            You are:{" "}
            <strong>
              {user.name}
            </strong>
          </p>

          <p>
            Role:{" "}
            <strong>
              {isOwner
                ? "Room Owner"
                : "Invited User"}
            </strong>
          </p>

          <button
            onClick={leaveRoom}
          >
            Leave Room
          </button>

          <hr />

          {/* =========================
              INVITATION
          ========================= */}

          {isOwner && (
            <div>
              <h3>
                Invite User
              </h3>

              <input
                type="email"
                placeholder="Enter user email"
                value={inviteEmail}
                onChange={(e) =>
                  setInviteEmail(
                    e.target.value
                  )
                }
              />

              <button
                onClick={inviteUser}
              >
                Invite
              </button>

              {inviteMessage && (
                <p>
                  {inviteMessage}
                </p>
              )}

              <hr />
            </div>
          )}

          {/* =========================
              WHITEBOARD TOOLS
          ========================= */}

          <div>
            <button
              onClick={() =>
                setTool("freehand")
              }
            >
              ✏️ Freehand
            </button>

            <button
              onClick={addRectangle}
            >
              ▭ Rectangle
            </button>

            <button
              onClick={addText}
            >
              T Text
            </button>

            <button
              onClick={
                clearWhiteboard
              }
            >
              Clear
            </button>
          </div>

          {/* =========================
              WORKSPACE
          ========================= */}

          <div className="workspace">
            {/* WHITEBOARD */}

            <div className="whiteboard">
              <h2>
                Whiteboard
              </h2>

              <Stage
                width={600}
                height={350}
                onMouseDown={
                  handleMouseDown
                }
                onMousemove={
                  handleMouseMove
                }
                onMouseup={
                  handleMouseUp
                }
                style={{
                  border:
                    "2px solid black",
                  background:
                    "white",
                }}
              >
                <Layer>
                  {/* FREEHAND LINES */}

                  {lines.map(
                    (
                      line,
                      index
                    ) => (
                      <Line
                        key={`line-${index}`}
                        points={
                          line.points
                        }
                        stroke="black"
                        strokeWidth={
                          3
                        }
                        lineCap="round"
                        lineJoin="round"
                      />
                    )
                  )}

                  {/* RECTANGLES */}

                  {rectangles.map(
                    (
                      rect,
                      index
                    ) => (
                      <Rect
                        key={`rect-${index}`}
                        {...rect}
                      />
                    )
                  )}

                  {/* TEXT */}

                  {texts.map(
                    (
                      text,
                      index
                    ) => (
                      <Text
                        key={`text-${index}`}
                        {...text}
                      />
                    )
                  )}

                  {/* OTHER USERS' CURSORS */}

                  {Object.entries(
                    cursors
                  ).map(
                    ([
                      id,
                      cursor,
                    ]) => (
                      <Group
                        key={id}
                        x={
                          cursor.x
                        }
                        y={
                          cursor.y
                        }
                      >
                        <Text
                          text={`👤 ${cursor.name}`}
                          fontSize={
                            14
                          }
                          fill="blue"
                          padding={
                            4
                          }
                        />

                        <Text
                          text="▼"
                          y={18}
                          fontSize={
                            16
                          }
                          fill="blue"
                        />
                      </Group>
                    )
                  )}
                </Layer>
              </Stage>
            </div>

            {/* CODE EDITOR */}

            <div className="code-editor">
              <h2>
                Code Editor
              </h2>

              <textarea
                placeholder="Write your code here..."
                rows="15"
                cols="60"
                value={code}
                onChange={
                  handleCodeChange
                }
              />
            </div>
          </div>

          {message && (
            <h3>{message}</h3>
          )}
        </main>
      )}
    </div>
  );
}

export default App;