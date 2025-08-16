import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// import { CacheModule } from '@nestjs/cache-manager';
// // import type { CacheStore } from '@nestjs/cache-manager';
// import { redisStore } from 'cache-manager-redis-yet';

import { ThrottlerModule, ThrottlerGuard, seconds } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TaskModule } from './tasks/tasks.module';

@Module({
  imports: [
    // Env config
    ConfigModule.forRoot({ isGlobal: true }),

    // TypeORM
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        type: 'postgres',
        host: cs.get<string>('DATABASE_HOST'),
        port: Number(cs.get<string>('DATABASE_PORT')),
        username: cs.get<string>('DATABASE_USERNAME'),
        password: cs.get<string>('DATABASE_PASSWORD'),
        database: cs.get<string>('DATABASE_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: cs.get<string>('NODE_ENV') !== 'production',
      }),
    }),

    // Throttler v6: `throttlers` array; ttl in ms via `seconds()`
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        throttlers: [
          {
            ttl: seconds(Number(cs.get('RATE_LIMIT_TTL') ?? 60)), // 60s -> ms
            limit: Number(cs.get('RATE_LIMIT_LIMIT') ?? 60),
          },
        ],
      }),
    }),

    // Cache (Redis) with proper typing
    // CacheModule.registerAsync({
    //   isGlobal: true,
    //   inject: [ConfigService],
    //   useFactory: async (cs: ConfigService) => {
    //     const url = cs.get<string>('REDIS_URL');
    //     if (!url) throw new Error('REDIS_URL is not set');

    //     const store = await redisStore({ url });
    //     return {
    //       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    //       store: store as unknown as CacheStore,
    //       ttl: 300, // seconds
    //     };
    //   },
    // }),

    // Feature modules go here:
    UsersModule,
    AuthModule,
    TaskModule,
    ProjectsModule,
  ],
  controllers: [],
  providers: [
    // Optional: make rate limiting global
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  // exports: [] // only if you need to re-export providers
})
export class AppModule {}
