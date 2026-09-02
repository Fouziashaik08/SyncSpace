const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Store whiteboard data for each room
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ==========================================
  // JOIN ROOM
  // ==========================================

  socket.on("join-room", (roomId) => {
    if (!roomId) return;

    socket.join(roomId);

    console.log(
      `User ${socket.id} joined room ${roomId}`
    );

    // Create room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        lines: [],
        rectangles: [],
        circles: [],
        triangles: [],
        texts: [],
      };
    }

    // Send current whiteboard to new user
    socket.emit(
      "whiteboard-state",
      rooms[roomId]
    );
  });

  // ==========================================
  // WHITEBOARD UPDATE
  // ==========================================

  socket.on("whiteboard-update", (data) => {
    if (!data || !data.roomId) return;

    const roomId = data.roomId;

    // Make room if necessary
    if (!rooms[roomId]) {
      rooms[roomId] = {
        lines: [],
        rectangles: [],
        circles: [],
        triangles: [],
        texts: [],
      };
    }

    // Save latest board
    rooms[roomId] = {
      lines: data.lines || [],
      rectangles: data.rectangles || [],
      circles: data.circles || [],
      triangles: data.triangles || [],
      texts: data.texts || [],
    };

    // Send update to everyone else in room
    socket.to(roomId).emit(
      "whiteboard-update",
      rooms[roomId]
    );
  });

  // ==========================================
  // CLEAR WHITEBOARD
  // ==========================================

  socket.on("clear-whiteboard", ({ roomId }) => {
    if (!roomId) return;

    rooms[roomId] = {
      lines: [],
      rectangles: [],
      circles: [],
      triangles: [],
      texts: [],
    };

    // Send clear to everyone in room
    io.to(roomId).emit(
      "whiteboard-update",
      rooms[roomId]
    );

    console.log(
      `Whiteboard cleared in room ${roomId}`
    );
  });

  // ==========================================
  // DISCONNECT
  // ==========================================

  socket.on("disconnect", () => {
    console.log(
      "User disconnected:",
      socket.id
    );
  });
});

// ==========================================
// BASIC SERVER ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.send("SyncSpace server is running!");
});

// ==========================================
// START SERVER
// ==========================================

const PORT = 5001;

server.listen(PORT, () => {
  console.log(
    `SyncSpace server running on http://localhost:${PORT}`
  );
});