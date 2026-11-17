import { ProgramError } from '../errors';
import { Program } from '../program/program';
import { createProgramFile, readProgramFile } from './program-file';

/**
 * A program with one script, enough to go through the file.
 */
const PROGRAM: Program = { version: 1, scripts: [ { trigger: { type: 'start' }, blocks: [ { op: 'wait', seconds: 1 } ] } ] };

describe('program file', () => {
	it('keeps the program as it is and leaves out a missing environment', () => {
		const file = createProgramFile(PROGRAM);

		expect(file).toEqual({ version: 1, program: PROGRAM });
		expect(readProgramFile(JSON.parse(JSON.stringify(file)))).toEqual({ program: PROGRAM });
	});

	it('writes the pictures as #rrggbb colors and reads them back as pixel buffers', () => {
		const picture = new Uint32Array(64 * 64).fill(0x336699);
		picture[1] = 0xffffff;

		const file = createProgramFile(PROGRAM, {
			background: { FRONT: picture },
			backgrounds: [ { name: 'Sky', images: { TOP: picture } } ],
			startBackground: 'Sky',
			brightness: { objects: 0.5 },
		});

		expect(file.environment?.background?.FRONT?.slice(0, 3)).toEqual([ '#336699', '#ffffff', '#336699' ]);

		const loaded = readProgramFile(JSON.parse(JSON.stringify(file)));

		expect(loaded.environment?.background?.FRONT).toEqual(picture);
		expect(loaded.environment?.backgrounds?.[0].images.TOP).toEqual(picture);
		expect(loaded.environment?.startBackground).toBe('Sky');
		expect(loaded.environment?.brightness).toEqual({ objects: 0.5 });
	});

	it('refuses a file of another version', () => {
		expect(() => readProgramFile({ version: 2, program: PROGRAM })).toThrowError(ProgramError);
	});

	it('refuses an invalid program, saying where', () => {
		expect(() => readProgramFile({ version: 1, program: { version: 1, scripts: [ { trigger: { type: 'every', seconds: 0 }, blocks: [] } ] } }))
			.toThrowError(/scripts\[0\]\.trigger\.seconds/);
	});

	it('refuses a picture that is not the size of a face', () => {
		expect(() => readProgramFile({ version: 1, program: PROGRAM, environment: { background: { FRONT: [ '#000000' ] } } }))
			.toThrowError(/environment\.background\.FRONT/);
	});
});
