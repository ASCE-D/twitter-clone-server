"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.muatations = void 0;
exports.muatations = `#graphql
    createTweet(payload: CreateTweetData!): Tweet
    likeTweet(tweetId: ID!): Like
    createComment(payload: CreateCommentData!): Comment
`;
