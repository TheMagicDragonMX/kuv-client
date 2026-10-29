import { Request } from './protocol';

/**
 * A live connection to one cube, at the level of whole messages. The Bluetooth transport does
 * the chunking; the simulated one skips it.
 */
export interface CubeTransport {
	/** The cube's name, as the browser saw it. */
	readonly name: string;

	send (request: Request): Promise<void>;

	/** Called with every message the cube sends (responses and events). */
	onMessage (listener: (message: unknown) => void): void;

	/** Called once, when the connection drops for any reason, including `disconnect()`. */
	onDisconnect (listener: () => void): void;

	disconnect (): void;
}
