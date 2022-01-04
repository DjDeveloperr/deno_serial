import { cstr, HANDLE, LPDEVINFO_DATA } from "./common.ts";
import { UnwrapError } from "./kernel32.ts";

const symbols = {
  SetupDiClassGuidsFromNameA: {
    parameters: [
      "pointer",
      "pointer",
      "u32",
      "pointer",
    ],
    result: "i32",
  },

  SetupDiGetClassDevsA: {
    parameters: [
      "pointer",
      "pointer",
      "pointer",
      "u32",
    ],
    result: "pointer",
  },

  SetupDiEnumDeviceInfo: {
    parameters: [
      "pointer",
      "u32",
      "pointer",
    ],
    result: "i32",
  },

  SetupDiDestroyDeviceInfoList: {
    parameters: [
      "pointer",
    ],
    result: "i32",
  },

  SetupDiOpenDevRegKey: {
    parameters: [
      "pointer",
      "pointer",
      "u32",
      "u32",
      "u32",
      "u32",
    ],
    result: "pointer",
  },

  SetupDiGetDeviceInstanceIdA: {
    parameters: [
      "pointer",
      "pointer",
      "pointer",
      "u32",
      "pointer",
    ],
    result: "i32",
  },

  SetupDiGetDeviceRegistryPropertyA: {
    parameters: [
      "pointer",
      "pointer",
      "u32",
      "pointer",
      "pointer",
      "u32",
      "pointer",
    ],
    result: "i32",
  },
} as const;

type Symbols = {
  [name in keyof typeof symbols]: {
    parameters: [...typeof symbols[name]["parameters"]];
    result: typeof symbols[name]["result"];
  };
};

let lib!: Deno.DynamicLibrary<Symbols>["symbols"];

if (Deno.build.os === "windows") {
  lib = Deno.dlopen("SetupApi", symbols as Symbols).symbols;
}

function checkSupported() {
  if (typeof lib === undefined) {
    throw new Error("This module only works on Windows.");
  }
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/setupapi/nf-setupapi-setupdiclassguidsfromnamea
 */
export function SetupDiClassGuidsFromNameA(className: string) {
  checkSupported();
  const classNamePtr = cstr(className);

  let guidList = new Uint8Array(16);
  let guidListSize = guidList.byteLength / 16;
  const actualSizePtr = new Uint8Array(4);

  const result = lib.SetupDiClassGuidsFromNameA(
    classNamePtr,
    guidList,
    guidListSize,
    actualSizePtr,
  );
  UnwrapError(result);

  const actualSize = new Uint32Array(actualSizePtr.buffer)[0];

  if (actualSize === 0) {
    return [];
  }

  if (actualSize !== guidListSize) {
    guidList = new Uint8Array(actualSize * 16);
    guidListSize = actualSize;

    const result = lib.SetupDiClassGuidsFromNameA(
      classNamePtr,
      guidList,
      guidListSize,
      actualSizePtr,
    );

    UnwrapError(result);
  }

  const guids = new Array<Uint8Array>(actualSize);
  for (let i = 0; i < actualSize; i++) {
    const guidPtr = new Uint8Array(guidList.buffer, i * 16, 16);
    guids[i] = guidPtr.slice();
  }

  return guids;
}

const DIGCF_PRESENT = 0x02;

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/setupapi/nf-setupapi-setupdigetclassdevsa
 */
export function SetupDiGetClassDevsA(classGuid: Uint8Array): HANDLE {
  const result = lib.SetupDiGetClassDevsA(
    classGuid,
    null,
    null,
    DIGCF_PRESENT,
  ) as HANDLE;
  UnwrapError(result.value);
  return result;
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/setupapi/nf-setupapi-setupdienumdeviceinfo
 */
export function SetupDiEnumDeviceInfo(
  deviceInfoSet: HANDLE,
  index: number,
  deviceInfoData: LPDEVINFO_DATA,
): boolean {
  const result = lib.SetupDiEnumDeviceInfo(
    deviceInfoSet,
    index,
    new Uint8Array(deviceInfoData._buffer),
  );
  return result !== 0;
}

/**
 * @link https://docs.microsoft.com/en-us/windows/win32/api/setupapi/nf-setupapi-setupdidestroydeviceinfolist
 */
export function SetupDiDestroyDeviceInfoList(deviceInfoSet: HANDLE) {
  const result = lib.SetupDiDestroyDeviceInfoList(deviceInfoSet);
  UnwrapError(result);
}

export const DICS_FLAG_GLOBAL = 0x00000001;
export const DIREG_DEV = 0x00000001;
export const KEY_READ = 0x20019;

export function SetupDiOpenDevRegKey(
  deviceInfoSet: HANDLE,
  deviceInfoData: LPDEVINFO_DATA,
  scope: number,
  hwProfile: number,
  keyType: number,
  samDesired: number,
): HANDLE {
  const result = lib.SetupDiOpenDevRegKey(
    deviceInfoSet,
    new Uint8Array(deviceInfoData._buffer),
    scope,
    hwProfile,
    keyType,
    samDesired,
  ) as HANDLE;
  UnwrapError(result.value);
  return result;
}

export function SetupDiGetDeviceInstanceIdA(
  deviceInfoSet: HANDLE,
  deviceInfoData: LPDEVINFO_DATA,
  deviceInstanceId: Uint8Array,
  requiredSize: Uint32Array | null,
): boolean {
  const result = lib.SetupDiGetDeviceInstanceIdA(
    deviceInfoSet,
    new Uint8Array(deviceInfoData._buffer),
    deviceInstanceId,
    deviceInstanceId.byteLength,
    requiredSize,
  );
  return result !== 0;
}

export function SetupDiGetDeviceRegistryPropertyA(
  deviceInfoSet: HANDLE,
  deviceInfoData: LPDEVINFO_DATA,
  property: number,
  propertyRegDataType: Uint8Array | null,
  propertyBuffer: Uint8Array,
  requiredSize: Uint32Array | null,
): boolean {
  const result = lib.SetupDiGetDeviceRegistryPropertyA(
    deviceInfoSet,
    new Uint8Array(deviceInfoData._buffer),
    property,
    propertyRegDataType,
    propertyBuffer,
    propertyBuffer.byteLength,
    requiredSize,
  );
  return result !== 0;
}
