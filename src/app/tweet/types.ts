export const types = `#graphql

    input CreateTweetData {
        content: String!
        imageURL: String
    }

    type Tweet {
        id: ID!
        content: String! 
        profileImageURL: String 
        likeCount: Int
        user: User
        likedByMe: Boolean
    }

    type Like {
        addedLike: Boolean
    }
`;
