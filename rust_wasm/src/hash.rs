use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn calculate_hash(data: &[u8]) -> u32 {
    let mut hasher = crc32fast::Hasher::new();
    hasher.update(data);
    hasher.finalize()
}

pub fn internal_hash_helper(data: &[u8]) -> Vec<u8> {
    data.to_vec()
} 