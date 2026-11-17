/**
 * LAYER: program file.
 *
 * The complete program of a creation as one JSON document: the program the cube runs and the
 * environment it runs on. It is what the API keeps as `program.json` in the folder of each
 * creation, and its structure is defined by `Schemas/program-file.schema.json` in the API, which
 * checks it before storing it.
 *
 *   ProgramFile
 *    ├─ version      version of this format
 *    ├─ program      the program (see `program/program.ts`)
 *    └─ environment  optional pictures behind the objects and brightness
 *
 * The engine works with pixel buffers (`Uint32Array` of packed numbers), which JSON cannot hold:
 * `JSON.stringify` turns them into objects keyed by position. In a file every picture is a list
 * of colors written `#RRGGBB`, like the pictures in the blocks, so it can be read by people and
 * by the Raspberry Pi. This file converts between the two forms.
 */

import { ProgramError } from '../errors';
import { Environment } from '../environment/environment';
import { isColorValue, formatColor, parseColor } from '../program/names';
import { ColorValue, FaceName, Program } from '../program/program';
import { validateProgram } from '../program/validate-program';
import { Brightness } from '../renderer/renderer';
import { Color, FACE_RESOLUTION } from '../state/cube-state';
import { NamedBackground } from '../world/world';

/**
 * Version of the program file format.
 */
export const PROGRAM_FILE_VERSION = 1;

/**
 * The picture of each face that has one, in a file: `FACE_RESOLUTION * FACE_RESOLUTION` colors
 * written `#RRGGBB`, row after row.
 */
export type FaceImagesFile = Partial<Record<FaceName, ColorValue[]>>;

/**
 * A background the program can switch to, in a file.
 */
export type NamedBackgroundFile = {
	/**
	 * What the blocks call it.
	 */
	name: string;

	/**
	 * The picture of each face that has one.
	 */
	images: FaceImagesFile;
};

/**
 * The environment, in a file.
 */
export type EnvironmentFile = {
	/**
	 * Pictures behind the objects, by face.
	 */
	background?: FaceImagesFile;

	/**
	 * The backgrounds a program can switch to, in order.
	 */
	backgrounds?: NamedBackgroundFile[];

	/**
	 * Name of the background of `backgrounds` the cube starts with.
	 */
	startBackground?: string;

	/**
	 * How intensely the background and the objects shine.
	 */
	brightness?: Partial<Brightness>;
};

/**
 * The complete program of a creation.
 */
export type ProgramFile = {
	/**
	 * Version of the program file format.
	 */
	version: typeof PROGRAM_FILE_VERSION;

	/**
	 * The program the cube runs.
	 */
	program: Program;

	/**
	 * The environment the program runs on, when it has one.
	 */
	environment?: EnvironmentFile;
};

/**
 * What a program file holds, ready for the engine.
 */
export type LoadedProgramFile = {
	/**
	 * The program the cube runs.
	 */
	program: Program;

	/**
	 * The environment the program runs on, when the file has one.
	 */
	environment?: Environment;
};

/**
 * Pixels on one face.
 */
const FACE_PIXELS = FACE_RESOLUTION * FACE_RESOLUTION;

/**
 * Builds the program file of a program and its environment, with the pictures written as colors.
 */
export function createProgramFile (program: Program, environment?: Environment): ProgramFile {
	const file: ProgramFile = { version: PROGRAM_FILE_VERSION, program };

	if (environment)
		file.environment = writeEnvironment(environment);

	return file;
}

/**
 * Checks a program file, for example one the API sent, and returns what it holds for the engine.
 * Throws a ProgramError, saying where, if it is not valid.
 */
export function readProgramFile (value: unknown): LoadedProgramFile {
	if ('object' !== typeof value || null === value || Array.isArray(value))
		throw new ProgramError('programFile: must be an object');

	const file = value as Record<string, unknown>;

	if (PROGRAM_FILE_VERSION !== file['version'])
		throw new ProgramError(`programFile.version: must be ${PROGRAM_FILE_VERSION}`);

	const program = validateProgram(file['program']);

	if (undefined === file['environment'])
		return { program };

	return { program, environment: readEnvironment(file['environment']) };
}

/**
 * The environment with every picture written as a list of colors. What is empty is left out.
 */
function writeEnvironment (environment: Environment): EnvironmentFile {
	const file: EnvironmentFile = {};

	if (environment.background)
		file.background = writeImages(environment.background);

	if (environment.backgrounds)
		file.backgrounds = environment.backgrounds.map((background) => ({ name: background.name, images: writeImages(background.images) }));

	if (undefined !== environment.startBackground)
		file.startBackground = environment.startBackground;

	if (environment.brightness)
		file.brightness = { ...environment.brightness };

	return file;
}

/**
 * The pictures of the faces, each as a list of `#RRGGBB` colors.
 */
function writeImages (images: Partial<Record<FaceName, ArrayLike<Color>>>): FaceImagesFile {
	const file: FaceImagesFile = {};

	for (const [ face, pixels ] of Object.entries(images) as [ FaceName, ArrayLike<Color> ][])
		file[face] = Array.from(pixels, formatColor);

	return file;
}

/**
 * Checks the environment of a file and turns its pictures into pixel buffers.
 */
function readEnvironment (value: unknown): Environment {
	const file = expectObject(value, 'environment');
	const environment: Environment = {};

	if (undefined !== file['background'])
		environment.background = readImages(file['background'], 'environment.background');

	if (undefined !== file['backgrounds']) {
		if (!Array.isArray(file['backgrounds']))
			throw new ProgramError('environment.backgrounds: must be a list of backgrounds');

		environment.backgrounds = file['backgrounds'].map((item, index): NamedBackground => {
			const path = `environment.backgrounds[${index}]`;
			const background = expectObject(item, path);

			if ('string' !== typeof background['name'] || 0 === background['name'].length)
				throw new ProgramError(`${path}.name: must be a non-empty text`);

			return { name: background['name'], images: readImages(background['images'], `${path}.images`) };
		});
	}

	if (undefined !== file['startBackground']) {
		if ('string' !== typeof file['startBackground'])
			throw new ProgramError('environment.startBackground: must be a text');

		environment.startBackground = file['startBackground'];
	}

	if (undefined !== file['brightness'])
		environment.brightness = expectObject(file['brightness'], 'environment.brightness') as Partial<Brightness>;

	return environment;
}

/**
 * Checks the pictures of the faces and turns each into a pixel buffer.
 */
function readImages (value: unknown, path: string): Partial<Record<FaceName, Uint32Array>> {
	const images: Partial<Record<FaceName, Uint32Array>> = {};

	for (const [ face, colors ] of Object.entries(expectObject(value, path))) {
		if (!Array.isArray(colors) || colors.length !== FACE_PIXELS || !colors.every(isColorValue))
			throw new ProgramError(`${path}.${face}: must be ${FACE_PIXELS} colors written as #rrggbb, row after row`);

		images[face as FaceName] = Uint32Array.from(colors, parseColor);
	}

	return images;
}

/**
 * Requires a plain object (not null, not a list).
 */
function expectObject (value: unknown, path: string): Record<string, unknown> {
	if ('object' !== typeof value || null === value || Array.isArray(value))
		throw new ProgramError(`${path}: must be an object`);

	return value as Record<string, unknown>;
}
