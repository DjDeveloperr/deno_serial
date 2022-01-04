import { cstr } from "./common.ts";
import { UnwrapError, WideCharToMultiByte } from "./kernel32.ts";

const symbols = {
  StringFromGUID2: {
    parameters: [
      "pointer",
      "pointer",
      "u32",
    ],
    result: "i32",
  },

  CLSIDFromString: {
    parameters: [
      "pointer",
      "pointer",
    ],
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
  lib = Deno.dlopen("Ole32", symbols as Symbols).symbols;
}

function checkSupported() {
  if (typeof lib === undefined) {
    throw new Error("This module only works on Windows.");
  }
}

export function StringFromGUID2(guid: Uint8Array) {
  checkSupported();
  const strW = new Uint8Array(40 * 2);
  const strA = new Uint8Array(40);
  let result = lib.StringFromGUID2(guid, strW, 40);
  UnwrapError(result);
  WideCharToMultiByte(0, 0, strW, -1, strA, 40);
  return new TextDecoder().decode(strA);
}

export function CLSIDFromStringA(guidStr: string) {
  checkSupported();
  const strBuf = cstr(guidStr);
  const guid = new Uint8Array(16);
  const result = lib.CLSIDFromString(strBuf, guid);
  UnwrapError(result);
  return guid;
}
