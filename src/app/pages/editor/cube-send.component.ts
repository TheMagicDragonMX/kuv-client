import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import {
	CubeLinkService,
	EVENT_CUBE_STATUS,
	EVENT_ERROR,
	EVENT_PROGRAM_STATUS,
	Environment,
	LinkState,
	Program,
	createProgramFile,
} from '../../cube';
import { AuthSession } from '../../services/auth-session.service';

/**
 * Key of the local storage entry that remembers the cube id, shared with the cube chat page.
 */
const CUBE_ID_KEY = 'cubeId';

/**
 * Text shown for each state of the socket.
 */
const LINK_STATES: Record<LinkState, string> = {
	closed: 'Desconectado',
	connecting: 'Conectando…',
	open: 'Conectado',
};

/**
 * A line shown under the controls: what the cube said, or why something could not be done.
 */
type Notice = {
	/**
	 * What it says.
	 */
	text: string;

	/**
	 * True when it is a problem.
	 */
	problem: boolean;
};

/**
 * Sends the program of the editor to a real cube through the server: the user types the id of
 * the cube, connects, and the cube runs the program and its environment on its LED panels. It
 * uses the same link as the cube chat page.
 */
@Component({
	selector: 'app-cube-send',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './cube-send.component.html',
})
export class CubeSendComponent implements OnDestroy {
	/**
	 * The program to send, or null while the blocks are not ready to run.
	 */
	readonly program = input<Program | null>(null);

	/**
	 * The stage the program runs on: the pictures of the faces.
	 */
	readonly environment = input<Environment | undefined>(undefined);

	/**
	 * The live connection to the cube.
	 */
	private readonly link = inject(CubeLinkService);

	/**
	 * Who is signed in: the server only lets signed-in users talk to cubes.
	 */
	private readonly authSession = inject(AuthSession);

	/**
	 * Listens to the link while the component exists.
	 */
	private readonly subscriptions = new Subscription();

	/**
	 * Whether someone is signed in.
	 */
	protected readonly signedIn = this.authSession.signedIn;

	/**
	 * True while the card with the controls is shown.
	 */
	protected readonly open = signal(false);

	/**
	 * The id of the cube to send to, as typed.
	 */
	protected readonly cubeId = signal(localStorage.getItem(CUBE_ID_KEY) ?? '');

	/**
	 * Where the socket stands.
	 */
	protected readonly linkState = signal<LinkState>('closed');

	/**
	 * True when the server says the cube is connected to it.
	 */
	protected readonly cubeOnline = signal(false);

	/**
	 * True when the cube said it runs a program.
	 */
	protected readonly cubeRunning = signal(false);

	/**
	 * The last thing worth telling the user, or null.
	 */
	protected readonly notice = signal<Notice | null>(null);

	/**
	 * Text shown for each state of the socket.
	 */
	protected readonly linkStates = LINK_STATES;

	/**
	 * True when a program can be sent: the cube is reachable and the blocks are ready.
	 */
	protected readonly canSend = computed(() => 'open' === this.linkState() && this.cubeOnline() && null !== this.program());

	constructor () {
		this.subscriptions.add(this.link.state$.subscribe((state) => {
			this.linkState.set(state);

			if ('open' !== state)
				this.cubeOnline.set(false);
		}));

		this.subscriptions.add(this.link.messages$.subscribe((message) => {
			const payload = message.payload ?? {};

			if (EVENT_CUBE_STATUS === message.name) {
				this.cubeOnline.set(true === payload['online']);

				if (!this.cubeOnline())
					this.cubeRunning.set(false);
			}

			else if (EVENT_PROGRAM_STATUS === message.name) {
				this.cubeRunning.set(true === payload['running']);
				this.say(this.cubeRunning() ? 'El cubo está ejecutando tu programa.' : 'El cubo se detuvo.', false);
			}

			else if (EVENT_ERROR === message.name)
				this.say(String(payload['message'] ?? 'Error desconocido.'), true);
		}));
	}

	/**
	 * Shows or hides the card.
	 */
	protected toggle (): void {
		this.open.update((open) => !open);
	}

	/**
	 * Connects to the cube whose id was typed.
	 */
	protected connect (): void {
		const cubeId = this.cubeId().trim();
		const token = this.authSession.accessToken();

		if (!cubeId) {
			this.say('Escribe el id del cubo.', true);
			return;
		}

		if (!token) {
			this.say('Inicia sesión primero.', true);
			return;
		}

		localStorage.setItem(CUBE_ID_KEY, cubeId);
		this.notice.set(null);
		this.link.connect(cubeId, token);
	}

	/**
	 * Closes the connection.
	 */
	protected disconnect (): void {
		this.link.disconnect();
		this.cubeRunning.set(false);
	}

	/**
	 * Sends the program and its environment for the cube to run.
	 */
	protected send (): void {
		const program = this.program();

		if (!program)
			return;

		const result = this.link.runProgram(createProgramFile(program, this.environment()));

		if ('too-large' === result)
			this.say('El programa es demasiado grande para enviarlo: usa menos imágenes.', true);

		else if ('closed' === result)
			this.say('No hay conexión con el cubo.', true);

		else
			this.say('Enviando…', false);
	}

	/**
	 * Stops the program on the cube.
	 */
	protected stop (): void {
		if (!this.link.stopProgram())
			this.say('No hay conexión con el cubo.', true);
	}

	/**
	 * Stops listening to the link and closes it.
	 */
	ngOnDestroy (): void {
		this.subscriptions.unsubscribe();
		this.link.disconnect();
	}

	/**
	 * Shows a line under the controls.
	 */
	private say (text: string, problem: boolean): void {
		this.notice.set({ text, problem });
	}
}
