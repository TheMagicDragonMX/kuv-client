import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
	connectBluetooth,
	connectSimulated,
	CubeInfo,
	CubeStatus,
	CubeTransport,
	isBluetoothAvailable,
	PROTOCOL_VERSION,
	SetupClient,
	SetupError,
	SIMULATED_PIN,
	WifiNetwork,
	WifiState,
} from '../../setup';

/**
 * Where the setup flow stands: not connected, connecting, waiting for the PIN, or ready.
 */
type Phase = 'disconnected' | 'connecting' | 'locked' | 'ready';

/**
 * Picked in the network list to type the name of a network that does not broadcast it.
 */
const HIDDEN = '\u0000hidden';

/**
 * Text shown for each WiFi state.
 */
const WIFI_STATES: Record<WifiState, string> = {
	connected: 'Conectado',
	connecting: 'Conectando…',
	disconnected: 'Sin conexión',
	failed: 'No se pudo conectar',
};

/**
 * Sets up a physical cube over Bluetooth: pick it, unlock it with its PIN, choose its WiFi and
 * see how it is doing. Works with a simulated cube too, for when the hardware is not around.
 */
@Component({
	selector: 'app-setup-page',
	standalone: true,
	imports: [ ReactiveFormsModule, RouterLink ],
	templateUrl: './setup.component.html',
})
export class SetupPage implements OnInit, OnDestroy {
	/**
	 * Builds the forms.
	 */
	private readonly formBuilder = inject(FormBuilder);

	/**
	 * The connection to the cube, or null when there is none.
	 */
	private client: SetupClient | null = null;

	/**
	 * Set before dropping the connection on purpose, so it is not reported as an error.
	 */
	private leaving = false;

	/**
	 * Value of the "other network" entry in the list.
	 */
	protected readonly hidden = HIDDEN;

	/**
	 * The PIN of the simulated cube, shown as a hint.
	 */
	protected readonly simulatedPin = SIMULATED_PIN;

	/**
	 * Text shown for each WiFi state.
	 */
	protected readonly wifiStates = WIFI_STATES;

	/**
	 * Where the setup flow stands.
	 */
	protected readonly phase = signal<Phase>('disconnected');

	/**
	 * Whether the browser supports Bluetooth. Null until known.
	 */
	protected readonly bluetoothAvailable = signal<boolean | null>(null);

	/**
	 * True when the connection is to the simulated cube.
	 */
	protected readonly simulated = signal(false);

	/**
	 * The cube's name.
	 */
	protected readonly deviceName = signal('');

	/**
	 * What the cube said about itself.
	 */
	protected readonly info = signal<CubeInfo | null>(null);

	/**
	 * The latest status of the cube, kept current by its events.
	 */
	protected readonly status = signal<CubeStatus | null>(null);

	/**
	 * The networks found by the last scan, or null before any scan.
	 */
	protected readonly networks = signal<WifiNetwork[] | null>(null);

	/**
	 * True while scanning for networks.
	 */
	protected readonly scanning = signal(false);

	/**
	 * True while an exchange with the cube is in progress.
	 */
	protected readonly busy = signal(false);

	/**
	 * The SSID whose connect form is open, or HIDDEN.
	 */
	protected readonly selected = signal<string | null>(null);

	/**
	 * Why the last action failed, or an empty string.
	 */
	protected readonly errorMessage = signal('');

	/**
	 * Information for the user that is not an error, or an empty string.
	 */
	protected readonly notice = signal('');

	/**
	 * The networks the cube remembers.
	 */
	protected readonly saved = computed(() => this.status()?.wifi.saved ?? []);

	/**
	 * The networks around, strongest first, with what the page needs to show each one.
	 */
	protected readonly networkRows = computed(() => {
		const wifi = this.status()?.wifi;

		return [ ...this.networks() ?? [] ]
			.sort((a, b) => b.signal - a.signal)
			.map((network) => ({
				...network,
				bars: signalBars(network.signal),
				saved: this.saved().includes(network.ssid),
				current: 'connected' === wifi?.state && network.ssid === wifi.ssid,
			}));
	});

	/**
	 * The form for the cube's PIN.
	 */
	protected readonly pinForm = this.formBuilder.nonNullable.group({
		pin: [ '', Validators.required ],
	});

	/**
	 * The form to join a network. The name is only used for hidden networks.
	 */
	protected readonly wifiForm = this.formBuilder.nonNullable.group({
		ssid: [ '' ],
		password: [ '' ],
	});

	/**
	 * Checks whether the browser supports Bluetooth.
	 */
	ngOnInit (): void {
		isBluetoothAvailable().then((available) => this.bluetoothAvailable.set(available));
	}

	/**
	 * Drops the connection, without reporting it as an error.
	 */
	ngOnDestroy (): void {
		this.leaving = true;
		this.client?.disconnect();
	}

	/**
	 * Connects to a cube, real or simulated, and asks for its PIN when it requires one.
	 */
	protected async connect (simulated: boolean): Promise<void> {
		this.errorMessage.set('');
		this.notice.set('');
		this.phase.set('connecting');

		let transport: CubeTransport;

		try {
			transport = await (simulated ? connectSimulated() : connectBluetooth());
		}

		catch (error) {
			this.phase.set('disconnected');
			this.errorMessage.set(describeBluetoothError(error));
			return;
		}

		const client = new SetupClient(transport);
		client.onStatus((status) => this.status.set(status));
		client.onDisconnect(() => this.dropped(client));

		this.client = client;
		this.leaving = false;
		this.simulated.set(simulated);
		this.deviceName.set(client.name);

		await this.run(async () => {
			const info = await client.info();

			if (PROTOCOL_VERSION !== info.protocol) {
				this.leave(`El cubo usa la versión ${info.protocol} del protocolo y esta página la ${PROTOCOL_VERSION}. Actualiza el que esté atrasado.`);
				return;
			}

			this.info.set(info);

			if (info.authRequired)
				this.phase.set('locked');

			else
				await this.unlocked();
		});
	}

	/**
	 * Sends the PIN the user typed.
	 */
	protected async unlock (): Promise<void> {
		if (this.pinForm.invalid) {
			this.pinForm.markAllAsTouched();
			return;
		}

		await this.run(async () => {
			await this.client?.auth(this.pinForm.getRawValue().pin.trim());
			this.pinForm.reset();
			await this.unlocked();
		});
	}

	/**
	 * Reads the cube's status again.
	 */
	protected async refresh (): Promise<void> {
		await this.run(async () => {
			const status = await this.client?.status();

			if (status)
				this.status.set(status);
		});
	}

	/**
	 * Scans for networks.
	 */
	protected async scan (): Promise<void> {
		this.scanning.set(true);

		try {
			await this.run(async () => this.networks.set(await this.client?.scanWifi() ?? []));
		}

		finally {
			this.scanning.set(false);
		}
	}

	/**
	 * Opens the connect form of a network, or closes it when it is already open.
	 */
	protected choose (ssid: string): void {
		this.selected.set(this.selected() === ssid ? null : ssid);
		this.wifiForm.reset();
		this.errorMessage.set('');
	}

	/**
	 * True when joining the network needs a password the cube does not have yet.
	 */
	protected needsPassword (ssid: string): boolean {
		const network = this.networks()?.find((candidate) => candidate.ssid === ssid);
		return !!network?.secure && !this.saved().includes(ssid);
	}

	/**
	 * Joins the chosen network.
	 */
	protected async join (): Promise<void> {
		const selected = this.selected();
		const hidden = HIDDEN === selected;
		const { ssid: typed, password } = this.wifiForm.getRawValue();
		const ssid = hidden ? typed.trim() : selected;

		if (!ssid) {
			this.errorMessage.set('Escribe el nombre de la red.');
			return;
		}

		if (!hidden && this.needsPassword(ssid) && !password) {
			this.errorMessage.set('Esta red necesita contraseña.');
			return;
		}

		await this.run(async () => {
			await this.client?.connectWifi(ssid, password || undefined, hidden);
			this.selected.set(null);
			this.wifiForm.reset();
			this.notice.set(`El cubo se conectó a ${ssid}. Pulsa Desconectar para que termine de configurarse.`);
		});
	}

	/**
	 * Makes the cube forget a network.
	 */
	protected async forget (ssid: string): Promise<void> {
		if (!confirm(`¿Olvidar la red ${ssid}? El cubo ya no se conectará a ella solo.`))
			return;

		await this.run(async () => {
			await this.client?.forgetWifi(ssid);
			this.notice.set(`El cubo olvidó ${ssid}.`);
		});
	}

	/**
	 * Reboots the cube and goes back to the start screen.
	 */
	protected async reboot (): Promise<void> {
		if (!confirm('¿Reiniciar el cubo? Se perderá la conexión Bluetooth.'))
			return;

		await this.run(async () => {
			await this.client?.reboot();
			this.leave('El cubo se está reiniciando. Vuelve a conectarte en un minuto.');
		});
	}

	/**
	 * Drops the connection on purpose and goes back to the start screen.
	 */
	protected disconnect (): void {
		this.leave('');
	}

	/**
	 * Shows seconds as days and hours, hours and minutes, or just minutes.
	 */
	protected formatUptime (seconds: number): string {
		const days = Math.floor(seconds / 86_400);
		const hours = Math.floor(seconds % 86_400 / 3600);
		const minutes = Math.floor(seconds % 3600 / 60);

		if (days)
			return `${days} d ${hours} h`;

		return hours ? `${hours} h ${minutes} min` : `${minutes} min`;
	}

	/**
	 * Starts the ready state: reads the status and scans for networks.
	 */
	private async unlocked (): Promise<void> {
		this.phase.set('ready');
		await this.refresh();
		await this.scan();
	}

	/**
	 * Runs one exchange with the cube, showing what went wrong if it fails.
	 */
	private async run (exchange: () => Promise<void>): Promise<void> {
		this.errorMessage.set('');
		this.notice.set('');
		this.busy.set(true);

		try {
			await exchange();
		}

		catch (error) {
			/**
			 * A dropped connection is reported by dropped() instead.
			 */
			if (!(error instanceof SetupError && 'disconnected' === error.code))
				this.errorMessage.set(describeSetupError(error));
		}

		finally {
			this.busy.set(false);
		}
	}

	/**
	 * Drops the connection on purpose, leaving a message on the start screen.
	 */
	private leave (message: string): void {
		this.leaving = true;
		this.client?.disconnect();
		this.reset();
		this.notice.set(message);
	}

	/**
	 * Handles the connection dropping, unless it was on purpose or belongs to an old client.
	 */
	private dropped (client: SetupClient): void {
		if (client !== this.client)
			return;

		const expected = this.leaving;
		this.reset();

		if (!expected)
			this.errorMessage.set('Se perdió la conexión con el cubo. Acércate a él y vuelve a conectarte.');
	}

	/**
	 * Goes back to the start screen, clearing everything about the cube.
	 */
	private reset (): void {
		this.client = null;
		this.phase.set('disconnected');
		this.info.set(null);
		this.status.set(null);
		this.networks.set(null);
		this.selected.set(null);
		this.busy.set(false);
		this.scanning.set(false);
		this.errorMessage.set('');
		this.notice.set('');
		this.pinForm.reset();
		this.wifiForm.reset();
	}
}

/**
 * 0 to 4 bars, like a phone.
 */
function signalBars (signal: number): number {
	return Math.min(4, Math.max(0, Math.ceil(signal / 25)));
}

/**
 * Turns a Bluetooth error into a message for the user. Empty when the user only closed the chooser.
 */
function describeBluetoothError (error: unknown): string {
	const name = error instanceof DOMException ? error.name : '';

	switch (name) {
		case 'NotFoundError':

			/**
			 * The user closed the chooser, or no cube was around.
			 */
			return '';

		case 'NotSupportedError':
			return 'Este navegador no puede usar Bluetooth.';

		case 'SecurityError':
			return 'El navegador no permitió usar Bluetooth en esta página (necesita HTTPS).';

		default:
			return 'No se pudo conectar con el cubo. Acércate a él y vuelve a intentarlo.';
	}
}

/**
 * Turns a setup error into a message for the user.
 */
function describeSetupError (error: unknown): string {
	if (!(error instanceof SetupError))
		return 'Algo salió mal. Vuelve a intentarlo.';

	switch (error.code) {
		case 'unauthorized':
			return 'PIN incorrecto.';

		case 'locked':
			return 'Demasiados intentos. Espera un momento antes de volver a probar.';

		case 'wifi_failed':
			return 'El cubo no pudo conectarse a esa red. Revisa la contraseña y que la red esté cerca.';

		case 'busy':
			return 'El cubo sigue con la tarea anterior. Espera un momento.';

		case 'timeout':
			return 'El cubo no respondió a tiempo.';

		default:
			return `El cubo respondió con un error: ${error.message}`;
	}
}
