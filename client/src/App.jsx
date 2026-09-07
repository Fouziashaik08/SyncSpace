import { useEffect, useRef, useState } from "react";
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
import CodeEditor from "./CodeEditor";

const socket = io("http://localhost:3001", {
  autoConnect: false,
});

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("syncspace_user");

    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [name, setName] = useState("");

  const [message, setMessage] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  const [invitations, setInvitations] = useState([]);
  const [invitationLoading, setInvitationLoading] = useState(false);

  const [tool, setTool] = useState("freehand");

  const [lines, setLines] = useState([]);
  const [rectangles, setRectangles] = useState([]);
  const [texts, setTexts] = useState([]);

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");

  const [cursors, setCursors] = useState({});
  const [roomUsers, setRoomUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimer = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);

  const [isReplayMode, setIsReplayMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayMessage, setReplayMessage] = useState("");

  const liveSnapshot = useRef(null);
  const replayTimer = useRef(null);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setName(loggedInUser.name);
    setMessage("Login successful!");
    const currentToken = localStorage.getItem("syncspace_token");
    if (currentToken) {
      socket.auth = { token: currentToken };
      if (!socket.connected) socket.connect();
    }
  };

  const handleLogout = () => {
    if (inRoom) {
      socket.emit("leave-room", roomId);
    }

    localStorage.removeItem("syncspace_token");
    localStorage.removeItem("syncspace_user");

    setUser(null);
    setRoomId("");
    setJoinRoomId("");
    setName("");
    setInRoom(false);
    setIsOwner(false);

    setMessage("");
    setInviteEmail("");
    setInviteMessage("");
    setInvitations([]);

    setLines([]);
    setRectangles([]);
    setTexts([]);
    setCode("");
    setLanguage("javascript");
    setCursors({});
    setRoomUsers([]);
    setTypingUsers({});

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }

    setIsReplayMode(false);
    setHistory([]);
    setReplayIndex(-1);
    setIsPlaying(false);
  };

  useEffect(() => {
    const currentToken = localStorage.getItem("syncspace_token");
    if (user && currentToken) {
      socket.auth = { token: currentToken };
      if (!socket.connected) socket.connect();
    }
  }, [user]);

  useEffect(() => {
    const handleWhiteboardObject = (data) => {
      if (isReplayMode) {
        return;
      }

      if (data.type === "line") {
        setLines((prev) => [...prev, data.object]);
      }

      if (data.type === "rect") {
        setRectangles((prev) => [...prev, data.object]);
      }

      if (data.type === "text") {
        setTexts((prev) => [...prev, data.object]);
      }
    };

    const handleClearWhiteboard = () => {
      if (isReplayMode) {
        return;
      }

      setLines([]);
      setRectangles([]);
      setTexts([]);
    };

    const handleLanguageUpdate = (newLanguage) => {
      if (isReplayMode) return;
      setLanguage(newLanguage);
    };

    const handleRoomUsers = (usersList) => {
      setRoomUsers(Array.isArray(usersList) ? usersList : []);
    };

    const handleUserJoined = (newUser) => {
      if (!newUser) return;
      setRoomUsers((prev) => {
        const exists = prev.some((item) => item.socketId === newUser.socketId);
        if (exists) return prev;
        return [...prev, newUser];
      });
    };

    const handleUserTyping = (data) => {
      if (!data || !data.id) return;
      setTypingUsers((prev) => {
        const updated = { ...prev };
        if (data.typing) {
          updated[data.id] = { name: data.name };
        } else {
          delete updated[data.id];
        }
        return updated;
      });
    };

    const handleCodeUpdate = (newCode) => {
      if (isReplayMode) {
        return;
      }

      setCode(newCode);
    };

    const handleCursorMove = (data) => {
      if (isReplayMode) {
        return;
      }

      setCursors((prev) => ({
        ...prev,
        [data.id]: {
          name: data.name,
          x: data.x,
          y: data.y,
        },
      }));
    };

    const handleUserLeft = (userId) => {
      setCursors((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });

      setRoomUsers((prev) =>
        prev.filter((roomUser) => roomUser.socketId !== userId)
      );

      setTypingUsers((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    };

    const handleRoomJoined = (data) => {
      setRoomId(data.roomId);
      setInRoom(true);
      setMessage(`Joined room: ${data.roomId}`);
    };

    const handleAuthError = (data) => {
      setInRoom(false);
      setMessage(data.message || "Unable to join room.");
    };

    socket.on("whiteboard-object", handleWhiteboardObject);
    socket.on("clear-whiteboard", handleClearWhiteboard);
    socket.on("code-update", handleCodeUpdate);
    socket.on("language-update", handleLanguageUpdate);
    socket.on("cursor-move", handleCursorMove);
    socket.on("room-users", handleRoomUsers);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-left", handleUserLeft);
    socket.on("room-joined", handleRoomJoined);
    socket.on("auth-error", handleAuthError);

    return () => {
      socket.off("whiteboard-object", handleWhiteboardObject);
      socket.off("clear-whiteboard", handleClearWhiteboard);
      socket.off("code-update", handleCodeUpdate);
      socket.off("language-update", handleLanguageUpdate);
      socket.off("cursor-move", handleCursorMove);
      socket.off("room-users", handleRoomUsers);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-left", handleUserLeft);
      socket.off("room-joined", handleRoomJoined);
      socket.off("auth-error", handleAuthError);
    };
  }, [isReplayMode]);

  useEffect(() => {
    return () => {
      if (replayTimer.current) {
        clearInterval(replayTimer.current);
      }
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }
    };
  }, []);

  const createRoom = async () => {
    const currentToken = localStorage.getItem("syncspace_token");

    if (!currentToken) {
      setMessage("Please login first.");
      return;
    }

    try {
      setMessage("Creating room...");

      const response = await fetch("http://localhost:3001/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to create room.");
        return;
      }

      const newRoomId = data.roomId;

      setRoomId(newRoomId);
      setIsOwner(true);

      setMessage(`Room created: ${newRoomId}`);

      if (!socket.connected) {
        socket.auth = { token: currentToken };
        socket.connect();
      }

      socket.emit("join-room", {
        roomId: newRoomId,
        name: user?.name || name.trim(),
        token: currentToken,
      });
    } catch (error) {
      console.error("Create room error:", error);
      setMessage("Unable to connect to server.");
    }
  };

  const joinRoom = async () => {
    const currentToken = localStorage.getItem("syncspace_token");

    if (!currentToken) {
      setMessage("Please login first.");
      return;
    }

    if (!joinRoomId.trim()) {
      setMessage("Please enter a Room ID.");
      return;
    }

    const id = joinRoomId.trim();

    try {
      setMessage("Checking room access...");

      const response = await fetch(
        `http://localhost:3001/rooms/${id}/access`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to check room access.");
        return;
      }

      if (!data.hasAccess) {
        setMessage(
          "Access denied. You have not been invited to this room."
        );
        return;
      }

      setRoomId(id);
      setIsOwner(data.isOwner === true);

      setMessage("Access approved. Joining room...");

      if (!socket.connected) {
        socket.auth = { token: currentToken };
        socket.connect();
      }

      socket.emit("join-room", {
        roomId: id,
        name: user?.name || name.trim(),
        token: currentToken,
      });
    } catch (error) {
      console.error("Join room error:", error);
      setMessage("Unable to connect to server.");
    }
  };

  const loadInvitations = async () => {
    const currentToken = localStorage.getItem("syncspace_token");

    if (!currentToken) {
      return;
    }

    try {
      setInvitationLoading(true);

      const response = await fetch(
        "http://localhost:3001/invitations",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return;
      }

      setInvitations(data.invitations || []);
    } catch (error) {
      console.error("Invitation loading error:", error);
    } finally {
      setInvitationLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadInvitations();
    }
  }, [user]);

  const acceptInvitation = async (invitationId) => {
    const currentToken = localStorage.getItem("syncspace_token");

    if (!currentToken) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/invitations/${invitationId}/accept`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to accept invitation.");
        return;
      }

      const acceptedRoomId = data.roomId;

      setJoinRoomId(acceptedRoomId);

      setMessage(
        `Invitation accepted. Joining room ${acceptedRoomId}...`
      );

      setInvitations((prev) =>
        prev.filter((item) => item.id !== invitationId)
      );

      socket.emit("join-room", {
        roomId: acceptedRoomId,
        name: user?.name || name.trim(),
        token: currentToken,
      });
    } catch (error) {
      console.error("Accept invitation error:", error);
      setMessage("Unable to connect to server.");
    }
  };

  const declineInvitation = async (invitationId) => {
    const currentToken = localStorage.getItem("syncspace_token");

    if (!currentToken) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/invitations/${invitationId}/decline`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to decline invitation.");
        return;
      }

      setInvitations((prev) =>
        prev.filter((item) => item.id !== invitationId)
      );

      setMessage("Invitation declined.");
    } catch (error) {
      console.error("Decline invitation error:", error);
      setMessage("Unable to connect to server.");
    }
  };

  const inviteUser = async () => {
    const currentToken = localStorage.getItem("syncspace_token");

    if (!currentToken) {
      setInviteMessage("Please login first.");
      return;
    }

    if (!roomId) {
      setInviteMessage("No room selected.");
      return;
    }

    if (!inviteEmail.trim()) {
      setInviteMessage("Please enter a user email.");
      return;
    }

    try {
      setInviteMessage("Sending invitation...");

      const response = await fetch(
        `http://localhost:3001/rooms/${roomId}/invite`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: inviteEmail.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setInviteMessage(data.message || "Failed to invite user.");
        return;
      }

      setInviteMessage(
        `${data.invitedUser.name} has been invited successfully.`
      );

      setInviteEmail("");
    } catch (error) {
      console.error("Invite error:", error);
      setInviteMessage("Unable to connect to server.");
    }
  };

  const leaveRoom = () => {
    if (replayTimer.current) {
      clearInterval(replayTimer.current);
      replayTimer.current = null;
    }

    socket.emit("leave-room", roomId);

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
    setLanguage("javascript");
    setCursors({});
    setRoomUsers([]);
    setTypingUsers({});

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }

    setIsReplayMode(false);
    setHistory([]);
    setReplayIndex(-1);
    setIsPlaying(false);
  };

  const handleMouseDown = (e) => {
    if (isReplayMode || tool !== "freehand") {
      return;
    }

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (!point) {
      return;
    }

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

    if (!point) {
      return;
    }

    if (inRoom && !isReplayMode) {
      socket.emit("cursor-move", {
        roomId,
        x: point.x,
        y: point.y,
      });
    }

    if (
      isReplayMode ||
      !isDrawing ||
      tool !== "freehand" ||
      !lastPoint
    ) {
      return;
    }

    setLines((prev) => {
      const lastLine = prev[prev.length - 1];

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

      return [...prev.slice(0, -1), updatedLine];
    });

    setLastPoint(point);
  };

  const handleMouseUp = () => {
    if (isReplayMode || !isDrawing) {
      return;
    }

    setIsDrawing(false);

    setLines((currentLines) => {
      const newLine = currentLines[currentLines.length - 1];

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
    if (isReplayMode) {
      return;
    }

    const newRectangle = {
      x: 100,
      y: 100,
      width: 150,
      height: 100,
      stroke: "black",
      strokeWidth: 3,
    };

    setRectangles((prev) => [...prev, newRectangle]);

    socket.emit("whiteboard-object", {
      roomId,
      type: "rect",
      object: newRectangle,
    });
  };

  const addText = () => {
    if (isReplayMode) {
      return;
    }

    const newText = {
      x: 150,
      y: 150,
      text: "SyncSpace Text",
      fontSize: 24,
      fill: "black",
    };

    setTexts((prev) => [...prev, newText]);

    socket.emit("whiteboard-object", {
      roomId,
      type: "text",
      object: newText,
    });
  };

  const clearWhiteboard = () => {
    if (isReplayMode) {
      return;
    }

    setLines([]);
    setRectangles([]);
    setTexts([]);

    socket.emit("clear-whiteboard", roomId);
  };

  const handleCodeChange = (newCode) => {
    if (isReplayMode) {
      return;
    }

    setCode(newCode);

    socket.emit("code-update", {
      roomId,
      code: newCode,
    });
  };

  const handleTyping = () => {
    if (isReplayMode || !inRoom) return;

    socket.emit("typing", { typing: true });

    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
    }

    typingTimer.current = setTimeout(() => {
      socket.emit("typing", { typing: false });
    }, 1000);
  };

  const loadReplayHistory = async () => {
    const currentToken = localStorage.getItem("syncspace_token");

    if (!currentToken) {
      setReplayMessage("Please login first.");
      return;
    }

    if (!roomId) {
      setReplayMessage("No room selected.");
      return;
    }

    try {
      setReplayLoading(true);
      setReplayMessage("Loading session history...");

      const response = await fetch(
        `http://localhost:3001/rooms/${roomId}/history`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setReplayMessage(
          data.message || "Unable to load replay history."
        );
        return;
      }

      const loadedHistory = data.history || [];

      if (loadedHistory.length === 0) {
        setReplayMessage(
          "No history recorded yet. Draw something or edit the code first."
        );
        return;
      }

      liveSnapshot.current = {
        lines: [...lines],
        rectangles: [...rectangles],
        texts: [...texts],
        code,
        language,
      };

      setHistory(loadedHistory);
      setIsReplayMode(true);
      setIsPlaying(false);
      setReplayIndex(-1);

      setReplayMessage(
        `Loaded ${loadedHistory.length} history events.`
      );

      setLines([]);
      setRectangles([]);
      setTexts([]);
      setCode("");
      setLanguage("javascript");
    } catch (error) {
      console.error("Replay history error:", error);
      setReplayMessage("Unable to connect to server.");
    } finally {
      setReplayLoading(false);
    }
  };

  const buildReplayState = (events, targetIndex) => {
    let replayLines = [];
    let replayRectangles = [];
    let replayTexts = [];
    let replayCode = "";
    let replayLanguage = "javascript";

    if (targetIndex < 0) {
      return {
        lines: [],
        rectangles: [],
        texts: [],
        code: "",
        language: "javascript",
      };
    }

    for (let i = 0; i <= targetIndex; i++) {
      const event = events[i];

      if (!event) {
        continue;
      }

      if (event.type === "line") {
        replayLines = [
          ...replayLines,
          event.object,
        ];
      }

      if (event.type === "rect") {
        replayRectangles = [
          ...replayRectangles,
          event.object,
        ];
      }

      if (event.type === "text") {
        replayTexts = [
          ...replayTexts,
          event.object,
        ];
      }

      if (event.type === "clear") {
        replayLines = [];
        replayRectangles = [];
        replayTexts = [];
      }

      if (event.type === "code") {
        replayCode = event.code || "";
      }

      if (event.type === "language") {
        replayLanguage = event.language || "javascript";
      }
    }

    return {
      lines: replayLines,
      rectangles: replayRectangles,
      texts: replayTexts,
      code: replayCode,
      language: replayLanguage,
    };
  };

  const showReplayPosition = (index) => {
    if (!history.length) {
      return;
    }

    const safeIndex = Math.max(
      -1,
      Math.min(index, history.length - 1)
    );

    const state = buildReplayState(
      history,
      safeIndex
    );

    setReplayIndex(safeIndex);
    setLines(state.lines);
    setRectangles(state.rectangles);
    setTexts(state.texts);
    setCode(state.code);
  };

  const handleReplaySlider = (e) => {
    const index = Number(e.target.value);

    setIsPlaying(false);

    if (replayTimer.current) {
      clearInterval(replayTimer.current);
      replayTimer.current = null;
    }

    showReplayPosition(index);
  };

  const toggleReplayPlay = () => {
    if (!history.length) {
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);

      if (replayTimer.current) {
        clearInterval(replayTimer.current);
        replayTimer.current = null;
      }

      return;
    }

    if (replayIndex >= history.length - 1) {
      showReplayPosition(-1);
    }

    setIsPlaying(true);

    if (replayTimer.current) {
      clearInterval(replayTimer.current);
    }

    replayTimer.current = setInterval(() => {
      setReplayIndex((currentIndex) => {
        const nextIndex = currentIndex + 1;

        if (nextIndex >= history.length) {
          clearInterval(replayTimer.current);

          replayTimer.current = null;

          setIsPlaying(false);

          return currentIndex;
        }

        const state = buildReplayState(
          history,
          nextIndex
        );

        setLines(state.lines);
        setRectangles(state.rectangles);
        setTexts(state.texts);
        setCode(state.code);
        setLanguage(state.language);

        return nextIndex;
      });
    }, 500);
  };

  const exitReplay = () => {
    if (replayTimer.current) {
      clearInterval(replayTimer.current);
      replayTimer.current = null;
    }

    setIsPlaying(false);

    if (liveSnapshot.current) {
      setLines(liveSnapshot.current.lines);
      setRectangles(liveSnapshot.current.rectangles);
      setTexts(liveSnapshot.current.texts);
      setCode(liveSnapshot.current.code);
      setLanguage(liveSnapshot.current.language || "javascript");
    }

    setIsReplayMode(false);
    setHistory([]);
    setReplayIndex(-1);
    setReplayMessage("");

    liveSnapshot.current = null;
  };

  const formatReplayTime = (timestamp) => {
    if (!timestamp) {
      return "00:00";
    }

    const firstTimestamp =
      history.length > 0
        ? history[0].timestamp
        : timestamp;

    const seconds = Math.max(
      0,
      Math.floor(
        (timestamp - firstTimestamp) / 1000
      )
    );

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  if (!user) {
    return (
      <div className="auth-page">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">S</div>

            <div>
              <h1>SyncSpace</h1>
              <p>
                Real-Time Collaborative Workspace
              </p>
            </div>
          </div>
        </header>

        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>

          <div>
            <h1>SyncSpace</h1>
            <p>Collaborative Workspace</p>
          </div>
        </div>

        <div className="topbar-center">
          {inRoom && (
            <div className="room-pill">
              Room: {roomId}
            </div>
          )}
        </div>

        <div className="user-menu">
          <span>{user.name}</span>

          <button
            className="button secondary"
            onClick={handleLogout}
            disabled={isReplayMode}
          >
            Logout
          </button>
        </div>
      </header>

      {!inRoom ? (
        <main className="home-page">
          <section className="hero-card">
            <div>
              <span className="eyebrow">
                REAL-TIME DEVELOPMENT
              </span>

              <h2>
                Build together.
                <br />
                Think together.
              </h2>

              <p>
                Collaborate on code and ideas in one
                shared workspace.
              </p>
            </div>
          </section>

          <div className="home-grid">
            <section className="panel action-panel">
              <div className="panel-heading">
                <div className="panel-icon">+</div>

                <div>
                  <h3>Create Workspace</h3>
                  <p>
                    Start a new collaborative room.
                  </p>
                </div>
              </div>

              <button
                className="button primary"
                onClick={createRoom}
              >
                Create New Room
              </button>
            </section>

            <section className="panel action-panel">
              <div className="panel-heading">
                <div className="panel-icon">↗</div>

                <div>
                  <h3>Join Workspace</h3>
                  <p>
                    Enter a room ID you have access to.
                  </p>
                </div>
              </div>

              <div className="input-row">
                <input
                  className="input"
                  type="text"
                  placeholder="Enter Room ID"
                  value={joinRoomId}
                  onChange={(e) =>
                    setJoinRoomId(e.target.value)
                  }
                />

                <button
                  className="button primary"
                  onClick={joinRoom}
                >
                  Join
                </button>
              </div>
            </section>
          </div>

          <section className="panel invitations-panel">
            <div className="section-heading">
              <div>
                <h3>Invitations</h3>
                <p>
                  Rooms shared with your account.
                </p>
              </div>

              <span className="count-badge">
                {invitations.length}
              </span>
            </div>

            {invitationLoading ? (
              <div className="empty-state">
                Loading invitations...
              </div>
            ) : invitations.length === 0 ? (
              <div className="empty-state">
                No pending invitations.
              </div>
            ) : (
              <div className="invitation-list">
                {invitations.map((invitation) => (
                  <div
                    className="invitation-card"
                    key={invitation.id}
                  >
                    <div className="invitation-avatar">
                      {(
                        invitation.fromUser?.name ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="invitation-info">
                      <strong>
                        {invitation.fromUser?.name ||
                          "User"}
                      </strong>

                      <span>
                        invited you to room{" "}
                        <b>{invitation.roomId}</b>
                      </span>
                    </div>

                    <div className="invitation-actions">
                      <button
                        className="button primary"
                        onClick={() =>
                          acceptInvitation(
                            invitation.id
                          )
                        }
                      >
                        Accept
                      </button>

                      <button
                        className="button secondary"
                        onClick={() =>
                          declineInvitation(
                            invitation.id
                          )
                        }
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {message && (
            <div className="notice">
              {message}
            </div>
          )}
        </main>
      ) : (
        <main className="workspace-page">
          <div className="workspace-toolbar">
            <div>
              <span className="eyebrow">
                COLLABORATIVE ROOM
              </span>

              <h2>Workspace</h2>

              <span className="workspace-title">
                Room ID: {roomId}
              </span>
            </div>

            <div className="toolbar-actions">
              <span className="online-pill">
                <span className="online-dot"></span>
                Live
              </span>

              <button
                className="button secondary"
                onClick={loadReplayHistory}
                disabled={
                  isReplayMode ||
                  replayLoading
                }
              >
                {replayLoading
                  ? "Loading..."
                  : "📜 Replay History"}
              </button>

              <button
                className="button danger"
                onClick={leaveRoom}
                disabled={isReplayMode}
              >
                Leave Room
              </button>
            </div>
          </div>

          {isReplayMode && (
            <section className="panel replay-panel">
              <div className="replay-header">
                <div>
                  <span className="replay-badge">
                    REPLAY MODE
                  </span>

                  <h3>
                    Previous Workspace Session
                  </h3>

                  <p>
                    Live collaboration is paused while
                    viewing history.
                  </p>
                </div>

                <button
                  className="button secondary"
                  onClick={exitReplay}
                >
                  Exit Replay
                </button>
              </div>

              <div className="replay-timeline">
                <div className="timeline-meta">
                  <span>
                    Event{" "}
                    <strong>
                      {Math.max(
                        0,
                        replayIndex + 1
                      )}
                    </strong>{" "}
                    / {history.length}
                  </span>

                  <span>
                    {replayIndex >= 0
                      ? formatReplayTime(
                          history[
                            replayIndex
                          ]?.timestamp
                        )
                      : "00:00"}
                  </span>
                </div>

                <input
                  className="timeline-slider"
                  type="range"
                  min="-1"
                  max={Math.max(
                    0,
                    history.length - 1
                  )}
                  value={replayIndex}
                  onChange={handleReplaySlider}
                />

                <div className="replay-controls">
                  <button
                    className="button secondary"
                    onClick={() =>
                      showReplayPosition(-1)
                    }
                  >
                    ⏮ Beginning
                  </button>

                  <button
                    className="button secondary"
                    onClick={() =>
                      showReplayPosition(
                        replayIndex - 1
                      )
                    }
                    disabled={
                      replayIndex <= -1
                    }
                  >
                    ◀ Previous
                  </button>

                  <button
                    className="button primary"
                    onClick={
                      toggleReplayPlay
                    }
                  >
                    {isPlaying
                      ? "⏸ Pause"
                      : "▶ Play"}
                  </button>

                  <button
                    className="button secondary"
                    onClick={() =>
                      showReplayPosition(
                        replayIndex + 1
                      )
                    }
                    disabled={
                      replayIndex >=
                      history.length - 1
                    }
                  >
                    Next ▶
                  </button>
                </div>

                {replayMessage && (
                  <div className="notice">
                    {replayMessage}
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="workspace-layout">
            <section className="workspace-main">
              <div className="editor-card">
                <div className="editor-header">
                  <div>
                    <span className="editor-icon">
                      ✎
                    </span>

                    <strong>
                      Whiteboard
                    </strong>
                  </div>

                  <div className="tool-group">
                    <button
                      className={`tool-button ${
                        tool === "freehand"
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setTool("freehand")
                      }
                      disabled={
                        isReplayMode
                      }
                    >
                      ✏ Freehand
                    </button>

                    <button
                      className="tool-button"
                      onClick={addRectangle}
                      disabled={
                        isReplayMode
                      }
                    >
                      ▭ Rectangle
                    </button>

                    <button
                      className="tool-button"
                      onClick={addText}
                      disabled={
                        isReplayMode
                      }
                    >
                      T Text
                    </button>

                    <button
                      className="tool-button clear-tool"
                      onClick={
                        clearWhiteboard
                      }
                      disabled={
                        isReplayMode
                      }
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="canvas-container">
                  <Stage
                    width={900}
                    height={500}
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
                      background: "#ffffff",
                    }}
                  >
                    <Layer>
                      {lines.map(
                        (line, index) => (
                          <Line
                            key={`line-${index}`}
                            points={
                              line.points
                            }
                            stroke="black"
                            strokeWidth={3}
                            lineCap="round"
                            lineJoin="round"
                          />
                        )
                      )}

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

                      {!isReplayMode &&
                        Object.entries(
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
              </div>

              <div className="code-card">
                <div className="code-status">
                  <span>
                    {isReplayMode
                      ? "Replay snapshot"
                      : "Live collaborative editor"}
                  </span>

                  <span>
                    {isReplayMode
                      ? "Read only"
                      : "Connected"}
                  </span>
                </div>

                {Object.keys(typingUsers).length > 0 && (
                  <div className="typing-indicator">
                    <span className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                    {Object.values(typingUsers)
                      .map((typingUser) => `${typingUser.name} is typing...`)
                      .join(" ")}
                  </div>
                )}

                <CodeEditor
                  code={code}
                  setCode={setCode}
                  language={language}
                  setLanguage={(nextLanguage) => {
                    if (isReplayMode) return;
                    setLanguage(nextLanguage);
                    socket.emit("language-update", {
                      roomId,
                      language: nextLanguage,
                    });
                  }}
                  onCodeChange={
                    handleCodeChange
                  }
                  onTyping={handleTyping}
                  readOnly={
                    isReplayMode
                  }
                />
              </div>
            </section>

            <aside className="sidebar">
              {isOwner && (
                <section className="side-panel">
                  <div className="side-panel-header">
                    <h3>Invite Collaborator</h3>
                    <span>OWNER</span>
                  </div>

                  <input
                    className="input"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) =>
                      setInviteEmail(
                        e.target.value
                      )
                    }
                    disabled={
                      isReplayMode
                    }
                  />

                  <button
                    className="button primary full-width"
                    onClick={inviteUser}
                    disabled={
                      isReplayMode
                    }
                  >
                    Send Invitation
                  </button>

                  {inviteMessage && (
                    <div className="notice">
                      {inviteMessage}
                    </div>
                  )}
                </section>
              )}

              <section className="side-panel">
                <div className="side-panel-header">
                  <h3>Collaborators</h3>
                  <span>{roomUsers.length}</span>
                </div>

                <div className="collaborator-list">
                  {roomUsers.length === 0 ? (
                    <div className="empty-state">
                      No collaborators yet.
                    </div>
                  ) : (
                    roomUsers.map((roomUser) => (
                      <div
                        className="collaborator-item"
                        key={roomUser.socketId}
                      >
                        <div className="collaborator-avatar">
                          {(roomUser.name || "U").charAt(0).toUpperCase()}
                        </div>

                        <div className="collaborator-info">
                          <strong>{roomUser.name}</strong>
                          <span>
                            {roomUser.id === user.id ? "You" : "Online"}
                          </span>
                        </div>

                        <span className="online-dot"></span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="side-panel">
                <div className="side-panel-header">
                  <h3>Room Info</h3>
                </div>

                <div className="room-detail">
                  <span>Room ID</span>
                  <strong>{roomId}</strong>
                </div>

                <div className="room-detail">
                  <span>Your Role</span>
                  <strong>
                    {isOwner
                      ? "Owner"
                      : "Collaborator"}
                  </strong>
                </div>

                <div className="room-detail">
                  <span>Editor</span>
                  <strong>
                    Monaco
                  </strong>
                </div>
              </section>

              <section className="side-panel">
                <div className="side-panel-header">
                  <h3>Session</h3>
                </div>

                <div className="room-detail">
                  <span>Status</span>

                  <strong>
                    {isReplayMode
                      ? "Replay"
                      : "Live"}
                  </strong>
                </div>

                <div className="room-detail">
                  <span>Language</span>

                  <strong>
                    {language}
                  </strong>
                </div>
              </section>
            </aside>
          </div>

          {message && (
            <div className="global-message">
              {message}
            </div>
          )}
        </main>
      )}
    </div>
  );
}

export default App;