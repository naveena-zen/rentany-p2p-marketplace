# RentAny ðŸ›¡ï¸ â€” Peer-to-Peer Rental Marketplace

> **Production-grade full-stack P2P rental platform** with Solidity smart contract escrow, Redis concurrency locks, an explainable trust score engine, composable legal contracts, and binding arbitration resolution.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![Solidity](https://img.shields.io/badge/Solidity-Smart%20Contracts-363636?logo=solidity)](https://soliditylang.org/)

---

## ðŸ—ï¸ Architecture Overview & Hard Design Decisions

### 1. Immutable Contract Snapshots (`compiledClauses`)
- **Problem**: In traditional rental systems, if an owner updates a contract template (e.g., increases late fee rate or changes cancellation window) *after* a renter requests a booking, the active agreement could retroactively mutate or cause legal ambiguity.
- **Solution**: When an agreement is created and accepted, the current template's clauses are compiled into a frozen, immutable JSON snapshot (`Agreement.compiledClauses`). The agreement **NEVER** reads live template data after signing. Subsequent template edits by the owner do not alter existing signed contracts.

### 2. Concurrency-Safe Booking & Double-Booking Prevention
- **Problem**: Naive `findFirst()` date range availability checks suffer from race conditions under high concurrent load (e.g., two users booking the exact same villa for the same dates simultaneously).
- **Solution**: RentAny uses a 2-tier lock strategy:
  1. **Distributed Mutex Lock**: Uses Redis `SETNX` (or in-memory mutex fallback) keyed by `lock:item-booking:<itemId>`.
  2. **Transactional Database Lock**: Uses Prisma transaction (`$transaction`) with strict date-range overlap queries on the `Booking` table.
  - **Result**: 100% concurrency safety â€” 100 simultaneous requests for the same date range â†’ exactly **1 succeeds (HTTP 201)**, 99 rejected with **HTTP 409 Conflict**.

### 3. Non-Averaged Explainable Trust Score Engine
- **Problem**: Live averages (simple 1-5 star means) fail to account for review age, reviewer credibility, transaction volume, or dispute penalties.
- **Solution**: A recomputable mathematical trust engine (0.0 to 100.0, default 50.0):

  ```
  TrustScore = Clamp( 50.0 + ReviewComponent + TransactionBonus - DisputePenalty, 0.0, 100.0 )
  ```

  - **Review Component**: Weighted by reviewer's trust score and exponential time decay `(1 / (1 + days_old / 30))`.
  - **Transaction Bonus**: +2.5 pts per completed transaction (max +20 pts).
  - **Dispute Penalty**: -15 pts per lost dispute / fault ruling.

### 4. Escrow State Machine & Solidity Intermediary
- **State Machine Flow**: `UNFUNDED` â†’ `PENDING` (funds locked on acceptance) â†’ `RELEASED` (released to owner minus 5% platform fee on confirmation) OR `REFUNDED` / `SPLIT` (on binding arbitrator ruling).
- **Blockchain Escrow**: Supported via Ethereum Solidity smart contract (`RentalEscrow.sol` using ethers.js) deployed on local Hardhat network, with graceful database escrow fallback when blockchain node is offline.

---

## ðŸ“ Repository Structure

```
rentany-p2p-marketplace/
â”œâ”€â”€ server/                    # Node.js + Express + TypeScript + Prisma ORM + Redis
â”‚   â”œâ”€â”€ prisma/
â”‚   â”‚   â””â”€â”€ schema.prisma      # PostgreSQL schema (Enums, Json attributes, indexes)
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ config/            # Env & Prisma client singleton
â”‚   â”‚   â”œâ”€â”€ controllers/       # auth, items, templates, agreements, disputes, users
â”‚   â”‚   â”œâ”€â”€ middleware/        # JWT auth & role guards (RENTER, OWNER, ADMIN_ARBITRATOR)
â”‚   â”‚   â”œâ”€â”€ routes/            # Express router definitions
â”‚   â”‚   â”œâ”€â”€ services/          # Contract Engine, Booking Engine, Trust Score Engine, Escrow
â”‚   â”‚   â”œâ”€â”€ utils/             # blockchainEscrow, hash, jwt, redis
â”‚   â”‚   â”œâ”€â”€ validators/        # Zod discriminated union schemas per category
â”‚   â”‚   â”œâ”€â”€ seed/              # Realistic test data seeder (3 roles, 5 categories)
â”‚   â”‚   â””â”€â”€ __tests__/         # Jest + Supertest API integration suite
â”‚   â”œâ”€â”€ package.json
â”‚   â””â”€â”€ tsconfig.json
â”‚
â”œâ”€â”€ client/                    # React 18 + TypeScript + Vite
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ api/               # Axios client with JWT interceptors
â”‚   â”‚   â”œâ”€â”€ components/        # TrustBadge, ItemCard, ContractModal, DisputeModal, ClauseBuilder, Navbar
â”‚   â”‚   â”œâ”€â”€ context/           # AuthContext (JWT + role state)
â”‚   â”‚   â”œâ”€â”€ pages/             # Home, ItemDetail, OwnerDashboard, RenterDashboard, ArbitratorDashboard, Login, Register
â”‚   â”‚   â”œâ”€â”€ types/             # Shared TypeScript interfaces
â”‚   â”‚   â””â”€â”€ index.css          # Glassmorphic dark design system
â”‚   â””â”€â”€ package.json
â”‚
â”œâ”€â”€ contracts/                 # Hardhat + Solidity Smart Contracts
â”‚   â”œâ”€â”€ contracts/
â”‚   â”‚   â””â”€â”€ RentalEscrow.sol   # On-chain escrow with deposit / release / refund / split
â”‚   â”œâ”€â”€ test/
â”‚   â”‚   â””â”€â”€ RentalEscrow.test.ts
â”‚   â””â”€â”€ hardhat.config.ts
â”‚
â”œâ”€â”€ load-test/                 # Autocannon concurrency benchmarks
â”‚   â”œâ”€â”€ load-test.ts           # 100 simultaneous requests against same booking slot
â”‚   â””â”€â”€ results.log            # Proof: 1 Ã— HTTP 201, 99 Ã— HTTP 409
â”‚
â”œâ”€â”€ package.json               # Monorepo root with unified scripts
â””â”€â”€ README.md
```

---

## âš¡ Quickstart

### 1. Install All Dependencies
```bash
npm run install:all
```

### 2. Configure Database & Seed Data
Ensure PostgreSQL is running (`postgresql://postgres:postgres@localhost:5432/rentany`), then:
```bash
npm run prisma:setup   # Push schema + generate Prisma client
npm run seed           # Seed realistic demo data
```

### 3. Start Development Servers
```bash
# Backend Express API  â†’  http://localhost:5000
npm run dev:server

# Frontend Vite App    â†’  http://localhost:3000
npm run dev:client
```

### 4. Smart Contracts & Tests
```bash
npm run contracts:compile     # Compile Solidity
npm run contracts:test        # Run Hardhat Chai tests
npm run test                  # Jest + Supertest API integration tests
npm run test:load             # 100-concurrent load benchmark
```

---

## ðŸ” Pre-Seeded Demo Accounts

| Role | Email | Password | Capabilities |
|------|-------|----------|--------------|
| **Owner (Lessor)** | `alice@rentany.com` | `password123` | List items, build contract templates, accept bookings |
| **Renter (Lessee)** | `bob@rentany.com` | `password123` | Browse, book, confirm completion, raise disputes |
| **Arbitrator Admin** | `charlie@rentany.com` | `password123` | Binding dispute resolution, escrow settlement rulings |

---

## ðŸ“š API Reference

### Authentication â€” `/api/auth`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register with role (`RENTER`, `OWNER`, `ADMIN_ARBITRATOR`) |
| `POST` | `/api/auth/login` | Authenticate â†’ JWT access + refresh token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |

### Items (5 Categories) â€” `/api/items`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/items` | Filter by category, price range, location, text |
| `POST` | `/api/items` | Create item with Zod-validated category attributes |
| `GET` | `/api/items/:id` | Single item + booking availability calendar |

### Contract Templates â€” `/api/templates`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/templates` | Build template with composable clauses (`DEPOSIT`, `LATE_FEE`, `CANCELLATION_WINDOW`, `DAMAGE_LIABILITY`, `REQUIRES_ARBITRATION`) |

### Agreements & Escrow â€” `/api/agreements`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/agreements` | Concurrency-locked booking request |
| `GET` | `/api/agreements/:id/contract` | View compiled immutable contract text |
| `POST` | `/api/agreements/:id/accept` | Lock escrow (`UNFUNDED â†’ PENDING`) |
| `POST` | `/api/agreements/:id/confirm` | Release escrow (`PENDING â†’ RELEASED`) |

### Dispute Resolution â€” `/api/disputes`
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/disputes` | Raise dispute with evidence |
| `GET` | `/api/disputes` | Queue of open disputes (arbitrators only) |
| `POST` | `/api/disputes/:id/resolve` | Issue ruling: `REFUND_RENTER` / `PAY_OWNER` / `SPLIT` |

---

## ðŸ› ï¸ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, React Router v6, Axios, Lucide Icons |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| Cache / Locks | Redis (`SETNX` distributed mutex) |
| Smart Contracts | Solidity 0.8.x, Hardhat, ethers.js, Chai |
| Auth | JWT (access + refresh tokens), bcrypt |
| Validation | Zod (discriminated union schemas per category) |
| Testing | Jest, Supertest, Hardhat test runner, Autocannon |

---

## ðŸ’¼ Interview Q&A

### Q: How did you handle double-booking prevention?
> I implemented a **two-tier concurrency safety** mechanism. First, a distributed Redis `SETNX` lock keyed by item ID serializes booking attempts at the application layer. Second, within a Prisma `$transaction`, I perform a strict date-range overlap query on confirmed bookings before creating the reservation. I proved its resilience with a load test: 100 simultaneous concurrent requests for the exact same slot â†’ exactly **1 HTTP 201**, 99 Ã— **HTTP 409 Conflict**, zero double-bookings.

### Q: Why compile contract snapshots instead of referencing live templates?
> Referencing live templates creates legal vulnerability â€” if an owner alters clause parameters after a booking is requested, active rentals would retroactively inherit modified terms. The contract engine **compiles and freezes** a JSON snapshot (`compiledClauses`) onto the Agreement at the moment of acceptance. Even if the owner modifies or deletes the template, the signed agreement's clauses remain completely immutable.

### Q: How does the trust score engine differ from a simple review average?
> Simple averages are vulnerable to manipulation and ignore recency. RentAny implements a **recomputable, explainable** trust algorithm (0â€“100). It incorporates an exponential time decay factor, weights each review by the reviewer's own trust score, rewards transaction volume (+2.5 pts/completion), and penalizes adverse dispute outcomes (-15 pts per lost dispute).
