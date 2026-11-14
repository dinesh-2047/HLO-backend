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

// Nearby rooms can be discovered publicly
router.route("/nearby").get(getNearbyRooms);

// All other room actions require authentication
router.use(VerifyJWT);

router.route("/create").post(createRoom);
router.route("/join/:roomId").post(joinRoom);
router.route("/leave/:roomId").post(leaveRoom);
router.route("/:roomId").get(getRoomDetails);
router.route("/:roomId").delete(closeRoom);

export default router;
