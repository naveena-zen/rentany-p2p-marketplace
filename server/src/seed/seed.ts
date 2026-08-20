import { prisma } from '../config/db';
import { hashPassword } from '../utils/hash';
import { compileContractClauses } from '../services/contractEngine';

async function seed() {
  console.log('[Seed] Starting database seed...');

  // Clean existing data
  await prisma.review.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.agreement.deleteMany();
  await prisma.contractTemplate.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();

  const commonPasswordHash = await hashPassword('password123');

  // 1. Create Users
  const aliceOwner = await prisma.user.create({
    data: {
      email: 'alice@rentany.com',
      passwordHash: commonPasswordHash,
      name: 'Alice Owner (Lessor)',
      roles: 'OWNER,RENTER',
      trustScore: 88.5,
    },
  });

  const bobRenter = await prisma.user.create({
    data: {
      email: 'bob@rentany.com',
      passwordHash: commonPasswordHash,
      name: 'Bob Renter (Lessee)',
      roles: 'RENTER',
      trustScore: 75.0,
    },
  });

  const charlieAdmin = await prisma.user.create({
    data: {
      email: 'charlie@rentany.com',
      passwordHash: commonPasswordHash,
      name: 'Charlie Admin (Arbitrator)',
      roles: 'ADMIN_ARBITRATOR,OWNER,RENTER',
      trustScore: 98.0,
    },
  });

  const daveUser = await prisma.user.create({
    data: {
      email: 'dave@rentany.com',
      passwordHash: commonPasswordHash,
      name: 'Dave User (Member)',
      roles: 'RENTER,OWNER',
      trustScore: 62.0,
    },
  });

  console.log('[Seed] Users created:', { alice: aliceOwner.id, bob: bobRenter.id, charlie: charlieAdmin.id });

  // 2. Create Contract Templates
  const propertyTemplate = await prisma.contractTemplate.create({
    data: {
      ownerId: aliceOwner.id,
      name: 'Premium Real Estate Rental Terms',
      clauses: [
        {
          type: 'DEPOSIT',
          title: 'Security Deposit Requirement',
          params: { amountPercent: 20, refundable: true },
          description: '20% refundable deposit held in escrow against property damages.',
        },
        {
          type: 'CANCELLATION_WINDOW',
          title: '48-Hour Cancellation Grace Period',
          params: { windowHours: 48, penaltyPercent: 15 },
          description: 'Free cancellation up to 48 hours before check-in date.',
        },
        {
          type: 'DAMAGE_LIABILITY',
          title: 'Occupant Property Damage Policy',
          params: { maxDeductible: 1000 },
          description: 'Lessee liable for up to $1,000 in repair/cleaning costs.',
        },
        {
          type: 'REQUIRES_ARBITRATION',
          title: 'Mandatory RentAny Arbitrated Settlement',
          params: { arbitratorRole: 'ADMIN_ARBITRATOR' },
          description: 'All property condition disputes subject to RentAny platform binding arbitration.',
        },
      ] as any,
    },
  });

  const vehicleTemplate = await prisma.contractTemplate.create({
    data: {
      ownerId: aliceOwner.id,
      name: 'High-Value Equipment & Vehicle Agreement',
      clauses: [
        {
          type: 'DEPOSIT',
          title: 'Equipment Security Deposit',
          params: { amountPercent: 10, refundable: true },
          description: '10% security deposit locked during rental duration.',
        },
        {
          type: 'LATE_FEE',
          title: 'Overdue Return Daily Surcharge',
          params: { dailyFee: 75 },
          description: '$75/day surcharge for unapproved late returns.',
        },
        {
          type: 'REQUIRES_ARBITRATION',
          title: 'Binding Arbitration Clause',
          params: { arbitratorRole: 'ADMIN_ARBITRATOR' },
        },
      ] as any,
    },
  });

  // 3. Create Items across all 5 Categories
  const itemProperty = await prisma.item.create({
    data: {
      ownerId: aliceOwner.id,
      category: 'PROPERTY',
      title: 'Luxury Beachfront Villa in Malibu',
      description: 'Stunning 4-bedroom oceanfront estate with private infinity pool, panoramic Pacific views, and private beach access.',
      pricingUnit: 'DAY',
      basePrice: 850.0,
      location: 'Malibu, CA',
      attributes: {
        beds: 4,
        baths: 4.5,
        propertyType: 'Villa',
        squareFeet: 4200,
      },
    },
  });

  const itemVehicle = await prisma.item.create({
    data: {
      ownerId: aliceOwner.id,
      category: 'VEHICLE',
      title: 'Tesla Model 3 Long Range (2024)',
      description: 'Fully optioned electric sedan with Full Self-Driving capabilities, premium sound system, and 340mi range.',
      pricingUnit: 'DAY',
      basePrice: 120.0,
      location: 'Los Angeles, CA',
      attributes: {
        mileage: 12500,
        fuelType: 'ELECTRIC',
        transmission: 'AUTOMATIC',
        seats: 5,
      },
    },
  });

  const itemEquipment = await prisma.item.create({
    data: {
      ownerId: charlieAdmin.id,
      category: 'EQUIPMENT',
      title: 'RED V-Raptor 8K Cinema Camera Package',
      description: 'Professional cinema camera rig including 3x RF lenses, V-mount batteries, 2TB RED PRO CFexpress media, and rugged flight case.',
      pricingUnit: 'DAY',
      basePrice: 450.0,
      location: 'Santa Monica, CA',
      attributes: {
        powerSource: 'V-Mount Battery / AC',
        condition: 'LIKE_NEW',
        includesAccessories: true,
      },
    },
  });

  const itemApparel = await prisma.item.create({
    data: {
      ownerId: daveUser.id,
      category: 'APPAREL',
      title: 'Tom Ford Tailored Black-Tie Tuxedo',
      description: 'Immaculate Italian wool dinner jacket and trousers with silk satin lapels. Dry-cleaned and ready for galas and weddings.',
      pricingUnit: 'DAY',
      basePrice: 175.0,
      location: 'Beverly Hills, CA',
      attributes: {
        size: 'L',
        gender: 'MEN',
        color: 'Midnight Black',
        material: '100% Super 150s Italian Wool',
      },
    },
  });

  const itemService = await prisma.item.create({
    data: {
      ownerId: charlieAdmin.id,
      category: 'SERVICE',
      title: 'Licensed Commercial Drone Aerial Videography',
      description: 'FAA Part 107 certified drone operator producing 4K/60fps HDR cinematic footage for real estate and commercial projects.',
      pricingUnit: 'HOUR',
      basePrice: 200.0,
      location: 'Los Angeles, CA',
      attributes: {
        providerExperienceYears: 6,
        includesMaterials: true,
        serviceRadiusMiles: 50,
      },
    },
  });

  console.log('[Seed] Items created across 5 categories');

  // 4. Create Pre-built Agreements & Bookings

  // Agreement 1: COMPLETED with Review
  const start1 = new Date();
  start1.setDate(start1.getDate() - 10);
  const end1 = new Date();
  end1.setDate(end1.getDate() - 7);

  const compiledSnapshot1 = compileContractClauses(vehicleTemplate.clauses as any, vehicleTemplate.name, vehicleTemplate.id);

  const completedAgreement = await prisma.agreement.create({
    data: {
      itemId: itemVehicle.id,
      renterId: bobRenter.id,
      ownerId: aliceOwner.id,
      startDate: start1,
      endDate: end1,
      compiledClauses: compiledSnapshot1 as any,
      status: 'COMPLETED',
      escrowState: 'RELEASED',
      escrowRef: 'DB_ESCROW_COMPLETED_001',
      totalAmount: 360.0,
      auditLog: [
        { actorId: bobRenter.id, actorRole: 'RENTER', action: 'CREATE_BOOKING_REQUEST', timestamp: start1.toISOString() },
        { actorId: aliceOwner.id, actorRole: 'OWNER', action: 'ACCEPT_AGREEMENT_AND_LOCK_ESCROW', timestamp: start1.toISOString() },
        { actorId: bobRenter.id, actorRole: 'RENTER', action: 'CONFIRM_COMPLETION_RELEASE_ESCROW', timestamp: end1.toISOString() },
      ] as any,
    },
  });

  await prisma.booking.create({
    data: {
      itemId: itemVehicle.id,
      agreementId: completedAgreement.id,
      startDate: start1,
      endDate: end1,
      status: 'CONFIRMED',
    },
  });

  await prisma.review.create({
    data: {
      agreementId: completedAgreement.id,
      fromUserId: bobRenter.id,
      toUserId: aliceOwner.id,
      rating: 5,
      comment: 'Awesome Tesla Model 3! Clean, fully charged, and smooth pickup process.',
    },
  });

  // Agreement 2: DISPUTED ready for Arbitrator Dashboard demo!
  const start2 = new Date();
  start2.setDate(start2.getDate() - 3);
  const end2 = new Date();
  end2.setDate(end2.getDate() + 2);

  const compiledSnapshot2 = compileContractClauses(propertyTemplate.clauses as any, propertyTemplate.name, propertyTemplate.id);

  const disputedAgreement = await prisma.agreement.create({
    data: {
      itemId: itemProperty.id,
      renterId: bobRenter.id,
      ownerId: aliceOwner.id,
      startDate: start2,
      endDate: end2,
      compiledClauses: compiledSnapshot2 as any,
      status: 'DISPUTED',
      escrowState: 'PENDING',
      escrowRef: 'DB_ESCROW_DISPUTED_002',
      totalAmount: 4250.0,
      auditLog: [
        { actorId: bobRenter.id, actorRole: 'RENTER', action: 'CREATE_BOOKING_REQUEST', timestamp: start2.toISOString() },
        { actorId: aliceOwner.id, actorRole: 'OWNER', action: 'ACCEPT_AGREEMENT_AND_LOCK_ESCROW', timestamp: start2.toISOString() },
        { actorId: bobRenter.id, actorRole: 'RENTER', action: 'RAISE_DISPUTE', timestamp: new Date().toISOString() },
      ] as any,
    },
  });

  await prisma.booking.create({
    data: {
      itemId: itemProperty.id,
      agreementId: disputedAgreement.id,
      startDate: start2,
      endDate: end2,
      status: 'CONFIRMED',
    },
  });

  await prisma.dispute.create({
    data: {
      agreementId: disputedAgreement.id,
      raisedById: bobRenter.id,
      reason: 'Pool heating was completely non-functional during stay, and HVAC system emitted persistent loud noise.',
      evidence: [
        'https://example.com/evidence/pool-temp-sensor-photo.jpg',
        'Video recorded showing HVAC compressor noise level exceeding 85dB at midnight.',
      ] as any,
      status: 'OPEN',
    },
  });

  // Agreement 3: ACTIVE agreement
  const start3 = new Date();
  start3.setDate(start3.getDate() + 1);
  const end3 = new Date();
  end3.setDate(end3.getDate() + 4);

  const activeAgreement = await prisma.agreement.create({
    data: {
      itemId: itemEquipment.id,
      renterId: daveUser.id,
      ownerId: charlieAdmin.id,
      startDate: start3,
      endDate: end3,
      compiledClauses: compileContractClauses() as any,
      status: 'ACTIVE',
      escrowState: 'PENDING',
      escrowRef: 'DB_ESCROW_ACTIVE_003',
      totalAmount: 1350.0,
      auditLog: [
        { actorId: daveUser.id, actorRole: 'RENTER', action: 'CREATE_BOOKING_REQUEST', timestamp: new Date().toISOString() },
        { actorId: charlieAdmin.id, actorRole: 'OWNER', action: 'ACCEPT_AGREEMENT_AND_LOCK_ESCROW', timestamp: new Date().toISOString() },
      ] as any,
    },
  });

  await prisma.booking.create({
    data: {
      itemId: itemEquipment.id,
      agreementId: activeAgreement.id,
      startDate: start3,
      endDate: end3,
      status: 'CONFIRMED',
    },
  });

  console.log('[Seed] Pre-built Agreements, Reviews, and Disputes created successfully');
  console.log('[Seed] Seeding completed successfully!');
}

seed()
  .catch((err) => {
    console.error('[Seed Error]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
