import {
  cstr,
  DCB,
  DWORD,
  HANDLE,
  LPCOMMSTAT,
  LPCOMMTIMEOUTS,
  LPCWSTR,
  LPDCB,
  LPOVERLAPPED,
  LPSECURITY_ATTRIBUTES,
} from "./common.ts";
import { Struct } from "../../../deps.ts";

const symbols = {
  CreateFileA: {
    parameters: [
      "pointer",
      "u32",
      "u32",
      "pointer",
      "u32",
      "u32",
      "pointer",
    ],
    result: "pointer",
  },

  ReadFile: {
    parameters: [
      "pointer",
      "pointer",
      "u32",
      "pointer",
      "pointer",
    ],
    result: "i32",
  },

  WriteFile: {
    parameters: [
      "pointer",
      "pointer",
      "u32",
      "pointer",
      "pointer",
    ],
    result: "i32",
  },

  FlushFileBuffers: {
    parameters: ["pointer"],
    result: "i32",
  },

  SetCommBreak: {
    parameters: ["pointer"],
    result: "i32",
  },

  ClearCommBreak: {
    parameters: ["pointer"],
    result: "i32",
  },

  PurgeComm: {
    parameters: ["pointer", "u32"],
    result: "i32",
  },

  SetCommTimeouts: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },

  EscapeCommFunction: {
    parameters: ["pointer", "u32"],
    result: "i32",
  },

  ClearCommError: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "i32",
  },

  GetCommState: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },

  SetCommState: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },

  GetCommModemStatus: {
    parameters: [
      "pointer",
      "pointer",
    ],
    result: "i32",
  },

  GetCurrentProcess: {
    parameters: [],
    result: "pointer",
  },

  CloseHandle: {
    parameters: ["pointer"],
    result: "i32",
  },

  GetLastError: {
    parameters: [],
    result: "u32",
  },

  SetLastError: {
    parameters: ["u32"],
    result: "void",
  },

  FormatMessageA: {
    parameters: [
      "u32",
      "pointer",
      "u32",
      "u32",
      "pointer",
      "u32",
      "pointer",
    ],
    result: "u32",
  },

  WideCharToMultiByte: {
    parameters: [
      "u32",
      "u32",
      "pointer",
      "i32",
      "pointer",
      "i32",
      "pointer",
      "pointer",
    ],
    result: "u32",
  },

  GetOverlappedResult: {
    nonblocking: true,
    parameters: ["pointer", "pointer", "pointer", "i32"],
    result: "i32",
  },

  CancelIoEx: {
    parameters: ["pointer", "pointer"],
    result: "i32",
  },
} as const;

type Symbols = {
  [name in keyof typeof symbols]: {
    nonblocking?: boolean;
    parameters: [...typeof symbols[name]["parameters"]];
    result: typeof symbols[name]["result"];
  };
};

let lib!: Deno.DynamicLibrary<Symbols>["symbols"];

if (Deno.build.os === "windows") {
  lib = Deno.dlopen("Kernel32", symbols as Symbols).symbols;
}

function checkSupported() {
  if (typeof lib === undefined) {
    throw new Error("This module only works on Windows.");
  }
}

export const GENERIC_READ = 0x80000000;
export const GENERIC_WRITE = 0x40000000;
export const OPEN_EXISTING = 3;
export const FILE_FLAG_OVERLAPPED = 0x40000000;
export const FILE_ATTRIBUTE_NORMAL = 0x80;

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilea
 */
export function CreateFileA(
  lpFileName: LPCWSTR,
  dwDesiredAccess: DWORD,
  dwShareMode: DWORD,
  lpSecurityAttributes: LPSECURITY_ATTRIBUTES | null,
  dwCreationDisposition: DWORD,
  dwFlagsAndAttributes: DWORD,
  hTemplateFile: HANDLE | null,
): HANDLE {
  checkSupported();
  const lpFileNamePtr = cstr(lpFileName);
  const handle = lib.CreateFileA(
    lpFileNamePtr,
    dwDesiredAccess >>> 0,
    dwShareMode >>> 0,
    lpSecurityAttributes,
    dwCreationDisposition >>> 0,
    dwFlagsAndAttributes >>> 0,
    hTemplateFile,
  ) as HANDLE;
  UnwrapError(handle.value);
  return handle;
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-readfile
 */
export function ReadFile(
  hFile: HANDLE,
  lpBuffer: Uint8Array,
  lpOverlapped: LPOVERLAPPED | null,
) {
  checkSupported();
  UnwrapError(
    lib.ReadFile(
      hFile,
      lpBuffer,
      lpBuffer.byteLength,
      null,
      lpOverlapped ? new Uint8Array(lpOverlapped._buffer) : null,
    ),
    [997],
  );
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-writefile
 */
export function WriteFile(
  hFile: HANDLE,
  lpBuffer: Uint8Array,
  lpOverlapped: LPOVERLAPPED | null,
) {
  checkSupported();
  UnwrapError(
    lib.WriteFile(
      hFile,
      lpBuffer,
      lpBuffer.byteLength,
      null,
      lpOverlapped ? new Uint8Array(lpOverlapped._buffer) : null,
    ),
    [997],
  );
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers
 */
export function FlushFileBuffers(hFile: HANDLE): void {
  checkSupported();
  UnwrapError(lib.FlushFileBuffers(hFile));
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-setcommbreak
 */
export function SetCommBreak(hFile: HANDLE): void {
  checkSupported();
  UnwrapError(lib.SetCommBreak(hFile));
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-clearcommbreak
 */
export function ClearCommBreak(hFile: HANDLE): void {
  checkSupported();
  UnwrapError(lib.ClearCommBreak(hFile));
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-purgecomm
 */
export function PurgeComm(hFile: HANDLE, dwFlags: DWORD): void {
  checkSupported();
  UnwrapError(lib.PurgeComm(hFile, dwFlags));
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-setcommtimeouts
 */
export function SetCommTimeouts(
  hFile: HANDLE,
  lpCommTimeouts: LPCOMMTIMEOUTS,
): void {
  checkSupported();
  UnwrapError(
    lib.SetCommTimeouts(
      hFile,
      new Uint8Array(lpCommTimeouts._buffer),
    ),
  );
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-escapecommfunction
 */
export function EscapeCommFunction(
  hFile: HANDLE,
  dwFunc: DWORD,
): void {
  checkSupported();
  UnwrapError(lib.EscapeCommFunction(hFile, dwFunc));
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getcommstat
 */
export function ClearCommError(
  hFile: HANDLE,
  lpErrors: Uint32Array,
  lpStat: LPCOMMSTAT,
): void {
  checkSupported();
  UnwrapError(
    lib.ClearCommError(hFile, lpErrors, new Uint8Array(lpStat._buffer)),
  );
}

export function GetCommState(hFile: HANDLE): LPDCB {
  checkSupported();
  const dcb = Struct(DCB);
  UnwrapError(lib.GetCommState(hFile, new Uint8Array(dcb._buffer)));
  return dcb;
}

export function SetCommState(hFile: HANDLE, dcb: LPDCB): void {
  checkSupported();
  UnwrapError(lib.SetCommState(hFile, new Uint8Array(dcb._buffer)));
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-getcommmodemstatus
 */
export function GetCommModemStatus(hFile: HANDLE): DWORD {
  checkSupported();
  const lpModemStatBuf = new Uint32Array(1);
  UnwrapError(lib.GetCommModemStatus(hFile, lpModemStatBuf));
  return lpModemStatBuf[0];
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getcurrentprocess
 */
export function GetCurrentProcess(): HANDLE {
  checkSupported();
  const handle = lib.GetCurrentProcess() as HANDLE;
  UnwrapError(handle.value);
  return handle;
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/handleapi/nf-handleapi-closehandle
 */
export function CloseHandle(hObject: HANDLE) {
  checkSupported();
  UnwrapError(lib.CloseHandle(hObject));
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/errhandlingapi/nf-errhandlingapi-getlasterror
 */
export function GetLastError(): DWORD {
  checkSupported();
  return lib.GetLastError() as DWORD;
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-formatmessagew
 */
export function FormatMessage(errCode: number): string {
  checkSupported();
  const lpBufferPtr = new Uint8Array(8);

  lib.FormatMessageA(
    0x00000100 | 0x00001000 | 0x00000200,
    null,
    errCode,
    0,
    lpBufferPtr,
    0,
    null,
  ) as DWORD;

  // if (result !== 1) {
  //   throw new Error(`FormatMessage failed with error code ${GetLastError()}`);
  // }

  const lpBufferView = new Deno.UnsafePointerView(
    new Deno.UnsafePointer(new BigUint64Array(lpBufferPtr.buffer)[0]),
  );
  return lpBufferView.getCString();
}

export function UnwrapError(result: unknown, exclude: number[] = []) {
  if (
    (typeof result === "bigint"
      ? (result === 0n || result === 0xffffffffffffffffn)
      : result === 0)
  ) {
    const lastError = GetLastError();
    if (exclude.includes(lastError)) return;
    if (lastError === 0) return;
    throw new Error(`(${lastError}) ${FormatMessage(lastError)}`);
  }
}

export function WideCharToMultiByte(
  codePage: number,
  dwFlags: number,
  lpWideCharStr: Uint8Array,
  cchWideChar: number,
  lpMultiByteStr: Uint8Array,
  cbMultiByte: number,
) {
  checkSupported();
  const result = lib.WideCharToMultiByte(
    codePage,
    dwFlags,
    lpWideCharStr,
    cchWideChar,
    lpMultiByteStr,
    cbMultiByte,
    null,
    null,
  );
  UnwrapError(result);
}

export async function GetOverlappedResult(
  hFile: HANDLE,
  lpOverlapped: LPOVERLAPPED,
  bWait: boolean,
): Promise<number> {
  checkSupported();
  const lpNumberOfBytesTransferred = new Uint32Array(4);
  const result = await lib.GetOverlappedResult(
    hFile,
    lpOverlapped ? new Uint8Array(lpOverlapped._buffer) : null,
    lpNumberOfBytesTransferred,
    Number(bWait),
  ) as number;
  UnwrapError(result);
  return lpNumberOfBytesTransferred[0];
}

export function CancelIoEx(
  hFile: HANDLE,
  lpOverlapped: LPOVERLAPPED,
): void {
  checkSupported();
  UnwrapError(
    lib.CancelIoEx(
      hFile,
      lpOverlapped ? new Uint8Array(lpOverlapped._buffer) : null,
    ),
  );
}
