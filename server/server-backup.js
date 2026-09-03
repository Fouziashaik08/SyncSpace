const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// JWT secret
const JWT_SECRET = "syncspace_secret_key_2026";

// Temporary users
// Later MongoDB mein move karenge
const usersDatabase = [
  {
    id: "user1",
    name: "Harshit",
    email: "harshit@example.com",
    password: "123456",
  },
  {
    id: "user2",
    name: "Fouzia khan",
    email: "fouzia@example.com",
    password: "123456",
  },
];

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const users = {};

/* =========================
   AUTHENTICATION
========================= */

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = usersDatabase.find(
    (user) =>
      user.email === email &&
      user.password === password
  );

  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

  res.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});

/* =========================
   JWT MIDDLEWARE
========================= */

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Access token required",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        message: "Invalid or expired token",
      });
    }

    req.user = user;
    next();
  });
}

/* =========================
   PROTECTED TEST ROUTE
========================= */

app.get("/profile", authenticateToken, (req, res) => {
  res.json({
    message: "You are authenticated!",
    user: req.user,
  });
});

/* =========================
   SOCKET.IO
========================= */

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  /* =========================
     JOIN ROOM
  ========================= */

  socket.on("join-room", (data) => {
    const { roomId, name, token } = data;

    // Verify JWT before joining room
    if (!token) {
      socket.emit("auth-error", {
        message: "Authentication required",
      });

      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      socket.join(roomId);

      users[socket.id] = {
        userId: decoded.id,
        roomId,
        name: decoded.name || name,
        x: 0,
        y: 0,
      };

      console.log(
        `${decoded.name} joined room ${roomId}`
      );

      socket.emit("room-joined", {
        roomId,
        user: {
          id: decoded.id,
          name: decoded.name,
        },
      });

      socket.to(roomId).emit("user-joined", {
        id: socket.id,
        name: decoded.name,
      });

    } catch (error) {
      socket.emit("auth-error", {
        message: "Invalid or expired token",
      });

      console.log("Unauthorized room join attempt");
    }
  });

  /* =========================
     WHITEBOARD
  ========================= */

  socket.on("whiteboard-object", (data) => {
    const user = users[socket.id];

    if (!user) return;

    socket
      .to(user.roomId)
      .emit("whiteboard-object", data);
  });

  /* =========================
     CLEAR WHITEBOARD
  ========================= */

  socket.on("clear-whiteboard", (roomId) => {
    const user = users[socket.id];

    if (!user || user.roomId !== roomId) return;

    socket.to(roomId).emit("clear-whiteboard");
  });

  /* =========================
     CODE EDITOR
  ========================= */

  socket.on("code-update", (data) => {
    const user = users[socket.id];

    if (!user) return;

    socket
      .to(user.roomId)
      .emit("code-update", data.code);
  });

  /* =========================
     CURSOR AWARENESS
  ========================= */

  socket.on("cursor-move", (data) => {
    const user = users[socket.id];

    if (!user) return;

    user.x = data.x;
    user.y = data.y;

    socket.to(user.roomId).emit("cursor-move", {
      id: socket.id,
      name: user.name,
      x: data.x,
      y: data.y,
    });
  });

  /* =========================
     LEAVE ROOM
  ========================= */

  socket.on("leave-room", (roomId) => {
    const user = users[socket.id];

    if (!user) return;

    socket.leave(roomId);

    socket.to(roomId).emit(
      "user-left",
      socket.id
    );

    delete users[socket.id];

    console.log(
      `${user.name} left room ${roomId}`
    );
  });

  /* =========================
     DISCONNECT
  ========================= */

  socket.on("disconnect", () => {
    const user = users[socket.id];

    if (user) {
      socket.to(user.roomId).emit(
        "user-left",
        socket.id
      );

      delete users[socket.id];
    }

    console.log(
      "User disconnected:",
      socket.id
    );
  });
});

/* =========================
   HOME ROUTE
========================= */

app.get("/", (req, res) => {
  res.send("SyncSpace server is running!");
});

/* =========================
   START SERVER
========================= */

const PORT = 3001;

server.listen(PORT, () => {
  console.log(
    `SyncSpace server running on http://localhost:${PORT}`
  );
});