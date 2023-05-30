import { Di, Reg, unwrap } from "./deps.ts";
import { PortInfo, PortType } from "../common/port_info.ts";

function getPortName(
  devInfoList: Deno.PointerValue,
  devInfoData: Uint8Array,
) {
  const hkey = Di.SetupDiOpenDevRegKey(
    devInfoList,
    devInfoData,
    Di.DICS_FLAG_GLOBAL,
    0,
    Di.DIREG_DEV,
    Reg.KEY_READ,
  );
  const nameBuf = new Uint8Array(256);
  const len = new Uint32Array([nameBuf.byteLength]);
  const result = Reg.RegQueryValueExA(
    hkey,
    "PortName",
    null,
    null,
    nameBuf,
    new Uint8Array(len.buffer),
  );
  unwrap(result);
  const nameLen = len[0];
  Reg.RegCloseKey(hkey);
  return new TextDecoder().decode(nameBuf.slice(0, nameLen - 1));
}

function getPortInstanceId(
  devInfoList: Deno.PointerValue,
  devInfoData: Uint8Array,
) {
  const instanceIdBuf = new Uint8Array(260);
  const instanceIdLen = new Uint32Array(1);
  unwrap(Di.SetupDiGetDeviceInstanceIdA(
    devInfoList,
    devInfoData,
    instanceIdBuf,
    instanceIdBuf.byteLength,
    new Uint8Array(instanceIdLen.buffer),
  ));
  return new TextDecoder().decode(
    instanceIdBuf.slice(0, instanceIdLen[0] - 1),
  );
}

function getPortProperty(
  devInfoList: Deno.PointerValue,
  devInfoData: Uint8Array,
  id: number,
) {
  const resultBuf = new Uint8Array(260);
  const requiredSize = new Uint32Array(1);
  Di.SetupDiGetDeviceRegistryPropertyA(
    devInfoList,
    devInfoData,
    id,
    null,
    resultBuf,
    resultBuf.byteLength,
    new Uint8Array(requiredSize.buffer),
  );
  return new TextDecoder().decode(resultBuf.slice(0, requiredSize[0] - 1));
}

export function SetupDiClassGuidsFromNameA(className: string) {
  let guidList = new Uint8Array(16);
  let guidListSize = guidList.byteLength / 16;
  const actualSizePtr = new Uint8Array(4);

  const result = Di.SetupDiClassGuidsFromNameA(
    className,
    guidList,
    guidListSize,
    actualSizePtr,
  );
  unwrap(result);

  const actualSize = new Uint32Array(actualSizePtr.buffer)[0];

  if (actualSize === 0) {
    return [];
  }

  if (actualSize !== guidListSize) {
    guidList = new Uint8Array(actualSize * 16);
    guidListSize = actualSize;

    const result = Di.SetupDiClassGuidsFromNameA(
      className,
      guidList,
      guidListSize,
      actualSizePtr,
    );

    unwrap(result);
  }

  const guids = new Array<Uint8Array>(actualSize);
  for (let i = 0; i < actualSize; i++) {
    const guidPtr = new Uint8Array(guidList.buffer, i * 16, 16);
    guids[i] = guidPtr.slice();
  }

  return guids;
}

export function getPortsWin() {
  const devInfoData = Di.allocSP_DEVINFO_DATA({
    cbSize: Di.sizeofSP_DEVINFO_DATA,
  });

  const ports: PortInfo[] = [];
  for (
    const guid of SetupDiClassGuidsFromNameA("Ports")
  ) {
    const devInfoList = Di.SetupDiGetClassDevsA(
      guid,
      null,
      null,
      Di.DIGCF_PRESENT,
    )!;
    unwrap(Number(devInfoList));

    for (let i = 0; true; i++) {
      const result = Di.SetupDiEnumDeviceInfo(devInfoList, i, devInfoData);
      if (!result) {
        break;
      } else {
        const name = getPortName(devInfoList, devInfoData);
        const instanceId = getPortInstanceId(devInfoList, devInfoData);

        const instance = instanceId.match(
          /(\w+)\\VID_([A-Fa-f0-9]+)&PID_([A-Fa-f0-9]+)\\([A-Fa-f0-9]+)/,
        );
        if (instance === null) continue;

        const type = instance[1] as PortType;
        const vendorId = parseInt(instance[2], 16);
        const productId = parseInt(instance[3], 16);
        const serialNumber = instance[4];

        const manufacturer = getPortProperty(
          devInfoList,
          devInfoData,
          0x0000000B,
        );
        const friendlyName = getPortProperty(
          devInfoList,
          devInfoData,
          0x0000000C,
        );

        ports.push({
          name,
          type,
          vendorId,
          productId,
          serialNumber,
          manufacturer,
          friendlyName,
        });
      }
    }

    Di.SetupDiDestroyDeviceInfoList(devInfoList);
  }
  return ports;
}
