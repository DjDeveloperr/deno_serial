export type PortType = "USB" | "Bluetooth" | "PCI";

export interface BasePortInfo {
  type: PortType;
  name: string;
}

export interface USBPortInfo extends BasePortInfo {
  type: "USB";
  vendorId: number;
  productId: number;
  manufacturer: string;
  friendlyName: string;
  serialNumber: string;
}

export interface BluetoothPortInfo extends BasePortInfo {
  type: "Bluetooth";
}

export interface PCIPortInfo extends BasePortInfo {
  type: "PCI";
}

export type PortInfo = USBPortInfo | BluetoothPortInfo | PCIPortInfo;
