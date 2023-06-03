# Deno SerialPort

[![Tags](https://img.shields.io/github/release/DjDeveloperr/deno_serial)](https://github.com/DjDeveloperr/deno_serial/releases)
[![License](https://img.shields.io/github/license/DjDeveloperr/deno_serial)](https://github.com/DjDeveloperr/deno_serial/blob/master/LICENSE)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86)](https://github.com/sponsors/DjDeveloperr)

Serial Port API for Deno with zero third-party native dependencies.

| Platform | `getPorts` | `open` |
| -------- | ---------- | ------ |
| Windows  | ✅         | ✅     |
| macOS    | ❌         | ❌     |
| Linux    | ❌         | ❌     |

## Try out

Run the following to list all available ports:

```sh
deno run --unstable --allow-ffi -r https://raw.githubusercontent.com/DjDeveloperr/deno_serial/main/examples/print_ports.ts
```

NOTE: Not yet published to deno.land/x as not all platforms are supported yet.

## Usage

```ts
import { getPorts, open } from "https://deno.land/x/serialport@0.1.0/mod.ts";

const ports = getPorts();
console.log("Ports:", ports);

const port = open({ name: ports[0].name, baudRate: 9600 });

// ...

port.close();
```

## License

Apache-2.0. Check [LICENSE](./LICENSE) for more information.

Copyright © 2022-2023 DjDeveloperr
