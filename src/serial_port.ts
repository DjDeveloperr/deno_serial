import { SerialOpenOptions } from "./common/serial_port.ts";
import { getPortsDarwin } from "./darwin/enumerate.ts";
import { getPortsWin, SerialPortWin } from "./windows/mod.ts";

export function getPorts() {
  if (Deno.build.os === "windows") {
    return getPortsWin();
  } else if (Deno.build.os === "darwin") {
    return getPortsDarwin();
  } else {
    throw new Error(`Unsupported OS: ${Deno.build.os}`);
  }
}

export function open(options: SerialOpenOptions) {
  if (Deno.build.os === "windows") {
    return new SerialPortWin(options);
  } else {
    throw new Error(`Unsupported OS: ${Deno.build.os}`);
  }
}
