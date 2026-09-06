const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());

const JWT_SECRET = "syncspace_secret_key_2026";
const PORT = 3001;

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

const rooms = {};
const roomHistory = {};
const invitations = {};
const users = {};

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

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

function generateRoomId() {
  let roomId = "";

  do {
    roomId = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
  } while (rooms[roomId]);

  return roomId;
}

function generateInvitationId() {
  return `inv_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 9)}`;
}

function recordHistory(roomId, event) {
  if (!roomId || !event) {
    return;
  }

  if (!roomHistory[roomId]) {
    roomHistory[roomId] = [];
  }

  roomHistory[roomId].push({
    ...event,
    timestamp: Date.now(),
  });

  console.log(`History recorded for room ${roomId}`);
}

function getRoomAccess(roomId, userId) {
  const room = rooms[roomId];

  if (!room) {
    return {
      exists: false,
      isOwner: false,
      isInvited: false,
      hasAccess: false,
    };
  }

  const isOwner = room.ownerId === userId;
  const isInvited = room.invitedUsers.includes(userId);

  return {
    exists: true,
    isOwner,
    isInvited,
    hasAccess: isOwner || isInvited,
  };
}

app.get("/", (req, res) => {
  res.send("SyncSpace server is running!");
});

app.post("/login", (req, res) => {
  const email =
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  const password =
    typeof req.body?.password === "string"
      ? req.body.password
      : "";

  const user = usersDatabase.find(
    (item) =>
      item.email.toLowerCase() === email &&
      item.password === password
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

app.get(
  "/profile",
  authenticateToken,
  (req, res) => {
    res.json({
      message: "You are authenticated!",
      user: req.user,
    });
  }
);

app.post(
  "/rooms",
  authenticateToken,
  (req, res) => {
    const roomId = generateRoomId();

    rooms[roomId] = {
      ownerId: req.user.id,
      invitedUsers: [],
    };

    roomHistory[roomId] = [];

    console.log(
      `Room ${roomId} created by ${req.user.name}`
    );

    res.json({
      message: "Room created successfully",
      roomId,
      ownerId: req.user.id,
    });
  }
);

app.post(
  "/rooms/:roomId/invite",
  authenticateToken,
  (req, res) => {
    const { roomId } = req.params;

    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const room = rooms[roomId];

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    if (room.ownerId !== req.user.id) {
      return res.status(403).json({
        message:
          "Only the room owner can invite users",
      });
    }

    if (!email) {
      return res.status(400).json({
        message: "User email is required",
      });
    }

    const invitedUser = usersDatabase.find(
      (user) =>
        user.email.toLowerCase() === email
    );

    if (!invitedUser) {
      return res.status(404).json({
        message:
          "User with this email does not exist",
      });
    }

    if (invitedUser.id === room.ownerId) {
      return res.status(400).json({
        message:
          "Room owner already has access",
      });
    }

    if (
      room.invitedUsers.includes(
        invitedUser.id
      )
    ) {
      return res.status(400).json({
        message: "User is already a member",
      });
    }

    const existingInvitation =
      Object.values(invitations).find(
        (invitation) =>
          invitation.roomId === roomId &&
          invitation.recipientId ===
            invitedUser.id &&
          invitation.status === "pending"
      );

    if (existingInvitation) {
      return res.status(400).json({
        message:
          "Invitation is already pending",
      });
    }

    const invitationId =
      generateInvitationId();

    invitations[invitationId] = {
      id: invitationId,
      roomId,
      senderId: req.user.id,
      senderName: req.user.name,
      senderEmail: req.user.email,
      recipientId: invitedUser.id,
      recipientName: invitedUser.name,
      recipientEmail: invitedUser.email,
      status: "pending",
      createdAt: Date.now(),
      acceptedAt: null,
      declinedAt: null,
    };

    console.log(
      `${invitedUser.name} invited to room ${roomId}`
    );

    res.json({
      message:
        "Invitation sent successfully",
      invitation: invitations[invitationId],
      invitedUser: {
        id: invitedUser.id,
        name: invitedUser.name,
        email: invitedUser.email,
      },
    });
  }
);

app.get(
  "/invitations",
  authenticateToken,
  (req, res) => {
    const userInvitations = Object.values(
      invitations
    )
      .filter(
        (invitation) =>
          invitation.recipientId ===
            req.user.id &&
          invitation.status === "pending"
      )
      .sort(
        (a, b) =>
          b.createdAt - a.createdAt
      );

    res.json({
      invitations: userInvitations,
    });
  }
);

app.post(
  "/invitations/:invitationId/accept",
  authenticateToken,
  (req, res) => {
    const { invitationId } =
      req.params;

    const invitation =
      invitations[invitationId];

    if (!invitation) {
      return res.status(404).json({
        message: "Invitation not found",
      });
    }

    if (
      invitation.recipientId !==
      req.user.id
    ) {
      return res.status(403).json({
        message:
          "You cannot accept this invitation",
      });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({
        message:
          "This invitation is no longer pending",
      });
    }

    const room =
      rooms[invitation.roomId];

    if (!room) {
      invitation.status = "expired";

      return res.status(404).json({
        message:
          "The room no longer exists",
      });
    }

    if (
      !room.invitedUsers.includes(
        req.user.id
      )
    ) {
      room.invitedUsers.push(
        req.user.id
      );
    }

    invitation.status = "accepted";
    invitation.acceptedAt = Date.now();

    console.log(
      `${req.user.name} accepted invitation for room ${invitation.roomId}`
    );

    res.json({
      message:
        "Invitation accepted successfully",
      roomId: invitation.roomId,
      invitation,
    });
  }
);

app.post(
  "/invitations/:invitationId/decline",
  authenticateToken,
  (req, res) => {
    const { invitationId } =
      req.params;

    const invitation =
      invitations[invitationId];

    if (!invitation) {
      return res.status(404).json({
        message: "Invitation not found",
      });
    }

    if (
      invitation.recipientId !==
      req.user.id
    ) {
      return res.status(403).json({
        message:
          "You cannot decline this invitation",
      });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({
        message:
          "This invitation is no longer pending",
      });
    }

    invitation.status = "declined";
    invitation.declinedAt = Date.now();

    console.log(
      `${req.user.name} declined invitation for room ${invitation.roomId}`
    );

    res.json({
      message:
        "Invitation declined successfully",
      invitation,
    });
  }
);

app.get(
  "/rooms/:roomId/access",
  authenticateToken,
  (req, res) => {
    const { roomId } = req.params;

    const access = getRoomAccess(
      roomId,
      req.user.id
    );

    if (!access.exists) {
      return res.status(404).json({
        message: "Room not found",
        hasAccess: false,
      });
    }

    res.json({
      roomId,
      hasAccess: access.hasAccess,
      isOwner: access.isOwner,
      isInvited: access.isInvited,
    });
  }
);

app.get(
  "/rooms/:roomId/history",
  authenticateToken,
  (req, res) => {
    const { roomId } = req.params;

    const access = getRoomAccess(
      roomId,
      req.user.id
    );

    if (!access.exists) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    if (!access.hasAccess) {
      return res.status(403).json({
        message:
          "You do not have access to this room",
      });
    }

    res.json({
      roomId,
      history:
        roomHistory[roomId] || [],
    });
  }
);

io.on("connection", (socket) => {
  console.log(
    "User connected:",
    socket.id
  );

  socket.on("join-room", (data) => {
    if (!data || typeof data !== "object") {
      socket.emit("auth-error", {
        message:
          "Invalid room join request",
      });

      return;
    }

    const roomId =
      typeof data.roomId === "string"
        ? data.roomId.trim()
        : "";

    const name =
      typeof data.name === "string"
        ? data.name.trim()
        : "";

    const token =
      typeof data.token === "string"
        ? data.token
        : "";

    if (!roomId) {
      socket.emit("auth-error", {
        message: "Room ID is required",
      });

      return;
    }

    if (!token) {
      socket.emit("auth-error", {
        message:
          "Authentication required",
      });

      return;
    }

    try {
      const decoded = jwt.verify(
        token,
        JWT_SECRET
      );

      const room = rooms[roomId];

      if (!room) {
        socket.emit("auth-error", {
          message: "Room does not exist",
        });

        return;
      }

      const isOwner =
        room.ownerId === decoded.id;

      const isInvited =
        room.invitedUsers.includes(
          decoded.id
        );

      if (!isOwner && !isInvited) {
        socket.emit("auth-error", {
          message:
            "You are not invited to this room",
        });

        console.log(
          `${decoded.name} tried to access room ${roomId} without invitation`
        );

        return;
      }

      socket.join(roomId);

      users[socket.id] = {
        userId: decoded.id,
        roomId,
        name:
          decoded.name || name,
        email: decoded.email,
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
          email: decoded.email,
        },
      });

      socket
        .to(roomId)
        .emit("user-joined", {
          id: socket.id,
          userId: decoded.id,
          name: decoded.name,
          email: decoded.email,
        });
    } catch (error) {
      socket.emit("auth-error", {
        message:
          "Invalid or expired token",
      });

      console.log(
        "Unauthorized room join attempt"
      );
    }
  });

  socket.on(
    "whiteboard-object",
    (data) => {
      const user =
        users[socket.id];

      if (!user) {
        return;
      }

      if (
        !data ||
        typeof data !== "object"
      ) {
        return;
      }

      if (
        !data.type ||
        !data.object
      ) {
        return;
      }

      recordHistory(user.roomId, {
        type: data.type,
        object: data.object,
      });

      socket
        .to(user.roomId)
        .emit(
          "whiteboard-object",
          data
        );
    }
  );

  socket.on(
    "clear-whiteboard",
    (data) => {
      const user =
        users[socket.id];

      if (!user) {
        return;
      }

      let roomId = null;

      if (typeof data === "string") {
        roomId = data;
      } else if (
        data &&
        typeof data.roomId === "string"
      ) {
        roomId = data.roomId;
      }

      if (!roomId) {
        return;
      }

      if (user.roomId !== roomId) {
        return;
      }

      recordHistory(roomId, {
        type: "clear",
      });

      socket
        .to(roomId)
        .emit("clear-whiteboard");
    }
  );

  socket.on(
    "code-update",
    (data) => {
      const user =
        users[socket.id];

      if (!user) {
        return;
      }

      if (
        !data ||
        typeof data !== "object"
      ) {
        return;
      }

      if (
        typeof data.code !== "string"
      ) {
        return;
      }

      recordHistory(user.roomId, {
        type: "code",
        code: data.code,
      });

      socket
        .to(user.roomId)
        .emit(
          "code-update",
          data.code
        );
    }
  );

  socket.on(
    "cursor-move",
    (data) => {
      const user =
        users[socket.id];

      if (!user) {
        return;
      }

      if (
        !data ||
        typeof data !== "object"
      ) {
        return;
      }

      if (
        typeof data.x !== "number" ||
        typeof data.y !== "number"
      ) {
        return;
      }

      user.x = data.x;
      user.y = data.y;

      socket
        .to(user.roomId)
        .emit("cursor-move", {
          id: socket.id,
          userId: user.userId,
          name: user.name,
          x: data.x,
          y: data.y,
        });
    }
  );

  socket.on(
    "leave-room",
    (data) => {
      const user =
        users[socket.id];

      if (!user) {
        return;
      }

      let roomId = null;

      if (typeof data === "string") {
        roomId = data.trim();
      } else if (
        data &&
        typeof data.roomId === "string"
      ) {
        roomId = data.roomId.trim();
      }

      if (!roomId) {
        roomId = user.roomId;
      }

      if (
        roomId !== user.roomId
      ) {
        return;
      }

      socket.leave(roomId);

      socket
        .to(roomId)
        .emit(
          "user-left",
          socket.id
        );

      console.log(
        `${user.name} left room ${roomId}`
      );

      delete users[socket.id];
    }
  );

  socket.on(
    "disconnect",
    () => {
      const user =
        users[socket.id];

      if (user) {
        const roomId =
          user.roomId;

        if (roomId) {
          socket
            .to(roomId)
            .emit(
              "user-left",
              socket.id
            );
        }

        delete users[socket.id];
      }

      console.log(
        "User disconnected:",
        socket.id
      );
    }
  );
});

server.listen(PORT, () => {
  console.log(
    `SyncSpace server running on http://localhost:${PORT}`
  );
});