import { encodeMessage, MessageDecoder } from './framing';
import { DEVICE_NAME_PREFIX, Request, RX_CHARACTERISTIC_UUID, SERVICE_UUID, TX_CHARACTERISTIC_UUID } from './protocol';
import { CubeTransport } from './transport';

/**
 * Whether this browser can talk Bluetooth at all. False on Firefox, Safari and iOS, on pages
 * not served over HTTPS (or localhost), and on computers without a Bluetooth adapter.
 */
export async function isBluetoothAvailable (): Promise<boolean> {
	if (!navigator.bluetooth)
		return false;

	try {
		return await navigator.bluetooth.getAvailability();
	}

	catch {
		return false;
	}
}

/**
 * Opens the browser's device chooser and connects to the cube the user picks.
 *
 * Must be called from a click (browsers refuse to open the chooser otherwise). Rejects with a
 * `NotFoundError` DOMException when the user closes the chooser without picking one.
 */
export async function connectBluetooth (): Promise<CubeTransport> {
	if (!navigator.bluetooth)
		throw new DOMException('Web Bluetooth is not available', 'NotSupportedError');

	const device = await navigator.bluetooth.requestDevice({
		filters: [ { services: [ SERVICE_UUID ] }, { namePrefix: DEVICE_NAME_PREFIX } ],
		optionalServices: [ SERVICE_UUID ],
	});

	if (!device.gatt)
		throw new DOMException('The device has no GATT server', 'NetworkError');

	const server = await device.gatt.connect();

	try {
		const service = await server.getPrimaryService(SERVICE_UUID);
		const rx = await service.getCharacteristic(RX_CHARACTERISTIC_UUID);
		const tx = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);
		const transport = new BluetoothTransport(device, rx, tx);

		await tx.startNotifications();
		return transport;
	}

	catch (error) {
		server.disconnect();
		throw error;
	}
}

class BluetoothTransport implements CubeTransport {
	readonly name: string;

	private readonly decoder = new MessageDecoder();
	private readonly messageListeners: ((message: unknown) => void)[] = [];
	private readonly disconnectListeners: (() => void)[] = [];

	/** GATT allows one operation at a time, so writes wait for the one before. */
	private writes: Promise<void> = Promise.resolve();

	constructor (
		private readonly device: BluetoothDevice,
		private readonly rx: BluetoothRemoteGATTCharacteristic,
		tx: BluetoothRemoteGATTCharacteristic,
	) {
		this.name = device.name ?? DEVICE_NAME_PREFIX;

		tx.addEventListener('characteristicvaluechanged', () => {
			if (!tx.value)
				return;

			const chunk = new Uint8Array(tx.value.buffer, tx.value.byteOffset, tx.value.byteLength);

			for (const message of this.decoder.push(chunk))
				this.messageListeners.forEach((listener) => listener(message));
		});

		device.addEventListener('gattserverdisconnected', () => {
			this.disconnectListeners.forEach((listener) => listener());
		}, { once: true });
	}

	send (request: Request): Promise<void> {
		const write = this.writes.then(async () => {
			for (const chunk of encodeMessage(request))
				await this.rx.writeValueWithResponse(chunk);
		});

		// A failed write must not block the next ones.
		this.writes = write.catch(() => undefined);
		return write;
	}

	onMessage (listener: (message: unknown) => void): void {
		this.messageListeners.push(listener);
	}

	onDisconnect (listener: () => void): void {
		this.disconnectListeners.push(listener);
	}

	disconnect (): void {
		this.device.gatt?.disconnect();
	}
}
