import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Room from "../models/room.model.js";

export const initializeSocket = (io) => {
  // Authenticate socket connections via JWT
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded._id).select(
        "-password -refreshToken"
      );

      if (!user) {
        return next(new Error("Invalid token"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.userName} (${socket.id})`);

    // Join a voice room
    socket.on("join-room", async (roomId) => {
      try {
        const room = await Room.findById(roomId);
        if (!room || !room.isActive) {
          socket.emit("error", { message: "Room not found or inactive" });
          return;
        }

        // Join the socket.io room
        socket.join(roomId);
        socket.currentRoom = roomId;

        // Notify other users in the room
        socket.to(roomId).emit("user-joined", {
          userId: socket.user._id,
          userName: socket.user.userName,
          fullName: socket.user.fullName,
          socketId: socket.id,
        });

        // Send list of existing users in the room to the new joiner
        const socketsInRoom = await io.in(roomId).fetchSockets();
        const existingUsers = socketsInRoom
          .filter((s) => s.id !== socket.id)
          .map((s) => ({
            userId: s.user._id,
            userName: s.user.userName,
            fullName: s.user.fullName,
            socketId: s.id,
          }));

        socket.emit("room-users", existingUsers);

        console.log(`${socket.user.userName} joined room ${roomId}`);
      } catch (error) {
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Leave a voice room
    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      socket.currentRoom = null;

      socket.to(roomId).emit("user-left", {
        userId: socket.user._id,
        userName: socket.user.userName,
        socketId: socket.id,
      });

      console.log(`${socket.user.userName} left room ${roomId}`);
    });

    // WebRTC Signaling: forward SDP offer to a specific peer
    socket.on("offer", ({ to, offer }) => {
      io.to(to).emit("offer", {
        from: socket.id,
        offer,
        userName: socket.user.userName,
        userId: socket.user._id,
      });
    });

    // WebRTC Signaling: forward SDP answer to a specific peer
    socket.on("answer", ({ to, answer }) => {
      io.to(to).emit("answer", {
        from: socket.id,
        answer,
      });
    });

    // WebRTC Signaling: forward ICE candidate to a specific peer
    socket.on("ice-candidate", ({ to, candidate }) => {
      io.to(to).emit("ice-candidate", {
        from: socket.id,
        candidate,
      });
    });

    // Toggle mute status
    socket.on("toggle-mute", ({ roomId, isMuted }) => {
      socket.to(roomId).emit("user-mute-toggle", {
        userId: socket.user._id,
        socketId: socket.id,
        isMuted,
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit("user-left", {
          userId: socket.user._id,
          userName: socket.user.userName,
          socketId: socket.id,
        });
      }
      console.log(`User disconnected: ${socket.user.userName} (${socket.id})`);
    });
  });
};

