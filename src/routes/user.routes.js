import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, 
         changeCurrentPassword, getCurrentUser, updateAccountDetails, 
         updateUserAvatar, updateUserCoverImage,userChannelProfile,
         getWatchHistory
       } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

// jo v method call ho rha uske just pehle middleware inject krdo jaise yha pe registerUser ke just pehle upload.fields se inject kiye h
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)

// secured routes
router.route("/logout").post(verifyJWT, logoutUser) // yha pe verifyJWT as a middleware inject hora h, verifyJWT yani pehle verify krega ki user k pas token h ya nhi yani ki user login h ki nhi

router.route("/refresh-token").post(refreshAccessToken)// req user ho nhi ho koi farq ni padta isliye yha verifyJWT nhi use kiye

router.route("/change-password").post(verifyJWT, changeCurrentPassword)

router.route("/current-user").get(verifyJWT,getCurrentUser)

router.route("/update-account").patch(verifyJWT, updateAccountDetails) // yha patch use krenge qki post me sara details update krdega

router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)

router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

router.route("/c/:username").get(verifyJWT,userChannelProfile)

router.route("/history").get(verifyJWT,getWatchHistory)

export default router