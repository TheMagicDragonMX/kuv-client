import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments';
import { CreationFormPayload, CreationParams, CreationVisibilityPayload, UserCreation, UserParams } from '../../models';

/**
 * Talks to the API's creation endpoints. It only makes the calls: building the form data and
 * parsing the answers is up to `CreationsService`.
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
	 * Lists creations of a specific user.
	 * If viewing another user, the server only returns their public creations.
	 */
	getUserCreations (params: UserParams): Observable<UserCreation[]> {
		return this.http.get<UserCreation[]>(`${this.endpoint}/user/${params.id}`);
	}

	/**
	 * Gets a creation by its id.
	 */
	getCreation (params: CreationParams): Observable<UserCreation> {
		return this.http.get<UserCreation>(`${this.endpoint}/${params.id}`);
	}

	/**
	 * Downloads the video file of a creation.
	 */
	getVideoBlob (params: CreationParams): Observable<Blob> {
		return this.http.get(`${this.endpoint}/${params.id}/video`, { responseType: 'blob' });
	}

	/**
	 * Changes whether a creation is public or private.
	 */
	setVisibility (params: CreationParams, payload: CreationVisibilityPayload): Observable<UserCreation> {
		return this.http.patch<UserCreation>(`${this.endpoint}/${params.id}/visibility`, payload);
	}

	/**
	 * Creates a creation from form data.
	 */
	createCreation (payload: CreationFormPayload): Observable<UserCreation> {
		return this.http.post<UserCreation>(this.endpoint, payload);
	}

	/**
	 * Replaces a creation with form data.
	 */
	updateCreation (params: CreationParams, payload: CreationFormPayload): Observable<UserCreation> {
		return this.http.put<UserCreation>(`${this.endpoint}/${params.id}`, payload);
	}

	/**
	 * Deletes a creation.
	 */
	deleteCreation (params: CreationParams): Observable<void> {
		return this.http.delete<void>(`${this.endpoint}/${params.id}`);
	}
}
