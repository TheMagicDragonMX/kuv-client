import { Injectable } from '@angular/core';
import { Environment, Program } from '../cube';

/**
 * A user-created animation project saved from the editor.
 */
export type CustomProject = {
	id: string;
	title: string;
	description: string;
	createdAt: number;
	durationSeconds: number;
	isPublic?: boolean;
	program: Program;
	environment?: Environment;
	videoBlob?: Blob;
	videoMimeType?: string;
};

const DB_NAME = 'KuvProjectsDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

@Injectable({
	providedIn: 'root',
})
export class ProjectStorageService {
	private dbPromise: Promise<IDBDatabase> | null = null;

	private getDB (): Promise<IDBDatabase> {
		if (this.dbPromise) 
			return this.dbPromise;
		

		this.dbPromise = new Promise((resolve, reject) => {
			if ('undefined' === typeof indexedDB) {
				reject(new Error('IndexedDB is not supported in this environment.'));
				return;
			}

			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(STORE_NAME)) 
					db.createObjectStore(STORE_NAME, { keyPath: 'id' });
				
			};

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		return this.dbPromise;
	}

	/**
	 * Returns all saved custom projects sorted by creation date descending.
	 */
	async getAll (): Promise<CustomProject[]> {
		const db = await this.getDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, 'readonly');
			const store = transaction.objectStore(STORE_NAME);
			const request = store.getAll();

			request.onsuccess = () => {
				const list = (request.result as CustomProject[]) || [];
				list.sort((a, b) => b.createdAt - a.createdAt);
				resolve(list);
			};
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Returns a single project by id.
	 */
	async get (id: string): Promise<CustomProject | undefined> {
		const db = await this.getDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, 'readonly');
			const store = transaction.objectStore(STORE_NAME);
			const request = store.get(id);

			request.onsuccess = () => resolve(request.result as CustomProject | undefined);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Saves or updates a project.
	 */
	async save (project: CustomProject): Promise<void> {
		const db = await this.getDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, 'readwrite');
			const store = transaction.objectStore(STORE_NAME);
			const request = store.put(project);

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Deletes a project by id.
	 */
	async delete (id: string): Promise<void> {
		const db = await this.getDB();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, 'readwrite');
			const store = transaction.objectStore(STORE_NAME);
			const request = store.delete(id);

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}
}

