import { CubeInfo, CubeStatus, ErrorCode, isEvent, isResponse, OperationName, Operations, WifiNetwork, WifiStatus } from './protocol';
import { CubeTransport } from './transport';

/**
 * Why a request failed: an error code from the cube, or one of these from the page's side.
 */
export type SetupErrorCode = ErrorCode | 'timeout' | 'disconnected';

/**
 * The error every failed request is rejected with, carrying the code that explains why.
 */
export class SetupError extends Error {
	/**
	 * Builds the error from a code and a readable message.
	 */
	constructor (
		/**
		 * Why the request failed.
		 */
		readonly code: SetupErrorCode,
		message: string,
	) {
		super(message);
		this.name = 'SetupError';
	}
}

/**
 * How long to wait for each answer before giving up. Joining a network is slow.
 */
const TIMEOUTS: Partial<Record<OperationName, number>> = {
	'wifi.scan': 20_000,
	'wifi.connect': 45_000,
};

/**
 * How long to wait for an answer when the operation has no entry in `TIMEOUTS`.
 */
const DEFAULT_TIMEOUT = 8_000;

/**
 * A request waiting for its answer.
 */
type Pending = {
	/**
	 * Settles the request with the cube's result.
	 */
	resolve: (result: unknown) => void;

	/**
	 * Fails the request.
	 */
	reject: (error: SetupError) => void;

	/**
	 * Fails the request with a timeout if no answer comes.
	 */
	timer: ReturnType<typeof setTimeout>;
};

/**
 * Talks to one connected cube: one method per operation, each answered with a promise.
 * Rejections are always a SetupError.
 */
export class SetupClient {
	/**
	 * The id the next request will carry.
	 */
	private nextId = 1;

	/**
	 * Requests sent and not answered yet, by id.
	 */
	private readonly pending = new Map<number, Pending>();

	/**
	 * Called with every status event from the cube.
	 */
	private readonly statusListeners: ((status: CubeStatus) => void)[] = [];

	/**
	 * Called once when the connection drops.
	 */
	private readonly disconnectListeners: (() => void)[] = [];

	/**
	 * Starts listening to the transport.
	 */
	constructor (
		/**
		 * The connection to the cube.
		 */
		private readonly transport: CubeTransport,
	) {
		transport.onMessage((message) => this.receive(message));

		transport.onDisconnect(() => {
			this.failAll(new SetupError('disconnected', 'The cube disconnected'));
			this.disconnectListeners.forEach((listener) => listener());
		});
	}

	/**
	 * The cube's name, as the browser saw it.
	 */
	get name (): string {
		return this.transport.name;
	}

	/**
	 * Asks the cube to describe itself.
	 */
	info (): Promise<CubeInfo> {
		return this.request('info', undefined);
	}

	/**
	 * Unlocks the cube with its PIN.
	 */
	auth (pin: string): Promise<null> {
		return this.request('auth', { pin });
	}

	/**
	 * Reads the current WiFi and system status.
	 */
	status (): Promise<CubeStatus> {
		return this.request('status', undefined);
	}

	/**
	 * Scans for WiFi networks and returns them.
	 */
	async scanWifi (): Promise<WifiNetwork[]> {
		const { networks } = await this.request('wifi.scan', undefined);
		return networks;
	}

	/**
	 * Joins a network. Resolves once connected and rejects with `wifi_failed` otherwise.
	 */
	connectWifi (ssid: string, password?: string, hidden = false): Promise<WifiStatus> {
		return this.request('wifi.connect', { ssid, ...password ? { password } : {}, ...hidden ? { hidden } : {} });
	}

	/**
	 * Makes the cube forget a saved network.
	 */
	forgetWifi (ssid: string): Promise<null> {
		return this.request('wifi.forget', { ssid });
	}

	/**
	 * Reboots the cube. The connection drops right after.
	 */
	reboot (): Promise<null> {
		return this.request('system.reboot', undefined);
	}

	/**
	 * Called with every status the cube pushes on its own.
	 */
	onStatus (listener: (status: CubeStatus) => void): void {
		this.statusListeners.push(listener);
	}

	/**
	 * Called once, when the connection drops (including after `disconnect()`).
	 */
	onDisconnect (listener: () => void): void {
		this.disconnectListeners.push(listener);
	}

	/**
	 * Drops the connection.
	 */
	disconnect (): void {
		this.transport.disconnect();
	}

	/**
	 * Sends one request and waits for its answer, up to the operation's timeout.
	 */
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

	/**
	 * Routes a message from the cube to the request it answers, or to the status listeners.
	 */
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

	/**
	 * Takes a request out of the pending ones and stops its timer.
	 */
	private settle (id: number): Pending | undefined {
		const pending = this.pending.get(id);

		if (pending) {
			clearTimeout(pending.timer);
			this.pending.delete(id);
		}

		return pending;
	}

	/**
	 * Fails every request still waiting, e.g. when the connection drops.
	 */
	private failAll (error: SetupError): void {
		for (const id of [ ...this.pending.keys() ])
			this.settle(id)?.reject(error);
	}
}
