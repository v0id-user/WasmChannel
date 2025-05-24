use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use js_sys::Uint8Array;
use bincode;
use crate::hash::calculate_crc32;

#[wasm_bindgen]
#[derive(Serialize, Deserialize, bincode::Encode, bincode::Decode, Copy, Clone)]
pub enum PacketKind {
    Message,
    Reaction,
}

#[derive(Serialize, Deserialize, bincode::Encode, bincode::Decode, Clone)]
pub struct Packet {
    pub kind: PacketKind,
    pub payload: Vec<u8>,
    pub crc: u32,
}

#[wasm_bindgen]
pub struct WasmPacket {
    inner: Packet,
}

#[wasm_bindgen]
impl WasmPacket {
    #[wasm_bindgen(constructor)]
    pub fn new(kind: PacketKind, payload: Uint8Array) -> WasmPacket {
        let payload = payload.to_vec();
        let crc = calculate_crc32(&payload);
        WasmPacket {
            inner: Packet { kind, payload, crc }
        }
    }

    pub fn kind(&self) -> PacketKind {
        self.inner.kind
    }

    pub fn payload(&self) -> Uint8Array {
        Uint8Array::from(&self.inner.payload[..])
    }

    pub fn serialize(&self) -> Result<Uint8Array, JsValue> {
        match bincode::encode_to_vec(&self.inner, bincode::config::standard()) {
            Ok(bytes) => Ok(Uint8Array::from(&bytes[..])),
            Err(_) => Err(JsValue::from_str("Serialization failed")),
        }
    }

    #[wasm_bindgen(js_name = deserialize)]
    pub fn deserialize_static(bytes: Uint8Array) -> Result<WasmPacket, JsValue> {
        let bytes = bytes.to_vec();
        match bincode::decode_from_slice(&bytes, bincode::config::standard()) {
            Ok((packet, _)) => Ok(WasmPacket { inner: packet }),
            Err(_) => Err(JsValue::from_str("Deserialization failed")),
        }
    }
}


