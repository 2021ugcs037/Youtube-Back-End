// ye middleware check krega ki user h ya nhi h 

import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandlers.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async(req, _ , next) =>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        // console.log("Cookie token:", req.cookies?.accessToken);
        // console.log("Header token:", req.header("Authorization"));
    
        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if(!user){
            throw new ApiError(401, "Invalid Access Token")
        }
        req.user = user;
        next()  //har middleware ke last me next() likhte h taaki next middleware ya fuction execute ho

    } catch (error) {
        if(error.name === "TokenExpiredError"){
            throw new ApiError(401, "Access Token Expired")
        }
        throw new ApiError(401, error?.message || "Invalid access token")
    }

})