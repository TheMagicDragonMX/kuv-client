import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { COMMAND_MESSAGE, CubeMessage, LinkState } from './protocol';

/**
 * Address of the API's WebSocket endpoints.
 */
const ENDPOINT = 'ws://localhost:5038/ws';

/**
 * Milliseconds to wait before connecting again after the socket drops.
 */
const RECONNECT_DELAY = 2000;

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
		if (this.socket?.readyState !== WebSocket.OPEN)
			return false;

		this.socket.send(JSON.stringify({ name, payload } satisfies CubeMessage));

		return true;
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
