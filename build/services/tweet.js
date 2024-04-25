"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../clients/db");
const redis_1 = require("../clients/redis");
class TweetService {
    static createTweet(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const rateLimitFlag = yield redis_1.redisClient.get(`RATE_LIMIT:TWEET:${data.userId}`);
            if (rateLimitFlag)
                throw new Error("Please wait....");
            const tweet = yield db_1.prismaClient.tweet.create({
                data: {
                    content: data.content,
                    imageURL: data.imageURL,
                    author: { connect: { id: data.userId } },
                },
            });
            yield redis_1.redisClient.setex(`RATE_LIMIT:TWEET:${data.userId}`, 10, 1);
            yield redis_1.redisClient.del("ALL_TWEETS");
            console.log("tweet", tweet);
            return tweet;
        });
    }
    static createComment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const rateLimitFlag = yield redis_1.redisClient.get(`RATE_LIMIT:TWEET:${data.userId}`);
            if (rateLimitFlag)
                throw new Error("Please wait....");
            const comment = yield db_1.prismaClient.commentTweet.create({
                data: {
                    content: data.content,
                    imageURL: data.imageURL,
                    User: { connect: { id: data.userId } },
                    tweet: { connect: { id: data.tweetId } },
                },
            });
            yield redis_1.redisClient.setex(`RATE_LIMIT:COMMENT:${data.userId}`, 10, 1);
            yield redis_1.redisClient.del("ALL_TWEETS");
            console.log("comment", comment);
            return comment;
        });
    }
    static getAllTweets(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cachedTweets = yield redis_1.redisClient.get("ALL_TWEETS");
            if (cachedTweets)
                return JSON.parse(cachedTweets);
            const currentUserId = userId;
            const tweets = yield db_1.prismaClient.tweet.findMany({
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
                var _a;
                return {
                    id: tweet.id,
                    content: tweet.content,
                    createdAt: tweet.createdAt,
                    imageURL: tweet.imageURL,
                    likeCount: tweet._count.likes,
                    commentCount: tweet._count.comments,
                    user: tweet.author,
                    likedByMe: ((_a = tweet.likes) === null || _a === void 0 ? void 0 : _a.length) > 0,
                };
            });
            // Set the data in the Redis cache
            yield redis_1.redisClient.set("ALL_TWEETS", JSON.stringify(formattedTweets));
            return formattedTweets;
        });
    }
    static likeTweet(tweetId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            let existingLike = yield db_1.prismaClient.likedTweet.findFirst({
                where: {
                    tweetId,
                    userId,
                },
            });
            if (existingLike) {
                // If an existing like is found, delete it
                existingLike = yield db_1.prismaClient.likedTweet.delete({
                    where: {
                        id: existingLike.id,
                    },
                });
                // Delete relevant cache entries (adjust key based on your cache structure)
                yield redis_1.redisClient.del("ALL_TWEETS");
                console.log("delete", existingLike);
                // Return information about the removed like
                return { addedLike: false };
            }
            else {
                // If no existing like is found, create a new like
                const newLike = yield db_1.prismaClient.likedTweet.create({
                    data: {
                        User: { connect: { id: userId } },
                        tweet: { connect: { id: tweetId } },
                    },
                });
                // Delete relevant cache entries (adjust key based on your cache structure)
                yield redis_1.redisClient.del("ALL_TWEETS");
                console.log("create", newLike);
                // Return information about the new like
                return { addedLike: true };
            }
        });
    }
    static getLikeCount(tweetId) {
        return __awaiter(this, void 0, void 0, function* () {
            const likes = yield db_1.prismaClient.likedTweet.findMany({
                where: {
                    tweetId,
                },
            });
            return likes.length;
        });
    }
    static getCommentsByTweetId(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const comments = yield db_1.prismaClient.commentTweet.findMany({
                where: { tweetId: id },
            });
            // console.log(comments);
            const commentsWithUsername = yield Promise.all(comments.map((comment) => __awaiter(this, void 0, void 0, function* () {
                const user = yield db_1.prismaClient.user.findUnique({
                    where: { id: comment.userId },
                });
                return Object.assign(Object.assign({}, comment), { username: (user === null || user === void 0 ? void 0 : user.firstName) || null });
            })));
            return commentsWithUsername;
        });
    }
}
exports.default = TweetService;
