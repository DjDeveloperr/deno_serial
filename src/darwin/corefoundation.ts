const corefoundation = Deno.dlopen(
  "/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation",
  {
    CFStringCreateWithBytes: {
      parameters: ["pointer", "buffer", "i32", "u32", "bool"],
      result: "pointer",
    },

    CFRelease: {
      parameters: ["pointer"],
      result: "void",
    },

    CFDictionarySetValue: {
      parameters: ["pointer", "pointer", "pointer"],
      result: "void",
    },

    CFRetain: {
      parameters: ["pointer"],
      result: "pointer",
    },

    CFDictionaryGetValue: {
      parameters: ["pointer", "pointer"],
      result: "pointer",
    },

    CFGetTypeID: {
      parameters: ["pointer"],
      result: "u32",
    },

    CFStringGetTypeID: {
      parameters: [],
      result: "u32",
    },

    CFStringGetCString: {
      parameters: ["pointer", "buffer", "i32", "u32"],
      result: "bool",
    },

    CFNumberGetValue: {
      parameters: ["pointer", "i32", "buffer"],
      result: "bool",
    },
  },
).symbols;

export default corefoundation;

export function createCFString(str: string) {
  const buffer = new TextEncoder().encode(str);
  return corefoundation.CFStringCreateWithBytes(
    null,
    buffer,
    buffer.byteLength,
    0x08000100,
    false,
  );
}
