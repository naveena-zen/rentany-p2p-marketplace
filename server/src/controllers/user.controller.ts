import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { recomputeUserTrustScore } from '../services/trustScoreEngine';

export async function recomputeTrustScoreHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await recomputeUserTrustScore(id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        trustScore: true,
        createdAt: true,
        items: { where: { isActive: true } },
        reviewsReceived: {
          include: { fromUser: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json(user);
  } catch (err) {
    next(err);
  }
}
