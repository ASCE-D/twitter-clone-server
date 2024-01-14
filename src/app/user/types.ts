export const types = `#graphql

    type User {
        id: ID!
        firstName: String!
        lastName: String
        email: String!
        profileImageURL: String

        followers: [User]
        following: [User]

        recommendedUsers: [User]
        likes: [Like]
        tweets: [Tweet]
        liked(tweetId: ID!): Boolean
    }
    type Like {
        id: ID!
        tweet: Tweet
    }

    type Tweet {
        id: ID!
        content: String!
        author: User!
        likes: [Like]
    }

`;
