export type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
export type PathIdentifier = string | number
export type GenericObject = Record<PathIdentifier, any>
export type PathProp<T extends GenericObject, Depth extends Prev[number] = 4> = [Depth] extends [never] ? never : keyof {
		[key in keyof T as T[key] extends GenericObject
				? (key extends `${infer rootKey}.${PathIdentifier}`
						? PathProp<T[rootKey], Prev[Depth]>
						: key | `${PathIdentifier & key}.${(string|number) & PathProp<T[key], Prev[Depth]>}`)
				: key
		]: true
} & (string | number)
export type PathValue<T extends GenericObject, K extends PathProp<T, Depth> | string, Depth extends Prev[number] = 4> = [Depth] extends [never] ? never : {
		[key in K]: key extends keyof T
				? T[key]
				: key extends `${infer rootkey}.${infer restPath}`
						? PathValue<T[rootkey], restPath, Depth>
						: T[key]
}[K]
export type Nullable<TypeState> = TypeState | null | undefined
export type NextState<TypeState> = TypeState | ((state:TypeState)=>TypeState)
export type StoreInitializer<TypeState=any> = ( get: ()=>TypeState, set: (nextState: NextState<TypeState>)=>void ) => TypeState
export type ChangeListener<TypeState> = (newState: TypeState, oldState?: TypeState) => void
export type ScopePath<TypeState> = TypeState extends GenericObject ? PathProp<TypeState> : (string | number)

export type ScopeGetter<TypeState> = <Key extends ScopePath<TypeState>>(propName: Key) => (TypeState extends GenericObject
	? StoreInterface<PathValue<TypeState, Key>>
	: (Key extends keyof TypeState ? StoreInterface<TypeState[Key]> : StoreInterface<any>)
)
export type ScopeExtendedGetter<TypeState> = <Key extends ScopePath<TypeState>>(propName: Key) => (TypeState extends GenericObject
	? StoreExtended<StoreInterface<PathValue<TypeState, Key>>, PathValue<TypeState, Key>>
	: (Key extends keyof TypeState ? StoreExtended<StoreInterface<TypeState[Key]>, TypeState[Key]> : StoreExtended<StoreInterface<any>, any>)
)
export type StoreExtensionApi = Record<string,Function>

export interface StoreInterface<TypeState> {
	/** Get snapshot state. */
	get: () => TypeState
	/** Set a new state into the store. */
	set: (nextState: NextState<TypeState>) => void
	/**
	 * Bind a listener which will be called on any state change within the store.
	 * A second optional parameter equalityCheck can be passed. It should return wether the two states are considered the same or not
	 */
	subscribe: (listener: ChangeListener<TypeState>, equalityCheck?:(newState: TypeState, oldState: TypeState) => boolean) => () => void
	/** Return a StoreScoped scoped to only a part of the initial state (without a destroy method). */
	getScopeStore: ScopeGetter<TypeState>
	/** Unbind all listener bound to the store and reset state value to null. */
	isDestroyed: () => boolean
}
export type StoreExtender<TypeState> = (store: StoreInterface<TypeState>) => StoreExtensionApi
export type Store<TypeState> = StoreInterface<TypeState> & {
	/**
	 * Use this to discard your store.
	 * It will:
	 * 	- set state to null allowing garbage collection
	 * 	- unbind all listener bound to the store
	 * Any subsequent call to Store.get or Store.set on a destroyed store will throw an Error
	 * the destroy method only exists on toplevel store, you can't call it on StoreScoped
	 */
	destroy: () => void
	/**
	 * ## Store.extends
	 * It will extends your store capabilities by applying a bunch of StoreExtenders. The capabilities will also be
	 * added to any StoreScoped you will get with the method Scope.getScopeStore.
	 * If default extenders has been set, then they will be applied before the one passed to that method.
	 * In order for TS to allow you to call extended methods without warning you should set your store reference to
	 * the returned value of this methods (this is in fact the same object, it is only due to TS limitation):
	 * ```ts
	 * // prefer
	 * const store = createStore(initializer).extends([dispatchExtender])
	 * const dispacth = store.dispatcher(reducer) // won't complain
	 * // over
	 * const store = createStore(initializer)
	 * store.extends()
	 * const dispacth = store.dispatcher(reducer) // TS will complain
	 * ```
	 * You can set default extenders by using the method ```createStore.setDefaultExtenders()```
	 * Calling this method without argument will apply only the default extenders
	 * @param extenders
	 * @returns
	 */
	extends: (extenders?:StoreExtender<TypeState>[]) => StoreExtended<Store<TypeState>, TypeState>
}
/** This is a StoreScoped, scoped to a subpath of the parent Store. It doesn't implement destroy or extends methods. */
export type StoreScoped<TypeState> = StoreInterface<TypeState>
/** StoreExtended is just a convenience to mark Store and StoreScoped as extended and let them call new methods without TS complains. */
export type StoreExtended<S extends StoreInterface<TypeState>, TypeState> = Omit<S, 'getScopeStore'> & StoreExtensionApi & {
	/** Return a child store scoped to only a part of the initial state and without the destroy method. */
	getScopeStore: ScopeExtendedGetter<TypeState>
}