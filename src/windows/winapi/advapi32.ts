import { cstr } from "./common.ts";
import { UnwrapError } from "./kernel32.ts";

const symbols = {
  RegQueryValueExA: {
    parameters: [
      "pointer",
      "pointer",
      "pointer",
      "pointer",
      "pointer",
      "pointer",
    ],
    result: "i32",
  },

  RegCloseKey: {
    parameters: ["pointer"],
    result: "i32",
  },
} as const;

type Symbols = {
  [name in keyof typeof symbols]: {
    parameters: [...typeof symbols[name]["parameters"]];
    result: typeof symbols[name]["result"];
  };
};

let lib!: Deno.DynamicLibrary<Symbols>["symbols"];

if (Deno.build.os === "windows") {
  lib = Deno.dlopen("Advapi32", symbols as Symbols).symbols;
}

function checkSupported() {
  if (typeof lib === undefined) {
    throw new Error("This module only works on Windows.");
  }
}

export function RegQueryValueExA(
  hKey: Deno.UnsafePointer,
  lpValueName: string,
  lpData: Uint8Array,
) {
  checkSupported();
  const len = new Uint32Array([lpData.byteLength]);
  const result = lib.RegQueryValueExA(
    hKey,
    cstr(lpValueName),
    null,
    null,
    lpData,
    len,
  );
  UnwrapError(result);
  return len[0];
}

export function RegCloseKey(hKey: Deno.UnsafePointer) {
  checkSupported();
  const result = lib.RegCloseKey(hKey);
  UnwrapError(result);
}
