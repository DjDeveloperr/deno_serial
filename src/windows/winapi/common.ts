import { Struct } from "../../../deps.ts";

export type LPCOMMTIMEOUTS = Struct<typeof COMMTIMEOUTS>;

export const COMMTIMEOUTS = {
  ReadIntervalTimeout: "u32",
  ReadTotalTimeoutMultiplier: "u32",
  ReadTotalTimeoutConstant: "u32",
  WriteTotalTimeoutMultiplier: "u32",
  WriteTotalTimeoutConstant: "u32",
} as const;

export type LPCOMMSTAT = Struct<typeof COMMSTAT>;

export const COMMSTAT = {
  fCtsHold: "u32",
  fDsrHold: "u32",
  fRlsdHold: "u32",
  fXoffHold: "u32",
  fXoffSent: "u32",
  fEof: "u32",
  fTxim: "u32",
  fReserved: "u32",
  cbInQue: "u32",
  cbOutQue: "u32",
} as const;

export type LPDEVINFO_DATA = Struct<typeof DEVINFO_DATA>;

export const DEVINFO_DATA = {
  cbSize: "u32",
  ClassGuid: "u8[16]",
  DevInst: "u32",
  Reserved: "u64",
} as const;

export type LPOVERLAPPED = Struct<typeof OVERLAPPED>;

export const OVERLAPPED = {
  Internal: "u64",
  InternalHigh: "u64",
  Pointer: "ptr",
  hEvent: "ptr",
} as const;

export type LPDCB = Struct<typeof DCB>;

export const DCB = {
  DCBlength: "u32",
  BaudRate: "u32",
  fBinary: "u32",
  fParity: "u32",
  fOutxCtsFlow: "u32",
  fOutxDsrFlow: "u32",
  fDtrControl: "u32",
  fDsrSensitivity: "u32",
  fTXContinueOnXoff: "u32",
  fOutX: "u32",
  fInX: "u32",
  fErrorChar: "u32",
  fNull: "u32",
  fRtsControl: "u32",
  fAbortOnError: "u32",
  fDummy2: "u32",
  wReserved: "u16",
  XonLim: "u16",
  XoffLim: "u16",
  ByteSize: "u8",
  Parity: "u8",
  StopBits: "u8",
  XonChar: "u8",
  XoffChar: "u8",
  ErrorChar: "u8",
  EofChar: "u8",
  EvtChar: "u8",
  wReserved1: "u16",
} as const;

export type POINTER = Deno.UnsafePointer;
export type PVOID = POINTER;
export type HANDLE = PVOID;
export type BOOL = number;
export type DWORD = number;
export type LPCWSTR = string;
export type LPSECURITY_ATTRIBUTES = POINTER;
export type LPVOID = PVOID;

export function cstr(str: string) {
  const buf = new Uint8Array(str.length + 1);
  buf.set((Deno as any).core.encode(str));
  return buf;
}
