export const muatations = `#graphql
    createTweet(payload: CreateTweetData!): Tweet
    likeTweet(tweetId: ID!): Like
`;
