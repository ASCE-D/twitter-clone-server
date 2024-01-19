-- CreateTable
CREATE TABLE "CommentTweet" (
    "id" SERIAL NOT NULL,
    "commentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "tweetId" TEXT NOT NULL,

    CONSTRAINT "CommentTweet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CommentTweet" ADD CONSTRAINT "CommentTweet_tweetId_fkey" FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentTweet" ADD CONSTRAINT "CommentTweet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
