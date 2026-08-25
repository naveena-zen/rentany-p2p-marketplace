import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { hashPassword, comparePassword } from '../utils/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator';
import { AuthenticatedRequest } from '../middleware/auth';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await hashPassword(data.password);
    const rolesArray = data.roles || ['RENTER'];
    const rolesString = rolesArray.join(',');

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        roles: rolesString,
        trustScore: 50.0,
      },
    });

    const payload = { userId: user.id, email: user.email, roles: rolesArray };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: rolesArray,
        trustScore: user.trustScore,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await comparePassword(data.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const rolesArray = user.roles.split(',');
    const payload = { userId: user.id, email: user.email, roles: rolesArray };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: rolesArray,
        trustScore: user.trustScore,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const data = refreshTokenSchema.parse(req.body);
    const payload = verifyRefreshToken(data.refreshToken);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    const rolesArray = user.roles.split(',');
    const newPayload = { userId: user.id, email: user.email, roles: rolesArray };
    const newAccessToken = generateAccessToken(newPayload);

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true, roles: true, trustScore: true, createdAt: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      ...user,
      roles: user.roles.split(','),
    });
  } catch (err) {
    next(err);
  }
}
