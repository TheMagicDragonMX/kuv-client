import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_URL } from './api-url';
import { Environment, Program } from '../cube';

/**
 * A user's creation representation returned from the API.
 */
export type UserCreation = {
	id: number;
	userId: number;
	title: string;
	description: string | null;
	programJson: string;
	environmentJson: string | null;
	durationSeconds: number;
	hasVideo: boolean;
	isPublic: boolean;
	createdAt: string;
	updatedAt: string;
};

/**
 * User creation with parsed cube program and environment.
 */
export type ParsedUserCreation = Omit<UserCreation, 'programJson' | 'environmentJson'> & {
	program: Program;
	environment?: Environment;
};

@Injectable({ providedIn: 'root' })
export class CreationsApi {
	private readonly http = inject(HttpClient);

	/**
	 * Lists all creations for the signed-in user.
	 */
	getMyCreations (): Observable<UserCreation[]> {
		return this.http.get<UserCreation[]>(`${API_URL}/creations/me`);
	}

	/**
	 * Gets a specific creation by ID.
	 */
	getCreation (id: number): Observable<UserCreation> {
		return this.http.get<UserCreation>(`${API_URL}/creations/${id}`);
	}

	/**
	 * Gets a specific creation with parsed program and environment.
	 */
	getParsedCreation (id: number): Observable<ParsedUserCreation> {
		return this.getCreation(id).pipe(
			map((creation) => ({
				...creation,
				program: JSON.parse(creation.programJson) as Program,
				environment: creation.environmentJson ? (JSON.parse(creation.environmentJson) as Environment) : undefined,
			})),
		);
	}

	/**
	 * Returns a URL for the creation's video file, appending access token if provided.
	 */
	getVideoUrl (id: number, token?: string | null): string {
		const base = `${API_URL}/creations/${id}/video`;
		return token ? `${base}?access_token=${encodeURIComponent(token)}` : base;
	}

	/**
	 * Downloads the video file as a Blob.
	 */
	getVideoBlob (id: number): Observable<Blob> {
		return this.http.get(`${API_URL}/creations/${id}/video`, { responseType: 'blob' });
	}

	/**
	 * Creates a new creation on the server.
	 */
	createCreation (payload: {
		title: string;
		description?: string;
		program: Program;
		environment?: Environment;
		durationSeconds: number;
		isPublic?: boolean;
		videoBlob?: Blob;
	}): Observable<UserCreation> {
		const formData = new FormData();
		formData.append('title', payload.title);
		if (payload.description) {
			formData.append('description', payload.description);
		}
		formData.append('programJson', JSON.stringify(payload.program));
		if (payload.environment) {
			formData.append('environmentJson', JSON.stringify(payload.environment));
		}
		formData.append('durationSeconds', payload.durationSeconds.toString());
		formData.append('isPublic', (payload.isPublic ?? false).toString());

		if (payload.videoBlob) {
			formData.append('video', payload.videoBlob, 'preview.webm');
		}

		return this.http.post<UserCreation>(`${API_URL}/creations`, formData);
	}

	/**
	 * Updates an existing creation on the server.
	 */
	updateCreation (
		id: number,
		payload: {
			title: string;
			description?: string;
			program: Program;
			environment?: Environment;
			durationSeconds: number;
			isPublic?: boolean;
			videoBlob?: Blob;
		},
	): Observable<UserCreation> {
		const formData = new FormData();
		formData.append('title', payload.title);
		if (payload.description !== undefined) {
			formData.append('description', payload.description || '');
		}
		formData.append('programJson', JSON.stringify(payload.program));
		if (payload.environment) {
			formData.append('environmentJson', JSON.stringify(payload.environment));
		}
		formData.append('durationSeconds', payload.durationSeconds.toString());
		if (payload.isPublic !== undefined) {
			formData.append('isPublic', payload.isPublic.toString());
		}

		if (payload.videoBlob) {
			formData.append('video', payload.videoBlob, 'preview.webm');
		}

		return this.http.put<UserCreation>(`${API_URL}/creations/${id}`, formData);
	}

	/**
	 * Deletes a creation on the server.
	 */
	deleteCreation (id: number): Observable<void> {
		return this.http.delete<void>(`${API_URL}/creations/${id}`);
	}
}

