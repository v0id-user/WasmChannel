<div align="center">

# Rust WebAssembly Crates

**High-performance packet processing and binary protocol implementation**

[![Rust](https://img.shields.io/badge/Rust-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-654FF0?logo=webassembly&logoColor=white)](https://webassembly.org/)
[![wasm-bindgen](https://img.shields.io/badge/wasm--bindgen-BA3B46?logo=rust&logoColor=white)](https://rustwasm.github.io/wasm-bindgen/)

</div>

## Overview

The Rust crates provide high-performance WebAssembly modules for:

- **Binary packet serialization/deserialization**
- **LZ4 compression and decompression**
- **CRC32 integrity validation**
- **Type-safe protocol handling**
- **Cross-platform compatibility** (Browser + Cloudflare Workers)

## Architecture

### Core Components

**Packet System (`oop/packet.rs`)**
- Binary protocol implementation
- Serialization with Bincode
- Compression with LZ4
- Integrity checking with CRC32

**Hash Utilities (`hash.rs`)**
- CRC32 implementation
- Data integrity validation
- Fast checksum computation

**Utils Module (`utils/`)**
- CRC utility functions
- Shared helper methods

## Tech Stack

- **Rust** - Systems programming language
- **wasm-bindgen** - Rust-WASM bindings and JavaScript interop
- **serde** - Serialization framework
- **bincode** - Binary serialization format
- **lz4_flex** - Fast LZ4 compression
- **wasm-pack** - WebAssembly compilation toolchain

## Dependencies

```toml
[dependencies]
wasm-bindgen = "0.2"
bincode = "2.0"
lz4_flex = "0.11"
js-sys = "0.3"

[dependencies.web-sys]
version = "0.3"
features = ["console"]
```

## Binary Protocol

### Packet Structure

```rust
#[derive(bincode::Encode, bincode::Decode, Clone)]
pub struct Packet {
    pub kind: PacketKind,              // Message type identifier
    pub message_id: Option<String>,    // Unique message identifier
    pub user_id: Option<String>,       // Sender user identifier
    pub reaction_kind: Option<ReactionKind>, // Reaction type for reactions
    pub payload: Vec<u8>,              // LZ4-compressed message data
    pub serialized: bool,              // Serialization state flag
    pub crc: u32,                      // CRC32 integrity checksum
}

#[wasm_bindgen]
pub struct WasmPacket {
    inner: Packet,                     // Internal packet structure
}
```

### Packet Types

```rust
#[wasm_bindgen]
#[derive(bincode::Encode, bincode::Decode, Copy, Clone)]
pub enum PacketKind {
    Message,        // Chat message
    OnlineUsers,    // Online user list
    Delete,         // Message deletion
    Reaction,       // Message reaction
    Joined,         // User joined room
    Typing,         // Typing indicator
}

#[wasm_bindgen]
#[derive(bincode::Encode, bincode::Decode, Copy, Clone)]
pub enum ReactionKind {
    None,           // No reaction
    Like,           // 👍
    Dislike,        // 👎
    Heart,          // ❤️
    Star,           // ⭐
}
```

## JavaScript Bindings

### WASM Interface

The `WasmPacket` struct provides a clean interface for JavaScript:

```rust
#[wasm_bindgen]
impl WasmPacket {
    // Accessor methods for packet data
    pub fn serialized(&self) -> bool { self.inner.serialized }
    pub fn message_id(&self) -> Option<String> { self.inner.message_id.clone() }
    pub fn user_id(&self) -> Option<String> { self.inner.user_id.clone() }
    pub fn kind(&self) -> PacketKind { self.inner.kind }
    pub fn reaction_kind(&self) -> Option<ReactionKind> { self.inner.reaction_kind }
    
    // Main operations
    pub fn serialize(&self) -> Result<Uint8Array, JsValue> { /* ... */ }
    pub fn payload(&self) -> Uint8Array { /* ... */ }
    
    // Static deserialization method
    #[wasm_bindgen(js_name = deserialize)]
    pub fn deserialize_static(bytes: Uint8Array) -> Result<WasmPacket, JsValue> { /* ... */ }
}
```

## Build Configuration

### Cargo.toml

```toml
[package]
name = "wasmchannel"
version = "0.1.0"
edition = "2024"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2.100"
serde = { version = "1.0", features = ["derive"] }
crc32fast = "1.4.2"
js-sys = "0.3.77"
bincode = "2.0.1"
lz4_flex = "0.11.3"

[dependencies.web-sys]
version = "0.3"
features = [
  "console",
]
```

## Build Pipeline

The project uses a custom TypeScript build script (`../build-wasm.ts`):

### Development Build
```bash
# From project root for debug builds
bun run build:wasm:dev
```

### Production Build
```bash
# Optimized release build
bun run build:wasm:release
```

### Build Features

The build pipeline automatically:

1. **Compiles Rust to WASM** for both browser and Workers environments
2. **Generates TypeScript bindings** with proper type definitions
3. **Applies Cloudflare Workers patches** for V8 isolate compatibility
4. **Optimizes binary size** with wasm-opt in release mode
5. **Creates dual outputs** for frontend and worker usage

### Usage Example

```typescript
import init, { WasmPacket, PacketKind, ReactionKind } from './public/wasm/wasmchannel.js';

// Initialize WASM module
await init();

// Create packet
const messageData = new TextEncoder().encode("Hello, World!");
const packet = new WasmPacket(
  PacketKind.Message,
  null, // message_id
  null, // user_id  
  ReactionKind.None,
  messageData
);

// Serialize packet
const serialized = packet.serialize();

// Deserialize packet
const deserialized = WasmPacket.deserialize(serialized);
console.log('Packet kind:', deserialized.kind());
console.log('Payload:', new TextDecoder().decode(deserialized.payload()));
```

## Debugging

### Console Logging
```rust
use web_sys::console;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

// Usage
console_log!("Processing packet with {} bytes", data.len());
```

## Troubleshooting

### Common Issues

**Compilation Errors**
```bash
# Ensure Rust toolchain is up to date
rustup update

# Install wasm-pack
cargo install wasm-pack

# Check target installation
rustup target add wasm32-unknown-unknown
```

**JavaScript Integration Problems**
- Verify wasm-bindgen versions match
- Check TypeScript binding generation
- Ensure proper async initialization

## Resources

- [Rust and WebAssembly Book](https://rustwasm.github.io/docs/book/)
- [wasm-bindgen Documentation](https://rustwasm.github.io/wasm-bindgen/)
- [WebAssembly Reference](https://webassembly.github.io/spec/)
- [LZ4 Compression](https://lz4.github.io/lz4/)
- [Bincode Serialization](https://docs.rs/bincode/)
