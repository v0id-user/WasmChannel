<div align="center">

# WasmChannel 🦀

**Experimental real-time chat application using Rust+WASM on Cloudflare Workers & Next.js frontend, featuring a custom binary protocol.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?logo=webassembly&logoColor=white)](https://webassembly.org/)

<div align="center">

[![MADE BY #V0ID](https://img.shields.io/badge/MADE%20BY%20%23V0ID-F3EEE1.svg?style=for-the-badge)](https://github.com/v0id-user)

</div>

</div>

## Overview
WasmChannel combines the performance of WebAssembly with the scalability of Cloudflare's edge infrastructure to create a high-performance real-time chat experience in an intentionally over engineered distributed system.

### Key Features

- **Real-time messaging** with WebSocket connections
- **Custom binary protocol** with LZ4 compression
- **WebAssembly performance** for message processing
- **Edge-first architecture** on Cloudflare Workers
- **Authentication** via Better Auth
- **Message reactions** with live updates
- **Typing indicators** and user presence
- **Persistent storage** with Cloudflare D1
- **Optimized bandwidth** usage through compression

## Architecture
![Processing Messages Architecture](arch/prcessing_messages.png)

### Core Components

- **Frontend**: Next.js with React hooks for real-time UI
- **WASM Layer**: Rust-compiled WebAssembly for high-performance packet processing as protocol layer over websocket
- **Backend**: Cloudflare Workers & Queues for database async writes and Durable Objects for stateful connections
- **Protocol**: Custom binary format with LZ4 compression and CRC32 validation

### Message Flow Architecture

The system uses a multi-tier approach optimized for ultra-low latency and reliability:

1. **WebSocket Reception** - Messages received via WebSocket connections in Durable Objects
2. **Immediate Broadcast** - Messages instantly broadcast to all connected WebSocket clients for low latency
3. **Cache Layer** - Messages immediately stored in Cloudflare KV for fast retrieval and temporary persistence
4. **Queue Processing** - Messages sent to Cloudflare Queue for batch processing (10 messages or 5-second intervals)
5. **Database Persistence** - Queue consumer processes messages in batches and persists to D1 database

**Benefits:**
- **Ultra-Low Latency** - Messages broadcast immediately to connected users before persistence
- **Reliability** - Queue ensures messages aren't lost during high traffic
- **Efficiency** - Batch processing reduces database load
- **Scalability** - Queue handles traffic spikes automatically

### Tech Stack

**Frontend**
- Next.js 15, React 19, TypeScript
- Tailwind CSS, Zustand

**Backend**
- Cloudflare Workers, Hono, Durable Objects
- Better Auth, Drizzle ORM

**WebAssembly**
- Rust, wasm-bindgen, LZ4, Bincode

**Infrastructure**
- Cloudflare D1, KV, Queues

## Quick Start

### Prerequisites
- Bun or Node.js 18+
- Rust toolchain
- wasm-pack
- Cloudflare account

### Installation

```bash
# Clone and install
git clone https://github.com/v0id-user/wasmchannel.git
cd wasmchannel
bun install
cd worker && bun install && cd ..

# Build WASM
bun run build:wasm:dev

# Setup environment
cp worker/.dev.vars.example worker/.dev.vars
# Edit with your Cloudflare credentials

# Start development
bun run dev              # Terminal 1: Frontend
bun run worker:dev       # Terminal 2: Worker
```

## Documentation

- **[Cloudflare Worker Setup](worker/README.md)** - Backend deployment and configuration
- **[Rust/WASM Development](crates/README.md)** - WebAssembly compilation and optimization
- **[Binary Protocol Specification](#binary-protocol)** - Custom messaging protocol details

## Binary Protocol

WasmChannel uses a custom binary protocol for efficient communication:

```rust
pub struct WasmPacket {
    inner: Packet {
        pub kind: PacketKind,              // Message type
        pub message_id: Option<String>,    // Unique identifier  
        pub user_id: Option<String>,       // Sender ID
        pub reaction_kind: Option<ReactionKind>, // Reaction type
        pub payload: Vec<u8>,              // LZ4-compressed data
        pub serialized: bool,              // Serialization state
        pub crc: u32,                      // CRC32 integrity check
    }
}
```

**Protocol Features:**
- LZ4 frame compression for payload optimization
- CRC32 validation for data integrity
- Binary serialization via Bincode
- Type-safe packet handling in both Rust and TypeScript

## Development Commands

```bash
# WASM builds
bun run build:wasm:dev      # Development build
bun run build:wasm:release  # Production build

# Deployment
bun run build               # Frontend build
cd worker && bun run deploy # Worker deployment
```

## Project Structure

```
wasmchannel/
├── app/                 # Next.js app directory
├── components/          # React components  
├── hooks/              # Custom React hooks
├── crates/             # Rust WebAssembly source
├── worker/             # Cloudflare Worker backend
├── types/              # TypeScript definitions
└── utils/              # Shared utilities
```

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ by [@v0id_user](https://x.com/v0id_user)**

*This is an experimental project. It's meant to be a learning experience for me.*

**⚠️ Important Notice:**
This project is incomplete and experimental. Several features like proper message fetching and reaction systems are not fully implemented. Host and use this at your own risk as things may break. The primary purpose of this project was for my learning experience, and it has served that purpose.

</div>
