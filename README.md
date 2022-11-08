# Deno SerialPort

[![Tags](https://img.shields.io/github/release/DjDeveloperr/deno_serial)](https://github.com/DjDeveloperr/deno_serial/releases)
[![License](https://img.shields.io/github/license/DjDeveloperr/deno_serial)](https://github.com/DjDeveloperr/deno_serial/blob/master/LICENSE)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86)](https://github.com/sponsors/DjDeveloperr)

Serial Port API for Deno with zero third party native dependencies.

## Usage

```ts
import { open, getPorts } from "https://deno.land/x/serialport@0.1.0/mod.ts";

const ports = getPorts();
console.log("Ports:", ports);

const port = open({ name: ports[0].name, baudRate: 9600 });

// ...

port.close();
```

## License

Apache-2.0. Check [LICENSE](./LICENSE) for more information.

Copyright © 2022 DjDeveloperr
