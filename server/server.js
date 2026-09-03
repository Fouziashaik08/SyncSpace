const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// =========================
// JWT
// =========================

const JWT_SECRET = "syncspace_secret_key_2026";

// =========================
// TEMPORARY USERS
// Later MongoDB mein move karenge
// =========================

const usersDatabase = [
  {
    id: "user1",
    name: "Harshit",
    email: "harshit@example.com",
    password: "123456",
  },
  {
    id: "user2",
    name: "Test User",
    email: "test@example.com",
    password: "123456",
  },
  {
    id: "user3",
    name: "Fouzia",
    email: "fouzia@example.com",
    password: "123456",
  },
];

// =========================
// ROOMS
// =========================

// Example:
//
// rooms = {
//   abc123: {
//     ownerId: "user1",
//     invitedUsers: ["user2", "user3"]
//   }
// }

const rooms = {};

// =========================
// REPLAY HISTORY
// =========================

// Example:
//
// roomHistory = {
//   abc123: [
//     {
//       type: "line",
//       object: {...},
//       timestamp: 123456789
//     }
//   ]
// }

const roomHistory = {};

// =========================
// SOCKET.IO
// =========================

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// =========================
// CONNECTED USERS
// =========================

const users = {};

// =========================
// JWT MIDDLEWARE
// =========================

function authenticateToken(req, res, next) {
  const authHeader =
    req.headers.authorization;

  const token =
    authHeader &&
    authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Access token required",
    });
  }

  jwt.verify(
    token,
    JWT_SECRET,
    (err, user) => {
      if (err) {
        return res.status(403).json({
          message:
            "Invalid or expired token",
        });
      }

      req.user = user;

      next();
    }
  );
}

// =========================
// REPLAY HISTORY FUNCTION
// =========================

function recordHistory(roomId, event) {
  if (!roomHistory[roomId]) {
    roomHistory[roomId] = [];
  }

  roomHistory[roomId].push({
    ...event,
    timestamp: Date.now(),
  });

  console.log(
    `History recorded for room ${roomId}`
  );
}

// =========================
// LOGIN
// =========================

app.post("/login", (req, res) => {
  const { email, password } =
    req.body;

  const user =
    usersDatabase.find(
      (user) =>
        user.email.toLowerCase() ===
          email?.toLowerCase() &&
        user.password === password
    );

  if (!user) {
    return res.status(401).json({
      message:
        "Invalid email or password",
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

// =========================
// PROFILE
// =========================

app.get(
  "/profile",
  authenticateToken,
  (req, res) => {
    res.json({
      message:
        "You are authenticated!",

      user: req.user,
    });
  }
);

// =========================
// CREATE ROOM
// =========================

app.post(
  "/rooms",
  authenticateToken,
  (req, res) => {
    const roomId =
      Math.random()
        .toString(36)
        .substring(2, 8);

    rooms[roomId] = {
      ownerId: req.user.id,
      invitedUsers: [],
    };

    // Initialize replay history
    roomHistory[roomId] = [];

    console.log(
      `Room ${roomId} created by ${req.user.name}`
    );

    res.json({
      message:
        "Room created successfully",

      roomId,

      ownerId:
        req.user.id,
    });
  }
);

// =========================
// INVITE USER
// =========================

app.post(
  "/rooms/:roomId/invite",
  authenticateToken,
  (req, res) => {
    const { roomId } =
      req.params;

    const { email } =
      req.body;

    const room =
      rooms[roomId];

    // Room check
    if (!room) {
      return res.status(404).json({
        message:
          "Room not found",
      });
    }

    // Only owner can invite
    if (
      room.ownerId !==
      req.user.id
    ) {
      return res.status(403).json({
        message:
          "Only the room owner can invite users",
      });
    }

    // Email check
    if (!email) {
      return res.status(400).json({
        message:
          "User email is required",
      });
    }

    // Find registered user
    const invitedUser =
      usersDatabase.find(
        (user) =>
          user.email.toLowerCase() ===
          email
            .toLowerCase()
      );

    if (!invitedUser) {
      return res.status(404).json({
        message:
          "User with this email does not exist",
      });
    }

    // Owner already has access
    if (
      invitedUser.id ===
      room.ownerId
    ) {
      return res.status(400).json({
        message:
          "Room owner already has access",
      });
    }

    // Duplicate invitation
    if (
      room.invitedUsers.includes(
        invitedUser.id
      )
    ) {
      return res.status(400).json({
        message:
          "User is already invited",
      });
    }

    // Add user
    room.invitedUsers.push(
      invitedUser.id
    );

    console.log(
      `${invitedUser.name} invited to room ${roomId}`
    );

    res.json({
      message:
        "User invited successfully",

      roomId,

      invitedUser: {
        id: invitedUser.id,
        name: invitedUser.name,
        email: invitedUser.email,
      },
    });
  }
);

// =========================
// ROOM ACCESS CHECK
// =========================

app.get(
  "/rooms/:roomId/access",
  authenticateToken,
  (req, res) => {
    const { roomId } =
      req.params;

    const room =
      rooms[roomId];

    if (!room) {
      return res.status(404).json({
        message:
          "Room not found",

        hasAccess: false,
      });
    }

    const isOwner =
      room.ownerId ===
      req.user.id;

    const isInvited =
      room.invitedUsers.includes(
        req.user.id
      );

    const hasAccess =
      isOwner ||
      isInvited;

    res.json({
      roomId,

      hasAccess,

      isOwner,

      isInvited,
    });
  }
);

// =========================
// REPLAY HISTORY API
// =========================

app.get(
  "/rooms/:roomId/history",
  authenticateToken,
  (req, res) => {
    const { roomId } =
      req.params;

    const room =
      rooms[roomId];

    // Room check
    if (!room) {
      return res.status(404).json({
        message:
          "Room not found",
      });
    }

    // Owner check
    const isOwner =
      room.ownerId ===
      req.user.id;

    // Invitation check
    const isInvited =
      room.invitedUsers.includes(
        req.user.id
      );

    // Access control
    if (
      !isOwner &&
      !isInvited
    ) {
      return res.status(403).json({
        message:
          "You do not have access to this room",
      });
    }

    res.json({
      roomId,

      history:
        roomHistory[roomId] ||
        [],
    });
  }
);

// =========================
// SOCKET.IO CONNECTION
// =========================

io.on(
  "connection",
  (socket) => {
    console.log(
      "User connected:",
      socket.id
    );

    // =========================
    // JOIN ROOM
    // =========================

    socket.on(
      "join-room",
      (data) => {
        const {
          roomId,
          name,
          token,
        } = data;

        // Token required
        if (!token) {
          socket.emit(
            "auth-error",
            {
              message:
                "Authentication required",
            }
          );

          return;
        }

        try {
          // Verify JWT
          const decoded =
            jwt.verify(
              token,
              JWT_SECRET
            );

          // Check room
          const room =
            rooms[roomId];

          if (!room) {
            socket.emit(
              "auth-error",
              {
                message:
                  "Room does not exist",
              }
            );

            return;
          }

          // Check owner
          const isOwner =
            room.ownerId ===
            decoded.id;

          // Check invitation
          const isInvited =
            room.invitedUsers.includes(
              decoded.id
            );

          // Access control
          if (
            !isOwner &&
            !isInvited
          ) {
            socket.emit(
              "auth-error",
              {
                message:
                  "You are not invited to this room",
              }
            );

            console.log(
              `${decoded.name} tried to access room ${roomId} without invitation`
            );

            return;
          }

          // Join Socket.IO room
          socket.join(roomId);

          // Store connected user
          users[socket.id] = {
            userId:
              decoded.id,

            roomId,

            name:
              decoded.name ||
              name,

            x: 0,

            y: 0,
          };

          console.log(
            `${decoded.name} joined room ${roomId}`
          );

          // Tell current user
          socket.emit(
            "room-joined",
            {
              roomId,

              user: {
                id:
                  decoded.id,

                name:
                  decoded.name,
              },
            }
          );

          // Tell other users
          socket
            .to(roomId)
            .emit(
              "user-joined",
              {
                id:
                  socket.id,

                name:
                  decoded.name,
              }
            );
        } catch (error) {
          socket.emit(
            "auth-error",
            {
              message:
                "Invalid or expired token",
            }
          );

          console.log(
            "Unauthorized room join attempt"
          );
        }
      }
    );

    // =========================
    // WHITEBOARD OBJECT
    // =========================

    socket.on(
      "whiteboard-object",
      (data) => {
        const user =
          users[socket.id];

        if (!user) {
          return;
        }

        // Record action for replay
        recordHistory(
          user.roomId,
          {
            type:
              data.type,

            object:
              data.object,
          }
        );

        // Send to other users
        socket
          .to(user.roomId)
          .emit(
            "whiteboard-object",
            data
          );
      }
    );

    // =========================
    // CLEAR WHITEBOARD
    // =========================

    socket.on(
      "clear-whiteboard",
      (roomId) => {
        const user =
          users[socket.id];

        if (!user) {
          return;
        }

        if (
          user.roomId !==
          roomId
        ) {
          return;
        }

        // Record clear action
        recordHistory(
          roomId,
          {
            type: "clear",
          }
        );

        // Send to other users
        socket
          .to(roomId)
          .emit(
            "clear-whiteboard"
          );
      }
    );

    // =========================
    // CODE UPDATE
    // =========================

    socket.on(
      "code-update",
      (data) => {
        const user =
          users[socket.id];

        if (!user) {
          return;
        }

        // Record code state
        recordHistory(
          user.roomId,
          {
            type: "code",
            code:
              data.code,
          }
        );

        // Send to other users
        socket
          .to(user.roomId)
          .emit(
            "code-update",
            data.code
          );
      }
    );

    // =========================
    // CURSOR
    // =========================

    socket.on(
      "cursor-move",
      (data) => {
        const user =
          users[socket.id];

        if (!user) {
          return;
        }

        user.x = data.x;
        user.y = data.y;

        socket
          .to(user.roomId)
          .emit(
            "cursor-move",
            {
              id:
                socket.id,

              name:
                user.name,

              x:
                data.x,

              y:
                data.y,
            }
          );
      }
    );

    // =========================
    // LEAVE ROOM
    // =========================

    socket.on(
      "leave-room",
      (roomId) => {
        const user =
          users[socket.id];

        if (!user) {
          return;
        }

        socket.leave(roomId);

        socket
          .to(roomId)
          .emit(
            "user-left",
            socket.id
          );

        delete users[
          socket.id
        ];

        console.log(
          `${user.name} left room ${roomId}`
        );
      }
    );

    // =========================
    // DISCONNECT
    // =========================

    socket.on(
      "disconnect",
      () => {
        const user =
          users[socket.id];

        if (user) {
          socket
            .to(user.roomId)
            .emit(
              "user-left",
              socket.id
            );

          delete users[
            socket.id
          ];
        }

        console.log(
          "User disconnected:",
          socket.id
        );
      }
    );
  }
);

// =========================
// HOME ROUTE
// =========================

app.get("/", (req, res) => {
  res.send(
    "SyncSpace server is running!"
  );
});

// =========================
// START SERVER
// =========================

const PORT = 3001;

server.listen(
  PORT,
  () => {
    console.log(
      `SyncSpace server running on http://localhost:${PORT}`
    );
  }
);