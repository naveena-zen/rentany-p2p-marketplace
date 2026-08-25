import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { createBookingRequestSchema, reviewSchema } from '../validators/agreement.validator';
import { createBookingConcurrentlySafe, ConcurrencyConflictError } from '../services/bookingEngine';
import { acceptAgreementAndLockEscrow, confirmCompletionAndReleaseEscrow } from '../services/escrowService';
import { renderHumanReadableContract, CompiledContractSnapshot } from '../services/contractEngine';
import { recomputeUserTrustScore } from '../services/trustScoreEngine';
import { AuthenticatedRequest } from '../middleware/auth';

export async function createBookingRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const data = createBookingRequestSchema.parse(req.body);

    const agreement = await createBookingConcurrentlySafe({
      itemId: data.itemId,
      renterId: req.user.userId,
      templateId: data.templateId,
      startDate: data.startDate,
      endDate: data.endDate,
    });

    return res.status(201).json(agreement);
  } catch (err: any) {
    if (err instanceof ConcurrencyConflictError) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
}

export async function acceptAgreement(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const userRole = req.user.roles.includes('OWNER') ? 'OWNER' : 'RENTER';
    const agreement = await acceptAgreementAndLockEscrow(id, req.user.userId, userRole);

    return res.json(agreement);
  } catch (err: any) {
    next(err);
  }
}

export async function confirmCompletion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    const userRole = req.user.roles.includes('OWNER') ? 'OWNER' : 'RENTER';
    const agreement = await confirmCompletionAndReleaseEscrow(id, req.user.userId, userRole);

    return res.json(agreement);
  } catch (err: any) {
    next(err);
  }
}

export async function getAgreementById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        item: true,
        renter: { select: { id: true, name: true, email: true, trustScore: true } },
        owner: { select: { id: true, name: true, email: true, trustScore: true } },
        dispute: true,
        review: true,
      },
    });

    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    return res.json(agreement);
  } catch (err) {
    next(err);
  }
}

export async function getAgreementContractView(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: {
        item: true,
        renter: { select: { name: true } },
        owner: { select: { name: true } },
      },
    });

    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });

    const snapshot = agreement.compiledClauses as unknown as CompiledContractSnapshot;
    const readableText = renderHumanReadableContract(
      agreement.item.title,
      agreement.owner.name,
      agreement.renter.name,
      agreement.startDate.toISOString(),
      agreement.endDate.toISOString(),
      agreement.totalAmount,
      snapshot
    );

    return res.json({
      agreementId: agreement.id,
      status: agreement.status,
      compiledClauses: snapshot,
      formattedText: readableText,
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserAgreements(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const roleQuery = req.query.role as string;

    let where: any = {};
    if (roleQuery === 'owner') {
      where.ownerId = req.user.userId;
    } else if (roleQuery === 'renter') {
      where.renterId = req.user.userId;
    } else {
      where.OR = [{ renterId: req.user.userId }, { ownerId: req.user.userId }];
    }

    const agreements = await prisma.agreement.findMany({
      where,
      include: {
        item: true,
        renter: { select: { id: true, name: true, email: true, trustScore: true } },
        owner: { select: { id: true, name: true, email: true, trustScore: true } },
        dispute: true,
        review: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(agreements);
  } catch (err) {
    next(err);
  }
}

export async function createReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params; // agreementId
    const data = reviewSchema.parse(req.body);

    const agreement = await prisma.agreement.findUnique({
      where: { id },
      include: { review: true },
    });

    if (!agreement) return res.status(404).json({ error: 'Agreement not found' });
    if (agreement.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Reviews can only be submitted for COMPLETED agreements' });
    }
    if (agreement.review) {
      return res.status(400).json({ error: 'Review already submitted for this agreement' });
    }

    const toUserId = req.user.userId === agreement.renterId ? agreement.ownerId : agreement.renterId;

    const review = await prisma.review.create({
      data: {
        agreementId: id,
        fromUserId: req.user.userId,
        toUserId,
        rating: data.rating,
        comment: data.comment,
      },
    });

    // Automatically recompute trust score for the receiving user
    await recomputeUserTrustScore(toUserId);

    return res.status(201).json(review);
  } catch (err) {
    next(err);
  }
}
