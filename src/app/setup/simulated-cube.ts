import { CubeStatus, ErrorCode, OperationName, PROTOCOL_VERSION, Request, Response, WifiNetwork, WifiStatus } from './protocol';
import { CubeTransport } from './transport';

/** The PIN the simulated cube asks for. */
export const SIMULATED_PIN = '1234';

export interface SimulatedCubeOptions {
	/** Milliseconds before each answer, to feel like a real radio. Tests use 0. */
	delay?: number;
	/** Milliseconds it takes to join a network. */
	joinDelay?: number;
}

/**
 * A pretend cube that lives in the page, for working on the setup page without the hardware.
 *
 * It follows the protocol the way the real cube should: the PIN gate, the errors, the status
 * events. Read it as an example of the expected behavior. Secure networks accept any password of
 * 8 characters or more (the WPA minimum) and refuse shorter ones.
 */
export function connectSimulated (options: SimulatedCubeOptions = {}): Promise<CubeTransport> {
	return Promise.resolve(new SimulatedCube(options.delay ?? 250, options.joinDelay ?? 2000));
}

const NETWORKS: WifiNetwork[] = [
	{ ssid: 'Casa', signal: 82, secure: true },
	{ ssid: 'Kuv-Lab', signal: 64, secure: true },
	{ ssid: 'Cafe libre', signal: 41, secure: false },
	{ ssid: 'CUCEI', signal: 23, secure: true },
];

class CubeError extends Error {
	constructor (readonly code: ErrorCode, message: string) {
		super(message);
	}
}

class SimulatedCube implements CubeTransport {
	readonly name = 'Kuv-SIM1';

	private readonly messageListeners: ((message: unknown) => void)[] = [];
	private readonly disconnectListeners: (() => void)[] = [];
	private readonly bootedAt = Date.now();
	private connected = true;
	private authenticated = false;
	private joining = false;

	/** Remembers the old lab network, which is out of range: the "moved to a new place" case. */
	private wifi: WifiStatus = { state: 'disconnected', ssid: null, ip: null, signal: null, saved: [ 'Laboratorio' ] };

	constructor (private readonly delay: number, private readonly joinDelay: number) {
	}

	send (request: Request): Promise<void> {
		if (!this.connected)
			return Promise.reject(new DOMException('Not connected', 'NetworkError'));

		this.later(async () => {
			let response: Response;

			try {
				response = { id: request.id, ok: true, result: await this.handle(request.op, request.params) };
			}

			catch (error) {
				const { code, message } = error instanceof CubeError ? error : new CubeError('internal', String(error));
				response = { id: request.id, ok: false, error: { code, message } };
			}

			this.emit(response);
		}, this.delay);

		return Promise.resolve();
	}

	onMessage (listener: (message: unknown) => void): void {
		this.messageListeners.push(listener);
	}

	onDisconnect (listener: () => void): void {
		this.disconnectListeners.push(listener);
	}

	disconnect (): void {
		if (!this.connected)
			return;

		this.connected = false;
		this.disconnectListeners.forEach((listener) => listener());
	}

	private async handle (op: OperationName, params: unknown): Promise<unknown> {
		if ('info' === op)
			return { name: this.name, version: '0.0.0-sim', hostname: 'kuv-cube', protocol: PROTOCOL_VERSION, authRequired: true };

		if ('auth' === op) {
			if (SIMULATED_PIN !== param(params, 'pin'))
				throw new CubeError('unauthorized', 'Wrong PIN');

			this.authenticated = true;
			return null;
		}

		if (!this.authenticated)
			throw new CubeError('unauthorized', 'Send auth first');

		switch (op) {
			case 'status':
				return this.status();

			case 'wifi.scan':
				return { networks: NETWORKS };

			case 'wifi.connect':
				return this.join(param(params, 'ssid'), param(params, 'password'));

			case 'wifi.forget':
				return this.forget(param(params, 'ssid'));

			case 'system.reboot':
				this.later(() => this.disconnect(), 100);
				return null;
		}

		throw new CubeError('unknown_op', `Unknown operation ${op}`);
	}

	private async join (ssid: string | undefined, password: string | undefined): Promise<WifiStatus> {
		if (!ssid)
			throw new CubeError('bad_request', 'ssid is required');

		if (this.joining)
			throw new CubeError('busy', 'Already joining a network');

		const network = NETWORKS.find((candidate) => candidate.ssid === ssid);
		const saved = this.wifi.saved.includes(ssid);

		this.joining = true;
		this.setWifi({ state: 'connecting', ssid, ip: null, signal: null });
		await new Promise<void>((resolve) => this.later(resolve, this.joinDelay));
		this.joining = false;

		const passwordOk = !network?.secure || (password ? 8 <= password.length : saved);

		if (!network || !passwordOk) {
			this.setWifi({ state: 'failed', ssid, ip: null, signal: null });
			throw new CubeError('wifi_failed', network ? 'Wrong password' : 'Network not found');
		}

		this.setWifi({
			state: 'connected',
			ssid,
			ip: '192.168.1.42',
			signal: network.signal,
			saved: saved ? this.wifi.saved : [ ...this.wifi.saved, ssid ],
		});

		return this.wifi;
	}

	private forget (ssid: string | undefined): null {
		if (!ssid || !this.wifi.saved.includes(ssid))
			throw new CubeError('bad_request', 'Not a saved network');

		const saved = this.wifi.saved.filter((name) => name !== ssid);

		if (this.wifi.ssid === ssid)
			this.setWifi({ state: 'disconnected', ssid: null, ip: null, signal: null, saved });
		else
			this.setWifi({ saved });

		return null;
	}

	private setWifi (changes: Partial<WifiStatus>): void {
		this.wifi = { ...this.wifi, ...changes };
		this.emit({ event: 'status', data: this.status() });
	}

	private status (): CubeStatus {
		return {
			wifi: this.wifi,
			system: { uptime: Math.floor((Date.now() - this.bootedAt) / 1000) + 3600, temperature: 47.5 },
		};
	}

	private emit (message: unknown): void {
		if (this.connected)
			this.messageListeners.forEach((listener) => listener(message));
	}

	private later (callback: () => void, delay: number): void {
		setTimeout(() => {
			if (this.connected)
				callback();
		}, delay);
	}
}

function param (params: unknown, key: string): string | undefined {
	const value = 'object' === typeof params && null !== params ? (params as Record<string, unknown>)[key] : undefined;
	return 'string' === typeof value ? value : undefined;
}
