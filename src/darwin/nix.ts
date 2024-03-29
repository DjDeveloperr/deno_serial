const nix = Deno.dlopen("libSystem.dylib", {
  open: {
    parameters: ["buffer", "i32", "i32"],
    result: "i32",
    nonblocking: true,
  },

  ioctl: {
    parameters: ["i32", "i64"],
    result: "i32",
  },

  ioctl1: {
    parameters: ["i32", "i64", "buffer"],
    result: "i32",
    name: "ioctl",
  },

  tcgetattr: {
    parameters: ["i32", "buffer"],
    result: "i32",
  },

  tcsetattr: {
    parameters: ["i32", "i32", "buffer"],
    result: "i32",
  },

  cfmakeraw: {
    parameters: ["buffer"],
    result: "void",
  },

  fcntl: {
    parameters: ["i32", "i32", "i32"],
    result: "i32",
  },

  strerror: {
    parameters: ["i32"],
    result: "pointer",
  },

  aio_read: {
    parameters: ["buffer"],
    result: "i32",
  },

  aio_write: {
    parameters: ["buffer"],
    result: "i32",
  },

  aio_suspend: {
    parameters: ["buffer", "i32", "buffer"],
    result: "i32",
    nonblocking: true,
  },

  aio_cancel: {
    parameters: ["i32", "buffer"],
    result: "i32",
  },

  aio_error: {
    parameters: ["buffer"],
    result: "i32",
  },

  aio_return: {
    parameters: ["buffer"],
    result: "i64",
  },

  cfsetospeed: {
    parameters: ["buffer", "i32"],
    result: "i32",
  },

  cfsetispeed: {
    parameters: ["buffer", "i32"],
    result: "i32",
  },

  tcflush: {
    parameters: ["i32", "i32"],
    result: "i32",
  },

  close: {
    parameters: ["i32"],
    result: "i32",
  },

  read: {
    parameters: ["i32", "buffer", "i32"],
    result: "i32",
    nonblocking: true,
  },

  write: {
    parameters: ["i32", "buffer", "i32"],
    result: "i32",
    nonblocking: true,
  },
}).symbols;

export default nix;

export class UnixError extends Error {
  errno: number;
  constructor(errno: number) {
    const str = nix.strerror(errno);
    const jstr = Deno.UnsafePointerView.getCString(str!);
    super(`UnixError: ${errno}: ${jstr}`);
    this.errno = errno;
  }
}

export function unwrap(result: number, error?: number) {
  if (result < 0) {
    let errno;
    if (error !== undefined) {
      errno = error;
    } else {
      const lib = Deno.dlopen("libSystem.dylib", {
        errno: {
          type: "i32",
        },
      });
      errno = lib.symbols.errno;
      lib.close();
    }
    throw new UnixError(errno);
  }
  return result;
}
