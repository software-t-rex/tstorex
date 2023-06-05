import { StoreInterface } from "../type"

interface BindStorageOptions<T> {
	// default to sessionStorage
	storage?: Storage
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
	const {
		storage = sessionStorage,
		key,
		restore = true,
		serializer = JSON.stringify,
		deserializer = JSON.parse
	} = options || {}
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
