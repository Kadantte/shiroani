import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CryptoService } from './crypto.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserModule } from '@/modules/user/user.module';
import { SessionModule } from '@/modules/session/session.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    UserModule,
    SessionModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, CryptoService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
