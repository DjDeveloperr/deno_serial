import {
  ClearBuffer,
  DataBits,
  FlowControl,
  Parity,
  SerialOpenOptions,
  SerialPort,
  StopBits,
} from "../common/serial_port.ts";
import { Comm, Foundation, Fs, OverlappedPromise, unwrap } from "./deps.ts";

// deno-fmt-ignore
const         fBinary = 0b0000_0000_0000_0001;
// deno-fmt-ignore
const         fParity = 0b0000_0000_0000_0010;
// deno-fmt-ignore
const    fOutxCtsFlow = 0b0000_0000_0000_0100;
// deno-fmt-ignore
const    fOutxDsrFlow = 0b0000_0000_0000_1000;
// deno-fmt-ignore
const    fDtrControl0 = 0b0000_0000_0001_0000;
// deno-fmt-ignore
const    fDtrControl1 = 0b0000_0000_0010_0000;
// deno-fmt-ignore
const fDsrSensitivity = 0b0000_0000_0100_0000;
// deno-fmt-ignore
const           fOutX = 0b0000_0001_0000_0000;
// deno-fmt-ignore
const            fInX = 0b0000_0010_0000_0000;
// deno-fmt-ignore
const      fErrorChar = 0b0000_0100_0000_0000;
// deno-fmt-ignore
const           fNull = 0b0000_1000_0000_0000;
// deno-fmt-ignore
const    fRtsControl0 = 0b0001_0000_0000_0000;
// deno-fmt-ignore
const    fRtsControl1 = 0b0010_0000_0000_0000;
// deno-fmt-ignore
const     fRtsControl = 0b0011_0000_0000_0000;
// deno-fmt-ignore
const   fAbortOnError = 0b0100_0000_0000_0000;

function getbit(bits: number, bit: number) {
  return (bits & bit) === bit;
}

function setbit(bits: number, bit: number, value: boolean) {
  if (value) {
    return bits | bit;
  } else {
    return bits & ~bit;
  }
}

function flowControlToDcb(flowControl: FlowControl, dcb: Comm.DCBView) {
  let bits = dcb._bitfield;
  switch (flowControl) {
    case FlowControl.NONE:
      bits = setbit(bits, fOutxCtsFlow, false);
      bits = setbit(bits, fRtsControl0, false);
      bits = setbit(bits, fRtsControl1, false);
      bits = setbit(bits, fOutX, false);
      bits = setbit(bits, fInX, false);
      break;
    case FlowControl.SOFTWARE:
      bits = setbit(bits, fOutxCtsFlow, true);
      bits = setbit(bits, fRtsControl0, false);
      bits = setbit(bits, fRtsControl1, false);
      bits = setbit(bits, fOutX, true);
      bits = setbit(bits, fInX, true);
      break;
    case FlowControl.HARDWARE:
      bits = setbit(bits, fOutxCtsFlow, false);
      bits = setbit(bits, fRtsControl0, true);
      bits = setbit(bits, fRtsControl1, false);
      bits = setbit(bits, fOutX, false);
      bits = setbit(bits, fInX, false);
      break;
  }
  dcb._bitfield = bits;
}

function dcbToFlowControl(dcb: Comm.DCBView) {
  const bits = dcb._bitfield;
  if (getbit(bits, fOutxCtsFlow)) {
    return FlowControl.SOFTWARE;
  } else if (getbit(bits, fRtsControl0)) {
    return FlowControl.HARDWARE;
  } else {
    return FlowControl.NONE;
  }
}

const comstat = Comm.allocCOMSTAT();

export class SerialPortWin implements SerialPort {
  #handle: Deno.PointerValue;
  #timeout = 100;

  readonly name?: string;

  #_dcb: Comm.DCBView;

  constructor(options: SerialOpenOptions) {
    this.#handle = Fs.CreateFileA(
      "\\\\.\\" + options.name,
      Fs.FILE_GENERIC_READ | Fs.FILE_GENERIC_WRITE,
      0,
      0,
      Fs.OPEN_EXISTING,
      Fs.FILE_ATTRIBUTE_NORMAL | Fs.FILE_FLAG_OVERLAPPED,
      null,
    )!;

    this.name = options.name;
    const dcb = Comm.allocDCB();
    unwrap(Comm.GetCommState(this.#handle, dcb));
    const dv = new Comm.DCBView(dcb);
    dv.XonChar = 17;
    dv.XoffChar = 19;
    dv.ErrorChar = 0;
    dv.EofChar = 26;
    let bitfield = dv._bitfield;
    bitfield = setbit(bitfield, fBinary, true);
    bitfield = setbit(bitfield, fOutxDsrFlow, false);
    bitfield = setbit(bitfield, fDtrControl0, false);
    bitfield = setbit(bitfield, fDtrControl1, false);
    bitfield = setbit(bitfield, fDsrSensitivity, false);
    bitfield = setbit(bitfield, fErrorChar, false);
    bitfield = setbit(bitfield, fNull, false);
    bitfield = setbit(bitfield, fAbortOnError, false);

    dv.BaudRate = options.baudRate;
    dv.ByteSize = options.dataBits || DataBits.EIGHT;
    dv.StopBits = options.stopBits || StopBits.ONE;
    dv.Parity = options.parity || Parity.NONE;
    flowControlToDcb(options.flowControl || FlowControl.NONE, dv);
    Comm.SetCommState(this.#handle, dcb);

    this.#_dcb = dv;

    this.timeout = options.timeout ?? 0;
  }

  get #dcb() {
    unwrap(Comm.GetCommState(this.#handle, this.#_dcb.buffer));
    return this.#_dcb;
  }

  set #dcb(dcb: Comm.DCBView) {
    unwrap(Comm.SetCommState(this.#handle, dcb.buffer));
  }

  get baudRate(): number {
    return this.#dcb.BaudRate;
  }

  set baudRate(value: number) {
    const dcb = this.#dcb;
    dcb.BaudRate = value;
    this.#dcb = dcb;
  }

  get dataBits(): DataBits {
    return this.#dcb.ByteSize;
  }

  set dataBits(value: DataBits) {
    const dcb = this.#dcb;
    dcb.ByteSize = value;
    this.#dcb = dcb;
  }

  set stopBits(value: StopBits) {
    const dcb = this.#dcb;
    dcb.StopBits = value;
    this.#dcb = dcb;
  }

  get stopBits(): StopBits {
    return this.#dcb.StopBits;
  }

  get parity(): Parity {
    return this.#dcb.Parity;
  }

  set parity(value: Parity) {
    const dcb = this.#dcb;
    dcb.Parity = value;
    this.#dcb = dcb;
  }

  get flowControl(): FlowControl {
    const dcb = this.#dcb;
    return dcbToFlowControl(dcb);
  }

  set flowControl(value: FlowControl) {
    const dcb = this.#dcb;
    flowControlToDcb(value, dcb);
    this.#dcb = dcb;
  }

  get timeout() {
    return this.#timeout;
  }

  set timeout(ms: number) {
    const timeouts = Comm.allocCOMMTIMEOUTS({
      ReadTotalTimeoutConstant: ms,
    });
    Comm.SetCommTimeouts(this.#handle, timeouts);
    this.#timeout = ms;
  }

  writeRequestToSend(level: boolean): void {
    Comm.EscapeCommFunction(this.#handle, level ? 3 : 4);
  }

  writeDataTerminalReady(level: boolean): void {
    Comm.EscapeCommFunction(this.#handle, level ? 5 : 6);
  }

  get #modemStatus() {
    const status = new Uint32Array(1);
    unwrap(
      Comm.GetCommModemStatus(this.#handle, new Uint8Array(status.buffer)),
    );
    return status[0];
  }

  readClearToSend(): boolean {
    return (this.#modemStatus & 0x0010) !== 0;
  }

  readDataSetReady(): boolean {
    return (this.#modemStatus & 0x0020) !== 0;
  }

  readRingIndicator(): boolean {
    return (this.#modemStatus & 0x0040) !== 0;
  }

  readCarrierDetect(): boolean {
    return (this.#modemStatus & 0x0080) !== 0;
  }

  bytesToRead(): number {
    const errors = new Uint32Array(1);
    Comm.ClearCommError(this.#handle, new Uint8Array(errors.buffer), comstat);
    return new Comm.COMSTATView(comstat).cbInQue;
  }

  bytesToWrite(): number {
    const errors = new Uint32Array(1);
    Comm.ClearCommError(this.#handle, new Uint8Array(errors.buffer), comstat);
    return new Comm.COMSTATView(comstat).cbOutQue;
  }

  clear(buffer: ClearBuffer): void {
    Comm.PurgeComm(
      this.#handle,
      ({
        [ClearBuffer.INPUT]: 0x0001 | 0x0004,
        [ClearBuffer.OUTPUT]: 0x0002 | 0x0008,
        [ClearBuffer.ALL]: 0x0001 | 0x0002 | 0x0004 | 0x0008,
      })[buffer],
    );
  }

  setBreak(): void {
    Comm.SetCommBreak(this.#handle);
  }

  clearBreak(): void {
    Comm.ClearCommBreak(this.#handle);
  }

  flush(): void {
    Fs.FlushFileBuffers(this.#handle);
  }

  #pending = new Set<AbortController>();

  async read(p: Uint8Array): Promise<number | null> {
    try {
      const controller = new AbortController();
      const overlapped = new OverlappedPromise(this.#handle, controller.signal);
      // const bytes = new Uint32Array(1);
      Fs.ReadFile(
        this.#handle,
        p,
        p.byteLength,
        0, // new Uint8Array(bytes.buffer),
        overlapped.buffer,
      );
      this.#pending.add(controller);
      await overlapped;
      this.#pending.delete(controller);
      return Number(overlapped.internalHigh);
    } catch (e) {
      return null;
    }
  }

  async write(p: Uint8Array): Promise<number> {
    const controller = new AbortController();
    const overlapped = new OverlappedPromise(this.#handle, controller.signal);
    // const bytes = new Uint32Array(1);
    Fs.WriteFile(
      this.#handle,
      p,
      p.byteLength,
      0, // new Uint8Array(bytes.buffer),
      overlapped.buffer,
    );
    this.#pending.add(controller);
    await overlapped;
    this.#pending.delete(controller);
    return Number(overlapped.internalHigh);
  }

  close(): void {
    for (const overlapped of this.#pending) {
      overlapped.abort();
    }
    Foundation.CloseHandle(this.#handle);
  }
}
