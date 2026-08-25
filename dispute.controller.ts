import { Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { createDisputeSchema, resolveDisputeSchema } from '../validators/dispute.validator';
import { raiseDisputeOnAgreement, resolveDisputeAndDistributeFunds } from '../services/escrowService';
import { recomputeUserTrustScore } from '../services/trustScoreEngine';
import { AuthenticatedRequest } from '../middleware/auth';

export async function createDispute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const data = createDisputeSchema.parse(req.body);

    const dispute = await raiseDisputeOnAgreement(
      data.agreementId,
      req.user.userId,
      data.reason,
      data.evidence
    );

    return res.status(201).json(dispute);
  } catch (err) {
    next(err);
  }
}

export async function getOpenDisputes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const disputes = await prisma.dispute.findMany({
      include: {
        agreement: {
          include: {
            item: true,
            renter: { select: { id: true, name: true, email: true, trustScore: true } },
            owner: { select: { id: true, name: true, email: true, trustScore: true } },
          },
        },
        raisedBy: { select: { id: true, name: true, email: true, trustScore: true } },
        arbitrator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(disputes);
  } catch (err) {
    next(err);
  }
}

export async function updateDisputeStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'UNDER_REVIEW') {
      return res.status(400).json({ error: 'Status can only be set to UNDER_REVIEW via this endpoint' });
    }

    const updated = await prisma.dispute.update({
      where: { id },
      data: {
        status: 'UNDER_REVIEW',
        arbitratorId: req.user.userId,
      },
      include: {
        agreement: { include: { item: true, renter: true, owner: true } },
      },
    });

    return res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function resolveDispute(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const data = resolveDisputeSchema.parse(req.body);

    const dispute = await resolveDisputeAndDistributeFunds(
      id,
      req.user.userId,
      data.resolution,
      data.resolutionNotes
    );

    // Recompute trust scores for both owner and renter following dispute resolution
    if (dispute.agreement) {
      await recomputeUserTrustScore(dispute.agreement.renterId);
      await recomputeUserTrustScore(dispute.agreement.ownerId);
    }

    return res.json(dispute);
  } catch (err) {
    next(err);
  }
}
