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

const users = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (data) => {
    const { roomId, name } = data;

    socket.join(roomId);

    users[socket.id] = {
      roomId,
      name,
      x: 0,
      y: 0,
    };

    console.log(`${name} joined room ${roomId}`);

    socket.to(roomId).emit("user-joined", {
      id: socket.id,
      name,
    });
  });

  // Whiteboard objects
  socket.on("whiteboard-object", (data) => {
    socket.to(data.roomId).emit("whiteboard-object", data);
  });

  // Clear whiteboard
  socket.on("clear-whiteboard", (roomId) => {
    socket.to(roomId).emit("clear-whiteboard");
  });

  // Code editor
  socket.on("code-update", (data) => {
    socket.to(data.roomId).emit("code-update", data.code);
  });

  // Cursor awareness
  socket.on("cursor-move", (data) => {
    if (users[socket.id]) {
      users[socket.id].x = data.x;
      users[socket.id].y = data.y;

      socket.to(data.roomId).emit("cursor-move", {
        id: socket.id,
        name: users[socket.id].name,
        x: data.x,
        y: data.y,
      });
    }
  });

  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);

    delete users[socket.id];

    socket.to(roomId).emit("user-left", socket.id);

    console.log(`User left room ${roomId}`);
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];

    if (user) {
      socket.to(user.roomId).emit("user-left", socket.id);
      delete users[socket.id];
    }

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