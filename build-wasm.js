const { exec } = require('child_process');
const path = require('path');

const rustWasmPath = path.resolve(__dirname, 'rust_wasm');
const outDir = path.resolve(__dirname, 'public', 'wasm');

const cmd = `wasm-pack build --target web --out-dir ${outDir} --dev`;

console.log('Building WASM module...');
exec(cmd, { cwd: rustWasmPath }, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  console.log(stdout);
  console.log('WASM build completed!');
});