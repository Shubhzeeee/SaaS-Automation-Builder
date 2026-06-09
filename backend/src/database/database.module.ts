import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const DB_POOL = 'DB_POOL';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DB_POOL,
      inject: [ConfigService],
      useFactory: async (cfg: ConfigService) => {
        const pool = new Pool({
          connectionString: cfg.get<string>('DATABASE_URL'),
          max: 20,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
          ssl:
            cfg.get('NODE_ENV') === 'production'
              ? { rejectUnauthorized: false }
              : false,
        });

        // Verify connection on startup
        const client = await pool.connect();
        client.release();

        return pool;
      },
    },
  ],
  exports: [DB_POOL],
})
export class DatabaseModule {}
