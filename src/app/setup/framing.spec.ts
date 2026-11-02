import { encodeMessage, MAX_MESSAGE_SIZE, MessageDecoder } from './framing';

describe('framing', () => {
	it('round-trips a message cut into many chunks', () => {
		const message = { id: 7, ok: true, result: { networks: [ { ssid: 'Casa', signal: 82, secure: true } ] } };
		const chunks = encodeMessage(message, 8);
		const decoder = new MessageDecoder();

		const received = chunks.flatMap((chunk) => decoder.push(chunk));

		expect(chunks.length).toBeGreaterThan(1);
		expect(received).toEqual([ message ]);
	});

	it('keeps characters that are cut between two chunks', () => {
		const message = { ssid: 'Café ñandú 📶' };
		const decoder = new MessageDecoder();

		const received = encodeMessage(message, 1).flatMap((chunk) => decoder.push(chunk));

		expect(received).toEqual([ message ]);
	});

	it('splits several messages that arrive in one chunk', () => {
		const bytes = new TextEncoder().encode('{"a":1}\n{"b":2}\n{"c":');
		const decoder = new MessageDecoder();

		expect(decoder.push(bytes)).toEqual([ { a: 1 }, { b: 2 } ]);
		expect(decoder.push(new TextEncoder().encode('3}\n'))).toEqual([ { c: 3 } ]);
	});

	it('drops lines that are not JSON and keeps going', () => {
		const decoder = new MessageDecoder();

		expect(decoder.push(new TextEncoder().encode('not json\n{"ok":true}\n'))).toEqual([ { ok: true } ]);
	});

	it('throws away a message that never ends', () => {
		const decoder = new MessageDecoder();

		decoder.push(new Uint8Array(MAX_MESSAGE_SIZE + 1).fill(0x61));

		expect(decoder.push(new TextEncoder().encode('{"fresh":true}\n'))).toEqual([ { fresh: true } ]);
	});
});
