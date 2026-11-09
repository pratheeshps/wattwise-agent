import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const globalForPrisma = globalThis;
const connectionString = process.env.DATABASE_URL;

function createPrismaClient() {
  if (!connectionString) throw new Error('DATABASE_URL is required for PostgreSQL storage.');
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.__wattwisePrisma || createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__wattwisePrisma = prisma;
