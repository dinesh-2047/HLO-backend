import {Router} from "express"
import { registerUser, LoginUser, logoutUser, getCurrentUser, refreshAccessToken } from "../controllers/user.controller.js"
import { VerifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();


//routes
router.route("/register").post(registerUser);
router.route("/login").post(LoginUser);
router.route("/logout").post(VerifyJWT, logoutUser);
router.route("/get-current-user").get(VerifyJWT, getCurrentUser);
router.route("/refresh-token").post(refreshAccessToken);

export default router ; 