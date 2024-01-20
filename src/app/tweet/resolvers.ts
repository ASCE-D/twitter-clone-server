import { Tweet } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../intefaces";
import UserService from "../../services/user";
import TweetService, { CreateCommentPayload, CreateTweetPayload } from "../../services/tweet";

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
});

const queries = {
  getAllTweets: async (_: any, __: any, ctx: GraphqlContext) => {
    // Get the userId from the context
    const userId = ctx.user?.id || null;

    // Call getAllTweets with the userId
    const tweets = await TweetService.getAllTweets(userId);

    return tweets;
  },
  getSignedURLForTweet: async (
    parent: any,
    { imageType, imageName }: { imageType: string; imageName: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user || !ctx.user.id) throw new Error("Unauthenticated");
    const allowedImageTypes = [
      "image/jpg",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedImageTypes.includes(imageType))
      throw new Error("Unsupported Image Type");

    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      ContentType: imageType,
      Key: `uploads/${ctx.user.id}/tweets/${imageName}-${Date.now()}`,
    });

    const signedURL = await getSignedUrl(s3Client, putObjectCommand);

    return signedURL;
  },
};

const mutations = {
  createTweet: async (
    parent: any,
    { payload }: { payload: CreateTweetPayload },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user) throw new Error("You are not authenticated");
    const tweet = await TweetService.createTweet({
      ...payload,
      userId: ctx.user.id,
    });

    return tweet;
  },
    createComment: async (
    parent: any,
    { payload }: { payload: CreateCommentPayload },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user) throw new Error("You are not authenticated");
    const comment = await TweetService.createComment({
      ...payload,
      userId: ctx.user.id,
    });

    return comment;
  },
  likeTweet: async (
    parent: any,
    { tweetId }: { tweetId: string },
    ctx: GraphqlContext
  ) => {
    if (!ctx.user) throw new Error("You are not authenticated");

    try {
      const like = await TweetService.likeTweet(tweetId, ctx.user.id);
      return like;
    } catch (error: any) {
      throw new Error(error.message);
    }
  },
};

const extraResolvers = {
  Tweet: {
    author: (parent: Tweet) => UserService.getUserById(parent.authorId),
    comments: (parent: Tweet) => TweetService.getCommentsByTweetId(parent.id),
    likeCount: (parent: Tweet) => TweetService.getLikeCount(parent.id),
  },
};

export const resolvers = { mutations, extraResolvers, queries };
