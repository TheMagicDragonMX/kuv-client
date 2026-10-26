import { FaceName } from '../../cube';

/**
 * The faces of the cube as the editor offers them, in the order they are shown.
 */
export const FACE_OPTIONS: { name: FaceName; label: string }[] = [
	{ name: 'FRONT', label: 'Front' },
	{ name: 'RIGHT', label: 'Right' },
	{ name: 'BACK', label: 'Back' },
	{ name: 'LEFT', label: 'Left' },
	{ name: 'TOP', label: 'Top' },
];
