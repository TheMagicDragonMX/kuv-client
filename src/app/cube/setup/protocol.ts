/**
 * The setup protocol: what the page and the cube say to each other over Bluetooth.
 *
 * This file is the contract with the Raspberry Pi. The Pi side must use the same UUIDs and
 * answer the same operations; README.md in this folder explains it for whoever implements it.
 */

/**
 * Bumped when a change would break a cube (or a page) that speaks the previous version.
 */
export const PROTOCOL_VERSION = 1;

/**
 * Cubes advertise a name that starts with this, e.g. "Kuv-A3F2".
 */
export const DEVICE_NAME_PREFIX = 'Kuv';

/**
 * The GATT service the cube exposes for setup.
 */
export const SERVICE_UUID = '6b750001-c0be-4f2a-9e1d-5b3a7c2e9d10';

/**
 * Page → cube. The page writes requests here, in chunks (see framing.ts).
 */
export const RX_CHARACTERISTIC_UUID = '6b750002-c0be-4f2a-9e1d-5b3a7c2e9d10';

/**
 * Cube → page. The cube notifies responses and events here, in chunks.
 */
export const TX_CHARACTERISTIC_UUID = '6b750003-c0be-4f2a-9e1d-5b3a7c2e9d10';

/**
 * Where the cube's WiFi connection stands.
 */
export type WifiState = 'disconnected' | 'connecting' | 'connected' | 'failed';

/**
 * What a cube says about itself before anything else, even before `auth`.
 */
export type CubeInfo = {
	/**
	 * The advertised name, e.g. "Kuv-A3F2".
	 */
	name: string;

	/**
	 * Version of the software running on the cube.
	 */
	version: string;

	/**
	 * The cube's network hostname.
	 */
	hostname: string;

	/**
	 * The `PROTOCOL_VERSION` the cube speaks.
	 */
	protocol: number;

	/**
	 * When true, every operation except `info` and `auth` is refused until `auth` succeeds.
	 */
	authRequired: boolean;
};

/**
 * The cube's WiFi connection, as reported by `status` and by status events.
 */
export type WifiStatus = {
	/**
	 * Where the connection stands.
	 */
	state: WifiState;

	/**
	 * The network it is connected (or connecting) to.
	 */
	ssid: string | null;

	/**
	 * The IP address the cube got on that network, once connected.
	 */
	ip: string | null;

	/**
	 * Signal strength, 0 to 100.
	 */
	signal: number | null;

	/**
	 * SSIDs the cube remembers and joins on its own.
	 */
	saved: string[];
};

/**
 * How the Raspberry Pi itself is doing.
 */
export type SystemStatus = {
	/**
	 * Seconds since the cube booted.
	 */
	uptime: number;

	/**
	 * CPU temperature in °C, when the cube can read it.
	 */
	temperature: number | null;
};

/**
 * Everything the cube reports in a `status` answer or event.
 */
export type CubeStatus = {
	/**
	 * The WiFi connection.
	 */
	wifi: WifiStatus;

	/**
	 * The Pi's health.
	 */
	system: SystemStatus;
};

/**
 * A network the cube sees when scanning.
 */
export type WifiNetwork = {
	/**
	 * The network name.
	 */
	ssid: string;

	/**
	 * Signal strength, 0 to 100.
	 */
	signal: number;

	/**
	 * Needs a password.
	 */
	secure: boolean;
};

/**
 * Every operation the cube answers: what the page sends as `params` and what comes back as
 * `result`. Operations without params are sent without the field.
 */
export type Operations = {
	/**
	 * Describes the cube. Allowed without `auth`.
	 */
	'info': { params: void; result: CubeInfo };

	/**
	 * Unlocks the other operations with the cube's PIN.
	 */
	'auth': { params: { pin: string }; result: null };

	/**
	 * Reads the current WiFi and system status.
	 */
	'status': { params: void; result: CubeStatus };

	/**
	 * Lists the networks around the cube.
	 */
	'wifi.scan': { params: void; result: { networks: WifiNetwork[] } };

	/**
	 * Answers once the cube is connected, or with a `wifi_failed` error. No password joins a saved
	 * or open network.
	 */
	'wifi.connect': { params: { ssid: string; password?: string; hidden?: boolean }; result: WifiStatus };

	/**
	 * Removes a saved network, and drops the connection if it is the current one.
	 */
	'wifi.forget': { params: { ssid: string }; result: null };

	/**
	 * Answers before rebooting; the Bluetooth connection drops right after.
	 */
	'system.reboot': { params: void; result: null };
};

/**
 * The name of any operation the cube answers.
 */
export type OperationName = keyof Operations;

/**
 * Why the cube refused or failed a request.
 */
export type ErrorCode =

	/**
	 * The operation needs `auth` first, or the PIN was wrong.
	 */
	| 'unauthorized'

	/**
	 * Too many wrong PINs; the cube stops accepting `auth` for a while.
	 */
	| 'locked'
	| 'bad_request'
	| 'unknown_op'

	/**
	 * The cube could not join the network (wrong password, out of range...).
	 */
	| 'wifi_failed'

	/**
	 * Another long operation (a scan, a connection) is still running.
	 */
	| 'busy'
	| 'internal';

/**
 * A message from the page to the cube.
 */
export type Request = {
	/**
	 * Chosen by the page; the response carries the same id.
	 */
	id: number;

	/**
	 * Which operation to run.
	 */
	op: OperationName;

	/**
	 * The operation's params, when it takes any.
	 */
	params?: unknown;
};

/**
 * The cube's answer to a request, matched to it by id. Either a result or an error.
 */
export type Response =
	| { id: number; ok: true; result: unknown }
	| { id: number; ok: false; error: { code: ErrorCode; message: string } };

/**
 * Sent by the cube on its own, without a request. `status` goes out whenever something in it
 * changes, and every few seconds while a page is connected.
 */
export type CubeEvent = {
	/**
	 * Which event this is. Only `status` exists for now.
	 */
	event: 'status';

	/**
	 * The new status.
	 */
	data: CubeStatus;
};

/**
 * True when the message looks like an answer to a request.
 */
export function isResponse (message: unknown): message is Response {
	return isObject(message) && 'number' === typeof message['id'] && 'boolean' === typeof message['ok'];
}

/**
 * True when the message looks like an event sent by the cube on its own.
 */
export function isEvent (message: unknown): message is CubeEvent {
	return isObject(message) && 'string' === typeof message['event'];
}

/**
 * True when the value is a non-null object whose keys can be read.
 */
function isObject (value: unknown): value is Record<string, unknown> {
	return 'object' === typeof value && null !== value;
}
