/*
  Warnings:

  - The values [EDIT] on the enum `OperationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OperationType_new" AS ENUM ('MERGE', 'SPLIT', 'COMPRESS', 'REACT_EDIT');
ALTER TABLE "pdf_operations" ALTER COLUMN "type" TYPE "OperationType_new" USING ("type"::text::"OperationType_new");
ALTER TYPE "OperationType" RENAME TO "OperationType_old";
ALTER TYPE "OperationType_new" RENAME TO "OperationType";
DROP TYPE "OperationType_old";
COMMIT;
