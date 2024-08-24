import {
  FromNumUuid,
  FromRadioUuid,
  ServiceUuid,
  ToRadioUuid,
} from "../constants.js";
import { MeshDevice } from "../meshDevice.js";
import * as Types from "../types.js";
//import { typedArrayToBuffer } from "../utils/index.js";
import { BleClient, BleDevice, BleService } from '@capacitor-community/bluetooth-le';

/** Allows to connect to a Meshtastic device via capacitor bluetooth plugin */
export class BleCapacitorConnection extends MeshDevice {
  /** Defines the connection type as ble */
  public connType: Types.ConnectionTypeName;

  public portId: any;

  /** Currently connected BLE device */
  public device: BleDevice | boolean;

  /** BT Service */
  private service: BleService | undefined;

  private timerUpdateFromRadio: NodeJS.Timeout | null = null;

  constructor(configId?: number) {
    super(configId);

    this.log = this.log.getSubLogger({ name: "BleCapacitorConnection" });

    this.connType = "cap";
    this.portId = "";
    this.device = false;
    this.service = undefined;

    this.log.debug(
      Types.Emitter[Types.Emitter.Constructor],
      "🔷 BleCapacitorConnection instantiated",
    );
  }

  /**
   * Gets bluetooth support avaliability for the device
   *
   * @returns Promise<boolean>
   */
  public supported(): Promise<boolean> {
    return BleClient.isEnabled();
  }

  /**
   * Opens native dialog to select a compatible device
   */
  public getDevice(filter: any): Promise<BleDevice> {
    return BleClient.requestDevice(
      filter ?? {
        services: [ServiceUuid]
      }
    );
  }

  /**
   * Initiates the connect process to a Meshtastic device via Bluetooth
   */
  public async connect({
    device,
    deviceFilter,
  }: Types.BleConnectionParameters): Promise<void> {
    /** Set device state to connecting */
    this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnecting);

    /** Set device if specified, else request. */
    if(!device) {
      this.device = await this.getDevice(deviceFilter);
      this.portId = this.device.deviceId;
    } else this.portId = device;
    var that = this;

    await BleClient.connect(this.portId, function onBleDisconnect(deviceId: string) {
      //console.log(`bledevice ${deviceId} disconnected`);

      that.log.info(
        Types.Emitter[Types.Emitter.Connect],
        `Device ${deviceId} disconnected`,
      );
      that.updateDeviceStatus(Types.DeviceStatusEnum.DeviceDisconnected);
      that.complete();
    });

    /** Setup event listners */
    const services = await BleClient.getServices(this.portId);
    this.service = services.find(service => service.uuid === ServiceUuid);
    if(this.service) console.log("bleservice ", this.service.uuid, this.service.characteristics);

    await BleClient.startNotifications(
      this.portId,
      ServiceUuid,
      FromNumUuid,
      () => { // value available
        this.readFromRadio();
      }
    );

    this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnected);

    this.configure().catch(() => {
      // TODO: FIX, workaround for `wantConfigId` not getting acks.
    });

    this.timerUpdateFromRadio = setInterval(() => this.readFromRadio(), 1000);
  }

  /** Disconnects from the Meshtastic device */
  public disconnect(): void {
    //this.device?.gatt?.disconnect();
    BleClient.disconnect(this.portId);

    this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceDisconnected);
    this.complete();
    if (this.timerUpdateFromRadio) {
      clearInterval(this.timerUpdateFromRadio);
    }
    this.timerUpdateFromRadio = null;
  }

  /**
   * Pings device to check if it is avaliable
   *
   * @todo Implement
   */
  public async ping(): Promise<boolean> {
    return await Promise.resolve(true);
  }

  /** Incoming BT data from radio */
  protected async readFromRadio(): Promise<void> {
    // if (this.pendingRead) {
    //   return Promise.resolve();
    // }
    // this.pendingRead = true;

    let readBuffer = new ArrayBuffer(1);
    while (readBuffer.byteLength > 0 && FromRadioUuid) {
      await BleClient.read(this.portId, ServiceUuid, FromRadioUuid).then((value) => {
        readBuffer = value.buffer;
        if (value.byteLength > 0) {
          this.handleFromRadio(new Uint8Array(readBuffer));
        }
        this.updateDeviceStatus(Types.DeviceStatusEnum.DeviceConnected);
      }).catch((e) => {
        readBuffer = new ArrayBuffer(0);
        this.log.error(
          Types.Emitter[Types.Emitter.ReadFromRadio],
          `❌ ${e.message}`,
        );
      });
    }
    // this.pendingRead = false;
  }

  /**
   * Sends supplied protobuf message to the radio
   */
  protected async writeToRadio(data: Uint8Array): Promise<void> {
    let ndata = new DataView(data.buffer); // typedArrayToBuffer(data) data.buffer
    await BleClient.write(this.portId, ServiceUuid, ToRadioUuid, ndata);
    await this.readFromRadio();
  }
}
