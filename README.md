# 🚀 DigitalSMM — Premier Automated Social Media Marketing Platform

A full-stack, enterprise-grade Social Media Marketing (SMM) platform built with **React**, **TypeScript**, **Node.js/Express**, and **Docker**, directly integrated with the **SMMFollows** provider infrastructure (`https://smmfollows.com/api/v2`).

All sensitive credentials and transaction ledgers are secured using **AES-256-GCM authenticated encryption** and **BCrypt (12 rounds)** password hashing.

---

## 🌟 Key Features

- **Direct SMMFollows Provider Integration**:
  - Automatically synchronized with **7,568+ active services** across YouTube, Telegram, TikTok, Instagram, Twitter/X, Spotify, Facebook, Twitch, LinkedIn, and Discord.
  - Automated order placement (`action: "add"`), live status syncing (`action: "status"`), and real-time provider account balance checks.
  - Automatic refund protection: if the provider rejects an order, funds are instantly refunded to the customer's wallet.

- **Enterprise Security & Encryption**:
  - **AES-256-GCM Authenticated Encryption**: Provider API keys and sensitive settings are encrypted at rest with an initialization vector (IV) and authentication tag.
  - **BCrypt Password Hashing**: Passwords stored with 12 salt rounds.
  - **Zero Provider Leakage**: Provider API keys are never sent to the browser or bundled in frontend assets. All calls are securely brokered through backend controllers.
  - **Security Headers & Protection**: Configured with Helmet HTTP security headers, CORS origin whitelisting, and strict rate limiters against brute-force attacks and double-spending.

- **Futuristic Fintech & SMM User Interface**:
  - Dark cyber-indigo & neon cyan aesthetic with glassmorphic cards and micro-animations.
  - Platform filter pills with real-time category filtering and instant search across 7,500+ services.
  - Interactive Order Modal with dynamic real-time price calculation, quantity chips, and wallet balance validation.
  - Wallet top-up modal with simulated instant credit (USDT Crypto TRC-20, Credit Card, PayPal).
  - Order history tracking with live provider status polling.

- **Admin Control Center**:
  - Live SMMFollows provider balance and health diagnostic monitor.
  - Global Resale Profit Margin Manager (batch update markup percentage across all 7,500+ services with 1 click).
  - User wallet management (manual credit/debit adjustments with audit logs).
  - Security audit logs recording all logins, orders, and key rotations.

- **DigitalSMM Reseller SMM API v2**:
  - DigitalSMM provides its own standard SMM API v2 endpoint at `/api/v2`.
  - Clients and bots can connect using personal API keys (`ds_usr_...`) to check balance, fetch services, place orders, and check status.

- **Docker & Docker Compose**:
  - Production-ready `Dockerfile` for backend and multi-stage Nginx `Dockerfile` for frontend.
  - Single-command orchestration via `docker compose up --build`.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Lucide Icons, Vanilla CSS Design System |
| **Backend** | Node.js (v20+ / v22 / v24), Express, TypeScript, Zod, JWT, BCrypt |
| **Security** | AES-256-GCM authenticated cipher, Helmet, Express-Rate-Limit, CORS |
| **Provider** | SMMFollows API v2 (`https://smmfollows.com/api/v2`) |
| **Database** | ACID transactional persistent JSON engine with atomic write-renames |
| **Container** | Docker, Docker Compose, Multi-stage Nginx Alpine |

---

## ⚡ Quickstart Guide

### Option 1: Native Local Development (Node.js)

1. **Install Dependencies**:
   ```bash
   # From root directory:
   npm install
   npm install --prefix backend
   npm install --prefix frontend
   ```

2. **Start Dev Servers**:
   ```bash
   npm run dev
   ```
   - **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:5000](http://localhost:5000)
   - **Reseller API v2**: [http://localhost:5000/api/v2](http://localhost:5000/api/v2)

---

### Option 2: Docker Compose

Make sure Docker Desktop or the Docker daemon is running on your machine:

```bash
docker compose up --build
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

To stop the containers:
```bash
docker compose down
```

---

## 🔑 Pre-Configured Accounts

| Role | Email / Login | Password | Initial Balance |
|---|---|---|---|
| **Administrator** | `admin@digitalsmm.com` | `Admin@DigitalSMM2026!` | $1,000.00 |
| **Demo User** | `user@digitalsmm.com` | `User@DigitalSMM2026!` | $100.00 |

> **Tip**: You can use the quick 1-click test login buttons in the Sign In modal to test both roles instantly.

---

## 🌐 Reseller SMM API v2 Reference

Clients can send automated HTTP POST requests to `http://localhost:5000/api/v2`:

### 1. Check Balance
```bash
curl -X POST http://localhost:5000/api/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "key": "YOUR_API_KEY",
    "action": "balance"
  }'
```

### 2. Services List
```bash
curl -X POST http://localhost:5000/api/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "key": "YOUR_API_KEY",
    "action": "services"
  }'
```

### 3. Place Order
```bash
curl -X POST http://localhost:5000/api/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "key": "YOUR_API_KEY",
    "action": "add",
    "service": 19573,
    "link": "https://t.me/channel",
    "quantity": 1000
  }'
```

### 4. Order Status
```bash
curl -X POST http://localhost:5000/api/v2 \
  -H "Content-Type: application/json" \
  -d '{
    "key": "YOUR_API_KEY",
    "action": "status",
    "order": "ORDER_ID"
  }'
```

---

## 🔒 Security Architecture

1. **Provider Key Encryption**:
   Stored in `backend/data/digitalsmm.json` as `iv:tag:cipherText`. Decrypted only in memory when dispatching authorized requests to SMMFollows.
2. **Double-Spend & Race Condition Prevention**:
   Wallet deductions and transaction logging occur atomically with strict balance checks before dispatching external orders.
3. **Automated Refund Mechanism**:
   If SMMFollows returns an error or has insufficient provider balance, the user's funds are immediately refunded and logged in the audit ledger.
