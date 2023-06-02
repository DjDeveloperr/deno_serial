export interface Serial {
  getPorts(): Promise<SerialPort[]>;
}

export interface SerialPortInfo {
  name: string;
  friendlyName?: string;
  manufacturer?: string;
  usbVendorId?: number;
  usbProductId?: number;
  serialNumber?: string;
}

export type ParityType = "none" | "even" | "odd";
export type FlowControlType = "none" | "software" | "hardware";

export interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: ParityType;
  bufferSize?: number;
  flowControl?: FlowControlType;
}

export interface SerialOutputSignals {
  dataTerminalReady?: boolean;
  requestToSend?: boolean;
  break?: boolean;
}

export interface SerialInputSignals {
  dataCarrierDetect: boolean;
  ringIndicator: boolean;
  dataSetReady: boolean;
  clearToSend: boolean;
}

export interface SerialPort extends EventTarget {
  getInfo(): Promise<SerialPortInfo>;

  open(options: SerialOptions): Promise<void>;

  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;

  setSignals(signals: SerialOutputSignals): Promise<void>;
  getSignals(): Promise<SerialInputSignals>;

  close(): Promise<void>;
}
