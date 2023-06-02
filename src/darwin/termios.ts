import { FlowControlType, ParityType } from "../common/web_serial.ts";
import nix, { unwrap } from "./nix.ts";

const PARENB = 0x00001000;
const PARODD = 0x00002000;
const INPCK = 0x00000010;
const IGNPAR = 0x00000004;

const IXON = 0x00000200;
const IXOFF = 0x00000400;
const CRTSCTS = 0x00010000 | 0x00020000;

const CSTOPB = 0x00000400;
const CS7 = 0x00000200;
const CS8 = 0x00000300;
const CSIZE = 0x00000300;

/**
 * struct termios {
 *  tcflag_t c_iflag;      // input flags
 *  tcflag_t c_oflag;      // output flags
 *  tcflag_t c_cflag;      // control flags
 *  tcflag_t c_lflag;      // local flags
 *  cc_t c_line;           // line discipline
 *  cc_t c_cc[NCCS];       // control characters
 *  speed_t c_ispeed;      // input speed
 *  speed_t c_ospeed;      // output speed
 * };
 *
 * typedef unsigned int tcflag_t;
 * typedef unsigned char cc_t;
 * typedef unsigned int speed_t;
 *
 * #define NCCS 32
 */
export class Termios {
  data: Uint8Array;
  view: DataView;

  constructor() {
    this.data = new Uint8Array(72);
    this.view = new DataView(this.data.buffer);
  }

  static get(fd: number) {
    const termios = new Termios();
    unwrap(nix.tcgetattr(fd, termios.data));
    nix.cfsetospeed(termios.data, 9600);
    nix.cfsetispeed(termios.data, 9600);
    return termios;
  }

  set(fd: number, baudRate: number) {
    nix.cfsetospeed(this.data, baudRate);
    nix.cfsetispeed(this.data, baudRate);

    unwrap(nix.tcsetattr(fd, 0, this.data));

    // if (baudRate > 0) {
    //   unwrap(nix.ioctl1(
    //     fd,
    //     0x80045402,
    //     new Uint8Array(
    //       new BigUint64Array([BigInt(baudRate)]).buffer,
    //     ),
    //   ));
    // }
  }

  setParity(parity: ParityType) {
    switch (parity) {
      case "none":
        this.cflag &= ~(PARENB | PARODD);
        this.iflag &= ~INPCK;
        this.iflag |= IGNPAR;
        break;
      case "odd":
        this.cflag |= PARENB | PARODD;
        this.iflag |= INPCK;
        this.iflag &= ~IGNPAR;
        break;
      case "even":
        this.cflag |= PARENB;
        this.cflag &= ~PARODD;
        this.iflag |= INPCK;
        this.iflag &= ~IGNPAR;
        break;
    }
  }

  setFlowControl(flowControl: FlowControlType) {
    switch (flowControl) {
      case "none":
        this.cflag &= ~CRTSCTS;
        this.iflag &= ~(IXON | IXOFF);
        break;
      case "software":
        this.cflag &= ~CRTSCTS;
        this.iflag |= IXON | IXOFF;
        break;
      case "hardware":
        this.cflag |= CRTSCTS;
        this.iflag &= ~(IXON | IXOFF);
        break;
    }
  }

  setDataBits(dataBits: number) {
    let size = 0;

    switch (dataBits) {
      case 7:
        size = CS7;
        break;
      case 8:
        size = CS8;
        break;
    }

    this.cflag &= ~CSIZE;
    this.cflag |= size;
  }

  setStopBits(stopBits: number) {
    switch (stopBits) {
      case 1:
        this.cflag &= ~CSTOPB;
        break;
      case 2:
        this.cflag |= CSTOPB;
        break;
    }
  }

  get iflag() {
    return this.view.getUint32(0, true);
  }

  set iflag(value: number) {
    this.view.setUint32(0, value, true);
  }

  get oflag() {
    return this.view.getUint32(4, true);
  }

  set oflag(value: number) {
    this.view.setUint32(4, value, true);
  }

  get cflag() {
    return this.view.getUint32(8, true);
  }

  set cflag(value: number) {
    this.view.setUint32(8, value, true);
  }

  get lflag() {
    return this.view.getUint32(12, true);
  }

  set lflag(value: number) {
    this.view.setUint32(12, value, true);
  }

  get line() {
    return this.view.getUint8(16);
  }

  set line(value: number) {
    this.view.setUint8(16, value);
  }

  get cc() {
    return this.data.subarray(17, 17 + 32);
  }

  set cc(value: Uint8Array) {
    this.data.set(value, 17);
  }

  get ispeed() {
    return this.view.getUint32(52, true);
  }

  set ispeed(value: number) {
    this.view.setUint32(52, value, true);
  }

  get ospeed() {
    return this.view.getUint32(56, true);
  }

  set ospeed(value: number) {
    this.view.setUint32(56, value, true);
  }
}
