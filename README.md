# WasmChannel 🦀

> **Experimental real-time chat application using Rust+WASM on Cloudflare Workers & Next.js frontend, featuring a custom binary protocol.**

WasmChannel is a cutting-edge experiment that combines the performance of WebAssembly with the scalability of Cloudflare's edge infrastructure to create a high-performance real-time chat experience.

## Features

- **Real-time messaging** with WebSocket connections
- **Custom binary protocol** with LZ4 compression
- **WebAssembly performance** for message processing
- **Edge-first architecture** on Cloudflare Workers
- **Authentication** via Better Auth
- **Message reactions** with live updates
- **Typing indicators** and user presence
- **Persistent storage** with Cloudflare D1
- **Optimized bandwidth** usage through compression


### Core Components

- **Frontend**: Next.js with React hooks for real-time UI
- **WASM Layer**: Rust-compiled WebAssembly for high-performance packet processing
- **Backend**: Cloudflare Workers with Durable Objects for stateful connections
- **Protocol**: Custom binary format with LZ4 compression and CRC32 validation

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management

### Backend
- **Cloudflare Workers** - Edge computing platform
- **Hono** - Fast web framework
- **Durable Objects** - Stateful edge computing
- **Better Auth** - Authentication system
- **Drizzle ORM** - Type-safe database queries

### WebAssembly
- **Rust** - Systems programming language
- **wasm-bindgen** - Rust-WASM bindings
- **LZ4** - Fast compression algorithm
- **Bincode** - Binary serialization

### Infrastructure
- **Cloudflare D1** - SQLite-compatible database
- **Cloudflare KV** - Key-value storage
- **Cloudflare Queues** - Message queuing system

## Quick Start

### Prerequisites
- **Bun** or **Node.js 18+**
- **Rust toolchain**
- **wasm-pack**
- **Cloudflare account**

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/v0id-user/wasmchannel.git
cd wasmchannel
```

2. **Install dependencies**
```bash
bun install
cd worker && bun install && cd ..
```

3. **Build WebAssembly modules**
```bash
bun run build:wasm:dev
```

4. **Set up environment variables**
```bash
# Copy example env files
cp worker/.dev.vars.example worker/.dev.vars
# Edit with your Cloudflare credentials
```

5. **Start development servers**
```bash
# Terminal 1: Frontend
bun run dev

# Terminal 2: Worker
bun run worker:dev
```

## Development

### Building WASM

The project includes a custom build pipeline for WebAssembly:

```bash
# Development build (faster compilation)
bun run build:wasm:dev

# Release build (optimized)
bun run build:wasm:release
```

The build script:
- Compiles Rust to WASM for both frontend and worker environments
- Applies Cloudflare Workers compatibility patches
- Generates TypeScript bindings

### Project Structure

```
wasmchannel/
├── app/                    # Next.js app directory
├── components/             # React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility libraries
├── crates/             # Rust WebAssembly source
│   ├── src/
│   │   ├── oop/           # Object-oriented packet handling
│   │   └── hash.rs        # CRC32 implementation
│   └── Cargo.toml
├── worker/                # Cloudflare Worker
│   ├── src/
│   │   ├── routers/       # API routes
│   │   ├── objects/       # Durable Objects
│   │   └── db/            # Database schema
│   └── wrangler.jsonc     # Worker configuration
├── types/                 # TypeScript type definitions
├── utils/                 # Shared utilities
└── build-wasm.ts         # WASM build pipeline
```

### Key Files

- `crates/src/oop/packet.rs` - Core packet serialization logic
- `worker/src/objects/room.ts` - Real-time room management
- `components/chat.tsx` - Main chat interface
- `build-wasm.ts` - WebAssembly build configuration

## Binary Protocol

WasmChannel uses a custom binary protocol for efficient communication:

```rust
pub struct Packet {
    pub kind: PacketKind,          // Message type
    pub message_id: Option<String>, // Unique identifier
    pub user_id: Option<String>,   // Sender ID
    pub reaction_kind: Option<ReactionKind>, // Reaction type
    pub payload: Vec<u8>,          // Compressed data
    pub crc: u32,                  // Integrity check
}
```

### Protocol Features
- **LZ4 compression** for payload optimization
- **CRC32 validation** for data integrity
- **Binary serialization** via Bincode
- **Type-safe** packet handling in both Rust and TypeScript

## Deployment

### Frontend (Vercel/Netlify)
```bash
bun run build:wasm:release
bun run build
```

### Worker (Cloudflare)
```bash
cd worker
bun run deploy
```

### Environment Setup
1. Create Cloudflare D1 database
2. Set up KV namespace
3. Configure Durable Objects
4. Update `wrangler.jsonc` with your resource IDs

## Experimental Features

This project explores several cutting-edge technologies:

- **WASM in Workers** - Running WebAssembly on Cloudflare's V8 isolates
- **Custom protocols** - Binary messaging for optimal performance
- **Edge-first architecture** - Leveraging global edge computing
- **Type-safe WASM** - Rust-TypeScript interoperability

## Contributing

This is an experimental project exploring the boundaries of web performance. Contributions, ideas, and feedback are welcome!

1. Fork the repository
2. Create a feature branch
3. Build and test your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- **Cloudflare** for their excellent edge computing platform
- **Rust/WASM ecosystem** for making high-performance web apps possible
- **Open source community** for the amazing tools and libraries

---

**Built with ❤️ by [@v0id_user](https://x.com/v0id_user)**

*This is an experimental project. Use in production at your own risk.*