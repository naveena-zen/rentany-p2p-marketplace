import { prisma } from '../config/db';
import { appendAuditLog } from './auditLogService';
import { createBlockchainEscrow } from '../utils/blockchainEscrow';

export async function acceptAgreementAndLockEscrow(agreementId: string, actorId: string, actorRole: string) {
  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
    include: { item: true, renter: true, owner: true },
  });

  if (!agreement) throw new Error('Agreement not found');

  if (agreement.status !== 'PENDING_ACCEPTANCE' && agreement.status !== 'DRAFT') {
    throw new Error(`Cannot accept agreement in status ${agreement.status}`);
  }

  // Blockchain escrow attempt
  const ethAmount = (agreement.totalAmount / 2000).toFixed(4); // Simulated ETH rate
  const blockchainTxHash = await createBlockchainEscrow(agreement.id, agreement.owner.email, ethAmount);

  const updated = await prisma.agreement.update({
    where: { id: agreementId },
    data: {
      status: 'ACTIVE',
      escrowState: 'PENDING',
      escrowRef: blockchainTxHash || `DB_ESCROW_${Date.now()}_${agreement.id.slice(0, 8)}`,
    },
    include: { item: true, renter: true, owner: true },
  });

  await appendAuditLog(agreementId, actorId, actorRole, 'ACCEPT_AGREEMENT_AND_LOCK_ESCROW', {
    escrowState: 'PENDING',
    escrowRef: updated.escrowRef,
  });

  return updated;
}

export async function confirmCompletionAndReleaseEscrow(agreementId: string, actorId: string, actorRole: string) {
  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
  });

  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status !== 'ACTIVE') {
    throw new Error(`Cannot complete agreement in status ${agreement.status}`);
  }

  const updated = await prisma.agreement.update({
    where: { id: agreementId },
    data: {
      status: 'COMPLETED',
      escrowState: 'RELEASED',
    },
    include: { item: true, renter: true, owner: true },
  });

  await appendAuditLog(agreementId, actorId, actorRole, 'CONFIRM_COMPLETION_RELEASE_ESCROW', {
    escrowState: 'RELEASED',
    platformFee: agreement.totalAmount * 0.05,
    payoutToOwner: agreement.totalAmount * 0.95,
  });

  return updated;
}

export async function raiseDisputeOnAgreement(agreementId: string, raisedById: string, reason: string, evidence: string[]) {
  const agreement = await prisma.agreement.findUnique({
    where: { id: agreementId },
    include: { dispute: true },
  });

  if (!agreement) throw new Error('Agreement not found');
  if (agreement.status !== 'ACTIVE') {
    throw new Error('Disputes can only be raised on ACTIVE agreements');
  }
  if (agreement.dispute) {
    throw new Error('A dispute has already been raised for this agreement');
  }

  // Transaction to update agreement status and create dispute record
  const result = await prisma.$transaction(async (tx) => {
    await tx.agreement.update({
      where: { id: agreementId },
      data: { status: 'DISPUTED' },
    });

    const dispute = await tx.dispute.create({
      data: {
        agreementId,
        raisedById,
        reason,
        evidence: evidence as any,
        status: 'OPEN',
      },
      include: {
        agreement: { include: { item: true, renter: true, owner: true } },
        raisedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return dispute;
  });

  await appendAuditLog(agreementId, raisedById, 'USER', 'RAISE_DISPUTE', {
    disputeId: result.id,
    reason,
  });

  return result;
}

export async function resolveDisputeAndDistributeFunds(
  disputeId: string,
  arbitratorId: string,
  resolution: 'REFUND_RENTER' | 'PAY_OWNER' | 'SPLIT',
  resolutionNotes: string
) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { agreement: true },
  });

  if (!dispute) throw new Error('Dispute not found');
  if (dispute.status === 'RESOLVED') {
    throw new Error('Dispute is already resolved');
  }

  let nextAgreementStatus: 'COMPLETED' | 'VOIDED' = 'COMPLETED';
  let nextEscrowState: 'RELEASED' | 'REFUNDED' | 'SPLIT' = 'RELEASED';

  if (resolution === 'REFUND_RENTER') {
    nextAgreementStatus = 'VOIDED';
    nextEscrowState = 'REFUNDED';
  } else if (resolution === 'PAY_OWNER') {
    nextAgreementStatus = 'COMPLETED';
    nextEscrowState = 'RELEASED';
  } else if (resolution === 'SPLIT') {
    nextAgreementStatus = 'COMPLETED';
    nextEscrowState = 'SPLIT';
  }

  const updatedDispute = await prisma.$transaction(async (tx) => {
    await tx.agreement.update({
      where: { id: dispute.agreementId },
      data: {
        status: nextAgreementStatus,
        escrowState: nextEscrowState,
      },
    });

    return tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        resolution,
        resolutionNotes,
        arbitratorId,
        resolvedAt: new Date(),
      },
      include: {
        agreement: { include: { item: true, renter: true, owner: true } },
        arbitrator: { select: { id: true, name: true, email: true } },
      },
    });
  });

  await appendAuditLog(dispute.agreementId, arbitratorId, 'ADMIN_ARBITRATOR', 'RESOLVE_DISPUTE', {
    disputeId,
    resolution,
    resolutionNotes,
    nextEscrowState,
  });

  return updatedDispute;
}
