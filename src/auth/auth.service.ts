import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/entities/user.entity';

// import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private cs: ConfigService,
  ) {}

  async register(email: string, name: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new BadRequestException('Email already in use');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.usersService.create({ email, name, passwordHash });
    // send verification email (placeholder)
    // await this.emailService.sendVerification(email, token)
    return { id: user.id, email: user.email, name: user.name };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  getTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.cs.get('JWT_ACCESS_SECRET'),
      expiresIn: this.cs.get('JWT_ACCESS_EXPIRES_IN'),
    });
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.cs.get('JWT_REFRESH_SECRET'),
        expiresIn: this.cs.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );
    return { accessToken, refreshToken };
  }

  async login(user: User) {
    const tokens = this.getTokens(user);
    // hash & store refreshToken
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 12);
    await this.usersService.setRefreshTokenHash(user.id, refreshHash);
    return tokens;
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.currentRefreshTokenHash)
      throw new UnauthorizedException('Access denied');
    const rtMatches = await bcrypt.compare(
      refreshToken,
      user.currentRefreshTokenHash,
    );
    if (!rtMatches) throw new UnauthorizedException('Access denied');
    const tokens = this.getTokens(user);
    const newRefreshHash = await bcrypt.hash(tokens.refreshToken, 12);
    await this.usersService.setRefreshTokenHash(user.id, newRefreshHash);
    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.setRefreshTokenHash(userId, null);
    return { ok: true };
  }
}
