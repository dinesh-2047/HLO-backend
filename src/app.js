import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import roomRouter from "./routes/room.routes.js";

const app = express();

// Normalize duplicate slashes in URLs (e.g., //api/v1 -> /api/v1)
app.use((req, res, next) => {
  req.url = req.url.replace(/\/{2,}/g, "/");
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl) or any localhost/LAN/Vercel origin
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/users", userRouter);
app.use("/api/v1/rooms", roomRouter);

// Global error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    statusCode,
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
  });
});

export default app;
