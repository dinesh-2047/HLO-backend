import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io"
import app from "./app.js"
import { connectDB } from "./config/db.js"
import { initializeSocket } from "./socket/socket.js"

dotenv.config()

const PORT = process.env.PORT;

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:19006"],
    credentials: true,
  },
});

// Initialize WebRTC signaling via Socket.io
initializeSocket(io);

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server is running on PORT: ${PORT}`);
      console.log(`Socket.io ready for connections`);
    });
  })
  .catch((error) => {
    console.log("Server Failed", error);
  });
