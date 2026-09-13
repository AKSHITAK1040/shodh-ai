import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('bcryptjs', () => ({ compare: vi.fn().mockResolvedValue(true) }));
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let usersService: any;

  beforeEach(async () => {
    prisma = { user: { findUnique: vi.fn() } };
    jwt = { signAsync: vi.fn().mockResolvedValue('token') };
    usersService = { findByEmail: vi.fn() };
    
    (bcrypt.compare as any).mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: (await import('../users/users.service')).UsersService, useValue: usersService }
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('rejects invalid user', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    await expect(service.login('test', 'pwd')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects invalid password', async () => {
    usersService.findByEmail.mockResolvedValue({ id: '1', email: 'test', password: 'pwd' });
    (bcrypt.compare as any).mockResolvedValue(false);
    await expect(service.login('test', 'wrong')).rejects.toThrow(UnauthorizedException);
  });

  it('login returns access token', async () => {
    usersService.findByEmail.mockResolvedValue({ id: '1', email: 'test', password: 'pwd' });
    (bcrypt.compare as any).mockResolvedValue(true);
    const res = await service.login('test', 'pwd');
    expect(res.access_token).toBe('token');
  });
});
