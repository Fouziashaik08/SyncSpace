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
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId) => {

        socket.join(roomId);

        console.log(`${socket.id} joined room ${roomId}`);

        socket.to(roomId).emit("user-joined", {
            userId: socket.id
        });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });

});

app.get("/", (req, res) => {
    res.send("SyncSpace Server Running");
});

server.listen(5000, () => {
    console.log("SyncSpace server running on port 5000");
});