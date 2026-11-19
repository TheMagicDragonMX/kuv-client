import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environment';

export interface CreateReportPayload {
	targetType: 'animation' | 'user' | 'comment';
	targetId: number;
	category: string;
	details?: string | null;
}

export interface ReportResponse {
	id: number;
	targetType: string;
	targetId: number;
	reportedUserId: number;
	category: string;
	details: string | null;
	status: string;
	createdAt: string;
}

/**
 * Talks to the API moderation reports endpoints.
 */
@Injectable({ providedIn: 'root' })
export class ReportsService {
	private readonly http = inject(HttpClient);
	private readonly endpoint = `${environment.apiUrl}/reports`;

	/**
	 * Submits a moderation report against an animation, user profile, or comment.
	 */
	submitReport (payload: CreateReportPayload): Observable<ReportResponse> {
		return this.http.post<ReportResponse>(this.endpoint, payload);
	}

	/**
	 * Returns all reports submitted by the signed-in user.
	 */
	getMyReports (): Observable<ReportResponse[]> {
		return this.http.get<ReportResponse[]>(`${this.endpoint}/me`);
	}
}

