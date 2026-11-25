import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environment';
import { CubeChatNotificationPayload, NotificationsSummary, UnreadCountResponse } from '../../models';

/**
 * Talks to the API's notification endpoints. All endpoints require a signed-in user.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsHttpService {
	private readonly http = inject(HttpClient);

	private readonly endpoint = `${environment.apiUrl}/notifications`;

	/**
	 * Fetches notifications and the current unread count.
	 */
	list (unreadOnly = false, limit = 50): Observable<NotificationsSummary> {
		return this.http.get<NotificationsSummary>(this.endpoint, {
			params: { unreadOnly: String(unreadOnly), limit: String(limit) },
		});
	}

	/**
	 * Fetches only the unread notification count.
	 */
	unreadCount (): Observable<UnreadCountResponse> {
		return this.http.get<UnreadCountResponse>(`${this.endpoint}/unread-count`);
	}

	/**
	 * Marks a single notification as read.
	 */
	markAsRead (id: number): Observable<void> {
		return this.http.post<void>(`${this.endpoint}/${id}/read`, null);
	}

	/**
	 * Marks all unread notifications as read.
	 */
	markAllAsRead (): Observable<void> {
		return this.http.post<void>(`${this.endpoint}/read-all`, null);
	}

	/**
	 * Deletes a notification.
	 */
	delete (id: number): Observable<void> {
		return this.http.delete<void>(`${this.endpoint}/${id}`);
	}

	/**
	 * Records a cube-chat notification or @username mention.
	 */
	recordCubeChat (payload: CubeChatNotificationPayload): Observable<void> {
		return this.http.post<void>(`${this.endpoint}/cube-chat`, payload);
	}
}
