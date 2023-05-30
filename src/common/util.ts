export function cString(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str + "\0");
}

export function refptr() {
  return new Uint8Array(8);
}

export function deref(ptr: Uint8Array): Deno.PointerValue {
  return Deno.UnsafePointer.create(new BigUint64Array(ptr.buffer)[0]);
}
