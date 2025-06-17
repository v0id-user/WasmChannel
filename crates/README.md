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
- Cross-platform compatibility

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

## Core Implementation

### WasmPacket Processing

```rust
#[wasm_bindgen]
impl WasmPacket {
    // Create new packet with LZ4 frame compression
    #[wasm_bindgen(constructor)]
    pub fn new(
        kind: PacketKind, 
        message_id: Option<String>, 
        user_id: Option<String>, 
        reaction_kind: Option<ReactionKind>, 
        payload: Uint8Array
    ) -> WasmPacket {
        // Compress payload using LZ4 frame encoding
        let mut compressed = Vec::new();
        let mut encoder = lz4_flex::frame::FrameEncoder::new(&mut compressed);
        io::copy(&mut payload.to_vec().as_slice(), &mut encoder)
            .expect("Compression failed");
        encoder.finish().unwrap();
        
        // Calculate CRC32 for integrity
        let crc = calculate_crc32(&compressed);
        
        WasmPacket {
            inner: Packet { 
                kind, message_id, user_id, reaction_kind, 
                payload: compressed, crc, serialized: false 
            }
        }
    }

    // Serialize packet to binary format
    pub fn serialize(&self) -> Result<Uint8Array, JsValue> {
        let mut serializable_inner = self.inner.clone();
        serializable_inner.serialized = true;
        
        match bincode::encode_to_vec(&serializable_inner, bincode::config::standard()) {
            Ok(bytes) => Ok(Uint8Array::from(&bytes[..])),
            Err(_) => Err(JsValue::from_str("Serialization failed")),
        }
    }

    // Deserialize binary data to packet
    #[wasm_bindgen(js_name = deserialize)]
    pub fn deserialize_static(bytes: Uint8Array) -> Result<WasmPacket, JsValue> {
        let bytes = bytes.to_vec();
        match bincode::decode_from_slice::<Packet, _>(&bytes, bincode::config::standard()) {
            Ok((packet, _)) => {
                let mut inner = packet.clone();
                inner.serialized = false;
                Ok(WasmPacket { inner })
            }
            Err(e) => Err(JsValue::from_str(&format!("Failed to deserialize packet: {}", e))),
        }
    }

    // Get decompressed payload
    pub fn payload(&self) -> Uint8Array {
        let mut decompressed = Vec::new();
        let mut decoder = lz4_flex::frame::FrameDecoder::new(&self.inner.payload[..]);
        io::copy(&mut decoder, &mut decompressed).expect("Decompression failed");
        Uint8Array::from(&decompressed[..])
    }
}
```

### CRC32 Implementation

```rust
// Fast CRC32 calculation for data integrity
pub fn crc32(data: &[u8]) -> u32 {
    const CRC32_TABLE: [u32; 256] = generate_crc32_table();
    
    let mut crc = 0xFFFFFFFF_u32;
    
    for &byte in data {
        let table_index = ((crc ^ byte as u32) & 0xFF) as usize;
        crc = (crc >> 8) ^ CRC32_TABLE[table_index];
    }
    
    !crc
}

const fn generate_crc32_table() -> [u32; 256] {
    let mut table = [0u32; 256];
    let mut i = 0;
    
    while i < 256 {
        let mut crc = i as u32;
        let mut j = 0;
        
        while j < 8 {
            if crc & 1 != 0 {
                crc = (crc >> 1) ^ 0xEDB88320;
            } else {
                crc >>= 1;
            }
            j += 1;
        }
        
        table[i] = crc;
        i += 1;
    }
    
    table
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
# From project root
bun run build:wasm:dev

# Or directly with wasm-pack
cd crates
wasm-pack build --target web --out-dir ../public/wasm --dev
```

### Production Build
```bash
# Optimized release build
bun run build:wasm:release

# Manual build with optimizations
cd crates
wasm-pack build --target web --out-dir ../public/wasm --release
```

### Build Features

The build pipeline automatically:

1. **Compiles Rust to WASM** for both browser and Workers environments
2. **Generates TypeScript bindings** with proper type definitions
3. **Applies Cloudflare Workers patches** for V8 isolate compatibility
4. **Optimizes binary size** with wasm-opt in release mode
5. **Creates dual outputs** for frontend and worker usage

## TypeScript Integration

### TypeScript Integration

The build process automatically generates TypeScript definitions and JavaScript bindings for seamless integration with your frontend code.

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

## Performance Optimizations

### Memory Management
```rust
// Use wee_alloc for smaller binary size
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

// Minimize allocations in hot paths
impl Packet {
    pub fn serialize_into(&self, buffer: &mut Vec<u8>) -> Result<(), String> {
        buffer.clear();
        // Reuse buffer to avoid allocations
    }
}
```

### Compression Efficiency
- **LZ4 Frame Format**: Chosen for optimal speed/compression ratio
- **Streaming**: Process data in chunks for large payloads
- **FrameEncoder/Decoder**: Handles compression state automatically

### Binary Size Optimization

Optimization is handled by the custom build pipeline (`build-wasm.ts`) which uses `wasm-opt` with aggressive size optimization flags:

- **Oz optimization level** for maximum size reduction
- **Dead code elimination** and unused module removal
- **Function and local reordering** for better compression
- **Debug symbol stripping** for smaller binaries

## Testing

### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_packet_roundtrip() {
        let original = Packet {
            kind: PacketKind::Message,
            message_id: Some("test-123".to_string()),
            user_id: Some("user-456".to_string()),
            reaction_kind: None,
            payload: b"Hello, World!".to_vec(),
            crc: 0,
        };
        
        let serialized = original.serialize().unwrap();
        let deserialized = Packet::deserialize(&serialized).unwrap();
        
        assert_eq!(original.kind, deserialized.kind);
        assert_eq!(original.message_id, deserialized.message_id);
        assert_eq!(original.payload, deserialized.payload);
    }
    
    #[test]
    fn test_crc32_validation() {
        let data = b"test data";
        let crc1 = crc32(data);
        let crc2 = crc32(data);
        
        assert_eq!(crc1, crc2); // Deterministic
        
        let modified_data = b"test datA"; // Changed last character
        let crc3 = crc32(modified_data);
        
        assert_ne!(crc1, crc3); // Different CRC for different data
    }
}
```

### Browser Testing
```bash
# Run tests in headless browser
wasm-pack test --headless --chrome
wasm-pack test --headless --firefox

# Node.js testing
wasm-pack test --node
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

### Performance Profiling
```rust
use web_sys::Performance;

#[wasm_bindgen]
pub fn profile_serialization(data: &[u8]) -> f64 {
    let performance = web_sys::window().unwrap().performance().unwrap();
    let start = performance.now();
    
    // Perform serialization
    let _ = Packet::deserialize(data);
    
    let end = performance.now();
    end - start
}
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

**Binary Size Issues**
- Enable LTO in Cargo.toml
- Use wee_alloc allocator
- Strip debug symbols
- Minimize feature flags

**JavaScript Integration Problems**
- Verify wasm-bindgen versions match
- Check TypeScript binding generation
- Ensure proper async initialization

### Debug Commands

```bash
# Inspect WASM binary
wasm-objdump -x public/wasm/wasmchannel_bg.wasm

# Analyze binary size
wasm-pack build --profiling
twiggy top public/wasm/wasmchannel_bg.wasm

# Test WASM functionality
cd crates && cargo test
```

## Contributing

When contributing to the Rust crates:

1. **Follow Rust best practices** and use `cargo fmt` and `cargo clippy`
2. **Add tests** for new packet types or protocol changes
3. **Benchmark performance** for critical path changes
4. **Update TypeScript bindings** when changing public APIs
5. **Test cross-platform compatibility** (Browser + Workers)

## Resources

- [Rust and WebAssembly Book](https://rustwasm.github.io/docs/book/)
- [wasm-bindgen Documentation](https://rustwasm.github.io/wasm-bindgen/)
- [WebAssembly Reference](https://webassembly.github.io/spec/)
- [LZ4 Compression](https://lz4.github.io/lz4/)
- [Bincode Serialization](https://docs.rs/bincode/)
</rewritten_file>
