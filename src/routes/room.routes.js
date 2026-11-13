import { Router } from "express";
import {
  createRoom,
  getNearbyRooms,
  joinRoom,
  leaveRoom,
  getRoomDetails,
  closeRoom,
} from "../controllers/room.controller.js";
import { VerifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All room routes require authentication
router.use(VerifyJWT);

router.route("/create").post(createRoom);
router.route("/nearby").get(getNearbyRooms);
router.route("/join/:roomId").post(joinRoom);
router.route("/leave/:roomId").post(leaveRoom);
router.route("/:roomId").get(getRoomDetails);
router.route("/:roomId").delete(closeRoom);

export default router;

