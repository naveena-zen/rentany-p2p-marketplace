# RentAny 🛡️ - Peer-to-Peer Rental Marketplace

**RentAny** is a full-stack, production-grade peer-to-peer rental platform where users can list and rent items across 5 categories (**PROPERTY**, **VEHICLE**, **EQUIPMENT**, **APPAREL**, **SERVICE**), negotiate composable legal contracts, transact via escrow-backed intermediaries, and resolve disputes through structured binding arbitration.

---

## 🏗️ Architecture Overview & Hard Design Decisions

### 1. Immutable Contract Snapshots (`compiledClauses`)
- **Problem**: In traditional rental systems, if an owner updates a contract template (e.g., increases late fee rate or changes cancellation window) *after* a renter requests a booking, the active agreement could retroactively mutate or cause legal ambiguity.
- **Solution**: When an agreement is created and accepted, the current template's clauses are compiled into a frozen, immutable JSON snapshot (`Agreement.compiledClauses`). The agreement **NEVER** reads live template data after signing. Subsequent template edits by the owner do not alter existing signed contracts.

### 2. Concurrency-Safe Booking & Double-Booking Prevention
- **Problem**: Naive `findFirst()` date range availability checks suffer from race conditions under high concurrent load (e.g., two users booking the exact same villa for the same dates simultaneously).
- **Solution**: RentAny uses a 2-tier lock strategy:
  1. **Distributed Mutex Lock**: Uses Redis `SETNX` (or in-memory mutex fallback) keyed by `lock:item-booking:<itemId>`.
  2. **Transactional Database Lock**: Uses Prisma transaction (`$transaction`) with strict date-range overlap queries (`startDate < requestedEnd AND endDate > requestedStart AND status = 'CONFIRMED'`) on the `Booking` table.
  - **Result**: Demonstrated 100% concurrency safety (100 simultaneous requests for the same date range → exactly 1 succeeds with 201 Created, 99 rejected with 409 Conflict).

### 3. Non-Averaged Explainable Trust Score Engine
- **Problem**: Live averages (simple 1-5 star means) fail to account for review age, reviewer credibility, transaction volume, or dispute penalties.
- **Solution**: A recomputable mathematical trust engine formula (0.0 to 100.0, default 50.0):
  $$\text{TrustScore} = \text{Clamp}\left( 50.0 + \text{ReviewComponent} + \text{TransactionBonus} - \text{DisputePenalty}, 0.0, 100.0 \right)$$
  - **Review Component**: Weighted by reviewer's trust score and time decay ($1 / (1 + \text{days\_old} / 30)$).
  - **Transaction Bonus**: +2.5 pts per completed transaction (max +20 pts).
  - **Dispute Penalty**: -15 pts per lost dispute / fault ruling.

### 4. Escrow State Machine & Solidity Intermediary
- **State Machine Flow**: `UNFUNDED` $\rightarrow$ `PENDING` (funds locked on acceptance) $\rightarrow$ `RELEASED` (released to owner minus 5% platform fee on both-party confirmation) OR `REFUNDED` / `SPLIT` (on binding arbitrator ruling).
- **Blockchain Escrow**: Supported via Ethereum Solidity smart contract (`RentalEscrow.sol` using ethers.js) deployed on local Hardhat network, with graceful database escrow fallback when blockchain node is offline.

---

## 📁 Repository Structure

```
rental platform/
├── server/               # Node.js + Express + TypeScript + Prisma ORM + Redis
│   ├── prisma/           # PostgreSQL schema (Enums, Json attributes, indexes)
│   ├── src/
│   │   ├── config/       # Env & Prisma client singleton
│   │   ├── controllers/  # API endpoints for auth, items, templates, agreements, disputes
│   │   ├── middleware/   # JWT auth & role guards (RENTER, OWNER, ADMIN_ARBITRATOR)
│   │   ├── services/     # Contract Engine, Booking Engine, Trust Score Engine, Escrow Service
│   │   ├── validators/   # Zod discriminated union attribute schemas per category
│   │   ├── seed/         # Database seed script populating realistic test data
│   │   └── __tests__/    # Jest + Supertest API integration suite
├── client/               # React + TypeScript + Vite
│   ├── src/
│   │   ├── api/          # Axios HTTP client with JWT interceptors
│   │   ├── components/   # TrustBadge, ItemCard, ContractModal, DisputeModal, ClauseBuilder
│   │   ├── pages/        # Home, ItemDetail, OwnerDashboard, RenterDashboard, ArbitratorDashboard
│   │   └── index.css     # Glassmorphic dark design system
├── contracts/            # Hardhat + Solidity Smart Contracts
│   ├── contracts/        # RentalEscrow.sol
│   └── test/             # Hardhat Chai contract test suite
├── load-test/            # Autocannon / Concurrent load testing
│   ├── load-test.ts      # 100 concurrent request benchmark script
│   └── results.log       # Benchmark verification output log
└── README.md
```

---

## ⚡ Quickstart Setup & Commands

### 1. Install All Dependencies
```bash
npm run install:all
```

### 2. Configure Database & Seed Data
Ensure PostgreSQL is running locally (`postgresql://postgres:postgres@localhost:5432/rentany`), then run:
```bash
npm run prisma:setup
npm run seed
```

### 3. Start Development Servers
In separate terminals or concurrently:
```bash
# Terminal 1: Backend Express Server (http://localhost:5000)
npm run dev:server

# Terminal 2: Frontend Vite App (http://localhost:3000)
npm run dev:client
```

### 4. Run Smart Contracts & Tests
```bash
# Compile Solidity Smart Contracts
npm run contracts:compile

# Run Hardhat Contract Tests
npm run contracts:test

# Run API Integration Test Suite (Jest + Supertest)
npm run test

# Run Concurrency Load Benchmark (100 simultaneous requests test)
npm run test:load
```

---

## 🔐 Pre-Seeded Demo User Accounts

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Owner (Lessor)** | `alice@rentany.com` | `password123` | List Items, Build Contract Templates, Accept Bookings |
| **Renter (Lessee)** | `bob@rentany.com` | `password123` | Browse Rentals, Lock Bookings, Confirm Completion, Raise Disputes |
| **Arbitrator Admin** | `charlie@rentany.com` | `password123` | Binding Dispute Resolution Court, Escrow Fund Settlement |

---

## 📚 API Reference Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Register user with role assignments (`RENTER`, `OWNER`, `ADMIN_ARBITRATOR`).
- `POST /api/auth/login`: Authenticate and issue JWT access token + refresh token.
- `GET /api/auth/me`: Fetch authenticated user profile.

### Polymorphic Item CRUD (`/api/items`)
- `GET /api/items`: List & filter items by category, price range, location, and search text.
- `POST /api/items`: Create item with category-specific Zod attribute validation (`PROPERTY`, `VEHICLE`, `EQUIPMENT`, `APPAREL`, `SERVICE`).
- `GET /api/items/:id`: Get single item with availability booking ranges.

### Contract Templates (`/api/templates`)
- `POST /api/templates`: Create template with composable clauses (`DEPOSIT`, `LATE_FEE`, `CANCELLATION_WINDOW`, `DAMAGE_LIABILITY`, `REQUIRES_ARBITRATION`).

### Agreements & Booking (`/api/agreements`)
- `POST /api/agreements`: Concurrency-locked booking request creation.
- `GET /api/agreements/:id/contract`: View human-readable compiled contract snapshot text.
- `POST /api/agreements/:id/accept`: Owner/Renter accepts contract & locks escrow (`PENDING`).
- `POST /api/agreements/:id/confirm`: Confirm completion & release escrow (`RELEASED`).

### Dispute Resolution Court (`/api/disputes`)
- `POST /api/disputes`: Raise dispute on active agreement with evidence attachments.
- `GET /api/disputes`: List open disputes queue for arbitrators.
- `POST /api/disputes/:id/resolve`: Issue binding ruling (`REFUND_RENTER`, `PAY_OWNER`, `SPLIT`).
