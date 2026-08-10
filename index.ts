export type Category = 'PROPERTY' | 'VEHICLE' | 'EQUIPMENT' | 'APPAREL' | 'SERVICE';
export type PricingUnit = 'HOUR' | 'DAY' | 'WEEK' | 'USE';
export type AgreementStatus = 'DRAFT' | 'PENDING_ACCEPTANCE' | 'ACTIVE' | 'DISPUTED' | 'COMPLETED' | 'VOIDED';
export type EscrowState = 'UNFUNDED' | 'PENDING' | 'RELEASED' | 'REFUNDED' | 'SPLIT';
export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED';
export type DisputeResolution = 'REFUND_RENTER' | 'PAY_OWNER' | 'SPLIT';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  trustScore: number;
  createdAt?: string;
}

export interface Item {
  id: string;
  ownerId: string;
  owner?: { id: string; name: string; email?: string; trustScore: number };
  category: Category;
  title: string;
  description: string;
  pricingUnit: PricingUnit;
  basePrice: number;
  attributes: Record<string, any>;
  location: string;
  isActive: boolean;
  createdAt: string;
  bookings?: Array<{ startDate: string; endDate: string }>;
}

export interface Clause {
  type: 'DEPOSIT' | 'LATE_FEE' | 'CANCELLATION_WINDOW' | 'DAMAGE_LIABILITY' | 'REQUIRES_ARBITRATION';
  title: string;
  params: Record<string, any>;
  description?: string;
}

export interface ContractTemplate {
  id: string;
  ownerId: string;
  name: string;
  clauses: Clause[];
  createdAt: string;
}

export interface CompiledContractSnapshot {
  compiledAt: string;
  templateId?: string;
  templateName?: string;
  clauses: Clause[];
  legalNotice: string;
}

export interface AuditLogEntry {
  actorId: string;
  actorRole: string;
  action: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface Agreement {
  id: string;
  itemId: string;
  item: Item;
  renterId: string;
  renter: User;
  ownerId: string;
  owner: User;
  startDate: string;
  endDate: string;
  compiledClauses: CompiledContractSnapshot;
  status: AgreementStatus;
  escrowState: EscrowState;
  escrowRef?: string;
  totalAmount: number;
  auditLog: AuditLogEntry[];
  createdAt: string;
  dispute?: Dispute;
  review?: Review;
}

export interface Dispute {
  id: string;
  agreementId: string;
  agreement?: Agreement;
  raisedById: string;
  raisedBy?: User;
  reason: string;
  evidence: string[];
  status: DisputeStatus;
  resolution?: DisputeResolution;
  resolutionNotes?: string;
  arbitratorId?: string;
  arbitrator?: User;
  createdAt: string;
  resolvedAt?: string;
}

export interface Review {
  id: string;
  agreementId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

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
