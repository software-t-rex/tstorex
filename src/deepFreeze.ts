declare type DeepReadonly<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> };

/**
 * # deepFreeze
 * recursively freeze an object ignoring ArrrayBufferView as not freezable by spec
 * Be warn it is not tested against circular references, and won't dive into already frozen object
 */
export const deepFreeze = <T>(obj:T): DeepReadonly<T> => {
	// fail silently on non object, and don't dive in frozen object
	if (!obj || typeof obj !== 'object' || Object.isFrozen(obj) ) {
		return obj
	}
	const props = Object.getOwnPropertyNames(obj)
	props.forEach((prop) => {
		const value = (obj as any)[prop]
		if (
			value
			&& value instanceof Object
			&& !('BYTES_PER_ELEMENT' in value)
			&& !Object.isFrozen(value)
		) {
			(obj as any)[prop] = deepFreeze(value)
		}
	})
	return Object.freeze(obj) as DeepReadonly<T>
}