import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminCreation, AdminPreviewPayload, CreationParams, UserCreation } from '../../models';
import { AdminHttpService } from '../http/admin.http.service';
import { appendPreview } from './creations.service';

/**
 * What the admin panel uses to list every creation and record their previews. The calls are made
 * by `AdminHttpService`; this one builds the form data that goes out.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
	/**
	 * Makes the calls to the admin endpoints.
	 */
	private readonly http = inject(AdminHttpService);

	/**
	 * Every creation of every user, the most recent first.
	 */
	allCreations (): Observable<AdminCreation[]> {
		return this.http.allCreations();
	}

	/**
	 * Replaces the preview of any creation (its two videos and its thumbnail) and nothing else.
	 */
	setPreview (params: CreationParams, payload: AdminPreviewPayload): Observable<UserCreation> {
		const formData = new FormData();
		appendPreview(formData, payload.videos);

		return this.http.setPreview(params, formData);
	}
}
