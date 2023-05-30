import { cString } from "../common/util.ts";

export const kIOSerialBSDServiceValue = cString("IOSerialBSDClient");

export default Deno.dlopen("/System/Library/Frameworks/IOKit.framework/IOKit", {
  IOServiceMatching: {
    parameters: ["buffer"],
    result: "pointer",
  },

  IOServiceGetMatchingServices: {
    parameters: ["pointer", "pointer", "buffer"],
    result: "i32",
  },

  IOIteratorNext: {
    parameters: ["pointer"],
    result: "pointer",
  },

  IORegistryEntryCreateCFProperties: {
    parameters: ["pointer", "buffer", "pointer", "i32"],
    result: "i32",
  },

  IOObjectGetClass: {
    parameters: ["pointer", "buffer"],
    result: "i32",
  },

  IORegistryEntryGetParentEntry: {
    parameters: ["pointer", "buffer", "buffer"],
    result: "i32",
  },

  IORegistryEntryCreateCFProperty: {
    parameters: ["pointer", "pointer", "pointer", "i32"],
    result: "pointer",
  },
}).symbols;

export function ioreturn(result: number) {
  if (result !== 0) {
    throw new Error(`IOKit error: ${result}`);
  }
}
