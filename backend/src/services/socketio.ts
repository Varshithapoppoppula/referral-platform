import { Server, Socket } from "socket.io";
import { verifyToken } from "./supabase";

export function setupSocketIO(io: Server) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));
    const user = await verifyToken(token);
    if (!user) return next(new Error("Invalid token"));
    socket.data.userId = user.id;
    next();
  });

  io.on("connection", (socket: Socket) => {
    console.log("Socket connected:", socket.data.userId);

    socket.on("join_conversation", (referralRequestId: string) => {
      socket.join(`conversation:${referralRequestId}`);
      console.log(
        `User ${socket.data.userId} joined conversation:${referralRequestId}`,
      );
    });

    socket.on("leave_conversation", (referralRequestId: string) => {
      socket.leave(`conversation:${referralRequestId}`);
    });

    socket.on(
      "send_message",
      (data: { referralRequestId: string; content: string }) => {
        io.to(`conversation:${data.referralRequestId}`).emit("new_message", {
          referral_request_id: data.referralRequestId,
          sender_id: socket.data.userId,
          content: data.content,
          created_at: new Date().toISOString(),
        });
      },
    );

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.data.userId);
    });
  });
}
