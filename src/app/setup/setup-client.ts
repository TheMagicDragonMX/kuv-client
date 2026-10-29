import { CubeInfo, CubeStatus, ErrorCode, isEvent, isResponse, OperationName, Operations, WifiNetwork, WifiStatus } from './protocol';
import { CubeTransport } from './transport';

/** Why a request failed: an error code from the cube, or one of these from the page's side. */
export type SetupErrorCode = ErrorCode | 'timeout' | 'disconnected';

export class SetupError extends Error {
	constructor (readonly code: SetupErrorCode, message: string) {
		super(message);
		this.name = 'SetupError';
	}
}

/** How long to wait for each answer before giving up. Joining a network is slow. */
const TIMEOUTS: Partial<Record<OperationName, number>> = {
	'wifi.scan': 20_000,
	'wifi.connect': 45_000,
};

const DEFAULT_TIMEOUT = 8_000;

interface Pending {
	resolve: (result: unknown) => void;
	reject: (error: SetupError) => void;
	timer: ReturnType<typeof setTimeout>;
}

/**
 * Talks to one connected cube: one method per operation, each answered with a promise.
 * Rejections are always a SetupError.
 */
export class SetupClient {
	private nextId = 1;
	private readonly pending = new Map<number, Pending>();
	private readonly statusListeners: ((status: CubeStatus) => void)[] = [];
	private readonly disconnectListeners: (() => void)[] = [];

	constructor (private readonly transport: CubeTransport) {
		transport.onMessage((message) => this.receive(message));

		transport.onDisconnect(() => {
			this.failAll(new SetupError('disconnected', 'The cube disconnected'));
			this.disconnectListeners.forEach((listener) => listener());
		});
	}

	/** The cube's name, as the browser saw it. */
	get name (): string {
		return this.transport.name;
	}

	info (): Promise<CubeInfo> {
		return this.request('info', undefined);
	}

	auth (pin: string): Promise<null> {
		return this.request('auth', { pin });
	}

	status (): Promise<CubeStatus> {
		return this.request('status', undefined);
	}

	async scanWifi (): Promise<WifiNetwork[]> {
		const { networks } = await this.request('wifi.scan', undefined);
		return networks;
	}

	connectWifi (ssid: string, password?: string, hidden = false): Promise<WifiStatus> {
		return this.request('wifi.connect', { ssid, ...password ? { password } : {}, ...hidden ? { hidden } : {} });
	}

	forgetWifi (ssid: string): Promise<null> {
		return this.request('wifi.forget', { ssid });
	}

	reboot (): Promise<null> {
		return this.request('system.reboot', undefined);
	}

	/** Called with every status the cube pushes on its own. */
	onStatus (listener: (status: CubeStatus) => void): void {
		this.statusListeners.push(listener);
	}

	/** Called once, when the connection drops (including after `disconnect()`). */
	onDisconnect (listener: () => void): void {
		this.disconnectListeners.push(listener);
	}

	disconnect (): void {
		this.transport.disconnect();
	}

	private request<Op extends OperationName> (op: Op, params: Operations[Op]['params']): Promise<Operations[Op]['result']> {
		const id = this.nextId++;

		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(new SetupError('timeout', `No answer to ${op}`));
			}, TIMEOUTS[op] ?? DEFAULT_TIMEOUT);

			this.pending.set(id, { resolve: resolve as (result: unknown) => void, reject, timer });

			this.transport.send({ id, op, ...undefined === params ? {} : { params } }).catch(() => {
				this.settle(id)?.reject(new SetupError('disconnected', `Could not send ${op}`));
			});
		});
	}

	private receive (message: unknown): void {
		if (isResponse(message)) {
			const pending = this.settle(message.id);

			if (pending && message.ok)
				pending.resolve(message.result);
			else if (pending && !message.ok)
				pending.reject(new SetupError(message.error.code, message.error.message));
		}

		else if (isEvent(message) && 'status' === message.event)
			this.statusListeners.forEach((listener) => listener(message.data));
	}

	/** Takes a request out of the pending ones and stops its timer. */
	private settle (id: number): Pending | undefined {
		const pending = this.pending.get(id);

		if (pending) {
			clearTimeout(pending.timer);
			this.pending.delete(id);
		}

		return pending;
	}

	private failAll (error: SetupError): void {
		for (const id of [ ...this.pending.keys() ])
			this.settle(id)?.reject(error);
	}
}
