/**
 * The workspace of the Blocks tab: the scripts the user built, each one a tree of blocks.
 *
 * The workspace is the source of truth for what the program does. The JSON program is made from
 * it (`compileWorkspace`), and a program can be turned back into blocks (`blocksFromProgram`),
 * which is how the examples are loaded. The objects the blocks act on are not here: the user
 * makes them in the Objects tab, and they are given to the functions that need them. What each block looks like and becomes is in `visual-blocks.ts`.
 *
 * Everything here is immutable: an edit returns a new workspace.
 */

import { Block, CreateCommand, Program, ProgramConfig, Script, Trigger } from '../../cube';
import { Context, FieldValue, Values, fieldProblem, specForOp, specOf } from './visual-blocks';

/**
 * A block of a script. Blocks like "Repeat" hold more blocks in `body`.
 */
export interface VisualBlock {
	id: number;
	type: string;
	values: Values;
	body?: VisualBlock[];
}

/**
 * A stack of blocks and the event that starts it.
 */
export interface VisualScript {
	id: number;
	trigger: Trigger;
	blocks: VisualBlock[];
}

export interface Workspace {
	config: ProgramConfig;
	scripts: VisualScript[];
}

/**
 * Hands out ids that are not used by any block or script.
 */
export type NextId = () => number;

export function emptyWorkspace (): Workspace {
	return { config: {}, scripts: [] };
}

/**
 * A block of the given type with the values it starts with.
 */
export function newBlock (type: string, id: number, objects: string[]): VisualBlock {
	const spec = specOf(type);
	const block: VisualBlock = { id, type, values: spec.defaults(objects) };

	if (spec.container)
		block.body = [];

	return block;
}

export function newScript (id: number, trigger: Trigger = { type: 'start' }): VisualScript {
	return { id, trigger, blocks: [] };
}

// --- Reading

/**
 * Calls `visit` for every block, in the order the program reads: script after script, and a
 * block before the blocks inside it.
 */
export function eachBlock (workspace: Workspace, visit: (block: VisualBlock) => void): void {
	const walk = (blocks: VisualBlock[]): void => {
		for (const block of blocks) {
			visit(block);
			walk(block.body ?? []);
		}
	};

	for (const script of workspace.scripts)
		walk(script.blocks);
}

export function countBlocks (workspace: Workspace): number {
	let count = 0;
	eachBlock(workspace, () => count += 1);

	return count;
}

/**
 * What is missing in each block or script that is not ready to run, by id, given the names of
 * the objects that exist. One that is fine is not in the map.
 */
export function problemsOf (workspace: Workspace, objects: string[]): Map<number, string> {
	const problems = new Map<number, string>();

	for (const script of workspace.scripts) {
		const seconds = 'every' === script.trigger.type ? script.trigger.seconds : 1;

		if (!Number.isFinite(seconds) || 0 >= seconds)
			problems.set(script.id, 'Seconds must be more than zero.');
	}

	eachBlock(workspace, (block) => {
		const spec = specOf(block.type);
		const context: Context = { objects };
		const message = fieldProblem(spec, block.values) ?? spec.problem?.(block.values, context) ?? null;

		if (message)
			problems.set(block.id, message);
	});

	return problems;
}

// --- Turning into a program

/**
 * The program the workspace stands for: one script for each script of blocks, and the objects
 * the program starts with.
 */
export function compileWorkspace (workspace: Workspace, objects: CreateCommand[] = []): Program {
	const compile = (blocks: VisualBlock[]): Block[] => blocks.map((block) =>
		specOf(block.type).compile(block.values, compile(block.body ?? [])));

	const program: Program = {
		version: 1,
		scripts: workspace.scripts.map((script): Script => ({ trigger: script.trigger, blocks: compile(script.blocks) })),
	};

	if (0 < Object.keys(workspace.config).length)
		program.config = workspace.config;

	if (0 < objects.length)
		program.objects = objects;

	return program;
}

/**
 * The blocks and the objects of a program. The objects are the ones it declares, plus the
 * `create` blocks at the start of its scripts (that is how an object was made before there was
 * a place for them), which become objects that exist from the start. A `create` block anywhere
 * else has no visual block, and so does any other block that is unknown: it throws.
 */
export function blocksFromProgram (program: Program, nextId: NextId): { workspace: Workspace; objects: CreateCommand[] } {
	const objects: CreateCommand[] = [ ...program.objects ?? [] ];

	const read = (blocks: Block[]): VisualBlock[] => blocks.map((block) => {
		const spec = specForOp(block.op);
		const visual: VisualBlock = { id: nextId(), type: spec.type, values: spec.read(block) };

		if ('body' in block)
			visual.body = read(block.body);

		return visual;
	});

	const scripts = program.scripts.map((script) => {
		let first = 0;

		while (first < script.blocks.length && 'create' === script.blocks[first].op)
			objects.push(script.blocks[first++] as CreateCommand);

		return { id: nextId(), trigger: { ...script.trigger }, blocks: read(script.blocks.slice(first)) };
	});

	return { workspace: { config: { ...program.config }, scripts }, objects };
}

// --- Editing

/**
 * Applies `edit` to the list that holds the block with this id, wherever it is.
 */
function editList (blocks: VisualBlock[], id: number, edit: (list: VisualBlock[], index: number) => VisualBlock[]): VisualBlock[] {
	const index = blocks.findIndex((block) => block.id === id);

	if (-1 !== index)
		return edit(blocks, index);

	return blocks.map((block) => block.body ? { ...block, body: editList(block.body, id, edit) } : block);
}

/**
 * Applies `edit` to the block with this id, wherever it is.
 */
function editBlock (blocks: VisualBlock[], id: number, edit: (block: VisualBlock) => VisualBlock): VisualBlock[] {
	return editList(blocks, id, (list, index) => list.map((block, at) => at === index ? edit(block) : block));
}

function editScripts (workspace: Workspace, edit: (blocks: VisualBlock[]) => VisualBlock[]): Workspace {
	return { ...workspace, scripts: workspace.scripts.map((script) => ({ ...script, blocks: edit(script.blocks) })) };
}

function swapped<T> (list: T[], index: number, offset: -1 | 1): T[] {
	const target = index + offset;

	if (0 > target || target >= list.length)
		return list;

	const moved = [ ...list ];
	[ moved[index], moved[target] ] = [ moved[target], moved[index] ];

	return moved;
}

export function addScript (workspace: Workspace, script: VisualScript): Workspace {
	return { ...workspace, scripts: [ ...workspace.scripts, script ] };
}

/**
 * Adds a block at the end of a script, or of the body of a block, by the id of that script or block.
 */
export function addBlock (workspace: Workspace, containerId: number, block: VisualBlock): Workspace {
	if (workspace.scripts.some((script) => script.id === containerId)) 
		return { ...workspace, scripts: workspace.scripts.map((script) =>
			script.id === containerId ? { ...script, blocks: [ ...script.blocks, block ] } : script) };
	

	return editScripts(workspace, (blocks) => editBlock(blocks, containerId, (container) =>
		({ ...container, body: [ ...(container.body ?? []), block ] })));
}

/**
 * Removes a script or a block (with what is inside it).
 */
export function removeItem (workspace: Workspace, id: number): Workspace {
	const scripts = workspace.scripts.filter((script) => script.id !== id);

	return editScripts({ ...workspace, scripts }, (blocks) => editList(blocks, id, (list, index) => list.filter((_, at) => at !== index)));
}

/**
 * Swaps a script or a block with its neighbor, one place up (-1) or down (1).
 */
export function moveItem (workspace: Workspace, id: number, offset: -1 | 1): Workspace {
	const index = workspace.scripts.findIndex((script) => script.id === id);

	if (-1 !== index)
		return { ...workspace, scripts: swapped(workspace.scripts, index, offset) };

	return editScripts(workspace, (blocks) => editList(blocks, id, (list, at) => swapped(list, at, offset)));
}

export function setValue (workspace: Workspace, id: number, key: string, value: FieldValue): Workspace {
	return editScripts(workspace, (blocks) => editBlock(blocks, id, (block) =>
		({ ...block, values: { ...block.values, [key]: value } })));
}

export function setTrigger (workspace: Workspace, id: number, trigger: Trigger): Workspace {
	return { ...workspace, scripts: workspace.scripts.map((script) => script.id === id ? { ...script, trigger } : script) };
}

/**
 * Changes one setting of the program. `undefined` goes back to the default of the engine.
 */
export function setConfig<K extends keyof ProgramConfig> (workspace: Workspace, key: K, value: ProgramConfig[K] | undefined): Workspace {
	const config = { ...workspace.config, [key]: value };

	if (undefined === value)
		delete config[key];

	return { ...workspace, config };
}
