import * as imports from "./wasmchannel_bg.js";

// switch between both syntax for node and for workerd
import wkmod from "./wasmchannel_bg.wasm";
import * as nodemod from "./wasmchannel_bg.wasm";

if (typeof process !== "undefined" && process.release?.name === "node") {
  imports.__wbg_set_wasm(nodemod);
} else {
  const instance = new WebAssembly.Instance(wkmod, {
    "./wasmchannel_bg.js": imports,
  });
  imports.__wbg_set_wasm(instance.exports);
}

export * from "./wasmchannel_bg.js";
