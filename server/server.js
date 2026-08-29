const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5174",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);

    console.log(`User ${socket.id} left room ${roomId}`);
  });

  // Whiteboard drawing
  socket.on("whiteboard-draw", (data) => {
    socket.to(data.roomId).emit("whiteboard-draw", data);
  });

  // Clear whiteboard
  socket.on("clear-whiteboard", (roomId) => {
    socket.to(roomId).emit("clear-whiteboard");
  });

  // Code editor synchronization
  socket.on("code-update", (data) => {
    socket.to(data.roomId).emit("code-update", data.code);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("SyncSpace server is running!");
});

const PORT = 3001;

server.listen(PORT, () => {
  console.log(`SyncSpace server running on http://localhost:${PORT}`);
});