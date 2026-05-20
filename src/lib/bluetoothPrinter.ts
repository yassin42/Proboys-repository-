import { InventoryItem } from "../types";

export type PrinterStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED";
export type PrintProtocol = "ESCPOS" | "TSPL";
export type PrinterConnectionType = "BLE" | "SERIAL" | "NONE";

class BluetoothPrinterManager {
  private device: any = null;
  private gattServer: any = null;
  private characteristic: any = null;
  private serialPort: any = null;
  
  private status: PrinterStatus = "DISCONNECTED";
  private deviceName: string = "";
  private protocol: PrintProtocol = "ESCPOS"; // Default to ESC/POS text
  private connectionType: PrinterConnectionType = "NONE";
  private listeners: Set<(status: PrinterStatus, deviceName: string, connectionType: PrinterConnectionType) => void> = new Set();

  constructor() {
    // Attempt local storage recall of protocol if exists
    const cachedProto = localStorage.getItem("proboys_printer_protocol");
    if (cachedProto === "ESCPOS" || cachedProto === "TSPL") {
      this.protocol = cachedProto;
    }

    // Auto-detect physical hardware disconnects from Web Serial COM slots when power-cycled or unplugged
    if (typeof navigator !== "undefined" && "serial" in navigator) {
      (navigator as any).serial.addEventListener("disconnect", (event: any) => {
        if (this.serialPort && event.port === this.serialPort) {
          console.log("Active serial printer device was physically disconnected or turned off.");
          this.disconnect();
        }
      });
    }
  }

  public getStatus(): PrinterStatus {
    return this.status;
  }

  public getDeviceName(): string {
    return this.deviceName;
  }

  public getProtocol(): PrintProtocol {
    return this.protocol;
  }

  public getConnectionType(): PrinterConnectionType {
    return this.connectionType;
  }

  public setProtocol(proto: PrintProtocol) {
    this.protocol = proto;
    localStorage.setItem("proboys_printer_protocol", proto);
  }

  public addStatusListener(callback: (status: PrinterStatus, deviceName: string, connectionType: PrinterConnectionType) => void) {
    this.listeners.add(callback);
    callback(this.status, this.deviceName, this.connectionType);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => cb(this.status, this.deviceName, this.connectionType));
  }

  private updateStatus(newStatus: PrinterStatus, devName: string = this.deviceName, conType: PrinterConnectionType = this.connectionType) {
    this.status = newStatus;
    this.deviceName = devName;
    this.connectionType = conType;
    this.notify();
  }

  /**
   * Request Bluetooth scanning & connect to BLE serial or printer device
   */
  public async connectBle(): Promise<boolean> {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      throw new Error("Web Bluetooth is not supported on this browser or origin (requires HTTPS or localhost). Please open this app in Chrome/Edge, or use Google AI Studio Shared link via a secure tab.");
    }

    // Clear any existing serial or BLE first
    this.disconnect();
    this.updateStatus("CONNECTING", "BLE Scanner", "BLE");

    try {
      // Ask for device with acceptance of all devices OR specific printer filters
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          // Common Bluetooth SPP / printer UUIDs
          "0000ffe0-0000-1000-8000-00805f9b34fb", // FFE0 service (common label/receipt)
          "000018f0-0000-1000-8000-00805f9b34fb", // standard 18F0 printing
          "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC Microchip Bluegiga
          "0000fee7-0000-1000-8000-00805f9b34fb", // WeChat / generic
          "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART service (very common in ls1 pro label printers)
          "0000ff00-0000-1000-8000-00805f9b34fb", // custom FF00 general serial SPP
          "0000ff01-0000-1000-8000-00805f9b34fb",
          "e7810a71-73ae-499d-8c15-faa9ae950c55"  // generic SPP raw write service
        ]
      });

      if (!device) {
        this.updateStatus("DISCONNECTED", "", "NONE");
        return false;
      }

      this.device = device;
      this.deviceName = device.name || "BLE Thermal Printer";

      // Re-register disconnect watcher
      device.addEventListener("gattserverdisconnected", () => {
        this.disconnect();
      });

      // Connect GATT
      const server = await device.gatt.connect();
      this.gattServer = server;

      // Find target characteristic
      let foundChar = null;
      const targetServices = [
        "0000ffe0-0000-1000-8000-00805f9b34fb",
        "000018f0-0000-1000-8000-00805f9b34fb",
        "49535343-fe7d-4ae5-8fa9-9fafd205e455",
        "0000fee7-0000-1000-8000-00805f9b34fb",
        "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
        "0000ff00-0000-1000-8000-00805f9b34fb",
        "0000ff01-0000-1000-8000-00805f9b34fb",
        "e7810a71-73ae-499d-8c15-faa9ae950c55"
      ];

      const checkChars = [
        "0000ffe1-0000-1000-8000-00805f9b34fb", // FFE1 (write)
        "00002af1-0000-1000-8000-00805f9b34fb", // 18F0 printing write
        "49535343-1e4d-4bd9-ba61-23c647249616", // ISSC Tx write
        "6e400002-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART RX (write)
        "0000fec9-0000-1000-8000-00805f9b34fb",
        "e7810a72-73ae-499d-8c15-faa9ae950c55"
      ];

      for (const serviceUuid of targetServices) {
        try {
          const service = await server.getPrimaryService(serviceUuid);
          if (service) {
            for (const charUuid of checkChars) {
              try {
                const char = await service.getCharacteristic(charUuid);
                if (char) {
                  foundChar = char;
                  break;
                }
              } catch (e) {}
            }
          }
        } catch (e) {}
        if (foundChar) break;
      }

      // If no pre-listed primary service succeeded, try traversing all characteristics of available primary services
      if (!foundChar) {
        try {
          const services = await server.getPrimaryServices();
          for (const s of services) {
            try {
              const chars = await s.getCharacteristics();
              for (const c of chars) {
                // If it supports write without response or normal write, use it
                if (c.properties.writeWithoutResponse || c.properties.write) {
                  foundChar = c;
                  break;
                }
              }
            } catch (e) {}
            if (foundChar) break;
          }
        } catch (e) {
          console.error("GATT service enumeration failed:", e);
        }
      }

      if (!foundChar) {
        throw new Error("Connected but could not discover the printing write characteristics. Please try using 'Web Serial (Classic Bluetooth SPP) Port' connection.");
      }

      this.characteristic = foundChar;
      this.updateStatus("CONNECTED", this.deviceName, "BLE");
      return true;
    } catch (err: any) {
      console.error("Bluetooth connection error:", err);
      this.disconnect();
      throw err;
    }
  }

  /**
   * Request Web Serial port selection & connect (Classic Bluetooth virtual COM / USB)
   */
  public async connectSerial(baudRate: number = 9600): Promise<boolean> {
    const nav = navigator as any;
    if (!nav.serial) {
      throw new Error("Web Serial is not supported on this browser or platform (requires Chrome, Edge, or Opera on Desktop).");
    }

    // Clear any existing connections
    this.disconnect();
    this.updateStatus("CONNECTING", "Serial Selection", "SERIAL");

    try {
      const port = await nav.serial.requestPort();
      if (!port) {
        this.updateStatus("DISCONNECTED", "", "NONE");
        return false;
      }

      await port.open({ baudRate });
      this.serialPort = port;
      this.deviceName = `Serial COM Port (Baud: ${baudRate})`;
      this.updateStatus("CONNECTED", this.deviceName, "SERIAL");
      return true;
    } catch (err: any) {
      console.error("Serial/Bluetooth SPP connection error:", err);
      this.disconnect();
      throw err;
    }
  }

  /**
   * Compatibility alias
   */
  public async connect(): Promise<boolean> {
    return this.connectBle();
  }

  /**
   * Disconnect securely
   */
  public disconnect() {
    // 1. Terminate Web Bluetooth
    if (this.gattServer && this.gattServer.connected) {
      try {
        this.gattServer.disconnect();
      } catch (e) {}
    }
    this.device = null;
    this.gattServer = null;
    this.characteristic = null;

    // 2. Terminate Web Serial
    if (this.serialPort) {
      try {
        this.serialPort.close();
      } catch (e) {}
      this.serialPort = null;
    }

    this.updateStatus("DISCONNECTED", "", "NONE");
  }

  /**
   * Helper to write raw Uint8Array in chunks
   */
  private async writeChunks(data: Uint8Array) {
    if (this.connectionType === "SERIAL") {
      if (!this.serialPort || !this.serialPort.writable) {
        throw new Error("Serial / Bluetooth SPP port is not open or not writable.");
      }
      const writer = this.serialPort.writable.getWriter();
      try {
        await writer.write(data);
      } finally {
        writer.releaseLock();
      }
      return;
    }

    if (this.connectionType === "BLE") {
      if (!this.characteristic) {
        throw new Error("No connected BLE characteristic found. Please pair first.");
      }
      const chunkSize = 20; // safe MTU boundary for cheap target BLE boards
      for (let offset = 0; offset < data.length; offset += chunkSize) {
        if (!this.characteristic) {
          throw new Error("Printer device disconnected during print payload transfer.");
        }
        const slice = data.slice(offset, offset + chunkSize);
        try {
          // Dynamic fallback mapping for maximum browser engine and WebView compatibility
          if (typeof this.characteristic.writeValueWithoutResponse === "function" && this.characteristic.properties.writeWithoutResponse) {
            await this.characteristic.writeValueWithoutResponse(slice);
          } else if (typeof this.characteristic.writeValueWithResponse === "function") {
            await this.characteristic.writeValueWithResponse(slice);
          } else if (typeof this.characteristic.writeValue === "function") {
            // Standard fallback supported across all older/embedded Chrome WebViews
            await this.characteristic.writeValue(slice);
          } else {
            throw new Error("Browser Web Bluetooth API has no compatible characteristic write function.");
          }
          // Delay to help the hardware serial and print head receive buffer catch up
          await new Promise((resolve) => setTimeout(resolve, 20));
        } catch (e: any) {
          console.warn("BLE Chunk write warning, trying legacy write payload retry...", e);
          await new Promise((resolve) => setTimeout(resolve, 80));
          if (this.characteristic) {
            if (typeof this.characteristic.writeValue === "function") {
              await this.characteristic.writeValue(slice);
            } else if (typeof this.characteristic.writeValueWithResponse === "function") {
              await this.characteristic.writeValueWithResponse(slice);
            } else {
              throw e;
            }
          } else {
            throw new Error("Printer device disconnected during print retry.");
          }
        }
      }
      return;
    }

    throw new Error("No connected printer. Please pair via Bluetooth or Web Serial first.");
  }

  /**
   * Send text & format code as raw ESC/POS
   */
  private async printEscPos(modelName: string, name: string, price: string, qrData: string) {
    const encoder = new TextEncoder();
    
    // ESC/POS Commands
    const init = new Uint8Array([0x1b, 0x40]); // ESC @
    const alignCenter = new Uint8Array([0x1b, 0x61, 0x01]); // ESC a 1
    const alignLeft = new Uint8Array([0x1b, 0x61, 0x00]); // ESC a 0
    const boldOn = new Uint8Array([0x1b, 0x45, 0x01]); // ESC E 1
    const boldOff = new Uint8Array([0x1b, 0x45, 0x00]); // ESC E 0
    const doubleSize = new Uint8Array([0x1d, 0x21, 0x11]); // GS ! 17 (Double width + height)
    const normalSize = new Uint8Array([0x1d, 0x21, 0x00]); // GS ! 0
    const feed = new Uint8Array([0x0a, 0x0a, 0x0a, 0x0a]); // 4 new lines (label printers don't have auto cutter, feed to tear-bar is required)

    const cleanModel = modelName.replace(/"/g, "'").substring(0, 24);
    const cleanPart = name.replace(/"/g, "'").substring(0, 24);
    
    // Assemble payload
    const list: Uint8Array[] = [
      init,
      alignCenter,
      doubleSize,
      boldOn,
      encoder.encode("PROBOYS\n"),
      normalSize,
      encoder.encode("Repair & Wholesale\n"),
      encoder.encode("--------------------------------\n"),
      alignLeft,
      boldOn,
      encoder.encode("Model: "),
      boldOff,
      encoder.encode(`${cleanModel}\n`),
      boldOn,
      encoder.encode("Part:  "),
      boldOff,
      encoder.encode(`${cleanPart}\n`),
      boldOn,
      encoder.encode("Price: "),
      doubleSize,
      encoder.encode(`${price} DA\n`),
      normalSize,
      alignCenter,
      encoder.encode("--------------------------------\n"),
      encoder.encode(`ID: ${qrData}\n`),
      encoder.encode("Shukran! Thank You.\n"),
      feed
    ];

    // Combine all
    let totalLength = list.reduce((acc, curr) => acc + curr.length, 0);
    let combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of list) {
      combined.set(arr, offset);
      offset += arr.length;
    }

    await this.writeChunks(combined);
  }

  /**
   * Send label design in TSPL (highly reliable for professional label printers like ls1 pro)
   */
  private async printTspl(modelName: string, name: string, price: string, qrData: string) {
    // Escape quote indicators as phone repairs contain items ending in " (such as 6.1" OLED Screen)
    // which breaks the TSPL print string parse block!
    const cleanModel = modelName.replace(/"/g, "'").substring(0, 24);
    const cleanPart = name.replace(/"/g, "'").substring(0, 24);

    const tsplCmds = [
      "SIZE 50 mm,30 mm",
      "GAP 2 mm,0 mm",
      "DIRECTION 0",
      "REFERENCE 0,0",
      "CLS",
      "BOX 5,5,395,235,3",
      "TEXT 20,25,\"3\",0,1,1,\"MobiFix ProBoys\"",
      "TEXT 20,60,\"2\",0,1,1,\"Model: " + cleanModel + "\"",
      "TEXT 20,95,\"2\",0,1,1,\"Part:  " + cleanPart + "\"",
      "TEXT 20,130,\"3\",0,1,1,\"Price: " + price + " DA\"",
      "BARCODE 40,165,\"128\",40,1,0,2,2,\"" + qrData + "\"",
      "PRINT 1,1",
      ""
    ].join("\r\n"); // Keep TSPL commands explicitly joined with \r\n (CRLF) as required by printer firmware

    const encoder = new TextEncoder();
    const bytes = encoder.encode(tsplCmds);
    await this.writeChunks(bytes);
  }

  /**
   * Fire actual print sequence
   */
  public async print(item: InventoryItem, modelName: string) {
    if (this.status !== "CONNECTED") {
      throw new Error("No connected printer. Please tap the connection button first.");
    }

    const priceText = item.price.toLocaleString();
    if (this.protocol === "TSPL") {
      await this.printTspl(modelName, item.name, priceText, item.qrCodeData);
    } else {
      await this.printEscPos(modelName, item.name, priceText, item.qrCodeData);
    }
  }

  /**
   * Print a fast test print label/receipt directly
   */
  public async printTestPage() {
    if (this.status !== "CONNECTED") {
      throw new Error("Printer is not connected yet.");
    }

    if (this.protocol === "TSPL") {
      const tsplCmds = [
        "SIZE 50 mm,30 mm",
        "GAP 2 mm,0 mm",
        "CLS",
        "BOX 5,5,395,235,4",
        "TEXT 20,40,\"4\",0,1,1,\"TEST OK!\"",
        "TEXT 20,100,\"3\",0,1,1,\"ls1 pro Connected\"",
        "TEXT 20,150,\"2\",0,1,1,\"Multi-Channel Interface\"",
        "PRINT 1,1",
        ""
      ].join("\r\n");
      await this.writeChunks(new TextEncoder().encode(tsplCmds));
    } else {
      const init = new Uint8Array([0x1b, 0x40]);
      const alignCenter = new Uint8Array([0x1b, 0x61, 0x01]);
      const doubleSize = new Uint8Array([0x1d, 0x21, 0x11]);
      const feed = new Uint8Array([0x0a, 0x0a, 0x0a, 0x0a]);
      const encoder = new TextEncoder();

      const textBytes = encoder.encode("TEST PRINT\nls1 pro OK!\n");
      const combined = new Uint8Array(init.length + alignCenter.length + doubleSize.length + textBytes.length + feed.length);
      combined.set(init, 0);
      combined.set(alignCenter, init.length);
      combined.set(doubleSize, init.length + alignCenter.length);
      combined.set(textBytes, init.length + alignCenter.length + doubleSize.length);
      combined.set(feed, init.length + alignCenter.length + doubleSize.length + textBytes.length);

      await this.writeChunks(combined);
    }
  }
}

export const bluetoothPrinter = new BluetoothPrinterManager();

// Create a reactive custom hook for components
import { useState, useEffect } from "react";

export function useBluetoothPrinter() {
  const [status, setStatus] = useState<PrinterStatus>(bluetoothPrinter.getStatus());
  const [deviceName, setDeviceName] = useState<string>(bluetoothPrinter.getDeviceName());
  const [protocol, setProtocolState] = useState<PrintProtocol>(bluetoothPrinter.getProtocol());
  const [connectionType, setConnectionType] = useState<PrinterConnectionType>(bluetoothPrinter.getConnectionType());

  useEffect(() => {
    const unsub = bluetoothPrinter.addStatusListener((newStatus, name, conType) => {
      setStatus(newStatus);
      setDeviceName(name);
      setConnectionType(conType);
    });
    return unsub;
  }, []);

  const setProtocol = (p: PrintProtocol) => {
    bluetoothPrinter.setProtocol(p);
    setProtocolState(p);
  };

  return {
    status,
    deviceName,
    protocol,
    setProtocol,
    connectionType,
    connectBle: () => bluetoothPrinter.connectBle(),
    connectSerial: (baudRate?: number) => bluetoothPrinter.connectSerial(baudRate),
    disconnect: () => bluetoothPrinter.disconnect(),
    print: (item: InventoryItem, modelName: string) => bluetoothPrinter.print(item, modelName),
    printTestPage: () => bluetoothPrinter.printTestPage()
  };
}
