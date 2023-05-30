import iokit, { ioreturn, kIOSerialBSDServiceValue } from "./iokit.ts";
import corefoundation, { createCFString } from "./corefoundation.ts";
import { PortInfo } from "../common/port_info.ts";
import { cString, deref, refptr } from "../common/util.ts";

const stringBuffer = new Uint8Array(256);

function readStringBuffer() {
  const len = stringBuffer.indexOf(0);
  return new TextDecoder().decode(stringBuffer.subarray(0, len));
}

const kIOServiceClass = cString("IOService");
const kIOUSBDeviceClassName = "IOUSBDevice";
const bluetoothDeviceClassName = "IOBluetoothSerialClient";
const usbDeviceClassName = "IOUSBHostDevice";
const kCFNumberSInt8Type = 0;
const kCFNumberSInt16Type = 1;
const kCFNumberSInt32Type = 2;

const i8 = new Int8Array(1);
const i8u8 = new Uint8Array(i8.buffer);
const i16 = new Int16Array(1);
const i16u8 = new Uint8Array(i16.buffer);
const i32 = new Int32Array(1);
const i32u8 = new Uint8Array(i32.buffer);

function getParentDeviceByType(device: Deno.PointerValue, parentType: string) {
  while (true) {
    iokit.IOObjectGetClass(device, stringBuffer);
    const className = readStringBuffer();

    if (className === parentType) {
      return device;
    }

    const parentRef = refptr();
    const result = iokit.IORegistryEntryGetParentEntry(
      device,
      kIOServiceClass,
      parentRef,
    );
    try {
      ioreturn(result);
    } catch (_) {
      return null;
    }
    device = deref(parentRef);

    if (!device) {
      return null;
    }
  }
}

function getIntProperty(
  deviceType: Deno.PointerValue,
  name: string,
  cfNumberType: number,
) {
  const key = createCFString(name);
  const value = iokit.IORegistryEntryCreateCFProperty(deviceType, key, null, 0);
  if (!value) {
    return null;
  }

  switch (cfNumberType) {
    case kCFNumberSInt8Type: {
      corefoundation.CFNumberGetValue(value, cfNumberType, i8u8);
      return i8[0];
    }

    case kCFNumberSInt16Type: {
      corefoundation.CFNumberGetValue(value, cfNumberType, i16u8);
      return i16[0];
    }

    case kCFNumberSInt32Type: {
      corefoundation.CFNumberGetValue(value, cfNumberType, i32u8);
      return i32[0];
    }
  }
}

function getStringProperty(deviceType: Deno.PointerValue, name: string) {
  const key = createCFString(name);
  const value = iokit.IORegistryEntryCreateCFProperty(deviceType, key, null, 0);
  if (!value) {
    return null;
  }

  const result = corefoundation.CFStringGetCString(
    value,
    stringBuffer,
    stringBuffer.byteLength,
    0,
  );
  if (!result) {
    return null;
  }

  return readStringBuffer();
}

function getPortInfo(service: Deno.PointerValue, name: string): PortInfo {
  const usbDevice = getParentDeviceByType(service, usbDeviceClassName) ??
    getParentDeviceByType(service, kIOUSBDeviceClassName);

  if (usbDevice) {
    return {
      type: "USB",
      name,
      vendorId: getIntProperty(usbDevice, "idVendor", kCFNumberSInt16Type) ?? 0,
      productId: getIntProperty(usbDevice, "idProduct", kCFNumberSInt16Type) ??
        0,
      manufacturer: getStringProperty(usbDevice, "USB Vendor Name") ?? "",
      friendlyName: getStringProperty(usbDevice, "USB Product Name") ?? "",
      serialNumber: getStringProperty(usbDevice, "USB Serial Number") ?? "",
    };
  } else if (getParentDeviceByType(service, bluetoothDeviceClassName)) {
    return {
      type: "Bluetooth",
      name,
    };
  } else {
    return {
      type: "PCI",
      name,
    };
  }
}

export function getPortsDarwin() {
  const ports: PortInfo[] = [];

  const matchingServices = iokit.IOServiceMatching(kIOSerialBSDServiceValue);

  const key = createCFString("IOSerialBSDClientType");
  const value = createCFString("IOSerialStream");

  corefoundation.CFDictionarySetValue(matchingServices, key, value);

  const classesToMatchRef = refptr();
  let result = iokit.IOServiceGetMatchingServices(
    null,
    corefoundation.CFRetain(matchingServices),
    classesToMatchRef,
  );
  ioreturn(result);
  const classesToMatch = deref(classesToMatchRef);

  let service = iokit.IOIteratorNext(classesToMatch);

  while (service) {
    const propsRef = refptr();
    result = iokit.IORegistryEntryCreateCFProperties(
      service,
      propsRef,
      null,
      0,
    );
    ioreturn(result);
    const props = deref(propsRef);

    const stringType = corefoundation.CFStringGetTypeID();

    for (const key of ["IOCalloutDevice", "IODialinDevice"]) {
      const cfkey = createCFString(key);
      const value = corefoundation.CFDictionaryGetValue(props, cfkey);

      const valueType = corefoundation.CFGetTypeID(value);

      if (valueType === stringType) {
        const result = corefoundation.CFStringGetCString(
          value,
          stringBuffer,
          stringBuffer.byteLength,
          0x08000100,
        );

        if (result) {
          const name = readStringBuffer();
          const portInfo = getPortInfo(service, name);
          if (portInfo) {
            ports.push(portInfo);
          }
        }
      }
    }

    service = iokit.IOIteratorNext(classesToMatch);
  }

  return ports;
}
