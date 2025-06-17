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
serde = { version = "1.0", features = ["derive"] }
bincode = "1.3"
lz4_flex = "0.11"
js-sys = "0.3"
wasm-bindgen-futures = "0.4"

[dependencies.web-sys]
version = "0.3"
features = ["console"]
```

## Binary Protocol

### Packet Structure

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Packet {
    pub kind: PacketKind,              // Message type identifier
    pub message_id: Option<String>,    // Unique message identifier
    pub user_id: Option<String>,       // Sender user identifier
    pub reaction_kind: Option<ReactionKind>, // Reaction type for reactions
    pub payload: Vec<u8>,              // LZ4-compressed message data
    pub crc: u32,                      // CRC32 integrity checksum
}
```

### Packet Types

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum PacketKind {
    Message,        // Chat message
    Reaction,       // Message reaction
    Typing,         // Typing indicator
    UserJoined,     // User presence
    UserLeft,       // User presence
    Heartbeat,      // Connection keep-alive
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum ReactionKind {
    Like,           // 👍
    Heart,          // ❤️
    Laugh,          // 😂
    Wow,            // 😮
    Sad,            // 😢
    Angry,          // 😡
}
```

## Core Implementation

### Packet Processing

```rust
impl Packet {
    // Serialize packet to binary format with compression
    pub fn serialize(&self) -> Result<Vec<u8>, String> {
        // 1. Serialize packet structure with bincode
        let serialized = bincode::serialize(self)
            .map_err(|e| format!("Serialization error: {}", e))?;
        
        // 2. Compress payload with LZ4
        let compressed = lz4_flex::compress_prepend_size(&serialized);
        
        // 3. Calculate and append CRC32
        let crc = crc32(&compressed);
        let mut result = compressed;
        result.extend_from_slice(&crc.to_le_bytes());
        
        Ok(result)
    }
    
    // Deserialize binary data to packet with validation
    pub fn deserialize(data: &[u8]) -> Result<Self, String> {
        // 1. Extract and validate CRC32
        if data.len() < 4 {
            return Err("Invalid packet size".to_string());
        }
        
        let (compressed, crc_bytes) = data.split_at(data.len() - 4);
        let expected_crc = u32::from_le_bytes([
            crc_bytes[0], crc_bytes[1], crc_bytes[2], crc_bytes[3]
        ]);
        
        let actual_crc = crc32(compressed);
        if actual_crc != expected_crc {
            return Err("CRC32 validation failed".to_string());
        }
        
        // 2. Decompress LZ4 data
        let decompressed = lz4_flex::decompress_size_prepended(compressed)
            .map_err(|e| format!("Decompression error: {}", e))?;
        
        // 3. Deserialize packet structure  
        let packet: Packet = bincode::deserialize(&decompressed)
            .map_err(|e| format!("Deserialization error: {}", e))?;
        
        Ok(packet)
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

### WASM Exports

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct PacketProcessor;

#[wasm_bindgen]
impl PacketProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> PacketProcessor {
        PacketProcessor
    }
    
    // Serialize packet to Uint8Array for JavaScript
    #[wasm_bindgen]
    pub fn serialize_packet(
        &self,
        kind: String,
        message_id: Option<String>,
        user_id: Option<String>,
        payload: &[u8]
    ) -> Result<Vec<u8>, JsValue> {
        let packet_kind = match kind.as_str() {
            "message" => PacketKind::Message,
            "reaction" => PacketKind::Reaction,
            "typing" => PacketKind::Typing,
            _ => return Err(JsValue::from_str("Invalid packet kind")),
        };
        
        let packet = Packet {
            kind: packet_kind,
            message_id,
            user_id,
            reaction_kind: None,
            payload: payload.to_vec(),
            crc: 0, // Will be calculated during serialization
        };
        
        packet.serialize()
            .map_err(|e| JsValue::from_str(&e))
    }
    
    // Deserialize Uint8Array to packet for JavaScript
    #[wasm_bindgen]
    pub fn deserialize_packet(&self, data: &[u8]) -> Result<JsValue, JsValue> {
        let packet = Packet::deserialize(data)
            .map_err(|e| JsValue::from_str(&e))?;
        
        // Convert to JavaScript object
        serde_wasm_bindgen::to_value(&packet)
            .map_err(|e| JsValue::from_str(&format!("JS conversion error: {}", e)))
    }
}
```

## Build Configuration

### Cargo.toml

```toml
[package]
name = "wasmchannel"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = { version = "0.2", features = ["serde-serialize"] }
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.4"
bincode = "1.3"
lz4_flex = "0.11"
js-sys = "0.3"

[dependencies.web-sys]
version = "0.3"
features = [
  "console",
  "Performance",
  "Window",
]

[profile.release]
# Optimize for size and speed
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"

# Enable wee_alloc for smaller binary size
[dependencies.wee_alloc]
version = "0.4.5"

[features]
default = ["console_error_panic_hook"]
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
4. **Optimizes binary size** with wee_alloc and LTO
5. **Creates dual outputs** for frontend and worker usage

## TypeScript Integration

### Generated Bindings

```typescript
// Generated wasmchannel.d.ts
export class PacketProcessor {
  constructor();
  serialize_packet(
    kind: string,
    message_id?: string,
    user_id?: string, 
    payload: Uint8Array
  ): Uint8Array;
  
  deserialize_packet(data: Uint8Array): any;
}

export interface Packet {
  kind: string;
  message_id?: string;
  user_id?: string;
  reaction_kind?: string;
  payload: number[];
  crc: number;
}
```

### Usage Example

```typescript
import init, { PacketProcessor } from './public/wasm/wasmchannel.js';

// Initialize WASM module
await init();

// Create processor instance
const processor = new PacketProcessor();

// Serialize message
const messageData = new TextEncoder().encode("Hello, World!");
const serialized = processor.serialize_packet(
  "message",
  "msg-123", 
  "user-456",
  messageData
);

// Deserialize packet
const packet = processor.deserialize_packet(serialized);
console.log('Received packet:', packet);
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
- **LZ4**: Chosen for optimal speed/compression ratio
- **Streaming**: Process data in chunks for large payloads
- **Dictionary**: Precomputed compression dictionaries for common patterns

### Binary Size Optimization
```toml
[profile.release]
opt-level = "s"          # Optimize for size
strip = true             # Remove debug symbols
lto = true              # Link-time optimization
codegen-units = 1       # Single codegen unit
panic = "abort"         # Smaller panic handler
```

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
