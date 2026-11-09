import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments';

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
 * Talks to the API's creation endpoints. It only makes the calls: building the form data and
 * parsing the answers is up to `creations.ts`.
 */
@Injectable({ providedIn: 'root' })
export class CreationsHttpService {
	/**
	 * Sends the HTTP requests.
	 */
	private readonly http = inject(HttpClient);

	/**
	 * Address of the creation endpoints.
	 */
	private readonly endpoint = `${environment.apiUrl}/creations`;

	/**
	 * Lists all creations of the signed-in user.
	 */
	getMyCreations (): Observable<UserCreation[]> {
		return this.http.get<UserCreation[]>(`${this.endpoint}/me`);
	}

	/**
	 * Gets a creation by its id.
	 */
	getCreation (id: number): Observable<UserCreation> {
		return this.http.get<UserCreation>(`${this.endpoint}/${id}`);
	}

	/**
	 * Downloads the video file of a creation.
	 */
	getVideoBlob (id: number): Observable<Blob> {
		return this.http.get(`${this.endpoint}/${id}/video`, { responseType: 'blob' });
	}

	/**
	 * Creates a creation from form data.
	 */
	createCreation (body: FormData): Observable<UserCreation> {
		return this.http.post<UserCreation>(this.endpoint, body);
	}

	/**
	 * Replaces a creation with form data.
	 */
	updateCreation (id: number, body: FormData): Observable<UserCreation> {
		return this.http.put<UserCreation>(`${this.endpoint}/${id}`, body);
	}

	/**
	 * Deletes a creation.
	 */
	deleteCreation (id: number): Observable<void> {
		return this.http.delete<void>(`${this.endpoint}/${id}`);
	}
}
