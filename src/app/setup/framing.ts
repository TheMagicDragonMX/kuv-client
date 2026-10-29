/**
 * How messages travel over the characteristics.
 *
 * A Bluetooth write or notification carries only a few hundred bytes (sometimes just 20), and a
 * list of WiFi networks does not fit in one. So every message is sent as compact JSON plus a
 * newline, cut into chunks; the other side joins chunks until it sees the newline. JSON never
 * contains a raw newline, so the newline always marks the end of a message.
 */

/** Bytes per write from the page. Bigger writes are fine for Chrome and BlueZ (long writes). */
export const CHUNK_SIZE = 180;

/** A message that grows past this without a newline is garbage; the buffer is dropped. */
export const MAX_MESSAGE_SIZE = 64 * 1024;

const NEWLINE = 0x0a;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * The chunks to send for one message, in order. A chunk can end in the middle of a character;
 * the receiver only decodes whole messages, so that is fine.
 */
export function encodeMessage (message: unknown, chunkSize = CHUNK_SIZE): Uint8Array<ArrayBuffer>[] {
	const bytes = encoder.encode(JSON.stringify(message) + '\n');
	const chunks: Uint8Array<ArrayBuffer>[] = [];

	for (let start = 0; start < bytes.length; start += chunkSize)
		chunks.push(bytes.slice(start, start + chunkSize));

	return chunks;
}

/**
 * Joins received chunks back into messages. Feed it every chunk as it arrives; it returns the
 * messages that chunk completed (often none, sometimes several). Lines that are not valid JSON
 * are dropped.
 */
export class MessageDecoder {
	private buffer = new Uint8Array(0);

	push (chunk: Uint8Array): unknown[] {
		const joined = new Uint8Array(this.buffer.length + chunk.length);
		joined.set(this.buffer);
		joined.set(chunk, this.buffer.length);

		const messages: unknown[] = [];
		let start = 0;
		let end = joined.indexOf(NEWLINE, start);

		while (-1 !== end) {
			const message = parseLine(decoder.decode(joined.subarray(start, end)));

			if (undefined !== message)
				messages.push(message);

			start = end + 1;
			end = joined.indexOf(NEWLINE, start);
		}

		this.buffer = joined.slice(start);

		if (MAX_MESSAGE_SIZE < this.buffer.length)
			this.buffer = new Uint8Array(0);

		return messages;
	}
}

/** The JSON on one line, or undefined when the line is empty or not JSON. */
function parseLine (line: string): unknown {
	if (!line.trim())
		return undefined;

	try {
		return JSON.parse(line);
	}

	catch {
		return undefined;
	}
}
