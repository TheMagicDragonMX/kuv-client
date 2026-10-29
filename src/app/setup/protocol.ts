/**
 * The setup protocol: what the page and the cube say to each other over Bluetooth.
 *
 * This file is the contract with the Raspberry Pi. The Pi side must use the same UUIDs and
 * answer the same operations; README.md in this folder explains it for whoever implements it.
 */

/** Bumped when a change would break a cube (or a page) that speaks the previous version. */
export const PROTOCOL_VERSION = 1;

/** Cubes advertise a name that starts with this, e.g. "Kuv-A3F2". */
export const DEVICE_NAME_PREFIX = 'Kuv';

/** The GATT service the cube exposes for setup. */
export const SERVICE_UUID = '6b750001-c0be-4f2a-9e1d-5b3a7c2e9d10';

/** Page → cube. The page writes requests here, in chunks (see framing.ts). */
export const RX_CHARACTERISTIC_UUID = '6b750002-c0be-4f2a-9e1d-5b3a7c2e9d10';

/** Cube → page. The cube notifies responses and events here, in chunks. */
export const TX_CHARACTERISTIC_UUID = '6b750003-c0be-4f2a-9e1d-5b3a7c2e9d10';

export type WifiState = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface CubeInfo {
	/** The advertised name, e.g. "Kuv-A3F2". */
	name: string;
	/** Version of the software running on the cube. */
	version: string;
	hostname: string;
	protocol: number;
	/** When true, every operation except `info` and `auth` is refused until `auth` succeeds. */
	authRequired: boolean;
}

export interface WifiStatus {
	state: WifiState;
	/** The network it is connected (or connecting) to. */
	ssid: string | null;
	ip: string | null;
	/** Signal strength, 0 to 100. */
	signal: number | null;
	/** SSIDs the cube remembers and joins on its own. */
	saved: string[];
}

export interface SystemStatus {
	/** Seconds since the cube booted. */
	uptime: number;
	/** CPU temperature in °C, when the cube can read it. */
	temperature: number | null;
}

export interface CubeStatus {
	wifi: WifiStatus;
	system: SystemStatus;
}

export interface WifiNetwork {
	ssid: string;
	/** Signal strength, 0 to 100. */
	signal: number;
	/** Needs a password. */
	secure: boolean;
}

/**
 * Every operation the cube answers: what the page sends as `params` and what comes back as
 * `result`. Operations without params are sent without the field.
 */
export interface Operations {
	'info': { params: void; result: CubeInfo };
	'auth': { params: { pin: string }; result: null };
	'status': { params: void; result: CubeStatus };
	'wifi.scan': { params: void; result: { networks: WifiNetwork[] } };
	/** Answers once the cube is connected, or with a `wifi_failed` error. No password joins a saved or open network. */
	'wifi.connect': { params: { ssid: string; password?: string; hidden?: boolean }; result: WifiStatus };
	'wifi.forget': { params: { ssid: string }; result: null };
	/** Answers before rebooting; the Bluetooth connection drops right after. */
	'system.reboot': { params: void; result: null };
}

export type OperationName = keyof Operations;

export type ErrorCode =
	/** The operation needs `auth` first, or the PIN was wrong. */
	| 'unauthorized'
	/** Too many wrong PINs; the cube stops accepting `auth` for a while. */
	| 'locked'
	| 'bad_request'
	| 'unknown_op'
	/** The cube could not join the network (wrong password, out of range...). */
	| 'wifi_failed'
	/** Another long operation (a scan, a connection) is still running. */
	| 'busy'
	| 'internal';

export interface Request {
	/** Chosen by the page; the response carries the same id. */
	id: number;
	op: OperationName;
	params?: unknown;
}

export type Response =
	| { id: number; ok: true; result: unknown }
	| { id: number; ok: false; error: { code: ErrorCode; message: string } };

/**
 * Sent by the cube on its own, without a request. `status` goes out whenever something in it
 * changes, and every few seconds while a page is connected.
 */
export interface CubeEvent {
	event: 'status';
	data: CubeStatus;
}

export function isResponse (message: unknown): message is Response {
	return isObject(message) && 'number' === typeof message['id'] && 'boolean' === typeof message['ok'];
}

export function isEvent (message: unknown): message is CubeEvent {
	return isObject(message) && 'string' === typeof message['event'];
}

function isObject (value: unknown): value is Record<string, unknown> {
	return 'object' === typeof value && null !== value;
}
