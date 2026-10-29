import { CubeStatus, Request } from './protocol';
import { SetupClient, SetupError } from './setup-client';
import { connectSimulated, SIMULATED_PIN } from './simulated-cube';
import { CubeTransport } from './transport';

async function simulatedClient (): Promise<SetupClient> {
	return new SetupClient(await connectSimulated({ delay: 0, joinDelay: 0 }));
}

/**
 * A transport that records what is sent and lets the test answer by hand.
 */
function manualTransport () {
	const sent: Request[] = [];
	let receive: (message: unknown) => void = () => undefined;
	let drop: () => void = () => undefined;

	const transport: CubeTransport = {
		name: 'Kuv-TEST',
		send: (request) => {
			sent.push(request);
			return Promise.resolve();
		},
		onMessage: (listener) => receive = listener,
		onDisconnect: (listener) => drop = listener,
		disconnect: () => drop(),
	};

	return { transport, sent, receive: (message: unknown) => receive(message) };
}

describe('SetupClient', () => {
	it('matches responses to requests by id, whatever the order', async () => {
		const { transport, sent, receive } = manualTransport();
		const client = new SetupClient(transport);

		const info = client.info();
		const auth = client.auth('0000');

		receive({ id: sent[1].id, ok: true, result: null });
		receive({ id: sent[0].id, ok: true, result: { name: 'Kuv-TEST' } });

		await expect(info).resolves.toEqual({ name: 'Kuv-TEST' });
		await expect(auth).resolves.toBeNull();
		expect(sent.map(({ op, params }) => ({ op, params }))).toEqual([
			{ op: 'info', params: undefined },
			{ op: 'auth', params: { pin: '0000' } },
		]);
	});

	it('rejects with the code the cube sent', async () => {
		const { transport, sent, receive } = manualTransport();
		const client = new SetupClient(transport);

		const status = client.status();
		receive({ id: sent[0].id, ok: false, error: { code: 'unauthorized', message: 'Send auth first' } });

		await expect(status).rejects.toEqual(new SetupError('unauthorized', 'Send auth first'));
	});

	it('rejects what is pending when the connection drops', async () => {
		const { transport } = manualTransport();
		const client = new SetupClient(transport);
		const dropped = vi.fn();
		client.onDisconnect(dropped);

		const status = client.status();
		client.disconnect();

		await expect(status).rejects.toMatchObject({ code: 'disconnected' });
		expect(dropped).toHaveBeenCalledOnce();
	});

	it('gives up when the cube does not answer', async () => {
		vi.useFakeTimers();

		try {
			const client = new SetupClient(manualTransport().transport);
			const status = client.status();

			vi.advanceTimersByTime(10_000);

			await expect(status).rejects.toMatchObject({ code: 'timeout' });
		}

		finally {
			vi.useRealTimers();
		}
	});
});

describe('SetupClient with the simulated cube', () => {
	it('refuses everything but info until the PIN is right', async () => {
		const client = await simulatedClient();

		await expect(client.info()).resolves.toMatchObject({ authRequired: true });
		await expect(client.status()).rejects.toMatchObject({ code: 'unauthorized' });
		await expect(client.auth('0000')).rejects.toMatchObject({ code: 'unauthorized' });

		await client.auth(SIMULATED_PIN);

		await expect(client.status()).resolves.toMatchObject({ wifi: { state: 'disconnected' } });
	});

	it('joins a network, remembers it and pushes the changes', async () => {
		const client = await simulatedClient();
		const states: string[] = [];
		client.onStatus((status: CubeStatus) => states.push(status.wifi.state));
		await client.auth(SIMULATED_PIN);

		await expect(client.connectWifi('Casa', 'short')).rejects.toMatchObject({ code: 'wifi_failed' });
		const wifi = await client.connectWifi('Casa', 'long enough');

		expect(wifi).toMatchObject({ state: 'connected', ssid: 'Casa', saved: [ 'Laboratorio', 'Casa' ] });
		expect(states).toEqual([ 'connecting', 'failed', 'connecting', 'connected' ]);
	});

	it('forgets a saved network', async () => {
		const client = await simulatedClient();
		await client.auth(SIMULATED_PIN);

		await client.forgetWifi('Laboratorio');

		await expect(client.status()).resolves.toMatchObject({ wifi: { saved: [] } });
	});
});
