import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandlers.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    // console.log(videoId);
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }


    const likedAlready = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id,
    });

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id);
        
        console.log("video like deleted !!")
        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }));
    }
    // console.log("reached here ")
    await Like.create({
        video: videoId,
        likedBy: req.user?._id,
    });
    
    console.log("video got liked !!")
    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentId");
    }


    const likedAlready = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id,
    });

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id);
        
        console.log("comment like deleted !!")
        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }));
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user?._id,
    });
    
    console.log("comment got liked !!")
    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId");
    }


    const likedAlready = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id);
        
        console.log("tweet like is deleted !!")
        return res
            .status(200)
            .json(new ApiResponse(200, { tweetId, isLiked: false }));
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id,
    });
    
    console.log("tweet got liked !!")
    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }));
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideosAggregate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                ],
            },
        },
        {
            $unwind: "$likedVideo",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1,
                    },
                },
            },
        },
    ]);
    console.log("liked videos fetched successfully !!")
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideosAggregate,
                "liked videos fetched successfully"
            )
        );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
