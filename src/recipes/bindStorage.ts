/*
Copyright © 2023 Jonathan Gotti <jgotti at jgotti dot org>
SPDX-FileType: SOURCE
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2023 Jonathan Gotti <jgotti@jgotti.org>
*/
import { StoreInterface } from "../type"

export interface BindStorageOptions<T> {
	// default to sessionStorage
	storage?: Pick<Storage, 'getItem' | 'setItem'>
	// key in storage to store the value in
	key: string
	// Try to restore state from storage on init if any. If not state is already set in storage, then set it to the current state.
	// If false, storage will only be updated on store change.
	// (default to true)
	restore?: boolean
	// serialize state before putting it in storage
	serializer?: (value: T) => any
	// deserialize state from storage before restoring it
	deserializer?: (value: any) => T
}
/**
 * Bind store state to a StorageInterface (sessionStorage or localStorage or any compliant storage interface).
 * It will restore value from storage if any, and update storage on store change.
 * Returns a function to unbind.
 */
export const bindStorage = <T>(store: StoreInterface<T>, options:BindStorageOptions<T>) => {
	if (!options || typeof options !== "object"){
		throw new Error("bindStorage called with invalid options.")
	}
	const {
		storage = sessionStorage,
		key,
		restore = true,
		serializer = JSON.stringify,
		deserializer = JSON.parse
	} = options
	if (typeof serializer !== "function" || typeof deserializer !== "function" || typeof key !== "string" || key.length < 1 ) {
		throw new Error("bindStorage called with invalid options.")
	}
	if (restore) {
		const storedValue = storage.getItem(key)
		if (storedValue === null) {
			storage.setItem(key, serializer(store.get()))
		} else {
			store.set(deserializer(storedValue))
		}
	}
	return store.subscribe((newState, oldState) => newState !== oldState && storage.setItem(key, serializer(newState)))
}
