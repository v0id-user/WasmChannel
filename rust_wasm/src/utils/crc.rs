use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn calculate_crc32(data: &[u8]) -> u32 {
    let mut hasher = crc32fast::Hasher::new();
    hasher.update(data);
    hasher.finalize()
}

pub fn dummy_helper() {
    println!("Helper function in utils::crc");
} 