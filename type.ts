export type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

export type PathIdentifier = string | number

export type GenericObject = Record<PathIdentifier, any>

export type PathKey<T extends GenericObject, Depth extends Prev[number] = 4> = [Depth] extends [never] ? never : keyof {
    [key in keyof T as T[key] extends GenericObject
        ? (key extends `${infer rootKey}.${PathIdentifier}`
            ? PathKey<T[rootKey], Prev[Depth]>
            : key | `${PathIdentifier & key}.${(string|number) & PathKey<T[key], Prev[Depth]>}`)
        : key
    ]: true
}

export type PathValue<T extends GenericObject, K extends PathKey<T, Depth> | string, Depth extends Prev[number] = 4> = [Depth] extends [never] ? never : {
    [key in K]: key extends keyof T
        ? T[key]
        : key extends `${infer rootkey}.${infer restPath}`
            ? PathValue<T[rootkey], restPath, Depth>
            : T[key]
}[K]

export type StoreInitializer<TypeState> = ( get: ()=>TypeState, set: (state:TypeState)=>void ) => TypeState
export type NextState<TypeState> = TypeState | ((state:TypeState)=>TypeState)
export type changeListener<TypeState> = (newState: TypeState, oldState?: TypeState) => void
export interface Store<TypeState> {
	/** get snapshot state */
	get: () => TypeState
	/** set a new state into the store */
	set: (nextState: NextState<TypeState>) => void
	/** bind a listener which will be call on any change on state in store */
	subscribe: (listener: changeListener<TypeState>) => () => void
	/** return a child store scoped to only a part of the initial state and with no destroy method */
	getScopeStore?: <Key extends PathKey<TypeState>>(propName: Key) => Store<PathValue<TypeState, Key>>
	/** unbind all listener bound to the store and reset state value to null */
	destroy?: () => void
}