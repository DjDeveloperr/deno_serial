import { getPorts, open } from "./mod.ts";
import { assertEquals } from "https://deno.land/std@0.119.0/testing/asserts.ts";
import { ClearBuffer } from "./src/common/serial_port.ts";

const OK = new Uint8Array([0x01, 0x00]);
const ERR = 0x00;
const INVALID_COMMAND = 0x01;
const CMD_OUTPUT_MODE = 0x01;
const CMD_DIGITAL_WRITE = 0x02;
const HIGH = 1;
const LOW = 0;

Deno.test("arduino blink", async (t) => {
  const portInfo = getPorts()[0];
  if (!portInfo) {
    throw new Error("No serial ports found.");
  }

  const port = open({ name: portInfo.name, baudRate: 9600 });
  port.clear(ClearBuffer.ALL);

  async function read(len: number) {
    const buf = new Uint8Array(len);
    const bytesRead = await port.read(buf);
    if (bytesRead === null) return "closed";
    return buf.subarray(0, bytesRead);
  }

  await t.step("set output mode", async () => {
    await port.write(new Uint8Array([CMD_OUTPUT_MODE, HIGH]));
    assertEquals(await read(2), OK);
  });

  await t.step("write to pin (HIGH)", async () => {
    await port.write(new Uint8Array([CMD_DIGITAL_WRITE, HIGH]));
    assertEquals(await read(2), OK);
  });

  await t.step("invalid command", async () => {
    await port.write(new Uint8Array([0x00]));
    assertEquals(await read(2), new Uint8Array([ERR, INVALID_COMMAND]));
  });

  await t.step("wait 1s", async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  await t.step("write to pin (LOW)", async () => {
    await port.write(new Uint8Array([CMD_DIGITAL_WRITE, LOW]));
    assertEquals(await read(2), OK);
  });

  await t.step("close port", () => {
    port.close();
  });
});
