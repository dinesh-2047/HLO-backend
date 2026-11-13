import express from "express"
const app = express();
import cors from "cors"
import cookieParser from "cookie-parser"


app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:19006"], // Next.js + Expo
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


import userRouter from "../src/routes/user.routes.js"
import roomRouter from "../src/routes/room.routes.js"


app.use("/api/v1/users", userRouter);
app.use("/api/v1/rooms", roomRouter);

export default app;
