import {
  BleConnection,
  HttpConnection,
  SerialConnection,
  BleCapacitorConnection
} from "./adapters/index.js";
import type * as Types from "./types.js";

/**
 * Allows to create new connections to devices and manages them. Alternatively,
 * new connections can be created directly by instantiating their respective the
 * interface classes.
 */
export class Client {
  /** Array containing all created connection interfaces */
  deviceInterfaces: Types.ConnectionType[];

  constructor() {
    this.deviceInterfaces = [];
  }

  /**
   * Creates a new Bluetooth Low Enery connection interface
   */
  public createBleConnection(configId?: number): BleConnection {
    const bleConnection = new BleConnection(configId);
    this.deviceInterfaces.push(bleConnection);
    return bleConnection;
  }

  /**
   * Creates a new Bluetooth Low Enery connection interface via the Capacitor Bluetooth plugin
   */
  public createBleCapacitorConnection(configId?: number): BleCapacitorConnection {
    const bleCapConnection = new BleCapacitorConnection(configId);
    this.deviceInterfaces.push(bleCapConnection);
    return bleCapConnection;
  }

  /**
   * Creates a new HTTP(S) connection interface
   */
  public createHttpConnection(configId?: number): HttpConnection {
    const httpConnection = new HttpConnection(configId);
    this.deviceInterfaces.push(httpConnection);
    return httpConnection;
  }

  /**
   * Creates a new Serial connection interface
   */
  public createSerialConnection(configId?: number): SerialConnection {
    const serialConnection = new SerialConnection(configId);
    this.deviceInterfaces.push(serialConnection);
    return serialConnection;
  }

  /**
   * Adds an already created connection interface to the client
   */
  public addConnection(connectionObj: Types.ConnectionType): void {
    this.deviceInterfaces.push(connectionObj);
  }

  /**
   * Removes a connection interface from the client
   */
  public removeConnection(connectionObj: Types.ConnectionType): void {
    const index = this.deviceInterfaces.indexOf(connectionObj);
    if (index !== -1) {
      this.deviceInterfaces.splice(index, 1);
    }
  }
}
