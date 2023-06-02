import { cString, Deferred } from "../common/util.ts";
import { AIOCB } from "./aio.ts";
import nix, { unwrap } from "./nix.ts";
import { Termios } from "./termios.ts";
import {
  SerialOptions,
  SerialOutputSignals,
  SerialPort,
  SerialPortInfo,
} from "../common/web_serial.ts";

export class SerialPortDarwin extends EventTarget implements SerialPort {
  #info: SerialPortInfo;
  #fd?: number;

  #state = "closed";
  #bufferSize?: number;
  #readable?: ReadableStream<Uint8Array>;
  #readFatal = false;
  #writable?: WritableStream<Uint8Array>;
  #writeFatal = false;
  #pendingClosePromise?: Deferred;

  constructor(info: SerialPortInfo) {
    super();
    this.#info = info;
  }

  getInfo(): Promise<SerialPortInfo> {
    return Promise.resolve(this.#info);
  }

  async open(options: SerialOptions) {
    if (this.#state !== "closed") {
      throw new DOMException("Port is already open", "InvalidStateError");
    }

    if (options.dataBits && options.dataBits !== 7 && options.dataBits !== 8) {
      throw new TypeError("Invalid dataBits, must be one of: 7, 8");
    }

    if (options.stopBits && options.stopBits !== 1 && options.stopBits !== 2) {
      throw new TypeError("Invalid stopBits, must be one of: 1, 2");
    }

    if (options.bufferSize === 0) {
      throw new TypeError("Invalid bufferSize, must be greater than 0");
    }

    if (
      options.flowControl && options.flowControl !== "none" &&
      options.flowControl !== "software" && options.flowControl !== "hardware"
    ) {
      throw new TypeError(
        "Invalid flowControl, must be one of: none, software, hardware",
      );
    }

    if (
      options.parity && options.parity !== "none" &&
      options.parity !== "even" && options.parity !== "odd"
    ) {
      throw new TypeError(
        "Invalid parity, must be one of: none, even, odd",
      );
    }

    const fd = await nix.open(
      cString(this.#info.name),
      131078,
      0,
    );
    unwrap(fd);
    this.#fd = fd;

    unwrap(nix.ioctl(fd, 536900621));

    let termios = new Termios();
    unwrap(nix.tcgetattr(fd, termios.data));

    termios.cflag |= 34816;

    nix.cfmakeraw(termios.data);

    unwrap(nix.tcsetattr(fd, 0, termios.data));

    const actualTermios = new Termios();
    unwrap(nix.tcgetattr(fd, actualTermios.data));

    if (
      actualTermios.iflag !== termios.iflag ||
      actualTermios.oflag !== termios.oflag ||
      actualTermios.cflag !== termios.cflag ||
      actualTermios.lflag !== termios.lflag
    ) {
      throw new Error("Failed to apply termios settings");
    }

    unwrap(nix.fcntl(fd, 4, 0)); // F_SETFL

    termios = Termios.get(fd);
    termios.setParity(options.parity ?? "none");
    termios.setFlowControl(options.flowControl ?? "none");
    termios.setDataBits(options.dataBits ?? 8);
    termios.setStopBits(options.stopBits ?? 1);
    termios.set(fd, options.baudRate);

    this.#state = "opened";
    this.#bufferSize = options.bufferSize ?? 255;
  }

  #aiocbs = new Set<AIOCB>();

  get readable() {
    if (this.#readable) {
      return this.#readable;
    }

    if (this.#state !== "opened" || this.#readFatal) {
      return null;
    }

    const highWaterMark = this.#bufferSize!;

    const stream = new ReadableStream({
      type: "bytes",
      pull: async (controller) => {
        const read = async (buffer: Uint8Array) => {
          const aio = new AIOCB(this.#fd!, buffer);
          aio.read();
          this.#aiocbs.add(aio);
          await aio.suspend();
          this.#aiocbs.delete(aio);
          return aio.return();
        };

        if (controller.byobRequest) {
          if (controller.byobRequest.view) {
            const buffer = new Uint8Array(
              controller.byobRequest.view.buffer,
              controller.byobRequest.view.byteOffset,
              controller.byobRequest.view.byteLength,
            );
            const nread = await read(buffer);
            if (nread === 0) {
              controller.close();
              return;
            }
            controller.byobRequest.respond(nread);
          } else {
            const buffer = new Uint8Array(
              controller.desiredSize ?? highWaterMark,
            );
            const nread = await read(buffer);
            if (nread === 0) {
              controller.close();
              return;
            }
            controller.byobRequest.respondWithNewView(
              buffer.subarray(0, nread),
            );
          }
        } else {
          const buffer = new Uint8Array(
            controller.desiredSize ?? highWaterMark,
          );
          const nread = await read(buffer);
          if (nread === 0) {
            controller.close();
            return;
          }
          controller.enqueue(buffer.subarray(0, nread));
        }
      },

      cancel: () => {
        nix.tcflush(this.#fd!, 0);
        this.#readable = undefined;
        if (this.#writable === null && this.#pendingClosePromise) {
          this.#pendingClosePromise.resolve();
        }
        return Promise.resolve();
      },
    }, { highWaterMark });

    this.#readable = stream;

    return stream;
  }

  get writable() {
    if (this.#writable) {
      return this.#writable;
    }

    if (this.#state !== "opened" || this.#writeFatal) {
      return null;
    }

    const highWaterMark = this.#bufferSize!;

    const stream = new WritableStream<Uint8Array>({
      write: async (chunk) => {
        await nix.write(this.#fd!, chunk, chunk.byteLength);
      },

      close: () => {
        nix.tcflush(this.#fd!, 1);
        this.#writable = undefined;
        if (this.#readable === null && this.#pendingClosePromise) {
          this.#pendingClosePromise.resolve();
        }
        return Promise.resolve();
      },

      abort: () => {
        nix.tcflush(this.#fd!, 1);
        this.#writable = undefined;
        if (this.#readable === null && this.#pendingClosePromise) {
          this.#pendingClosePromise.resolve();
        }
        return Promise.resolve();
      },
    }, { highWaterMark, size: () => highWaterMark });

    this.#writable = stream;

    return stream;
  }

  async setSignals(_signals: SerialOutputSignals) {
    // TODO
  }

  // deno-lint-ignore require-await
  async getSignals() {
    // TODO
    return {
      dataCarrierDetect: false,
      ringIndicator: false,
      dataSetReady: false,
      clearToSend: false,
    };
  }

  close() {
    if (this.#state !== "opened") {
      throw new DOMException("Port is not open", "InvalidStateError");
    }

    for (const aio of this.#aiocbs) {
      console.log(nix.aio_error(aio.data));
      console.log(nix.aio_return(aio.data));
      console.log(nix.aio_cancel(this.#fd!, aio.data));
    }

    console.log(unwrap(nix.aio_cancel(this.#fd!, null)));

    const pendingClosePromise = new Deferred();

    if (this.#readable === null && this.#writable === null) {
      pendingClosePromise.resolve();
    } else {
      this.#pendingClosePromise = pendingClosePromise;
    }

    const cancelPromise = this.#readable
      ? this.#readable.cancel()
      : Promise.resolve();
    const abortPromise = this.#writable
      ? this.#writable.abort()
      : Promise.resolve();

    this.#state = "closing";

    return Promise.all([cancelPromise, abortPromise, pendingClosePromise]).then(
      () => {
        unwrap(
          nix.ioctl(
            this.#fd!,
            536900622,
          ),
        );
        unwrap(nix.close(this.#fd!));
        this.#state = "closed";
        this.#readFatal = this.#writeFatal = false;
        this.#pendingClosePromise = undefined;
      },
      (r) => {
        this.#pendingClosePromise = undefined;
        throw r;
      },
    );
  }

  [Symbol.for("Deno.customInspect")](
    inspect: typeof Deno.inspect,
    options: Deno.InspectOptions,
  ) {
    return `SerialPort ${
      inspect({ name: this.#info.name, state: this.#state }, options)
    }`;
  }
}
