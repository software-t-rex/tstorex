/*
Copyright © 2023 Jonathan Gotti <jgotti at jgotti dot org>
SPDX-FileType: SOURCE
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2023 Jonathan Gotti <jgotti@jgotti.org>
*/
export type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
export type Nullable<TypeState> = TypeState | null | undefined
export type PathIdentifier = string | number
export type GenericObject = Record<string, any>
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

export interface StoreOptions {
	/**
	 * By default state in store are made immutable (deeply frozen), unless this options is set to true.
	 * You should not need to set this option to true, unless you have a very specific use case.
	 */
	noFreeze?: boolean
	/**
	 * Setting a store to a strictly equal state (===) won't do anything and will just be ignored, so it won't trigger any change listener.
	 * Passing noStrictEqual option to true will throw an error if you try to set to the current state to itself, unless it's a primitive value.
	 * This won't affect the behavior of ScopedStore (which will always trigger change listeners).
	 */
	noStrictEqual?: boolean
	/**
	 * If you initialize a store with a state that is not a plain object, array or primitive value,
	 * TstoREx will complain about it. You can set this option to true to disable this warning.
	 */
	noWarn?: boolean
}
export type NextState<TypeState> = TypeState | ((state: TypeState) => TypeState)
export type StoreInitializer<TypeState = any> = (get: () => TypeState, set: (nextState: NextState<TypeState>) => void) => TypeState
export type ChangeListener<TypeState> = (newState: TypeState, oldState?: TypeState) => void
export type ScopePath<TypeState, Depth extends Prev[number] = 4> = TypeState extends GenericObject ? PathProp<TypeState, Depth> & string: string
export type ScopeValue<TypeState, Key extends ScopePath<TypeState, Depth>, Depth extends Prev[number] = 4> = TypeState extends GenericObject
	? PathValue<TypeState, Key, Depth>
	: Key extends keyof TypeState ? TypeState[Key] : any
export type GetScopeStore<TypeState, Depth extends Prev[number] = 4> = <Key extends ScopePath<TypeState, Depth>>(propName: Key) => Store<ScopeValue<TypeState, Key, Depth>>
export interface StoreInterface<TypeState=any> {
	/** Get snapshot state. */
	get: () => TypeState
	/** Set a new state into the store. */
	set: (nextState: NextState<TypeState>) => void
	/**
	 * Bind a listener which will be called on any state change within the store.
	 * A second optional parameter equalityCheck can be passed. It should return wether the two states are considered the same or not
	 */
	subscribe: (listener: ChangeListener<TypeState>, equalityCheck?: (newState: TypeState, oldState: TypeState) => boolean) => () => void
	/** Unbind all listener bound to the store and reset state value to null. */
	isDestroyed: () => boolean
}
export type Store<TypeState=any> = StoreInterface<TypeState> & {
	/** Return a StoreScoped scoped to only a part of the initial state (without a destroy method). */
	getScopeStore: GetScopeStore<TypeState, 10>
}