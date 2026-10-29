/**
 * The part of the Web Bluetooth API this folder uses. TypeScript's DOM types do not include it
 * yet. Full spec: https://webbluetoothcg.github.io/web-bluetooth/
 */

interface BluetoothLEScanFilter {
	services?: string[];
	name?: string;
	namePrefix?: string;
}

interface RequestDeviceOptions {
	filters?: BluetoothLEScanFilter[];
	optionalServices?: string[];
	acceptAllDevices?: boolean;
}

interface Bluetooth extends EventTarget {
	getAvailability (): Promise<boolean>;
	requestDevice (options: RequestDeviceOptions): Promise<BluetoothDevice>;
}

interface BluetoothDevice extends EventTarget {
	readonly id: string;
	readonly name?: string;
	readonly gatt?: BluetoothRemoteGATTServer;
}

interface BluetoothRemoteGATTServer {
	readonly connected: boolean;
	readonly device: BluetoothDevice;
	connect (): Promise<BluetoothRemoteGATTServer>;
	disconnect (): void;
	getPrimaryService (service: string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
	getCharacteristic (characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
	readonly value?: DataView;
	startNotifications (): Promise<BluetoothRemoteGATTCharacteristic>;
	writeValueWithResponse (value: BufferSource): Promise<void>;
}

interface Navigator {
	readonly bluetooth?: Bluetooth;
}
