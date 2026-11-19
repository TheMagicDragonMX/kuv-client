import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '@environment';
import { AdminCreation, AdminPreviewFormPayload, CreationParams, UserCreation } from '../../models';

/**
 * Talks to the API's admin endpoints, which only answer super admins. It only makes the calls:
 * building the form data is up to `AdminService`.
 */
@Injectable({ providedIn: 'root' })
export class AdminHttpService {
	/**
	 * Sends the HTTP requests.
	 */
	private readonly http = inject(HttpClient);

	/**
	 * Address of the admin endpoints.
	 */
	private readonly endpoint = `${environment.apiUrl}/admin`;

	/**
	 * Every creation of every user, the most recent first.
	 */
	allCreations (): Observable<AdminCreation[]> {
		return this.http.get<AdminCreation[]>(`${this.endpoint}/creations`).pipe(
			tap((response) => console.log('All creations', response)),
		);
	}

	/**
	 * Replaces the preview of any creation with form data.
	 */
	setPreview (params: CreationParams, payload: AdminPreviewFormPayload): Observable<UserCreation> {
		return this.http.put<UserCreation>(`${this.endpoint}/creations/${params.id}/preview`, payload).pipe(
			tap((response) => console.log('Preview replaced', response)),
		);
	}
}
