import { Struct } from "../../deps.ts";
import {
  ClearBuffer,
  DataBits,
  FlowControl,
  Parity,
  SerialOpenOptions,
  SerialPort,
  StopBits,
} from "../common/serial_port.ts";
import {
  CancelIoEx,
  ClearCommBreak,
  ClearCommError,
  CloseHandle,
  COMMSTAT,
  COMMTIMEOUTS,
  CreateFileA,
  EscapeCommFunction,
  FILE_ATTRIBUTE_NORMAL,
  FILE_FLAG_OVERLAPPED,
  FlushFileBuffers,
  GENERIC_READ,
  GENERIC_WRITE,
  GetCommModemStatus,
  GetCommState,
  GetOverlappedResult,
  HANDLE,
  LPDCB,
  LPOVERLAPPED,
  OPEN_EXISTING,
  OVERLAPPED,
  PurgeComm,
  ReadFile,
  SetCommBreak,
  SetCommState,
  SetCommTimeouts,
  WriteFile,
} from "./winapi/mod.ts";

function flowControlToDcb(flowControl: FlowControl, dcb: LPDCB) {
  switch (flowControl) {
    case FlowControl.NONE:
      dcb.fOutxCtsFlow = 0;
      dcb.fRtsControl = 0;
      dcb.fOutX = 0;
      dcb.fInX = 0;
      break;
    case FlowControl.SOFTWARE:
      dcb.fOutxCtsFlow = 1;
      dcb.fRtsControl = 0;
      dcb.fOutX = 0;
      dcb.fInX = 0;
      break;
    case FlowControl.HARDWARE:
      dcb.fOutxCtsFlow = 0;
      dcb.fRtsControl = 2;
      dcb.fOutX = 0;
      dcb.fInX = 0;
      break;
  }
}

function dcbToFlowControl(dcb: LPDCB) {
  if (dcb.fOutxCtsFlow) {
    return FlowControl.SOFTWARE;
  } else if (dcb.fRtsControl === 2) {
    return FlowControl.HARDWARE;
  } else {
    return FlowControl.NONE;
  }
}

export class SerialPortWin implements SerialPort {
  #handle: HANDLE;
  #timeout = 100;

  readonly name?: string;

  constructor(options: SerialOpenOptions) {
    this.#handle = CreateFileA(
      "\\\\.\\" + options.name,
      GENERIC_READ | GENERIC_WRITE,
      0,
      null,
      OPEN_EXISTING,
      FILE_FLAG_OVERLAPPED | FILE_ATTRIBUTE_NORMAL,
      null,
    );

    this.name = options.name;
    const dcb = GetCommState(this.#handle);
    dcb.XonChar = 17;
    dcb.XoffChar = 19;
    dcb.ErrorChar = 0;
    dcb.EofChar = 26;
    dcb.fBinary = 1;
    dcb.fOutxDsrFlow = 0;
    dcb.fDtrControl = 0;
    dcb.fDsrSensitivity = 0;
    dcb.fErrorChar = 0;
    dcb.fNull = 0;
    dcb.fAbortOnError = 0;

    dcb.BaudRate = options.baudRate;
    dcb.ByteSize = options.dataBits || DataBits.EIGHT;
    dcb.StopBits = options.stopBits || StopBits.ONE;
    dcb.Parity = options.parity || Parity.NONE;
    flowControlToDcb(options.flowControl || FlowControl.NONE, dcb);

    SetCommState(this.#handle, dcb);

    this.timeout = options.timeout ?? 0;
  }

  get baudRate(): number {
    const dcb = GetCommState(this.#handle);
    return dcb.BaudRate;
  }

  set baudRate(value: number) {
    const dcb = GetCommState(this.#handle);
    dcb.BaudRate = value;
    SetCommState(this.#handle, dcb);
  }

  get dataBits(): DataBits {
    const dcb = GetCommState(this.#handle);
    return dcb.ByteSize;
  }

  set dataBits(value: DataBits) {
    const dcb = GetCommState(this.#handle);
    dcb.ByteSize = value;
    SetCommState(this.#handle, dcb);
  }

  set stopBits(value: StopBits) {
    const dcb = GetCommState(this.#handle);
    dcb.StopBits = value;
    SetCommState(this.#handle, dcb);
  }

  get stopBits(): StopBits {
    const dcb = GetCommState(this.#handle);
    return dcb.StopBits;
  }

  get parity(): Parity {
    const dcb = GetCommState(this.#handle);
    return dcb.Parity;
  }

  set parity(value: Parity) {
    const dcb = GetCommState(this.#handle);
    dcb.Parity = value;
    SetCommState(this.#handle, dcb);
  }

  get flowControl(): FlowControl {
    const dcb = GetCommState(this.#handle);
    return dcbToFlowControl(dcb);
  }

  set flowControl(value: FlowControl) {
    const dcb = GetCommState(this.#handle);
    flowControlToDcb(value, dcb);
    SetCommState(this.#handle, dcb);
  }

  get timeout() {
    return this.#timeout;
  }

  set timeout(ms: number) {
    const timeouts = Struct(COMMTIMEOUTS);
    timeouts.ReadTotalTimeoutConstant = ms;
    SetCommTimeouts(this.#handle, timeouts);
    this.#timeout = ms;
  }

  writeRequestToSend(level: boolean): void {
    EscapeCommFunction(this.#handle, level ? 3 : 4);
  }

  writeDataTerminalReady(level: boolean): void {
    EscapeCommFunction(this.#handle, level ? 5 : 6);
  }

  readClearToSend(): boolean {
    return (GetCommModemStatus(this.#handle) & 0x0010) !== 0;
  }

  readDataSetReady(): boolean {
    return (GetCommModemStatus(this.#handle) & 0x0020) !== 0;
  }

  readRingIndicator(): boolean {
    return (GetCommModemStatus(this.#handle) & 0x0040) !== 0;
  }

  readCarrierDetect(): boolean {
    return (GetCommModemStatus(this.#handle) & 0x0080) !== 0;
  }

  bytesToRead(): number {
    const comstat = Struct(COMMSTAT);
    const errors = new Uint32Array(1);
    ClearCommError(this.#handle, errors, comstat);
    return comstat.cbInQue;
  }

  bytesToWrite(): number {
    const comstat = Struct(COMMSTAT);
    const errors = new Uint32Array(1);
    ClearCommError(this.#handle, errors, comstat);
    return comstat.cbOutQue;
  }

  clear(buffer: ClearBuffer): void {
    PurgeComm(
      this.#handle,
      ({
        [ClearBuffer.INPUT]: 0x0001 | 0x0004,
        [ClearBuffer.OUTPUT]: 0x0002 | 0x0008,
        [ClearBuffer.ALL]: 0x0001 | 0x0002 | 0x0004 | 0x0008,
      })[buffer],
    );
  }

  setBreak(): void {
    SetCommBreak(this.#handle);
  }

  clearBreak(): void {
    ClearCommBreak(this.#handle);
  }

  flush(): void {
    FlushFileBuffers(this.#handle);
  }

  #pending = new Set<LPOVERLAPPED>();

  async read(p: Uint8Array): Promise<number | null> {
    try {
      const overlapped = Struct(OVERLAPPED);
      ReadFile(this.#handle, p, overlapped);
      this.#pending.add(overlapped);
      await GetOverlappedResult(this.#handle, overlapped, true);
      this.#pending.delete(overlapped);
      return Number(overlapped.InternalHigh);
    } catch (e) {
      return null;
    }
  }

  async write(p: Uint8Array): Promise<number> {
    const overlapped = Struct(OVERLAPPED);
    WriteFile(this.#handle, p, overlapped);
    this.#pending.add(overlapped);
    await GetOverlappedResult(this.#handle, overlapped, true);
    this.#pending.delete(overlapped);
    return Number(overlapped.InternalHigh);
  }

  close(): void {
    for (const overlapped of this.#pending) {
      CancelIoEx(this.#handle, overlapped);
    }
    CloseHandle(this.#handle);
  }
}
