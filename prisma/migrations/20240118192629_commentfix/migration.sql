/*
  Warnings:

  - Made the column `userId` on table `CommentTweet` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "CommentTweet" DROP CONSTRAINT "CommentTweet_userId_fkey";

-- AlterTable
ALTER TABLE "CommentTweet" ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "CommentTweet" ADD CONSTRAINT "CommentTweet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
