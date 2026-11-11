/**
 * The messages of the cube socket. Mirror of `CubeMessage` in kuv-api and of `programs/main/link/protocol.py` in kuv-cube.
 * Every message, in both directions, has this shape: the client sends commands, the cube sends events and the server
 * sends its own notices.
 */
export type CubeMessage = {
	/**
	 * What the message is, e.g. `message`, `reply`, `cube_status` or `error`.
	 */
	name: string;

	/**
	 * Identifier of the message. The server gives one to every command it forwards.
	 */
	id?: string;

	/**
	 * Id of the message this one answers.
	 */
	replyTo?: string;

	/**
	 * The data of the message; its shape depends on the name.
	 */
	payload?: Record<string, unknown>;
};

/**
 * Command: a user wrote a text to the cube. Payload: `{ text: string }`.
 */
export const COMMAND_MESSAGE = 'message';

/**
 * Event: the cube answers a text. Payload: `{ text: string }`.
 */
export const EVENT_REPLY = 'reply';

/**
 * Notice from the server: the cube went online or offline. Payload: `{ online: boolean }`.
 */
export const EVENT_CUBE_STATUS = 'cube_status';

/**
 * Event or notice: a command could not be done. Payload: `{ code: string, message: string }`.
 */
export const EVENT_ERROR = 'error';

/**
 * Where the socket stands: not connected, connecting, or open.
 */
export type LinkState = 'closed' | 'connecting' | 'open';
