export type PortType = "USB";

export interface PortInfo {
  type: PortType;
  name: string;
  vendorId: number;
  productId: number;
  manufacturer: string;
  friendlyName: string;
  serialNumber: string;
}
