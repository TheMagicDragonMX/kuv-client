/**
 * Helpers to build workspaces in tests, the way the user does.
 */

import { CreateCommand } from '../../cube';
import { Workspace, addBlock, addScript, emptyWorkspace, newBlock, newScript } from './workspace';

/**
 * The object the tests act on, as the Objects tab would make it.
 */
export const BALL: CreateCommand = { op: 'create', name: 'ball', face: 'FRONT', x: 32, y: 32, color: '#f9a8d4' };

/**
 * A workspace with one script that starts at once, built by adding the given types one after the
 * other, like the user does. The script has id 1, and the blocks 2, 3...
 */
export function workspaceOf (...types: string[]): Workspace {
	let id = 1;
	let workspace = addScript(emptyWorkspace(), newScript(id++));

	for (const type of types)
		workspace = addBlock(workspace, 1, newBlock(type, id++, [ BALL.name ]));

	return workspace;
}

/**
 * A picture of one color for a whole face.
 */
const picture = new Uint32Array(64 * 64).fill(0x336699);

/**
 * Gives the image to the blocks that need one.
 */
export function withImages (workspace: Workspace): Workspace {
	return {
		...workspace,
		scripts: workspace.scripts.map((script) => ({
			...script,
			blocks: script.blocks.map((block) => 'image' in block.values ? { ...block, values: { ...block.values, image: picture } } : block),
		})),
	};
}
