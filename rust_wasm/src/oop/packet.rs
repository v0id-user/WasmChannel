use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use js_sys::Uint8Array;
use bincode;
use crate::hash::calculate_crc32;
use std::io;

#[wasm_bindgen]
#[derive(Serialize, Deserialize, bincode::Encode, bincode::Decode, Copy, Clone)]
pub enum PacketKind {
    Message,
    Reaction,
    Typing,
}

#[wasm_bindgen]
#[derive(Serialize, Deserialize, bincode::Encode, bincode::Decode, Copy, Clone)]
pub enum ReactionKind {
    None,
    Like,
    Dislike,
    Heart,
    Star,
    
}

#[derive(Serialize, Deserialize, bincode::Encode, bincode::Decode, Clone)]
pub struct Packet {
    pub kind: PacketKind,
    pub reaction_kind: Option<ReactionKind>,
    pub payload: Vec<u8>,
    pub serialized: bool,
    pub crc: u32,
}

#[wasm_bindgen]
pub struct WasmPacket {
    inner: Packet,
}

#[wasm_bindgen]
impl WasmPacket {
    #[wasm_bindgen(constructor)]
    pub fn new(kind: PacketKind, payload: Uint8Array, reaction_kind: Option<ReactionKind>) -> WasmPacket {
        let mut compressed = Vec::new();
        let mut encoder = lz4_flex::frame::FrameEncoder::new(&mut compressed);
        io::copy(&mut payload.to_vec().as_slice(), &mut encoder).expect("Compression failed");
        encoder.finish().unwrap();
        let payload = compressed;
        let crc = calculate_crc32(&payload);
        WasmPacket {
            inner: Packet { kind, reaction_kind, payload, crc, serialized: false }
        }
    }

    pub fn serialized(&self) -> bool {
        self.inner.serialized
    }

    pub fn kind(&self) -> PacketKind {
        self.inner.kind
    }

    pub fn payload(&self) -> Uint8Array {
        let mut decompressed = Vec::new();
        let mut decoder = lz4_flex::frame::FrameDecoder::new(&self.inner.payload[..]);
        io::copy(&mut decoder, &mut decompressed).expect("Decompression failed");
        Uint8Array::from(&decompressed[..])
    }

    pub fn serialize(&self) -> Result<Uint8Array, JsValue> {
        match bincode::encode_to_vec(&self.inner, bincode::config::standard()) {
            Ok(bytes) => {
                let mut inner = self.inner.clone();
                inner.serialized = true;
                Ok(Uint8Array::from(&bytes[..]))
            }
            Err(_) => Err(JsValue::from_str("Serialization failed")),
        }
    }

    #[wasm_bindgen(js_name = deserialize)]
    pub fn deserialize_static(bytes: Uint8Array) -> Result<WasmPacket, JsValue> {
        let bytes = bytes.to_vec();
        match bincode::decode_from_slice::<Packet, _>(&bytes, bincode::config::standard()) {
            Ok((packet, _)) => {
                let mut inner = packet.clone();
                inner.serialized = false;
                Ok(WasmPacket { inner })
            }
            Err(_) => Err(JsValue::from_str("Deserialization failed")),
        }
    }
}


