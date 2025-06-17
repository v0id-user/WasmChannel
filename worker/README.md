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
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=your-d1-database-url
KV_NAMESPACE=your-kv-namespace
```

### Database Setup

1. **Create D1 database**
```bash
npx wrangler d1 create wasmchannel-db
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
# Local development
npx wrangler d1 migrations apply wasmchannel-db --local

# Production
npx wrangler d1 migrations apply wasmchannel-db
```

### KV Namespace Setup

```bash
# Create KV namespace
npx wrangler kv:namespace create "wasmchannel-kv"

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

## Development Commands

```bash
# Start development server
bun run dev

# Type generation
bun run cf-typegen

# Database operations
bun run db:generate    # Generate migrations
bun run db:migrate     # Apply migrations locally
bun run db:studio      # Open Drizzle Studio

# Deployment
bun run deploy
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

## Database Schema

### Messages Table
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL, 
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER NOT NULL
);
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
# Build WASM modules
cd .. && bun run build:wasm:release

# Deploy worker
cd worker && bun run deploy
```

### Environment Variables (Production)

```bash
# Set production secrets
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put DATABASE_URL
```

## Monitoring & Debugging

### Logs
```bash
# Tail worker logs
npx wrangler tail

# View specific deployment logs  
npx wrangler tail --format=pretty
```

### Analytics
- Cloudflare Workers Analytics Dashboard
- D1 Analytics for database performance
- Custom metrics via Worker Analytics Engine

## Performance Optimization

### Durable Object Best Practices
- Minimize state serialization
- Batch database operations
- Use WebSocket hibernation for idle connections

### Database Optimization
- Indexed queries for message retrieval
- Connection pooling
- Prepared statements via Drizzle

### WASM Integration
- Efficient memory management
- Minimal serialization overhead  
- Optimized compression algorithms

## Troubleshooting

### Common Issues

**Database Connection Errors**
```bash
# Verify D1 binding configuration
npx wrangler d1 list
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
npx wrangler dev --remote

# Test specific routes
curl https://your-worker.workers.dev/api/health

# Database inspection
npx wrangler d1 execute wasmchannel-db --command="SELECT * FROM messages LIMIT 10"
```

## Contributing

When contributing to the worker backend:

1. Follow TypeScript best practices
2. Use Drizzle for all database operations
3. Test WebSocket functionality locally
4. Ensure WASM integration works correctly
5. Update migrations for schema changes

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Durable Objects Guide](https://developers.cloudflare.com/workers/learning/using-durable-objects/)
- [Hono Framework](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Better Auth](https://www.better-auth.com/)
