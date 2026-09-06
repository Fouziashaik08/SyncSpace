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

const socket = io("http://localhost:3001");

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

  const [tool, setTool] = useState("freehand");
  const [lines, setLines] = useState([]);
  const [rectangles, setRectangles] = useState([]);
  const [texts, setTexts] = useState([]);
  const [code, setCode] = useState("");

  const [cursors, setCursors] = useState({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);

  const [canvasWidth, setCanvasWidth] = useState(800);
  const canvasContainerRef = useRef(null);

  const [isReplayMode, setIsReplayMode] = useState(false);
  const [history, setHistory] = useState([]);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayMessage, setReplayMessage] = useState("");

  const liveSnapshot = useRef(null);
  const replayTimer = useRef(null);

  const token = localStorage.getItem("syncspace_token");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasContainerRef.current) {
        const width = canvasContainerRef.current.clientWidth;
        setCanvasWidth(Math.max(400, width));
      }
    };

    updateCanvasSize();

    const observer = new ResizeObserver(() => {
      updateCanvasSize();
    });

    if (canvasContainerRef.current) {
      observer.observe(canvasContainerRef.current);
    }

    window.addEventListener("resize", updateCanvasSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [inRoom]);

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
    };

    const handleRoomJoined = (data) => {
      setRoomId(data.roomId);
      setInRoom(true);
      setMessage(`Joined room: ${data.roomId}`);
    };

    const handleAuthError = (data) => {
      setMessage(data.message || "Room access denied.");
      setInRoom(false);
    };

    socket.on("whiteboard-object", handleWhiteboardObject);
    socket.on("clear-whiteboard", handleClearWhiteboard);
    socket.on("code-update", handleCodeUpdate);
    socket.on("cursor-move", handleCursorMove);
    socket.on("user-left", handleUserLeft);
    socket.on("room-joined", handleRoomJoined);
    socket.on("auth-error", handleAuthError);

    return () => {
      socket.off("whiteboard-object", handleWhiteboardObject);
      socket.off("clear-whiteboard", handleClearWhiteboard);
      socket.off("code-update", handleCodeUpdate);
      socket.off("cursor-move", handleCursorMove);
      socket.off("user-left", handleUserLeft);
      socket.off("room-joined", handleRoomJoined);
      socket.off("auth-error", handleAuthError);
    };
  }, [isReplayMode]);

  useEffect(() => {
    if (user) {
      loadInvitations();
    }
  }, [user]);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setName(loggedInUser.name || "");
    setMessage("Login successful!");
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
    setCursors({});
    setIsReplayMode(false);
    setHistory([]);
    setReplayIndex(-1);
    setIsPlaying(false);
  };

  const createRoom = async () => {
    const currentToken = localStorage.getItem("syncspace_token");

    if (!currentToken) {
      setMessage("Please login first.");
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to create room.");
        return;
      }

      const newRoomId = data.roomId;

      setRoomId(newRoomId);
      setInRoom(true);
      setIsOwner(true);
      setMessage(`Room created: ${newRoomId}`);

      socket.emit("join-room", {
        roomId: newRoomId,
        name: user.name,
        token: currentToken,
      });
    } catch (error) {
      setMessage("Unable to connect to server.");
    }
  };

  const joinRoom = async () => {
    const currentToken = localStorage.getItem("syncspace_token");
    const id = joinRoomId.trim();

    if (!currentToken) {
      setMessage("Please login first.");
      return;
    }

    if (!id) {
      setMessage("Please enter a Room ID.");
      return;
    }

    try {
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
        setMessage("You are not invited to this room.");
        return;
      }

      setRoomId(id);
      setIsOwner(Boolean(data.isOwner));
      setMessage("Joining room...");

      socket.emit("join-room", {
        roomId: id,
        name: user.name,
        token: currentToken,
      });
    } catch (error) {
      setMessage("Unable to connect to server.");
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
    setCursors({});
    setIsReplayMode(false);
    setHistory([]);
    setReplayIndex(-1);
    setIsPlaying(false);
    liveSnapshot.current = null;
  };

  const inviteUser = async () => {
    const currentToken = localStorage.getItem("syncspace_token");

    if (!currentToken) {
      setInviteMessage("Please login first.");
      return;
    }

    if (!inviteEmail.trim()) {
      setInviteMessage("Please enter an email address.");
      return;
    }

    try {
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
        setInviteMessage(data.message || "Unable to invite user.");
        return;
      }

      setInviteMessage(
        `${data.invitedUser?.name || inviteEmail} invited successfully.`
      );
      setInviteEmail("");
    } catch (error) {
      setInviteMessage("Unable to connect to server.");
    }
  };

  const loadInvitations = async () => {
    const currentToken = localStorage.getItem("syncspace_token");

    if (!currentToken) {
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:3001/invitations",
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (error) {
      setInvitations([]);
    }
  };

  const acceptInvitation = async (invitationId) => {
    const currentToken = localStorage.getItem("syncspace_token");

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

      setInvitations((prev) =>
        prev.filter((invitation) => invitation.id !== invitationId)
      );

      const acceptedRoomId = data.roomId;

      setJoinRoomId(acceptedRoomId);
      setMessage("Invitation accepted. Joining room...");

      const accessResponse = await fetch(
        `http://localhost:3001/rooms/${acceptedRoomId}/access`,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      const accessData = await accessResponse.json();

      if (!accessResponse.ok || !accessData.hasAccess) {
        setMessage("Invitation accepted, but room access could not be loaded.");
        return;
      }

      setRoomId(acceptedRoomId);
      setIsOwner(Boolean(accessData.isOwner));

      socket.emit("join-room", {
        roomId: acceptedRoomId,
        name: user.name,
        token: currentToken,
      });
    } catch (error) {
      setMessage("Unable to connect to server.");
    }
  };

  const declineInvitation = async (invitationId) => {
    const currentToken = localStorage.getItem("syncspace_token");

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
        prev.filter((invitation) => invitation.id !== invitationId)
      );

      setMessage("Invitation declined.");
    } catch (error) {
      setMessage("Unable to connect to server.");
    }
  };

  const handleMouseDown = (e) => {
    if (isReplayMode || tool !== "freehand") {
      return;
    }

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

      return [
        ...prev.slice(0, -1),
        updatedLine,
      ];
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
    if (isReplayMode) {
      return;
    }

    setLines([]);
    setRectangles([]);
    setTexts([]);

    socket.emit("clear-whiteboard", roomId);
  };

  const handleCodeChange = (e) => {
    if (isReplayMode) {
      return;
    }

    const newCode = e.target.value;

    setCode(newCode);

    socket.emit("code-update", {
      roomId,
      code: newCode,
    });
  };

  const buildReplayState = (events, targetIndex) => {
    let replayLines = [];
    let replayRectangles = [];
    let replayTexts = [];
    let replayCode = "";

    if (targetIndex < 0) {
      return {
        lines: [],
        rectangles: [],
        texts: [],
        code: "",
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
    }

    return {
      lines: replayLines,
      rectangles: replayRectangles,
      texts: replayTexts,
      code: replayCode,
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

  const loadReplayHistory = async () => {
    const currentToken =
      localStorage.getItem("syncspace_token");

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
          data.message ||
            "Unable to load replay history."
        );
        return;
      }

      const loadedHistory =
        data.history || [];

      if (!loadedHistory.length) {
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
      };

      setHistory(loadedHistory);
      setIsReplayMode(true);
      setIsPlaying(false);
      setReplayIndex(-1);

      setLines([]);
      setRectangles([]);
      setTexts([]);
      setCode("");

      setReplayMessage(
        `Loaded ${loadedHistory.length} history events.`
      );
    } catch (error) {
      setReplayMessage(
        "Unable to connect to server."
      );
    } finally {
      setReplayLoading(false);
    }
  };

  const handleReplaySlider = (e) => {
    showReplayPosition(
      Number(e.target.value)
    );
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
      setRectangles(
        liveSnapshot.current.rectangles
      );
      setTexts(liveSnapshot.current.texts);
      setCode(liveSnapshot.current.code);
    }

    setIsReplayMode(false);
    setHistory([]);
    setReplayIndex(-1);
    setReplayMessage("");
    liveSnapshot.current = null;
  };

  const formatReplayTime = (timestamp) => {
    if (!timestamp || !history.length) {
      return "00:00";
    }

    const firstTimestamp =
      history[0].timestamp;

    const seconds = Math.max(
      0,
      Math.floor(
        (timestamp - firstTimestamp) / 1000
      )
    );

    const minutes = Math.floor(
      seconds / 60
    );

    const remainingSeconds =
      seconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(remainingSeconds).padStart(
      2,
      "0"
    )}`;
  };

  if (!user) {
    return (
      <div className="app-shell">
        <div className="auth-page">
          <div className="auth-brand">
            <div className="brand-mark">S</div>
            <div>
              <h1>SyncSpace</h1>
              <p>
                Real-time collaborative workspace
              </p>
            </div>
          </div>

          <Login onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">S</div>

          <div className="brand-copy">
            <strong>SyncSpace</strong>
            <span>Collaborative Workspace</span>
          </div>
        </div>

        {inRoom && (
          <div className="topbar-center">
            <div className="room-pill">
              <span className="room-dot" />
              Room {roomId}
            </div>
          </div>
        )}

        <div className="user-menu">
          <div className="user-avatar">
            {user.name?.charAt(0)?.toUpperCase()}
          </div>

          <div className="user-details">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>

          <button
            className="button ghost"
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
            <div className="hero-content">
              <div className="eyebrow">
                REAL-TIME COLLABORATION
              </div>

              <h1>
                Build together,
                <br />
                in the same space.
              </h1>

              <p>
                Collaborate on diagrams, code and ideas
                with your team in real time.
              </p>
            </div>

            <div className="hero-orb">
              <span>✦</span>
            </div>
          </section>

          <section className="home-grid">
            <div className="panel action-panel">
              <div className="panel-heading">
                <div className="panel-icon">＋</div>
                <div>
                  <h2>Create a workspace</h2>
                  <p>
                    Start a new collaborative room.
                  </p>
                </div>
              </div>

              <button
                className="button primary large"
                onClick={createRoom}
              >
                Create Room
              </button>
            </div>

            <div className="panel action-panel">
              <div className="panel-heading">
                <div className="panel-icon">↗</div>
                <div>
                  <h2>Join a workspace</h2>
                  <p>
                    Enter a room ID to continue.
                  </p>
                </div>
              </div>

              <div className="input-row">
                <input
                  value={joinRoomId}
                  onChange={(e) =>
                    setJoinRoomId(e.target.value)
                  }
                  placeholder="Enter Room ID"
                />

                <button
                  className="button secondary"
                  onClick={joinRoom}
                >
                  Join
                </button>
              </div>
            </div>
          </section>

          <section className="panel invitations-panel">
            <div className="section-heading">
              <div>
                <h2>📩 Invitations</h2>
                <p>
                  Rooms you've been invited to join.
                </p>
              </div>

              <div className="section-heading-actions">
                <span className="count-badge">
                  {invitations.length}
                </span>

                <button
                  className="button ghost"
                  onClick={loadInvitations}
                >
                  Refresh
                </button>
              </div>
            </div>

            {invitations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✉</div>
                <strong>No pending invitations</strong>
                <span>
                  New workspace invitations will appear here.
                </span>
              </div>
            ) : (
              <div className="invitation-list">
                {invitations.map((invitation) => (
                  <div
                    className="invitation-card"
                    key={invitation.id}
                  >
                    <div className="invitation-avatar">
                      {invitation.senderName
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </div>

                    <div className="invitation-info">
                      <strong>
                        {invitation.senderName}
                      </strong>

                      <span>
                        {invitation.senderEmail}
                      </span>

                      <small>
                        Room: {invitation.roomId}
                      </small>
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
                        className="button danger-outline"
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
            <div className="global-message">
              {message}
            </div>
          )}
        </main>
      ) : (
        <main className="workspace-page">
          <div className="workspace-toolbar">
            <div className="workspace-title">
              <div className="workspace-icon">✦</div>

              <div>
                <span>WORKSPACE</span>
                <h1>Room {roomId}</h1>
              </div>
            </div>

            <div className="toolbar-actions">
              <div className="online-pill">
                <span className="online-dot" />
                Live collaboration
              </div>

              <button
                className="button secondary"
                onClick={loadReplayHistory}
                disabled={
                  isReplayMode ||
                  replayLoading
                }
              >
                📜{" "}
                {replayLoading
                  ? "Loading..."
                  : "Replay Session"}
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
            <section className="replay-panel">
              <div className="replay-header">
                <div>
                  <div className="replay-badge">
                    ● REPLAY MODE
                  </div>

                  <h2>
                    Session history
                  </h2>

                  <p>
                    Viewing a previous state of
                    the workspace.
                  </p>
                </div>

                <button
                  className="button danger"
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
                      {replayIndex + 1}
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
                  onChange={
                    handleReplaySlider
                  }
                />

                <div className="replay-controls">
                  <button
                    className="button secondary"
                    onClick={
                      toggleReplayPlay
                    }
                  >
                    {isPlaying
                      ? "⏸ Pause"
                      : "▶ Play"}
                  </button>

                  <button
                    className="button ghost"
                    onClick={() =>
                      showReplayPosition(-1)
                    }
                  >
                    ⏮ Beginning
                  </button>

                  <button
                    className="button ghost"
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
                    className="button ghost"
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
            <div className="workspace-main">
              <section className="editor-card">
                <div className="editor-header">
                  <div className="editor-title">
                    <div className="editor-icon">
                      ✎
                    </div>

                    <div>
                      <h2>Whiteboard</h2>
                      <span>
                        Shared visual workspace
                      </span>
                    </div>
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
                      ✎ Freehand
                    </button>

                    <button
                      className={`tool-button ${
                        tool === "rectangle"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        setTool("rectangle");
                        addRectangle();
                      }}
                      disabled={
                        isReplayMode
                      }
                    >
                      ▫ Rectangle
                    </button>

                    <button
                      className={`tool-button ${
                        tool === "text"
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        setTool("text");
                        addText();
                      }}
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

                <div
                  ref={canvasContainerRef}
                  className="canvas-container"
                >
                  <Stage
                    width={canvasWidth}
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
                              x={cursor.x}
                              y={cursor.y}
                            >
                              <Text
                                text="▼"
                                fontSize={18}
                                fill="blue"
                                offsetX={6}
                                offsetY={-2}
                              />

                              <Text
                                text={
                                  cursor.name
                                }
                                fontSize={16}
                                fill="blue"
                                x={12}
                                y={-4}
                              />
                            </Group>
                          )
                        )}
                    </Layer>
                  </Stage>
                </div>
              </section>

              <section className="editor-card code-card">
                <div className="editor-header">
                  <div className="editor-title">
                    <div className="editor-icon">
                      {"</>"}
                    </div>

                    <div>
                      <h2>Code Editor</h2>
                      <span>
                        Shared source code
                      </span>
                    </div>
                  </div>

                  <div className="code-status">
                    <span className="online-dot" />
                    Synced
                  </div>
                </div>

                <div className="code-editor-wrap">
                  <div className="line-numbers">
                    {code
                      .split("\n")
                      .map(
                        (_, index) => (
                          <span
                            key={index}
                          >
                            {index + 1}
                          </span>
                        )
                      )}
                  </div>

                  <textarea
                    className="code-textarea"
                    placeholder="// Start writing code together..."
                    value={code}
                    onChange={
                      handleCodeChange
                    }
                    readOnly={
                      isReplayMode
                    }
                    spellCheck="false"
                  />
                </div>

                {isReplayMode && (
                  <div className="editor-lock">
                    🔒 Code editing is disabled
                    during replay.
                  </div>
                )}
              </section>
            </div>

            <aside className="sidebar">
              {isOwner && (
                <section className="side-panel">
                  <div className="side-panel-header">
                    <div>
                      <h3>
                        Invite collaborator
                      </h3>
                      <span>
                        Add a team member
                      </span>
                    </div>
                  </div>

                  <div className="invite-form">
                    <input
                      type="email"
                      placeholder="Email address"
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
                      className="button primary"
                      onClick={inviteUser}
                      disabled={
                        isReplayMode
                      }
                    >
                      Invite
                    </button>
                  </div>

                  {inviteMessage && (
                    <div className="notice">
                      {inviteMessage}
                    </div>
                  )}
                </section>
              )}

              <section className="side-panel">
                <div className="side-panel-header">
                  <div>
                    <h3>
                      Collaborators
                    </h3>
                    <span>
                      People currently drawing
                    </span>
                  </div>

                  <span className="count-badge">
                    {Object.keys(
                      cursors
                    ).length + 1}
                  </span>
                </div>

                <div className="collaborator-list">
                  <div className="collaborator">
                    <div className="collaborator-avatar">
                      {user.name
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </div>

                    <div>
                      <strong>
                        {user.name}
                      </strong>
                      <span>
                        You ·{" "}
                        {isOwner
                          ? "Owner"
                          : "Member"}
                      </span>
                    </div>

                    <span className="online-dot" />
                  </div>

                  {Object.entries(
                    cursors
                  ).map(
                    ([id, cursor]) => (
                      <div
                        className="collaborator"
                        key={id}
                      >
                        <div className="collaborator-avatar">
                          {cursor.name
                            ?.charAt(0)
                            ?.toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {cursor.name}
                          </strong>
                          <span>
                            Collaborator
                          </span>
                        </div>

                        <span className="online-dot" />
                      </div>
                    )
                  )}
                </div>
              </section>

              <section className="side-panel room-info-panel">
                <div className="side-panel-header">
                  <div>
                    <h3>Room details</h3>
                    <span>
                      Workspace information
                    </span>
                  </div>
                </div>

                <div className="room-detail">
                  <span>Room ID</span>
                  <strong>
                    {roomId}
                  </strong>
                </div>

                <div className="room-detail">
                  <span>Your role</span>
                  <strong>
                    {isOwner
                      ? "Owner"
                      : "Member"}
                  </strong>
                </div>

                <div className="room-detail">
                  <span>Status</span>
                  <strong>
                    Live
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