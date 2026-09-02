const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5174",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.send("SyncSpace server is running!");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    console.log(`User ${socket.id} joined room: ${roomId}`);

    socket.emit("room-joined", {
      roomId,
      message: `Successfully joined room: ${roomId}`,
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5001, () => {
  console.log("SyncSpace server running on http://localhost:5001");
});