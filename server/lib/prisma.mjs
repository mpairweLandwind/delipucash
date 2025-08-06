import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Ensure the client is connected
prisma.$connect()
  .then(() => {
    console.log('Prisma client connected successfully');
  })
  .catch((error) => {
    console.error('Failed to connect to database:', error);
  });

export default prisma;
