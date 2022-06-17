declare type DeepReadonly<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> };

/**
 * # deepFreeze
 * recursively freeze an object ignoring ArrrayBufferView as not freezable by spec
 * Be warn it is not tested against circular references
 */
export const deepFreeze = <T>(obj:T): DeepReadonly<T> => {
	if (!obj || typeof obj !== 'object' ) { // fail silently on non object
		return obj
	}
  const props = Object.getOwnPropertyNames(obj);
	props.forEach((prop) => {
		const value = obj[prop];
		if (
			value
			&& value instanceof Object
			&& !('BYTES_PER_ELEMENT' in value)
			&& !Object.isFrozen(value)
		) {
			obj[prop] = deepFreeze(value)
		}
	})
  return Object.freeze(obj) as DeepReadonly<T>;
}