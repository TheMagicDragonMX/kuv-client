/**
 * CATEGORY: background.
 *
 * Blocks that change what is behind the objects: a picture or a color on some faces. They write
 * to the world's background layer, the same one the environment (the Background tab of the
 * editor) paints its pictures on, so a program can change the stage while it runs. The
 * environment is where the cube starts, and a reset brings it back.
 *
 * To add a block to this category: write its file in this folder, then add it to the union and
 * to the table below. The compiler fails if you do one and not the other.
 */

import { CommandDefinition } from '../block-definition';
import { SetBackgroundColorCommand, setBackgroundColorBlock } from './set-background-color';
import { SetBackgroundImageCommand, setBackgroundImageBlock } from './set-background-image';

/**
 * Every command that changes the background.
 */
export type BackgroundCommand = SetBackgroundImageCommand | SetBackgroundColorCommand;

/**
 * The definition of each background block, by `op`.
 */
export const BACKGROUND_BLOCKS: { [K in BackgroundCommand['op']]: CommandDefinition<Extract<BackgroundCommand, { op: K }>> } = {
	setBackgroundImage: setBackgroundImageBlock,
	setBackgroundColor: setBackgroundColorBlock,
};
