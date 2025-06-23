import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

// used to store users in group rooms
const groupRooms = {}; // {groupId: [userId1, userId2, ...]}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle joining a group chat room
  socket.on("joinGroup", ({ groupId }) => {
    console.log(`User ${userId} joined group ${groupId}`);
    socket.join(`group:${groupId}`);
    
    // Add user to group room tracking
    if (!groupRooms[groupId]) {
      groupRooms[groupId] = [];
    }
    if (!groupRooms[groupId].includes(userId)) {
      groupRooms[groupId].push(userId);
    }
  });

  // Handle leaving a group chat room
  socket.on("leaveGroup", ({ groupId }) => {
    console.log(`User ${userId} left group ${groupId}`);
    socket.leave(`group:${groupId}`);
    
    // Remove user from group room tracking
    if (groupRooms[groupId]) {
      groupRooms[groupId] = groupRooms[groupId].filter(id => id !== userId);
      if (groupRooms[groupId].length === 0) {
        delete groupRooms[groupId];
      }
    }
  });

  // Handle typing in a group
  socket.on("startTypingInGroup", ({ groupId }) => {
    socket.to(`group:${groupId}`).emit("groupTyping", {
      groupId,
      userId,
    });
  });

  socket.on("stopTypingInGroup", ({ groupId }) => {
    socket.to(`group:${groupId}`).emit("groupTypingStopped", {
      groupId,
      userId,
    });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    
    // Remove user from all group rooms they were in
    Object.keys(groupRooms).forEach(groupId => {
      if (groupRooms[groupId].includes(userId)) {
        groupRooms[groupId] = groupRooms[groupId].filter(id => id !== userId);
        if (groupRooms[groupId].length === 0) {
          delete groupRooms[groupId];
        }
      }
    });
    
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// Helper function to emit a message to all members of a group
export function emitToGroup(groupId, event, data) {
  io.to(`group:${groupId}`).emit(event, data);
}

export { io, app, server };
