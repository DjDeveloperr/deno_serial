import { getPorts, open, USBPortInfo } from "../mod.ts";

const portInfo = getPorts().find((port) => port.type === "USB") as USBPortInfo;
if (!portInfo) {
  throw new Error("No serial ports found.");
}

const port = open({ name: portInfo.name, baudRate: 9600 });
console.log("Opened port:", portInfo.friendlyName);

let on = false;
const size = new Uint8Array(1);
const buffer = new Uint8Array(64);

(async () => {
  while (true) {
    await port.read(size);
    const n = await port.read(buffer.subarray(0, size[0]));
    console.log(
      "read:",
      new TextDecoder().decode(buffer.subarray(0, n!)),
    );
  }
})();

setInterval(async () => {
  on = !on;
  await port.write(new Uint8Array([on ? 0x01 : 0x02]));
}, 1000);
