export const types = `#graphql

    input CreateTweetData {
        content: String!
        imageURL: String
    }

    type Tweet {
        id: ID!
        content: String! 
        imageURL: String 
        likeCount: Int
        commentCount: Int
        user: User
        likedByMe: Boolean
        comments: [Comment]
    }

    type Like {
        addedLike: Boolean
    }

    input CreateCommentData {
        content: String!
        imageURL: String
        tweetId: String!
    }

    type Comment {
        id: ID!
        content: String!
        username: String
        imageURL: String
        commentCount: Int
        userId: ID
    }
`;
