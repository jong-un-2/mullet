# Mars Backend - Database Setup Guide

## 📊 Database Architecture

Mars Backend uses a **dual-database architecture**:

1. **D1 (SQLite)** - Primary database for DEX data
   - Pools, tokens, swaps, liquidity events
   - User API keys and usage tracking
   - Fast, edge-distributed

2. **Neon PostgreSQL + Hyperdrive** - Secondary database for Mars Liquid
   - User accounts and transactions
   - Vault states and farm positions
   - Mars protocol TVL, APY, earnings data
   - Wallet connections (Privy)
   - Globally accelerated via Cloudflare Hyperdrive

---

## 🚀 Quick Start

### 1. Neon PostgreSQL Setup

**Connection Info:**
- Host: `ep-solitary-heart-a19z1rs7.ap-southeast-1.aws.neon.tech`
- Database: `neondb`
- User: `neondb_owner`
- Region: Singapore (ap-southeast-1)

**Hyperdrive Config:**
- Name: `mars-neon-db`
- ID: `598eb138eef849c9a5682f494f20e753`
- Binding: `HYPERDRIVE`

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Generate and Push Schema

```bash
# Generate migration files
npm run postgres:generate

# Push schema to Neon (recommended for development)
npm run postgres:push

# Or run migrations manually
npm run migrate:postgres
```

### 4. Initialize Data (Optional)

```bash
npm run db:init:postgres
```

### 5. Health Check

```bash
npm run db:health:postgres
```

---

## 📋 PostgreSQL Schema (14 Tables)

### Core Tables (7)

1. **users** (9 columns)
   - User accounts with wallet address
   - Email, subscription tier
   - Last login tracking

2. **api_keys** (12 columns)
   - API key management
   - Permissions, rate limits
   - Expiration dates

3. **transactions** (18 columns)
   - Transaction history (deposit, withdraw, stake, unstake)
   - Token info, amounts, fees
   - Block time and confirmations

4. **vault_states** (13 columns)
   - Vault state cache
   - Total assets, shares, TVL, APY
   - Last updated timestamp

5. **farm_positions** (13 columns)
   - User farm staking positions
   - Staked shares, pending rewards
   - Active/inactive status

6. **api_usage_logs** (14 columns)
   - API usage tracking
   - Performance metrics
   - Error logging

7. **price_history** (11 columns)
   - Token price history
   - 24h volume, market cap
   - Price changes (1h, 24h, 7d)

### Mars Liquid Tables (7)

8. **mars_tvl_data** (7 columns)
   - Protocol TVL by asset
   - Historical TVL tracking

9. **mars_apy_data** (8 columns)
   - Raw APY from protocols
   - Platform fees, net APY

10. **mars_user_balances** (15 columns)
    - User balances across protocols
    - Total deposited/withdrawn
    - Yield earned, current APY

11. **mars_user_daily_earnings** (14 columns)
    - Daily earnings per user/protocol
    - Cumulative earnings
    - Daily APY snapshots

12. **mars_protocol_performance** (8 columns)
    - Historical performance data
    - APY and TVL time series

13. **mars_user_monthly_summary** (17 columns)
    - Monthly earnings summary
    - Starting/ending balance
    - Total deposits/withdrawals

14. **wallet_connections** (17 columns)
    - Wallet connection logs
    - Privy integration data
    - Session tracking

---

## 🛠️ NPM Scripts

```bash
# PostgreSQL
npm run postgres:generate    # Generate migration files
npm run postgres:push       # Push schema to database
npm run migrate:postgres    # Run migrations
npm run db:init:postgres    # Initialize with sample data
npm run db:health:postgres  # Health check
npm run studio:postgres     # Open Drizzle Studio

# D1 (SQLite)
npm run migrate:local       # Run D1 migrations locally
npm run migrate:remote      # Run D1 migrations on production
npm run db:init             # Initialize D1 database
```

---

## 🔧 Configuration Files

- `drizzle.postgres.config.ts` - PostgreSQL Drizzle config
- `drizzle.config.ts` - D1 Drizzle config
- `wrangler.toml` - Cloudflare Worker configuration
- `.env` - Local environment variables

---

## 🌐 Testing Hyperdrive Connection

After deployment, test the connection:

```bash
curl https://api.marsliquidity.com/v1/api/postgres/test-db
```

Expected response:
```json
{
  "success": true,
  "message": "Hyperdrive + Neon PostgreSQL connection successful!",
  "database": {
    "version": "PostgreSQL 17.5...",
    "totalTables": 14,
    "totalEnums": 3
  }
}
```

---

## 📚 Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [Cloudflare Hyperdrive](https://developers.cloudflare.com/hyperdrive/)
- [Drizzle ORM](https://orm.drizzle.team/)

---

## ⚠️ Important Notes

1. **Hyperdrive Statistics Delay**: Cloudflare dashboard metrics update every 5-15 minutes
2. **Connection Pooling**: Hyperdrive automatically manages connection pools (60 connections)
3. **Global Acceleration**: Hyperdrive provides global edge caching for queries
4. **SSL Required**: Always use `sslmode=require` for Neon connections
5. **Direct vs Pooled**: Use Direct connection (no `-pooler`) for Hyperdrive

---

## 🚨 Troubleshooting

### Local Connection Timeout
If you can't connect locally (network/proxy issues):
```bash
# Use push instead of migrate
npm run postgres:push

# Or deploy and test via Worker
npm run deploy
curl https://your-worker.workers.dev/v1/api/postgres/test-db
```

### Hyperdrive Shows 0 Queries
This is normal! Statistics update with delay. Your connection is working if:
- Deployment succeeded
- Test endpoint returns data
- No errors in logs

---

**Last Updated**: 2025-10-01
**Schema Version**: v1.0.0 (14 tables)
