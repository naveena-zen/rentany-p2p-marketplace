import { prisma } from '../config/db';

/**
 * RentAny Recomputable Trust Score Engine Formula:
 * 
 * Score S range: [0.0, 100.0], default baseline = 50.0.
 * 
 * 1. Base Score = 50.0
 * 
 * 2. Weighted Reviews Component (Max +30 pts, Min -30 pts):
 *    - Each review rating (1-5) is converted to normalized score [-1, +1] -> (rating - 3) / 2.
 *    - Weight = (Reviewer Trust Score / 100) * TimeDecayFactor.
 *    - TimeDecayFactor = 1 / (1 + (Days Since Review / 30)).
 *    - Weighted Average = Sum(NormalizedScore * Weight) / Sum(Weight).
 *    - Component Score = Weighted Average * 30.
 * 
 * 3. Successful Transaction Volume Bonus (Max +20 pts):
 *    - +2.5 pts per completed agreement (capped at 8 completions = +20 pts).
 * 
 * 4. Dispute Penalty (Min -40 pts):
 *    - -15 pts for each dispute resolved against the user (where user was at fault or REFUND_RENTER when user is owner / PAY_OWNER when user is renter).
 *    - -5 pts for each unresolved OPEN/UNDER_REVIEW dispute raised against user.
 * 
 * Final Trust Score = Clamp(Base + ReviewComponent + TransactionBonus - DisputePenalty, 0.0, 100.0).
 */
export interface TrustScoreBreakdown {
  userId: string;
  previousScore: number;
  newScore: number;
  baseScore: number;
  reviewComponent: number;
  transactionBonus: number;
  disputePenalty: number;
  completedAgreementsCount: number;
  totalReviewsReceived: number;
  disputesLostCount: number;
  formulaExplanation: string;
}

export async function recomputeUserTrustScore(userId: string): Promise<TrustScoreBreakdown> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      reviewsReceived: {
        include: {
          fromUser: {
            select: { trustScore: true },
          },
        },
      },
      agreementsAsRenter: {
        where: { status: 'COMPLETED' },
      },
      agreementsAsOwner: {
        where: { status: 'COMPLETED' },
      },
      disputesRaised: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const baseScore = 50.0;
  const now = Date.now();

  // 1. Calculate Weighted Review Component
  let totalWeight = 0;
  let weightedNormalizedSum = 0;

  for (const r of user.reviewsReceived) {
    const normalizedRating = (r.rating - 3) / 2; // Maps 1->-1, 3->0, 5->+1
    const daysOld = (now - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const timeDecayFactor = 1 / (1 + daysOld / 30);
    const reviewerTrustFactor = (r.fromUser?.trustScore || 50.0) / 100.0;

    const weight = timeDecayFactor * reviewerTrustFactor;
    totalWeight += weight;
    weightedNormalizedSum += normalizedRating * weight;
  }

  const reviewComponent = totalWeight > 0 ? (weightedNormalizedSum / totalWeight) * 30 : 0;

  // 2. Calculate Transaction Volume Bonus
  const completedCount = user.agreementsAsRenter.length + user.agreementsAsOwner.length;
  const transactionBonus = Math.min(20.0, completedCount * 2.5);

  // 3. Calculate Dispute Penalties
  // Find disputes where user was involved and lost or has open disputes against them
  const disputesInvolvingUser = await prisma.dispute.findMany({
    where: {
      agreement: {
        OR: [{ renterId: userId }, { ownerId: userId }],
      },
    },
    include: {
      agreement: true,
    },
  });

  let disputesLostCount = 0;
  let openDisputesAgainstUserCount = 0;

  for (const d of disputesInvolvingUser) {
    const isOwner = d.agreement.ownerId === userId;
    const isRenter = d.agreement.renterId === userId;

    if (d.status === 'RESOLVED' && d.resolution) {
      if (isOwner && d.resolution === 'REFUND_RENTER') {
        disputesLostCount++;
      } else if (isRenter && d.resolution === 'PAY_OWNER') {
        disputesLostCount++;
      }
    } else if (d.status !== 'RESOLVED') {
      if (d.raisedById !== userId) {
        openDisputesAgainstUserCount++;
      }
    }
  }

  const disputePenalty = disputesLostCount * 15.0 + openDisputesAgainstUserCount * 5.0;

  // Final Trust Score
  const rawScore = baseScore + reviewComponent + transactionBonus - disputePenalty;
  const newScore = Math.min(100.0, Math.max(0.0, Math.round(rawScore * 10) / 10));

  // Update in database
  await prisma.user.update({
    where: { id: userId },
    data: { trustScore: newScore },
  });

  return {
    userId,
    previousScore: user.trustScore,
    newScore,
    baseScore,
    reviewComponent: Math.round(reviewComponent * 10) / 10,
    transactionBonus,
    disputePenalty,
    completedAgreementsCount: completedCount,
    totalReviewsReceived: user.reviewsReceived.length,
    disputesLostCount,
    formulaExplanation: `TrustScore = Clamp(Base(50) + ReviewComp(${reviewComponent.toFixed(1)}) + TransBonus(${transactionBonus.toFixed(1)}) - DisputePenalty(${disputePenalty.toFixed(1)}), 0, 100)`,
  };
}
