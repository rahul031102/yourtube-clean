import jwt from "jsonwebtoken";
import { markOnline, markOffline } from "./lib/presence.js";

export default function registerSignaling(io) {
  // middleware: verify JWT token on handshake and attach userId
  io.use((socket, next) => {
    try {
      const token = socket.handshake?.auth?.token;
      if (!token) return next();
      const payload = jwt.verify(token, process.env.JWT_SECRET || "secret");
      if (payload && payload.id) {
        socket.data = socket.data || {};
        socket.data.userId = payload.id;
      }
      return next();
    } catch (e) {
      console.warn("socket middleware auth failed", e);
      return next();
    }
  });

  // in-memory map of active calls: roomId -> callId
  const activeCalls = new Map();
  io.on("connection", (socket) => {
    console.log("[signaling] socket connected", socket.id);
    // map of userId -> socketId stored on socket object
    socket.data = socket.data || {};
    // helper to lazily import user model (ESM-safe)
    const importUsers = async () => {
      try {
        const mod = await import("./Modals/Auth.js");
        return mod.default;
      } catch (e) {
        return null;
      }
    };

    // if client passed token during handshake, verify and register automatically
    try {
      const token = socket.handshake?.auth?.token;
      if (token) {
        const payload = jwt.verify(token, process.env.JWT_SECRET || "secret");
        if (payload && payload.id) {
          socket.data.userId = payload.id;
          markOnline(payload.id);
          console.log(`[signaling] socket auth ${socket.id} -> user ${payload.id}`);
          socket.emit("register-success", { userId: payload.id });
        }
      }
    } catch (e) {
      console.warn("socket auth failed", e);
      socket.emit("register-failed", { reason: "INVALID_TOKEN" });
    }

    socket.on("join-room", ({ roomId }) => {
      // require registration before allowing join
      if (!socket.data?.userId) {
        socket.emit("join-failed", { reason: "NOT_REGISTERED" });
        return;
      }
      socket.join(roomId);
      socket.to(roomId).emit("user-joined", { id: socket.id, userId: socket.data.userId });
    });

    // register a userId with this socket for direct messaging
    socket.on("register", async ({ userId }) => {
      // verify user exists in DB before registering
      try {
        const Users = await importUsers();
        if (Users) {
          const exists = await Users.findById(userId).lean();
          if (!exists) {
            socket.emit("register-failed", { reason: "USER_NOT_FOUND" });
            return;
          }
        }
      } catch (e) {
        console.warn("register check failed", e);
        socket.emit("register-failed", { reason: "ERROR" });
        return;
      }
      socket.data.userId = userId;
      markOnline(userId);
      console.log(`[signaling] register ${userId} -> ${socket.id}`);
      socket.emit("register-success", { userId });
    });

    // call request flow: caller -> server -> target (incoming-call)
    socket.on("call-request", ({ targetUserId, roomId, fromUserId, mode }) => {
      // ensure caller is registered and matches the declared fromUserId
      if (!socket.data?.userId || socket.data.userId !== fromUserId) {
        socket.emit("call-error", { reason: "INVALID_CALLER" });
        return;
      }
      // find socket for target
      const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.data?.userId === targetUserId);
      if (targetSocket) {
        targetSocket.emit("incoming-call", { fromUserId, roomId, mode });
      } else {
        // notify caller that target unavailable
        socket.emit("call-unavailable", { targetUserId });
      }
    });

    // call response: target -> server -> caller
    socket.on("call-response", async ({ targetUserId, fromUserId, accepted, roomId }) => {
      // ensure responder is registered
      if (!socket.data?.userId) {
        socket.emit("call-error", { reason: "NOT_REGISTERED" });
        return;
      }
      const callerSocket = Array.from(io.sockets.sockets.values()).find(s => s.data?.userId === fromUserId);
      if (callerSocket) {
        callerSocket.emit("call-response", { accepted, roomId, targetUserId });
      }
      // if accepted, create a call log entry and store mapping
      if (accepted) {
        try {
          const { createCallLog } = await import("./controllers/callLog.js");
          const doc = await createCallLog({ roomId, participants: [fromUserId, targetUserId] });
          if (doc && roomId) activeCalls.set(roomId, doc._id?.toString?.() || doc._id);
        } catch (e) {
          console.warn("createCallLog failed", e);
        }
      }
    });

    socket.on("offer", ({ target, sdp }) => {
      if (!socket.data?.userId) return socket.emit("call-error", { reason: "NOT_REGISTERED" });
      if (target) io.to(target).emit("offer", { from: socket.id, sdp });
      else socket.broadcast.emit("offer", { from: socket.id, sdp });
    });

    socket.on("answer", ({ target, sdp }) => {
      if (!socket.data?.userId) return socket.emit("call-error", { reason: "NOT_REGISTERED" });
      if (target) io.to(target).emit("answer", { from: socket.id, sdp });
      else socket.broadcast.emit("answer", { from: socket.id, sdp });
    });

    socket.on("ice-candidate", ({ target, candidate }) => {
      if (!socket.data?.userId) return socket.emit("call-error", { reason: "NOT_REGISTERED" });
      if (target) io.to(target).emit("ice-candidate", { from: socket.id, candidate });
      else socket.broadcast.emit("ice-candidate", { from: socket.id, candidate });
    });

    socket.on("leave-room", ({ roomId }) => {
      socket.leave(roomId);
      socket.to(roomId).emit("user-left", { id: socket.id });
    });

    // end-call: notify room participants
    socket.on("end-call", async ({ roomId }) => {
      try {
        socket.to(roomId).emit("call-ended", { id: socket.id });
        socket.leave(roomId);
        // finalize call log if present
        if (roomId && activeCalls.has(roomId)) {
          try {
            const { endCallLog } = await import("./controllers/callLog.js");
            await endCallLog({ roomId });
          } catch (e) {
            console.warn("endCallLog failed", e);
          }
          activeCalls.delete(roomId);
        }
      } catch (e) {
        console.warn("end-call error", e);
      }
    });

    socket.on("disconnect", () => {
      console.log("[signaling] socket disconnected", socket.id);
      if (socket.data?.userId) markOffline(socket.data.userId);
      socket.broadcast.emit("user-left", { id: socket.id, userId: socket.data?.userId });
    });
  });
}
