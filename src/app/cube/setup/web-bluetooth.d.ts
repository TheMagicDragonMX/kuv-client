/**
 * The part of the Web Bluetooth API this folder uses. TypeScript's DOM types do not include it
 * yet. Full spec: https://webbluetoothcg.github.io/web-bluetooth/
 */

type BluetoothLEScanFilter = {
	/**
	 * Service UUIDs the device must advertise.
	 */
	services?: string[];

	/**
	 * Exact device name.
	 */
	name?: string;

	/**
	 * Device name must start with this.
	 */
	namePrefix?: string;
};

/**
 * Options for the device chooser.
 */
type RequestDeviceOptions = {
	/**
	 * Only devices matching one of these filters are listed.
	 */
	filters?: BluetoothLEScanFilter[];

	/**
	 * Services the page may use besides the filtered ones.
	 */
	optionalServices?: string[];

	/**
	 * Lists every device instead of filtering.
	 */
	acceptAllDevices?: boolean;
};

/**
 * The browser's Bluetooth entry point.
 */
type Bluetooth = EventTarget & {
	/**
	 * Whether this device has a usable Bluetooth adapter.
	 */
	getAvailability (): Promise<boolean>;

	/**
	 * Shows the browser's device chooser and resolves with the chosen device.
	 */
	requestDevice (options: RequestDeviceOptions): Promise<BluetoothDevice>;
};

/**
 * A Bluetooth device the page can connect to.
 */
type BluetoothDevice = EventTarget & {
	/**
	 * Identifier of the device.
	 */
	readonly id: string;

	/**
	 * Advertised name of the device.
	 */
	readonly name?: string;

	/**
	 * Its GATT server, once available.
	 */
	readonly gatt?: BluetoothRemoteGATTServer;
};

/**
 * The GATT server of a device.
 */
type BluetoothRemoteGATTServer = {
	/**
	 * True while the connection is open.
	 */
	readonly connected: boolean;

	/**
	 * The device this server belongs to.
	 */
	readonly device: BluetoothDevice;

	/**
	 * Opens the connection.
	 */
	connect (): Promise<BluetoothRemoteGATTServer>;

	/**
	 * Closes the connection.
	 */
	disconnect (): void;

	/**
	 * Finds one of the server's services.
	 */
	getPrimaryService (service: string): Promise<BluetoothRemoteGATTService>;
};

/**
 * A GATT service.
 */
type BluetoothRemoteGATTService = {
	/**
	 * Finds one of the service's characteristics.
	 */
	getCharacteristic (characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
};

/**
 * A GATT characteristic: a value the page can write or be notified about.
 */
type BluetoothRemoteGATTCharacteristic = EventTarget & {
	/**
	 * The latest value received.
	 */
	readonly value?: DataView;

	/**
	 * Starts the notifications that deliver new values.
	 */
	startNotifications (): Promise<BluetoothRemoteGATTCharacteristic>;

	/**
	 * Writes a value and waits for the device to confirm it.
	 */
	writeValueWithResponse (value: BufferSource): Promise<void>;
};

/**
 * The browser's navigator, extended with Web Bluetooth. It stays an interface because it merges
 * with the one TypeScript's DOM types declare.
 */
interface Navigator {
	/**
	 * Web Bluetooth, when the browser has it.
	 */
	readonly bluetooth?: Bluetooth;
}
