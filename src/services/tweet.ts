import { prismaClient } from "../clients/db";
import { redisClient } from "../clients/redis";
import UserService from "./user";

export interface CreateTweetPayload {
  content: string;
  imageURL?: string;
  userId: string;
}
export interface CreateCommentPayload {
  content: string;
  imageURL?: string;
  userId: string;
  tweetId: string;
}

class TweetService {
  public static async createTweet(data: CreateTweetPayload) {
    const rateLimitFlag = await redisClient.get(
      `RATE_LIMIT:TWEET:${data.userId}`
    );
    if (rateLimitFlag) throw new Error("Please wait....");
    const tweet = await prismaClient.tweet.create({
      data: {
        content: data.content,
        imageURL: data.imageURL,
        author: { connect: { id: data.userId } },
      },
    });
    await redisClient.setex(`RATE_LIMIT:TWEET:${data.userId}`, 10, 1);
    await redisClient.del("ALL_TWEETS");
    console.log("tweet", tweet);
    return tweet;
  }
  public static async createComment(data: CreateCommentPayload) {
    const rateLimitFlag = await redisClient.get(
      `RATE_LIMIT:TWEET:${data.userId}`
    );
    if (rateLimitFlag) throw new Error("Please wait....");
    const comment = await prismaClient.commentTweet.create({
      data: {
        content: data.content,
        imageURL: data.imageURL,
        User: { connect: { id: data.userId } },
        tweet: { connect: { id: data.tweetId } },
      },
    });
    await redisClient.setex(`RATE_LIMIT:COMMENT:${data.userId}`, 10, 1);
    await redisClient.del("ALL_TWEETS");
    console.log("comment", comment);
    return comment;
  }

  public static async getAllTweets(userId: string | null) {
    const cachedTweets = await redisClient.get("ALL_TWEETS");
    if (cachedTweets) return JSON.parse(cachedTweets);

    const currentUserId = userId;

    const tweets = await prismaClient.tweet.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        imageURL: true,
        createdAt: true,
        _count: { select: { likes: true, comments: true } },
        likes: !userId ? false : { where: { userId: currentUserId } },
        author: {
          select: { firstName: true, id: true, profileImageURL: true },
        },
      },
    });

    const formattedTweets = tweets.map((tweet) => {
      return {
        id: tweet.id,
        content: tweet.content,
        createdAt: tweet.createdAt,
        imageURL: tweet.imageURL,
        likeCount: tweet._count.likes,
        commentCount: tweet._count.comments,
        user: tweet.author,
        likedByMe: tweet.likes?.length > 0,
      };
    });

    // Set the data in the Redis cache
    await redisClient.set("ALL_TWEETS", JSON.stringify(formattedTweets));

    return formattedTweets;
  }

  public static async likeTweet(tweetId: string, userId: string) {
    let existingLike = await prismaClient.likedTweet.findFirst({
      where: {
        tweetId,
        userId,
      },
    });

    if (existingLike) {
      // If an existing like is found, delete it
      existingLike = await prismaClient.likedTweet.delete({
        where: {
          id: existingLike.id,
        },
      });

      // Delete relevant cache entries (adjust key based on your cache structure)
      await redisClient.del("ALL_TWEETS");
      console.log("delete", existingLike);
      // Return information about the removed like
      return { addedLike: false };
    } else {
      // If no existing like is found, create a new like
      const newLike = await prismaClient.likedTweet.create({
        data: {
          User: { connect: { id: userId } },
          tweet: { connect: { id: tweetId } },
        },
      });

      // Delete relevant cache entries (adjust key based on your cache structure)

      await redisClient.del("ALL_TWEETS");
      console.log("create", newLike);
      // Return information about the new like
      return { addedLike: true };
    }
  }

  public static async getLikeCount(tweetId: string) {
    const likes = await prismaClient.likedTweet.findMany({
      where: {
        tweetId,
      },
    });

    return likes.length;
  }
  public static async getCommentsByTweetId(id: string) {
    const comments = await prismaClient.commentTweet.findMany({
      where: { tweetId: id },
    });

    // console.log(comments);

    const commentsWithUsername = await Promise.all(
      comments.map(async (comment) => {
        const user = await prismaClient.user.findUnique({
          where: { id: comment.userId },
        });
        return {
          ...comment,
          username: user?.firstName || null,
        };
      })
    );

    return commentsWithUsername;
  }
}

export default TweetService;
