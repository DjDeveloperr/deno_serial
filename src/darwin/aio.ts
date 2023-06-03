import nix, { unwrap } from "./nix.ts";

export class AIOCB {
  data: Uint8Array;

  constructor(fd: number, data: Uint8Array) {
    this.data = new Uint8Array(80);
    const view = new DataView(this.data.buffer);
    view.setUint32(0, fd, true);
    const ptr = Deno.UnsafePointer.of(data);
    const ptrVal = Deno.UnsafePointer.value(ptr);
    view.setBigUint64(16, BigInt(ptrVal), true);
    view.setBigUint64(24, BigInt(data.byteLength), true);
  }

  read() {
    const result = nix.aio_read(this.data);
    unwrap(result);
  }

  write() {
    const result = nix.aio_write(this.data);
    unwrap(result);
  }

  async suspend(timeout1?: number, timeout2?: number) {
    const result = await nix.aio_suspend(
      this.data ?? new Uint8Array(
        new BigUint64Array([
          BigInt(Deno.UnsafePointer.value(Deno.UnsafePointer.of(this.data))),
        ]).buffer,
      ),
      1,
      timeout1 !== undefined && timeout2 !== undefined
        ? new Uint8Array(
          new BigUint64Array([BigInt(timeout1), BigInt(timeout2)]).buffer,
        )
        : null,
    );
    unwrap(result, this.error());
  }

  cancel() {
    const result = nix.aio_cancel(0, this.data);
    unwrap(result);
  }

  error() {
    return nix.aio_error(this.data);
  }

  return() {
    const result = Number(nix.aio_return(this.data));
    return unwrap(result);
  }
}
