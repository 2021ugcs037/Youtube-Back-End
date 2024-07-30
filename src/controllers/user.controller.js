import { asyncHandler } from "../utils/asyncHandlers.js";
import {ApiError} from '../utils/ApiError.js'
import { User} from '../models/user.models.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// refreshToken database me saved rhta h or iski help se accessToken ko renew kra lete h jo short lived hota h
const generateAccessAndRefreshToken = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})
        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating access and refresh tokens")
    }
}

// register user ka end point
const registerUser = asyncHandler( async(req,res) =>{
    // get user details from frontend
    // validation - not empty any field
    // check if user already exist - username,email
    // check for images , avatar
    // upload them to cloudinary
    // create user obj - creatye entry in db
    // remove password and refresh token from response
    // check for user creation 
    // return response if created otherwise return error

    const {fullname,email,username,password} = req.body
    // console.log("email : ",email)

    // if(fullname === ""){
    //     throw new ApiError(400,"fullname is required ") 
    // } 
    // sb field k liye alg alg if else lagayge to code lengthy ho jyga isliye sbko eksath check krlete h
    if(
        [fullname,email,username,password].some((field) => 
        field ?.trim() === "") 

    ) {
        throw new ApiError(400,"all fields are required ")
    }
    // check if user already exist - username,email
    const existedUser = await User.findOne({
        $or : [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"username or email already exist")
    }
    // console.log(req.files);

    // check for images , avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar is required")
    }
    // now upload them to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    console.log(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"avatar file is required")
    }
    // create user obj - creatye entry in db
    const user = await User.create({
        fullname,
        avatar :avatar.url,
        coverImage : coverImage?.url || "",// coverImage h ya nhi ye fix ni h isliye empty string v accept krwa denge
        email,
        password,
        username : username.toLowerCase()
    })
    // checking whether the user is created or not
    const createdUser = await User.findById(user._id).select("-password -refreshToken") // yha pass and refrtoken ni chahiye, by default sab selected rhta h
    if(!createdUser){
        throw new ApiError("something went wrong while registering the user")
    }
    // send the response to the user
    res.status(201).json(
        new ApiResponse(200, createdUser , "User is registerd successfully !!!")
    )
})

// login user ka end point
const loginUser = asyncHandler(async (req,res) =>{
    // req body --> data (req.body se data le aao)
    // check username or email
    // find the user
    // password check
    // access and refresh token
    // send cookies

    const {email,username,password} = req.body
    console.log(email);

    if(!(username || email)){
        throw new ApiError(400,"username or email is required")
    }
    // check whether the user is exist or not
    const user = await User.findOne({
        $or : [{email},{username}]
    })
    if(!user){
        throw new ApiError(404,"user does not exist")
    }
    // password check
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"invalid password")
    }
    // generate access and refresh token
    // NOTE :- "user" ye wla user wha use krenge jaha khud se methods bnaye ho
    //         "User" ye wla findOne , updateOne yesb me use hoga jo mongoose ka function h
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    // send the response to the user (cookies bhejdo)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    console.log("User is logged in successfully !!")
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, 
        {
            user:loggedInUser, accessToken,refreshToken
        },
            
        "User is logged in successfully !!!"
    ))

})

// logout user ka end point
const logoutUser = asyncHandler(async(req,res) =>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            // $set : {
            //     refreshToken : null
            // }
            // isko aise v likh skte h -->
            $unset : {
                refreshToken : 1 // this removes the field from ducument
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    console.log("User is logged out successfully !!")
    return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200,{}, "User logged out successfully"))
})
// REFRESH TOKEN KA END POINT
// agr access token expire ho jyga to wapis se login krne bolega..isse acha hmlog access token ko renew kra dete h refresh token ke help se to login hojata h
const refreshAccessToken = asyncHandler(async(req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }
    // DECODED TOKEN/INFO KE LIYE JWT VERIFY KRENGE qki user ke pas jo token jata h wo encrypted hota h or hme raw token chahiye jo db me store rhta h
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
        // INCOMING REFRESH TOKEN JO USER SE MILEGA OR DECODED REF TOKEN JO DATABASE SE AYGA DONO KO COMPARE KRENGE..DONO SAME HUA TO ACCESS DE DENGE WRNA ERROR THROW KRDENGE 
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "refresh token is expired or used")
        }
        const options = {
            httpOnly: true,
            secure: true
        }
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)

        console.log("Access token refreshed successfully !!")
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json( new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access token renewed successfully"))

    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})
const changeCurrentPassword = asyncHandler(async(req,res) =>{
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401, "Old password is incorrect")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})
    
    console.log("password is changed successfully !!")
    return res
    .status(200)
    .json(new ApiResponse(200,{}, "password changed successfully !!"))
})
// fetching current user
const getCurrentUser = asyncHandler(async(req,res) =>{

    console.log("Current user data fetched successfully !!")
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})
const updateAccountDetails = asyncHandler(async(req,res) =>{
    const {fullname, email} = req.body

    if(!(fullname || email)){
        throw new ApiError(400, "all fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set: {
                fullname, // fullname: fullname aise v likh skte h
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully !!"))
})
// upload files in multer end point
const updateUserAvatar = asyncHandler(async(req,res) =>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading avatar file")
    }
    const user = await User.findByIdAndUpdate(req.user?._id, {$set:{avatr: avatar.url}}, {new:"true"}).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar file uploaded successfully !!"))
})

const updateUserCoverImage = asyncHandler(async(req,res) =>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading cover image file")
    }
    const user = await User.findByIdAndUpdate(req.user?._id, {$set:{coverImage: coverImage.url}}, {new:"true"}).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully !!"))
})

const userChannelProfile = asyncHandler(async(req,res) =>{
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400, "Username is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {   //kitna subscribers h
            $lookup: {
                from: "subscriptions", // sari lowercase me hogyi or plural v hogya
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {   // kitna ko subscribe kiya h
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedChannels"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedCount: {
                    $size: "$subscribedChannels"
                },
                // subscribe/subscribed button ko kese dikhayge...true h to subscribed ni to subscribe
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                createdAt: 1
            }
        }

    ])
    if(!channel?.length){
        throw new ApiError(404, "channel does not exist")
    }
    
    console.log("User channel fetched successfully !!")
    return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "user channel fetched successfully"))
})

const getWatchHistory = asyncHandler(async(req,res) =>{
    const user = await User.aggregate([
        {
            $match: {
                // _id: req.user?._id // ye glt h qki req.user.id hme id nhi string deta h
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory" ,
                pipeline: [  // sub-pipelines
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [ // owner ke pas bahut sare fields h but sb nhi chahiye mko isliye sub-pipeline lgaya
                                {
                                    $project:{
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                           owner:{
                            $first: "$owner"
                           } 
                        }
                    }
                ]
            }
        }
    ])
    console.log("User watch history fetched successfully !!")
    return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "user watch history fetched successfully"))
})
export {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    userChannelProfile,
    getWatchHistory
} 