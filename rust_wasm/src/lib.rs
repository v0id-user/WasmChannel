use wasm_bindgen::prelude::*;
use web_sys::console;

// Declare our modules
mod protocol;
mod hash;
pub mod utils;

// Re-export commonly used items
pub use protocol::WasmPacket;
pub use hash::calculate_hash;
pub use utils::crc::calculate_crc32;

#[wasm_bindgen]
pub fn add(left: u64, right: u64) -> u64 {
    console::log_1(&format!("Adding {} + {}", left, right).into());
    left + right
}

#[wasm_bindgen]
pub fn calculate_factorial(n: u32) -> u64 {
    if n == 0 || n == 1 {
        return 1;
    }
    (1..=n).fold(1, |acc, x| acc * x as u64)
}

#[wasm_bindgen]
pub fn fibonacci_sequence(n: u32) -> Vec<u64> {
    if n <= 1 {
        return vec![0];
    }
    let mut sequence = vec![0, 1];
    while sequence.len() < n as usize {
        let next = sequence[sequence.len() - 1] + sequence[sequence.len() - 2];
        sequence.push(next);
    }
    sequence
}

#[wasm_bindgen]
pub fn complex_operation(input: u32) -> String {
    // Step 1: Calculate factorial
    let factorial_result = calculate_factorial(input);
    console::log_1(&format!("Factorial of {} is {}", input, factorial_result).into());
    
    // Step 2: Generate Fibonacci sequence
    let fib_sequence = fibonacci_sequence(input);
    console::log_1(&format!("Fibonacci sequence up to {} terms: {:?}", input, fib_sequence).into());
    
    // Step 3: Find sum of Fibonacci sequence
    let fib_sum: u64 = fib_sequence.iter().sum();
    
    // Step 4: Perform a complex calculation
    let final_result = if factorial_result > fib_sum {
        factorial_result - fib_sum
    } else {
        fib_sum - factorial_result
    };
    
    // Return formatted result
    format!(
        "Input: {}\nFactorial: {}\nFibonacci Sum: {}\nDifference: {}\nSequence: {:?}",
        input, factorial_result, fib_sum, final_result, fib_sequence
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }

    #[test]
    fn test_factorial() {
        assert_eq!(calculate_factorial(0), 1);
        assert_eq!(calculate_factorial(1), 1);
        assert_eq!(calculate_factorial(5), 120);
    }

    #[test]
    fn test_fibonacci() {
        assert_eq!(fibonacci_sequence(1), vec![0]);
        assert_eq!(fibonacci_sequence(5), vec![0, 1, 1, 2, 3]);
    }

    #[test]
    fn test_complex_operation() {
        let result = complex_operation(5);
        assert!(result.contains("Factorial: 120"));
        assert!(result.contains("Sequence: [0, 1, 1, 2, 3]"));
    }
}
