import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

import authRoutes from "./routes/auth";
import jobRoutes from "./routes/jobs";
import referralRoutes from "./routes/referral";
import userRoutes from "./routes/users";
import applicationRoutes from "./routes/applications";
import aiRoutes from "./routes/ai";
import ragRoutes from "./routes/rag";
import skillsRoutes from "./routes/skills";
import { setupSocketIO } from "./services/socketio";
import { startJobCron } from "./services/jobCron";
import {
  initRAG,
  seedCareerKnowledge,
  seedInterviewQuestions,
} from "./services/rag";
import questionsData from "./data/questions.json";

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL || "",
].filter(Boolean) as string[];

export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.use(helmet());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((o) => origin.startsWith(o)))
        return callback(null, true);
      return callback(new Error("CORS blocked: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-id"],
    optionsSuccessStatus: 200,
  }),
);
app.options("*", cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/users", userRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/skills", skillsRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  },
);

setupSocketIO(io);
startJobCron();

const PORT = process.env.PORT ?? 5000;
httpServer.listen(PORT, async () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  // Initialise RAG (non-blocking — server is already listening)
  try {
    await initRAG();
    await seedCareerKnowledge();
    await seedInterviewQuestions(questionsData as any);
    console.log("RAG initialised and seeded.");
  } catch (err: any) {
    console.error("RAG init failed (non-fatal):", err.message);
  }
});
