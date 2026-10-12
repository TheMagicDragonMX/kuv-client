/**
 * LAYER: commands (objects).
 *
 * What each object block does to the world. One small function per block.
 *
 * Moving, placing and orienting go through the geometry, which is the only code that knows how
 * the faces connect. These functions never compute edges or rotations themselves.
 *
 * Names are looked up with `world.get`, which throws if the object does not exist; the
 * scheduler turns that into a message for the user and stops only that script.
 */

import {
	CreateCommand,
	DeleteCommand,
	HideCommand,
	MoveCommand,
	MoveToCommand,
	PointUpCommand,
	SetColorCommand,
	ShowCommand,
} from '../program/program';
import { FACE_BY_NAME, HEADING_BY_NAME, parseColor } from '../program/names';
import { World } from '../world/world';

/**
 * Creates a new visible pixel object.
 */
export function create (world: World, command: CreateCommand): void {
	world.add({
		name: command.name,
		shape: 'pixel',
		pose: world.geometry.place({
			face: FACE_BY_NAME[command.face],
			x: command.x,
			y: command.y,
			heading: command.heading && HEADING_BY_NAME[command.heading],
		}),
		color: parseColor(command.color),
		visible: true,
	});
}

/**
 * Moves an object relative to its heading. If the move changes nothing (zero cells, or the
 * object is already against the floor) the world is left untouched, so nothing is redrawn.
 */
export function move (world: World, command: MoveCommand): void {
	const object = world.get(command.target);
	const pose = world.geometry.move(object.pose, command.step, command.count ?? 1);

	if (pose !== object.pose) 
		world.update(command.target, { pose });
	
}

/**
 * Puts an object on a cell of a face, with the given heading or north.
 */
export function moveTo (world: World, command: MoveToCommand): void {
	world.get(command.target);

	world.update(command.target, {
		pose: world.geometry.place({
			face: FACE_BY_NAME[command.face],
			x: command.x,
			y: command.y,
			heading: command.heading && HEADING_BY_NAME[command.heading],
		}),
	});
}

/**
 * Changes the color of an object.
 */
export function setColor (world: World, command: SetColorCommand): void {
	const color = parseColor(command.color);

	if (world.get(command.target).color !== color) 
		world.update(command.target, { color });
	
}

/**
 * Makes an object visible.
 */
export function show (world: World, command: ShowCommand): void {
	if (!world.get(command.target).visible) 
		world.update(command.target, { visible: true });
	
}

/**
 * Hides an object.
 */
export function hide (world: World, command: HideCommand): void {
	if (world.get(command.target).visible) 
		world.update(command.target, { visible: false });
	
}

/**
 * Removes an object.
 */
export function remove (world: World, command: DeleteCommand): void {
	world.remove(command.target);
}

/**
 * Resets the heading of an object so its "up" is the up of the screen again.
 */
export function pointUp (world: World, command: PointUpCommand): void {
	const object = world.get(command.target);
	const pose = world.geometry.pointUp(object.pose);

	if (pose.heading !== object.pose.heading) 
		world.update(command.target, { pose });
	
}
