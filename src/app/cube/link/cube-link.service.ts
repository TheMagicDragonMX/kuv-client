import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '@environment';
import { ProgramFile } from '../engine';
import { COMMAND_GET_BRIGHTNESS, COMMAND_MESSAGE, COMMAND_RUN_CREATION, COMMAND_RUN_PROGRAM, COMMAND_SET_BRIGHTNESS, COMMAND_STOP_PROGRAM, CubeMessage, LinkState, MAX_MESSAGE_BYTES } from './protocol';

/**
 * Address of the API's WebSocket endpoints, derived from the API address of the current environment.
 */
const ENDPOINT = `${environment.apiUrl.replace(/^http/, 'ws')}/ws`;

/**
 * Milliseconds to wait before connecting again after the socket drops.
 */
const RECONNECT_DELAY = 2000;

/**
 * Bytes left free under `MAX_MESSAGE_BYTES` for what the server adds to a command (its id).
 */
const MESSAGE_MARGIN = 1024;

/**
 * What happened to a program sent to the cube: it left, the socket was not open, or it was too
 * big for the server to take.
 */
export type ProgramSendResult = 'sent' | 'closed' | 'too-large';

/**
 * The live conversation with a cube through the server: sends it commands and streams what it answers. It reconnects by
 * itself until `disconnect` is called.
 */
@Injectable({ providedIn: 'root' })
export class CubeLinkService implements OnDestroy {
	/**
	 * The open socket, or null when there is none.
	 */
	private socket: WebSocket | null = null;

	/**
	 * Waiting reconnection, or null when none is scheduled.
	 */
	private retry: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Cube and token of the current connection, kept to reconnect; null after `disconnect`.
	 */
	private target: { cubeId: string; token: string } | null = null;

	/**
	 * Where the socket stands.
	 */
	private readonly stateSubject = new BehaviorSubject<LinkState>('closed');

	/**
	 * Every message that arrives.
	 */
	private readonly messageSubject = new Subject<CubeMessage>();

	/**
	 * Where the socket stands.
	 */
	readonly state$: Observable<LinkState> = this.stateSubject.asObservable();

	/**
	 * Every message that arrives: the cube's events and the server's notices.
	 */
	readonly messages$: Observable<CubeMessage> = this.messageSubject.asObservable();

	/**
	 * Connects to a cube through the server, replacing any previous connection.
	 */
	connect (cubeId: string, token: string): void {
		this.disconnect();
		this.target = { cubeId, token };
		this.open();
	}

	/**
	 * Closes the connection and stops reconnecting.
	 */
	disconnect (): void {
		this.target = null;

		if (this.retry)
			clearTimeout(this.retry);

		this.retry = null;
		this.socket?.close();
		this.socket = null;
		this.stateSubject.next('closed');
	}

	/**
	 * Sends a command to the cube. Returns false if the socket is not open.
	 */
	send (name: string, payload?: Record<string, unknown>): boolean {
		return this.sendFrame(JSON.stringify({ name, payload } satisfies CubeMessage));
	}

	/**
	 * Sends a program, with its environment, for the cube to run. A program too big for the
	 * server is not sent, since the server would drop the connection.
	 */
	runProgram (file: ProgramFile): ProgramSendResult {
		const frame = JSON.stringify({ name: COMMAND_RUN_PROGRAM, payload: file } satisfies CubeMessage);

		if (new TextEncoder().encode(frame).length > MAX_MESSAGE_BYTES - MESSAGE_MARGIN)
			return 'too-large';

		return this.sendFrame(frame) ? 'sent' : 'closed';
	}

	/**
	 * Asks the server to send a saved creation to the cube, which runs it. Returns false if the
	 * socket is not open.
	 */
	runCreation (creationId: number): boolean {
		return this.send(COMMAND_RUN_CREATION, { creationId });
	}

	/**
	 * Stops the program the cube runs. Returns false if the socket is not open.
	 */
	stopProgram (): boolean {
		return this.send(COMMAND_STOP_PROGRAM);
	}

	/**
	 * Changes how bright the cube's LED panels are, in percent. Returns false if the socket is not
	 * open.
	 */
	setBrightness (percent: number): boolean {
		return this.send(COMMAND_SET_BRIGHTNESS, { percent });
	}

	/**
	 * Asks the cube how bright its LED panels are; the answer comes as a `brightness` event.
	 * Returns false if the socket is not open.
	 */
	getBrightness (): boolean {
		return this.send(COMMAND_GET_BRIGHTNESS);
	}

	/**
	 * Writes a text to the cube.
	 */
	sendText (text: string): boolean {
		return this.send(COMMAND_MESSAGE, { text });
	}

	/**
	 * Closes the socket when the service goes away.
	 */
	ngOnDestroy (): void {
		this.disconnect();
	}

	/**
	 * Sends one frame. Returns false if the socket is not open.
	 */
	private sendFrame (frame: string): boolean {
		if (this.socket?.readyState !== WebSocket.OPEN)
			return false;

		this.socket.send(frame);

		return true;
	}

	/**
	 * Opens the socket to the current target.
	 */
	private open (): void {
		if (!this.target)
			return;

		const { cubeId, token } = this.target;
		const socket = new WebSocket(`${ENDPOINT}/client?cubeId=${encodeURIComponent(cubeId)}&access_token=${encodeURIComponent(token)}`);

		this.socket = socket;
		this.stateSubject.next('connecting');

		socket.onopen = () => this.stateSubject.next('open');

		socket.onmessage = (event) => {
			try {
				const message = JSON.parse(String(event.data)) as CubeMessage;

				if ('string' === typeof message.name)
					this.messageSubject.next(message);
			}

			catch {
				// Not a message: ignore it.
			}
		};

		socket.onclose = () => {
			if (this.socket !== socket)
				return;

			this.socket = null;
			this.stateSubject.next('closed');

			if (this.target)
				this.retry = setTimeout(() => this.open(), RECONNECT_DELAY);
		};
	}
}
