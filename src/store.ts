/*
Copyright © 2023 Jonathan Gotti <jgotti at jgotti dot org>
SPDX-FileType: SOURCE
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2023 Jonathan Gotti <jgotti@jgotti.org>
*/
import type { GetScopeStore, Nullable, ScopePath, Store, StoreInitializer, StoreInterface, StoreOptions, SubscribeOptions } from './type'
import { deepFreeze } from './deepFreeze'

//@TODO add documentation for deepFreezed objects and that setter should never return state directly
const createChangeEmitter = () => {
	const subscriptions = new Map<Symbol, Function>()
	return {
		emit: <T>(newState: T, oldState: T) => subscriptions.forEach((fn) => fn(newState, oldState)),
		subscribe: <T>(fn: (newState: T, oldState: T) => void, equalityCheck?: (newState: T, oldState: T) => boolean) => {
			const key = Symbol()
			subscriptions.set(key, !equalityCheck
				? fn
				: (newState:T, oldState:T) => {equalityCheck(newState, oldState) || fn(newState, oldState)}
			)
			return () => subscriptions.delete(key)
		},
		clear: () => { subscriptions.clear() }
	}
}

/** extract a scoped store from given store and property name in store  */
const getScopedStore = <TypeState, Key extends keyof TypeState>(store: Omit<StoreInterface<TypeState>, 'getScopeStore'>, propName: Key): Store<TypeState[Key]> => {
	const isDestroyed = store.isDestroyed

	const get: StoreInterface<TypeState[Key]>['get'] = () => (store.get() as any)?.[propName]

	const set: StoreInterface<TypeState[Key]>['set'] = (nextState) => {
		store.set((state) => {
			const newPropState = (nextState instanceof Function) ? nextState((state as any)?.[propName]) : nextState
			if (Array.isArray(state)) {
				const newState = [...state]
				newState[propName as any] = newPropState
				return newState as TypeState
			} else if (typeof state === 'object' && state !== null) {
				return {...state, [propName]:newPropState} as TypeState
			} else if (state === undefined || state === null) {
				return {[propName]:newPropState} as TypeState
			}
			throw Error("Can't set propery on primitive values")
		})
	}
	
	const subscribe: StoreInterface<TypeState[Key]>['subscribe'] = (listener, options) => {
		const { equalityCheck = undefined, initCall = false } = options || {}
		const _listener = (newState: Nullable<TypeState>, oldState: Nullable<TypeState>) => {
			if (equalityCheck) {
				if (equalityCheck(newState?.[propName] as TypeState[Key], oldState?.[propName] as TypeState[Key])){
					return
				}
			} else if (newState?.[propName] === oldState?.[propName]) {
				return
			}
			listener(newState?.[propName] as TypeState[Key], oldState?.[propName])
		}
		if (initCall) {
			const state = get()
			listener(state, state)
		}
		return store.subscribe(_listener)
	}

	const getScopeStore = (path:string) => {
		return getScopeStoreFromPath({ get, set, subscribe, isDestroyed }, path)
	}

	return { get, set, subscribe, getScopeStore, isDestroyed } as Store<TypeState[Key]>
}

const getScopeStoreFromPath = <TypeState, Path extends string>(store: StoreInterface<TypeState>, path: Path) => {
	const props = String(path).split('.')
	const scope = props.reduce(
		<T>(_store: Omit<StoreInterface<T>, 'getScopeStore'>, propName: keyof T) => getScopedStore(_store, propName)
		, store as any
	)
	return scope
}
const primitives = ["string", "number", "bigint", "boolean", "undefined", "symbol"]
const isPrimitive = (value: any) => value === null || primitives.includes(typeof value)
/**
 * # createStore
 * can be called with an initial state value or a StoreInitializer and will return a new Store
 * returned store expose the following methods:
 * - **get()**: return a snapshot of state in the store
 * - **set(nexState)**: set a new state in the store
 * - **subscribe(listner(newState, oldState))**: to be notified of state change in the store
 * - **getScopeStore(path)**: return a child store scoped to given path and without destroy method
 * - **destroy()**: unsubscibe all listener and reste store state to null, any attempt to manipulate
 *   the store or any of its child store after that will throw.
 *   The store can't be re-used and any reference in your code to the store or any of its child should be dropped.
 * - **isDestroyed()**: will return true if the store is destroyed
 * - **extends([StoreExtender, ...])**: can be used to extend a store
 *
 * ⚠ Beware that store are intended to store Generic data objects, arrays or primitives values.
 * Using store to manipulate Date, UInt*Array, Map, Set, or any other non generic object at the top level may result
 * in unexpected behavior and is not in the scope of this library.
 * You can however use store to manipulate state that contain such objects as properties.
 */
export const createStore = <TypeState>(init: Nullable<StoreInitializer<TypeState> | TypeState> = null, opts?:StoreOptions): Store<TypeState> & {
	/**
	 * Use this to discard your store.
	 * It will:
	 * 	- set state to null allowing garbage collection
	 * 	- unbind all listener bound to the store
	 * Any subsequent call to Store.get or Store.set on a destroyed store will throw an Error
	 * the destroy method only exists on toplevel store, you can't call it on StoreScoped
	 */
	destroy:()=>void
} => {
	let destroyed = false
	let state: Nullable<TypeState> = null
	const {noFreeze = false, noStrictEqual = false, noWarn = false} = opts || {}
	const emitter = createChangeEmitter()
	const throwIfDestroyed = (msg: string) => {
		if (destroyed) {
			throw new Error(msg)
		}
	}
	const isDestroyed = () => destroyed
	const get: StoreInterface<TypeState>['get'] = () => {
		throwIfDestroyed("Can't read from a destroyed store")
		return state as TypeState
	}

	const set: StoreInterface<TypeState>['set'] = (nextState) => {
		const oldState = state
		throwIfDestroyed("Can't set a destroyed store")
		if (nextState instanceof Function) {
			state = nextState(oldState as TypeState)
		} else {
			state = nextState
		}
		if (state === oldState) {
			if (noStrictEqual && !isPrimitive(state)) {
				throw new Error("Store should never be set to its own state!")
			}
			return // simply ignore if state are the same
		}
		noFreeze || deepFreeze(state)
		emitter.emit(state, oldState)
	}

	if (init !== null) {
		if (typeof init === 'function') {
			state = (init as StoreInitializer<TypeState>)(get, set)
		} else if (Array.isArray(init)) {
			state = [...init] as TypeState
		} else if (typeof init === 'object') {
			if (!noWarn && Object.prototype.toString.call(init) !== '[object Object]') {
				console.warn("TstoREx is intended to be used with plain object, array or primitives, other types may not work as expected.\nIf you know what you are doing you can disable this warning using the noWarn option.")
			}
			state = { ...init }
		} else {
			state = init
		}
		noFreeze || deepFreeze(state)
	}

	const subscribe: StoreInterface<TypeState>['subscribe'] = (listener, options?:SubscribeOptions<TypeState>) => {
		// const subscribe: StoreInterface<TypeState>['subscribe'] = (listener, equalityCheck) => {
		throwIfDestroyed("Can't subscribe to a destroyed store")
		const { equalityCheck = undefined, initCall = false } = options || {}
		initCall && listener(state as TypeState, state as TypeState)
		return emitter.subscribe(listener, equalityCheck)
	}

	const destroy = () => {
		emitter.clear()
		set(null as any)
		destroyed = true
	}

	const getScopeStore:GetScopeStore<TypeState> = ((path:ScopePath<TypeState>) => {
		return getScopeStoreFromPath({ get, set, subscribe, isDestroyed }, path as string)
	})

	return { get, set, subscribe, destroy, getScopeStore, isDestroyed }
}
