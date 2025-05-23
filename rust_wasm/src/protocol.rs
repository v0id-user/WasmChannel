use serde::{Serialize, Deserialize};
use wasm_bindgen::prelude::*;
use js_sys::Uint8Array;

#[derive(Serialize, Deserialize)]
pub struct Packet {
    kind: u8,
    payload: Vec<u8>,
}

#[wasm_bindgen]
pub struct WasmPacket {
    inner: Packet
}

#[wasm_bindgen]
impl WasmPacket {
    #[wasm_bindgen(constructor)]
    pub fn new(kind: u8, payload: Uint8Array) -> WasmPacket {
        let payload = payload.to_vec();
        WasmPacket {
            inner: Packet { kind, payload }
        }
    }

    pub fn kind(&self) -> u8 {
        self.inner.kind
    }

    pub fn payload(&self) -> Uint8Array {
        Uint8Array::from(&self.inner.payload[..])
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(self.inner.payload.len() + 1);
        bytes.push(self.inner.kind);
        bytes.extend(&self.inner.payload);
        bytes
    }
}

impl Packet {
    pub fn new(kind: u8, payload: Vec<u8>) -> Self {
        Self { kind, payload }
    }

    pub fn kind(&self) -> u8 {
        self.kind
    }

    pub fn payload(&self) -> &[u8] {
        &self.payload
    }
} 