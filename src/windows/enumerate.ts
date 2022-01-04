import {
  DEVINFO_DATA,
  DICS_FLAG_GLOBAL,
  DIREG_DEV,
  KEY_READ,
  LPDEVINFO_DATA,
  RegCloseKey,
  RegQueryValueExA,
  SetupDiClassGuidsFromNameA,
  SetupDiDestroyDeviceInfoList,
  SetupDiEnumDeviceInfo,
  SetupDiGetClassDevsA,
  SetupDiGetDeviceInstanceIdA,
  SetupDiGetDeviceRegistryPropertyA,
  SetupDiOpenDevRegKey,
} from "./winapi/mod.ts";
import { Struct } from "../../deps.ts";
import { PortInfo, PortType } from "../common/port_info.ts";

function getPortName(
  devInfoList: Deno.UnsafePointer,
  devInfoData: LPDEVINFO_DATA,
) {
  const hkey = SetupDiOpenDevRegKey(
    devInfoList,
    devInfoData,
    DICS_FLAG_GLOBAL,
    0,
    DIREG_DEV,
    KEY_READ,
  );
  const nameBuf = new Uint8Array(260);
  const nameLen = RegQueryValueExA(
    hkey,
    "PortName",
    nameBuf,
  );
  RegCloseKey(hkey);
  return new TextDecoder().decode(nameBuf.slice(0, nameLen - 1));
}

function getPortInstanceId(
  devInfoList: Deno.UnsafePointer,
  devInfoData: LPDEVINFO_DATA,
) {
  const instanceIdBuf = new Uint8Array(260);
  const instanceIdLen = new Uint32Array(1);
  SetupDiGetDeviceInstanceIdA(
    devInfoList,
    devInfoData,
    instanceIdBuf,
    instanceIdLen,
  );
  return new TextDecoder().decode(
    instanceIdBuf.slice(0, instanceIdLen[0] - 1),
  );
}

function getPortProperty(
  devInfoList: Deno.UnsafePointer,
  devInfoData: LPDEVINFO_DATA,
  id: number,
) {
  const resultBuf = new Uint8Array(260);
  const requiredSize = new Uint32Array(1);
  SetupDiGetDeviceRegistryPropertyA(
    devInfoList,
    devInfoData,
    id,
    null,
    resultBuf,
    requiredSize,
  );
  return new TextDecoder().decode(resultBuf.slice(0, requiredSize[0] - 1));
}

export function getPortsWin() {
  const devInfoData = Struct(DEVINFO_DATA);
  devInfoData.cbSize = devInfoData._buffer.byteLength;

  const ports: PortInfo[] = [];
  for (
    const guid of SetupDiClassGuidsFromNameA("Ports")
  ) {
    const devInfoList = SetupDiGetClassDevsA(guid);

    for (let i = 0; true; i++) {
      const result = SetupDiEnumDeviceInfo(devInfoList, i, devInfoData);
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

    SetupDiDestroyDeviceInfoList(devInfoList);
  }
  return ports;
}
