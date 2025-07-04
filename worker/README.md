<div align="center">

# Cloudflare Worker Backend

**Real-time chat backend powered by Cloudflare Workers and Durable Objects**

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Hono](https://img.shields.io/badge/Hono-E36002?logo=hono&logoColor=white)](https://hono.dev/)
[![Drizzle](https://img.shields.io/badge/Drizzle-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)

</div>

## Overview

The WasmChannel backend leverages Cloudflare's edge infrastructure to provide:

- **Real-time WebSocket connections** via Durable Objects
- **Authentication** with Better Auth
- **Database operations** using Cloudflare D1
- **Message processing** with embedded WebAssembly
- **Global edge deployment** for minimal latency

## Architecture

### Core Components

**Durable Objects**
- `Room` - Manages real-time chat rooms and WebSocket connections
- Stateful message handling and user presence tracking

**API Routes** 
- Authentication endpoints
- Message history retrieval
- User management

**Database Layer**
- Drizzle ORM with type-safe queries
- Cloudflare D1 SQLite-compatible database
- Message persistence and user data

**WebAssembly Integration**
- Rust-compiled WASM for packet processing
- Binary protocol handling
- LZ4 compression/decompression

## Tech Stack

- **Cloudflare Workers** - Edge computing platform
- **Hono** - Fast web framework for Workers
- **Durable Objects** - Stateful edge computing
- **Better Auth** - Authentication system
- **Drizzle ORM** - Type-safe database queries
- **Cloudflare D1** - SQLite-compatible database
- **Cloudflare KV** - Key-value storage
- **Cloudflare Queues** - Message queuing system

## Setup & Development

### Prerequisites

- Cloudflare account with Workers plan
- Wrangler CLI installed
- Bun or Node.js 18+

### Installation

```bash
cd worker
bun install
```

### Environment Configuration

1. **Copy environment template**
```bash
cp .dev.vars.example .dev.vars
```

2. **Configure environment variables**
```bash
# .dev.vars
BETTER_AUTH_SECRET=xxxx
BETTER_AUTH_URL=http://localhost:8787

CLOUDFLARE_ACCOUNT_ID=xxxx
CLOUDFLARE_DATABASE_ID=xxxxx
CLOUDFLARE_D1_TOKEN=xxxx

FRONTEND_URL=http://localhost:3000

DOMAIN=.localhost
WS_DOMAIN=localhost:8787
BASE_DOMAIN=localhost:8787
DEBUG=true
```

### Database Setup

1. **Create D1 database**
```bash
bunx wrangler d1 create wasmchannel-db
```

2. **Update wrangler.jsonc with database ID**
```jsonc
{
  "d1_databases": [
    {
      "binding": "DB", 
      "database_name": "wasmchannel-db",
      "database_id": "your-database-id"
    }
  ]
}
```

3. **Run migrations**
```bash
# Generate, migrate, and apply all at once
bun run migrate:all

# Or step by step:
bun run db:generate    # Generate migration files
bun run db:migrate     # Apply migrations locally
bun run db:apply       # Apply to D1 database

# Manual D1 commands (if needed)
bunx wrangler d1 migrations apply DB --local    # Local
bunx wrangler d1 migrations apply DB            # Production
```

### KV Namespace Setup

```bash
# Create KV namespace
bunx wrangler kv:namespace create "wasmchannel-kv"

# Update wrangler.jsonc
{
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "your-kv-id"
    }
  ]
}
```

### Queue Setup

The backend uses Cloudflare Queues for efficient message persistence with batch processing:

```bash
# Create queue
bunx wrangler queues create wasmchannel

# Update wrangler.jsonc with queue configuration
{
  "queues": {
    "consumers": [
      {
        "queue": "wasmchannel",
        "max_batch_size": 10,    // Process up to 10 messages per batch
        "max_batch_timeout": 5   // Wait maximum 5 seconds before processing batch
      }
    ],
    "producers": [
      {
        "queue": "wasmchannel",
        "binding": "QUEUE_MESSAGES"
      }
    ]
  }
}
```

#### Message Flow Architecture

The system follows a multi-tier approach for optimal performance and reliability:

1. **WebSocket Reception** - Messages received via WebSocket connections in Durable Objects
2. **Immediate Broadcast** - Messages instantly broadcast to all connected WebSocket clients for low latency
3. **Cache Layer** - Messages immediately stored in KV for fast retrieval and temporary persistence
4. **Queue Processing** - Messages sent to Cloudflare Queue for batch processing
5. **Database Persistence** - Queue consumer processes messages in batches and persists to D1 database

**Benefits:**
- **Ultra-Low Latency** - Messages broadcast immediately to connected users before persistence
- **Immediate Response** - Users see messages instantly from cache for reconnecting clients
- **Reliability** - Queue ensures messages aren't lost even during high traffic
- **Efficiency** - Batch processing (10 messages or 5-second intervals) reduces database load
- **Scalability** - Queue handles traffic spikes automatically

## Development Commands

```bash
# Start development server
bun run dev

# Type generation
bun run cf-typegen
bun run types:build    # Build TypeScript declarations

# Database operations
bun run db:generate    # Generate migrations
bun run db:migrate     # Apply migrations locally  
bun run db:apply       # Apply migrations to D1 database
bun run db:studio      # Open Drizzle Studio
bun run migrate:all    # Run all migration steps

# Authentication
bun run auth:generate  # Generate Better Auth types
bun run auth:migrate   # Apply Better Auth migrations

# Deployment
bun run deploy         # Production deployment with minification
bun run deploy:dev     # Development deployment
```

## Project Structure

```
worker/
├── src/
│   ├── index.ts           # Main worker entry point
│   ├── contexts.ts        # Request context setup
│   ├── routers/           # API route handlers
│   │   ├── index.ts       # Router configuration
│   │   └── messages.ts    # Message endpoints
│   ├── objects/           # Durable Objects
│   │   └── room.ts        # Chat room object
│   ├── db/                # Database layer
│   │   ├── index.ts       # Database connection
│   │   └── schema/        # Drizzle schemas
│   └── driver/            # Storage drivers
├── drizzle/               # Database migrations
├── wasm/                  # WebAssembly binaries
├── wrangler.jsonc         # Worker configuration
└── drizzle.config.ts      # Drizzle ORM config
```

## Key Files

### `src/objects/room.ts`
Durable Object managing real-time chat rooms:

```typescript
export class Room {
  // WebSocket connection management
  // Message broadcasting
  // User presence tracking
  // Packet processing with WASM
}
```

### `src/routers/messages.ts`
API endpoints for message operations:

```typescript
// GET /api/messages - Retrieve message history
// POST /api/messages - Send new message
// PUT /api/messages/:id/react - Add reaction
```

### `wrangler.jsonc`
Worker configuration:

```jsonc
{
  "name": "wasmchannel-worker",
  "main": "src/index.ts",
  "compatibility_date": "2024-01-01",
  "durable_objects": {
    "bindings": [
      {
        "name": "ROOM",
        "class_name": "Room"
      }
    ]
  }
}
```

## WebSocket Protocol

The worker handles WebSocket connections through Durable Objects:

1. **Connection Management**
   - Client connects to room-specific WebSocket
   - Authentication via session token
   - User presence tracking

2. **Message Processing**
   - Binary packet deserialization via WASM
   - LZ4 decompression
   - CRC32 validation
   - Database persistence

3. **Broadcasting**
   - Real-time message distribution
   - Typing indicators
   - User presence updates

## Deployment

### Development Deployment
```bash
bun run deploy:dev
```

### Production Deployment
```bash
# Build WASM modules first
cd .. && bun run build:wasm:release

# Deploy with minification
cd worker && bun run deploy
```

### Environment Variables (Production)

```bash
# Set production secrets
bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put DATABASE_URL
# ...

# or copy them from .dev.vars and add them from the console 
```

## Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Verify D1 binding configuration
bunx wrangler d1 list
```

**WebSocket Connection Failures**
- Check Durable Object limits
- Verify hibernation API usage
- Monitor connection counts

**WASM Loading Issues**
- Ensure WASM files are in correct directory
- Check Cloudflare Workers WASM support
- Verify binary compatibility

### Debug Commands

```bash
# Local development with remote database
bunx wrangler dev --remote

# Test specific routes
curl https://your-worker.workers.dev/api/health

# Database inspection  
bunx wrangler d1 execute DB --command="SELECT * FROM messages LIMIT 10"

# Open Drizzle Studio for database GUI
bun run db:studio
```

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Durable Objects Guide](https://developers.cloudflare.com/workers/learning/using-durable-objects/)
- [Hono Framework](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Better Auth](https://www.better-auth.com/)
