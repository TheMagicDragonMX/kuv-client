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
 * Command: run a program on the cube, replacing the one it runs. Payload: a program file
 * (`createProgramFile`). Answered with `program_status`, or with an `error` whose code is
 * `invalid_program` when the cube cannot run it.
 */
export const COMMAND_RUN_PROGRAM = 'run_program';

/**
 * Command: stop the program; the cube keeps what it shows. No payload. Answered with `program_status`.
 */
export const COMMAND_STOP_PROGRAM = 'stop_program';

/**
 * Event: the cube answers a text. Payload: `{ text: string }`.
 */
export const EVENT_REPLY = 'reply';

/**
 * Event: whether the cube is running a program, after `run_program` or `stop_program`.
 * Payload: `{ running: boolean }`.
 */
export const EVENT_PROGRAM_STATUS = 'program_status';

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

/**
 * Largest message the server and the cube take, in bytes (`MaxMessageBytes` in kuv-api's
 * `SocketLink`, the default of the cube's WebSocket library). A bigger one closes the socket.
 */
export const MAX_MESSAGE_BYTES = 1024 * 1024;
