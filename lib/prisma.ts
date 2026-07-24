import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  const directUrl = process.env.DIRECT_URL;
  const accelerateUrl = process.env.DATABASE_URL;

  // Se tiver DIRECT_URL, conecta diretamente ao Postgres via adapter
  if (directUrl) {
    const adapter = new PrismaPg({ connectionString: directUrl });
    return new PrismaClient({ adapter });
  }

  // Fallback: Prisma Accelerate (necessário passar como adapter também no v7)
  if (accelerateUrl) {
    const adapter = new PrismaPg({ connectionString: accelerateUrl });
    return new PrismaClient({ adapter });
  }

  throw new Error('DATABASE_URL ou DIRECT_URL não configurada no .env');
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
