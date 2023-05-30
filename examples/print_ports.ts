import { getPorts } from "../mod.ts";

const ports = getPorts();

if (ports.length === 0) {
  console.log("No serial ports found.");
} else {
  console.log("Available ports:");
  for (const port of ports) {
    switch (port.type) {
      case "USB":
        console.log(
          "- USB:",
          `${port.name} (${port.friendlyName}, ${port.manufacturer}, SN: ${port.serialNumber}, VID: ${port.vendorId}, PID: ${port.productId})`,
        );
        break;
      case "Bluetooth":
        console.log("- Bluetooth:", port.name);
        break;
      case "PCI":
        console.log("- PCI:", port.name);
        break;
    }
  }
}
