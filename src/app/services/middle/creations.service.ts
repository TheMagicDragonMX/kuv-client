import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environment';
import { createProgramFile, readProgramFile } from '../../cube';
import {
	CreationFormPayload,
	CreationParams,
	CreationPayload,
	CreationVisibilityPayload,
	ParsedUserCreation,
	UserCreation,
	UserCreationDetail,
	UserParams,
	VideoUrlParams,
} from '../../models';
import { CreationsHttpService } from '../http/creations.http.service';

/**
 * What the components use to read and save the user's creations. The calls are made by
 * `CreationsHttpService`; this one builds the form data that goes out and parses what comes in.
 */
@Injectable({ providedIn: 'root' })
export class CreationsService {
	/**
	 * Makes the calls to the creation endpoints.
	 */
	private readonly http = inject(CreationsHttpService);

	/**
	 * Lists all creations of the signed-in user.
	 */
	getMyCreations (): Observable<UserCreation[]> {
		return this.http.getMyCreations();
	}

	/**
	 * Lists creations of a specific user.
	 * If viewing another user, the server only returns their public creations.
	 */
	getUserCreations (params: UserParams): Observable<UserCreation[]> {
		return this.http.getUserCreations(params);
	}

	/**
	 * Gets a creation by its id, with its program file.
	 */
	getCreation (params: CreationParams): Observable<UserCreationDetail> {
		return this.http.getCreation(params);
	}

	/**
	 * Downloads the video file of a creation.
	 */
	getVideoBlob (params: CreationParams): Observable<Blob> {
		return this.http.getVideoBlob(params);
	}

	/**
	 * Changes whether a creation is public or private.
	 */
	setVisibility (params: CreationParams, payload: CreationVisibilityPayload): Observable<UserCreation> {
		return this.http.setVisibility(params, payload);
	}

	/**
	 * Creates a creation from what the editor made.
	 */
	createCreation (payload: CreationPayload): Observable<UserCreationDetail> {
		return this.http.createCreation(this.form(payload));
	}

	/**
	 * Replaces a creation. A missing description or visibility is left as it was.
	 */
	updateCreation (params: CreationParams, payload: CreationPayload): Observable<UserCreationDetail> {
		return this.http.updateCreation(params, this.form(payload, true));
	}

	/**
	 * Deletes a creation.
	 */
	deleteCreation (params: CreationParams): Observable<void> {
		return this.http.deleteCreation(params);
	}

	/**
	 * A creation with its program file checked and its program and environment ready for the
	 * engine. Throws a ProgramError, saying where, if the program file is not valid.
	 */
	parseCreation (creation: UserCreationDetail): ParsedUserCreation {
		const { programFile, ...description } = creation;

		return { ...description, ...readProgramFile(programFile) };
	}

	/**
	 * Address of a creation's video for a theme (dark when not given), with the access token when
	 * given so a `<video>` element can load it.
	 */
	videoUrl (params: VideoUrlParams): string {
		const query = new URLSearchParams({ theme: params.theme ?? 'dark' });

		if (params.token)
			query.set('access_token', params.token);

		return `${environment.apiUrl}/creations/${params.id}/video?${query}`;
	}

	/**
	 * The form data the API expects for a creation. When updating, a missing description or
	 * visibility is left as it was.
	 */
	private form (payload: CreationPayload, updating = false): CreationFormPayload {
		const formData = new FormData();
		formData.append('title', payload.title);

		if (updating ? undefined !== payload.description : payload.description)
			formData.append('description', payload.description ?? '');

		formData.append('programFile', JSON.stringify(createProgramFile(payload.program, payload.environment)));

		if (updating ? undefined !== payload.isPublic : true)
			formData.append('isPublic', (payload.isPublic ?? false).toString());

		/**
		 * The name says what kind of video it is: the API keeps the extension, and Safari records mp4.
		 */
		if (payload.videos) {
			for (const [ field, video ] of [ [ 'videoDark', payload.videos.dark ], [ 'videoLight', payload.videos.light ] ] as const)
				formData.append(field, video.blob, video.mimeType.startsWith('video/mp4') ? 'preview.mp4' : 'preview.webm');
		}

		return formData;
	}
}
