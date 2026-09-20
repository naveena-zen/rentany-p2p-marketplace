import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/db';

const PORT = parseInt(env.PORT, 10) || 5000;

async function main() {
  try {
    await prisma.$connect();
    console.log('[Database] Connected to PostgreSQL via Prisma');

    app.listen(PORT, () => {
      console.log(`[RentAny Server] Running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Fatal] Server failed to start:', error);
    process.exit(1);
  }
}

main();
