import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CubeLinkService, EVENT_CUBE_STATUS, EVENT_ERROR, EVENT_REPLY, LinkState } from '../../cube-link';

/**
 * Who wrote a line of the conversation.
 */
type Author = 'user' | 'cube' | 'system';

/**
 * One line of the conversation.
 */
type ChatLine = {
	/**
	 * Who wrote it.
	 */
	author: Author;

	/**
	 * What it says.
	 */
	text: string;
};

/**
 * Key of the local storage entry that remembers the cube id.
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
 * A conversation with a cube: connects to it through the server, sends it the texts the user writes and shows what the
 * cube answers. It is the first use of the cube link; later commands go through the same channel.
 */
@Component({
	selector: 'app-cube-chat-page',
	standalone: true,
	imports: [ ReactiveFormsModule, RouterLink ],
	templateUrl: './cube-chat.component.html',
})
export class CubeChatPage implements OnDestroy {
	/**
	 * Builds the forms.
	 */
	private readonly formBuilder = inject(FormBuilder);

	/**
	 * The live connection to the cube.
	 */
	private readonly link = inject(CubeLinkService);

	/**
	 * Listens to the link while the page is open.
	 */
	private readonly subscriptions = new Subscription();

	/**
	 * Where the socket stands.
	 */
	protected readonly linkState = signal<LinkState>('closed');

	/**
	 * True when the server says the cube is connected to it.
	 */
	protected readonly cubeOnline = signal(false);

	/**
	 * The conversation so far.
	 */
	protected readonly lines = signal<ChatLine[]>([]);

	/**
	 * Why the page cannot connect, or an empty string.
	 */
	protected readonly errorMessage = signal('');

	/**
	 * Text shown for each state of the socket.
	 */
	protected readonly linkStates = LINK_STATES;

	/**
	 * Which cube to talk to.
	 */
	protected readonly connectForm = this.formBuilder.nonNullable.group({
		cubeId: [ localStorage.getItem(CUBE_ID_KEY) ?? '', Validators.required ],
	});

	/**
	 * The text to send.
	 */
	protected readonly messageForm = this.formBuilder.nonNullable.group({
		text: [ '', Validators.required ],
	});

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
				this.say('system', this.cubeOnline() ? 'El cubo está en línea.' : 'El cubo se desconectó.');
			}

			else if (EVENT_REPLY === message.name)
				this.say('cube', String(payload['text'] ?? ''));

			else if (EVENT_ERROR === message.name)
				this.say('system', String(payload['message'] ?? 'Error desconocido.'));
		}));
	}

	/**
	 * Connects to the cube in the form, or marks the field when it is empty.
	 */
	protected connect (): void {
		if (this.connectForm.invalid) {
			this.connectForm.markAllAsTouched();
			return;
		}

		const token = localStorage.getItem('accessToken');

		if (!token) {
			this.errorMessage.set('Inicia sesión primero.');
			return;
		}

		const { cubeId } = this.connectForm.getRawValue();

		this.errorMessage.set('');
		localStorage.setItem(CUBE_ID_KEY, cubeId.trim());
		this.lines.set([]);
		this.link.connect(cubeId.trim(), token);
	}

	/**
	 * Closes the connection.
	 */
	protected disconnect (): void {
		this.link.disconnect();
	}

	/**
	 * Sends the written text to the cube and shows it in the conversation.
	 */
	protected send (): void {
		if (this.messageForm.invalid)
			return;

		const { text } = this.messageForm.getRawValue();

		if (!this.link.sendText(text.trim()))
			return;

		this.say('user', text.trim());
		this.messageForm.reset();
	}

	/**
	 * Stops listening to the link and closes it.
	 */
	ngOnDestroy (): void {
		this.subscriptions.unsubscribe();
		this.link.disconnect();
	}

	/**
	 * Adds a line to the conversation.
	 */
	private say (author: Author, text: string): void {
		this.lines.update((lines) => [ ...lines, { author, text } ]);
	}
}
