import { Environment, Program } from '../cube';
import { environment } from '../environments';
import { UserCreation } from './creations.http.service';

/**
 * User creation with parsed cube program and environment.
 */
export type ParsedUserCreation = Omit<UserCreation, 'programJson' | 'environmentJson'> & {
	/**
	 * The cube program of the creation.
	 */
	program: Program;

	/**
	 * The environment of the creation, when it has one.
	 */
	environment?: Environment;
};

/**
 * What the editor sends to save a creation.
 */
export type CreationPayload = {
	/**
	 * Title of the creation.
	 */
	title: string;

	/**
	 * What the creation is about.
	 */
	description?: string;

	/**
	 * The cube program.
	 */
	program: Program;

	/**
	 * The environment the program runs in.
	 */
	environment?: Environment;

	/**
	 * How long the video lasts, in seconds.
	 */
	durationSeconds: number;

	/**
	 * Whether other users can see it.
	 */
	isPublic?: boolean;

	/**
	 * The recorded video.
	 */
	videoBlob?: Blob;
};

/**
 * The form data the API expects for a creation. When updating, a missing description or
 * visibility is left as it was.
 */
export function creationForm (payload: CreationPayload, updating = false): FormData {
	const formData = new FormData();
	formData.append('title', payload.title);

	if (updating ? undefined !== payload.description : payload.description)
		formData.append('description', payload.description ?? '');

	formData.append('programJson', JSON.stringify(payload.program));

	if (payload.environment)
		formData.append('environmentJson', JSON.stringify(payload.environment));

	formData.append('durationSeconds', payload.durationSeconds.toString());

	if (updating ? undefined !== payload.isPublic : true)
		formData.append('isPublic', (payload.isPublic ?? false).toString());

	if (payload.videoBlob)
		formData.append('video', payload.videoBlob, 'preview.webm');

	return formData;
}

/**
 * A creation with its program and environment parsed from JSON.
 */
export function parseCreation (creation: UserCreation): ParsedUserCreation {
	return {
		...creation,
		program: JSON.parse(creation.programJson) as Program,
		environment: creation.environmentJson ? (JSON.parse(creation.environmentJson) as Environment) : undefined,
	};
}

/**
 * Address of a creation's video, with the access token when given so a `<video>` element can load it.
 */
export function videoUrl (id: number, token?: string | null): string {
	const base = `${environment.apiUrl}/creations/${id}/video`;

	return token ? `${base}?access_token=${encodeURIComponent(token)}` : base;
}
