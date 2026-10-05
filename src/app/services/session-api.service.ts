import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface TokenResponse {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
}

export interface RegisterPayload {
	username: string;
	email: string;
	age: number;
	password: string;
}

@Injectable({ providedIn: 'root' })
export class SessionApi {
	private readonly http = inject(HttpClient);
	private readonly endpoint = 'http://localhost:5038/session';

	login (username: string, password: string): Observable<TokenResponse> {
		return this.http.post<TokenResponse>(`${this.endpoint}/login`, { username, password });
	}

	register (user: RegisterPayload): Observable<unknown> {
		return this.http.post(`${this.endpoint}/register`, user);
	}
}