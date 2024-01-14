import { prismaClient } from "../clients/db";
import { redisClient } from "../clients/redis";
import UserService from "./user";

export interface CreateTweetPayload {
  content: string;
  imageURL?: string;
  userId: string;
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
    return tweet;
  }

  public static async getAllTweets(userId: string | null) {
    const cachedTweets = await redisClient.get("ALL_TWEETS");
    if (cachedTweets) return JSON.parse(cachedTweets);
    const currentUserId = userId;
    console.log("userID: ", userId);
    const tweets = await prismaClient.tweet.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        _count: { select: { likes: true }},
        likes: !userId ? false : { where: { userId: currentUserId}},
        author: {
          select: { firstName: true, id: true, profileImageURL: true}
        }
      }
    });
    console.log("tweets", tweets[0].likes);

    // if (userId) {
    //  const likedTweetIds = await prismaClient.likedTweet
    //    .findMany({
    //      where: {
    //        userId,
    //        tweetId: {
    //          in: tweets.map((tweet) => tweet.id),
    //        },
    //      },
    //    })
    //    .then((likes) => likes.map((like) => like.tweetId));

    //  const tweetsWithLikedStatus = tweets.map((tweet) => ({
    //    ...tweet,
    //    isLiked: likedTweetIds.includes(tweet.id),
    //  }));
    //   await redisClient.set(
    //     "ALL_TWEETS",
    //     JSON.stringify(tweetsWithLikedStatus)
    //   );
    //   return tweetsWithLikedStatus;
    // } else {
    //   await redisClient.set("ALL_TWEETS", JSON.stringify(tweets));
    //   return tweets;
    // }
      return tweets.map((tweet) => {
          return {
            id: tweet.id,
            content: tweet.content,
            createdAt: tweet.createdAt,
            profileImageURL: tweet.author.profileImageURL,
            likeCount: tweet._count.likes,
            user: tweet.author,
            likedByMe: tweet.likes?.length > 0,
          };
        });
        
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
}

export default TweetService;
