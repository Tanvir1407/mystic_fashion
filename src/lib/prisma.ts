import {config} from 'dotenv';

config();
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const softDeletableModels = [
  "brand",
  "category",
  "subcategory",
  "product",
  "order",
  "supplier",
  "purchase",
  "coupon",
  "discount",
  "heroSlide"
];

const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const baseClient = new PrismaClient({ adapter });

  // Get transaction-aware or standard base client dynamically
  const getClient = (rest: any) => {
    const transaction = rest?.__internalParams?.transaction;
    if (transaction && transaction.kind === 'itx') {
      return (baseClient as any)._createItxClient(transaction);
    }
    return baseClient;
  };

  return baseClient.$extends({
    query: {
      $allModels: {
        async delete({ model, args, query, ...rest }: any) {
          const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
          if (softDeletableModels.includes(modelKey)) {
            const client = getClient(rest);

            // Category soft-delete: cascade to subcategories, but products stay visible with categoryId = null
            if (modelKey === "category" && args.where?.id) {
              const subs = await client.subcategory.findMany({
                where: { categoryId: args.where.id, deletedAt: null },
                select: { id: true },
              });
              const subIds = subs.map((s: any) => s.id);

              await client.subcategory.updateMany({
                where: { categoryId: args.where.id, deletedAt: null },
                data: { deletedAt: new Date() },
              });

              // Products are NOT soft-deleted — they remain visible but lose their category reference
              await client.product.updateMany({
                where: { categoryId: args.where.id, deletedAt: null },
                data: { categoryId: null },
              });
              if (subIds.length > 0) {
                await client.product.updateMany({
                  where: { subcategoryId: { in: subIds }, deletedAt: null },
                  data: { categoryId: null },
                });
              }
            }

            return client[modelKey].update({
              ...args,
              data: { deletedAt: new Date() },
            });
          }
          return query(args);
        },
        async deleteMany({ model, args, query, ...rest }: any) {
          const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
          if (softDeletableModels.includes(modelKey)) {
            const client = getClient(rest);
            try {
              return await client[modelKey].updateMany({
                where: args.where,
                data: { deletedAt: new Date() },
              });
            } catch {
              // Fallback to baseClient if transaction context detection fails
              return await (baseClient as any)[modelKey].updateMany({
                where: args.where,
                data: { deletedAt: new Date() },
              });
            }
          }
          return query(args);
        },
        async findFirst({ model, args, query }: any) {
          const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
          if (softDeletableModels.includes(modelKey)) {
            args.where = args.where || {};
            if (!('deletedAt' in args.where)) {
              args.where.deletedAt = null;
            }
          }
          return query(args);
        },
        async findMany({ model, args, query }: any) {
          const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
          if (softDeletableModels.includes(modelKey)) {
            args.where = args.where || {};
            if (!('deletedAt' in args.where)) {
              args.where.deletedAt = null;
            }
          }
          return query(args);
        },
        async findUnique({ model, args, query }: any) {
          const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
          if (softDeletableModels.includes(modelKey)) {
            args.where = args.where || {};
            if (!('deletedAt' in args.where)) {
              const result = await query(args);
              if (result && result.deletedAt !== null) {
                return null;
              }
              return result;
            }
          }
          return query(args);
        },
        async count({ model, args, query }: any) {
          const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
          if (softDeletableModels.includes(modelKey)) {
            args.where = args.where || {};
            if (!('deletedAt' in args.where)) {
              args.where.deletedAt = null;
            }
          }
          return query(args);
        },
      },
    },
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
