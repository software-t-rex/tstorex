import type { Nullable, ScopeExtendedGetter, ScopePath, Store, StoreExtended, StoreExtender, StoreInitializer, StoreInterface, StoreScoped } from './type'
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


let defaultExtenders:StoreExtender<any>[] = []

/**
 * apply extenders methods to a store and all scopeStore derivated from it
 */
export const extendStore = <TypeState>(store: StoreInterface<TypeState>, extenders: StoreExtender<any>[]):StoreExtended<typeof store, TypeState>|StoreInterface<TypeState> => {
	if (!extenders.length) {
		return store
	}
	// automatically apply extenders to scopeStores
	const { getScopeStore } = store
	store.getScopeStore = (<Key extends ScopePath<TypeState>>(propName: Key) => {
		return extendStore(getScopeStore(propName), extenders)
	}) as ScopeExtendedGetter<TypeState>
	// store.getScopeStore = (path) => extendStore(getScopeStore(path), extenders)
	extenders.forEach((extender) => {
		const methods = extender(store)
		Object.entries(methods).forEach(([k,v]) => (store as any)[k] = v)
		store = store as typeof store & typeof methods
	})
	return store// as StoreExtended<typeof store, TypeState>
}

/** extract a scoped store from given store and property name in store  */
const getScopedStore = <TypeState, Key extends keyof TypeState>(store: Omit<StoreInterface<TypeState>, 'getScopeStore'>, propName: Key): StoreScoped<TypeState[Key]> => {
	const isDestroyed = store.isDestroyed

	const get: Store<TypeState[Key]>['get'] = () => (store.get() as any)?.[propName]

	const set: Store<TypeState[Key]>['set'] = (nextState) => {
		store.set((state) => {
			const newPropState = (nextState instanceof Function) ? nextState((state as any)?.[propName]) : nextState
			if (Array.isArray(state)) {
				const newState = [...state]
				newState[propName as any] = newPropState
				return newState as TypeState
			} else if (typeof state === 'object') {
				return {...state, [propName]:newPropState} as TypeState
			} else if (state === undefined || state === null) {
				return {[propName]:newPropState} as TypeState
			}
			throw Error("Can't set propery on primitive values")
		})
	}

	const subscribe: Store<TypeState[Key]>['subscribe'] = (listener) => {
		const _listener = (newState: Nullable<TypeState>, oldState: Nullable<TypeState>) => {
			newState?.[propName] !== oldState?.[propName] && listener(newState?.[propName] as TypeState[Key], oldState?.[propName])
		}
		return store.subscribe(_listener)
	}

	const getScopeStore: Store<TypeState[Key]>['getScopeStore'] = (path) => {
		return getScopeStoreFromPath({ get, set, subscribe, isDestroyed }, path)
	}

	return { get, set, subscribe, getScopeStore, isDestroyed }
}

const getScopeStoreFromPath = <TypeState, Path extends ScopePath<TypeState>>(store: Omit<StoreInterface<TypeState>, 'getScopeStore'>, path: Path) => {
	const props = String(path).split('.')
	const scope = props.reduce(
		<T>(_store: Omit<StoreInterface<T>, 'getScopeStore'>, propName: keyof T) => getScopedStore(_store, propName)
		, store as any
	)
	return scope
}

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
 */
export const createStore = <TypeState>(init: Nullable<StoreInitializer<TypeState> | TypeState> = null, noFreeze = false) => {
	let destroyed = false
	let state: Nullable<TypeState> = null
	const emitter = createChangeEmitter()
	const throwIfDestroyed = (msg: string) => {
		if (destroyed) {
			throw new Error(msg)
		}
	}
	const isDestroyed = () => destroyed
	const get: Store<TypeState>['get'] = () => {
		throwIfDestroyed("Can't read from a destroyed store")
		return state as TypeState
	}

	const set: Store<TypeState>['set'] = (nextState) => {
		const oldState = state
		throwIfDestroyed("Can't set a destroyed store")
		if (nextState instanceof Function) {
			state = nextState(oldState as TypeState)
		} else {
			state = nextState
		}
		if (state === oldState) {
			throw new Error("Store should never be set to its own state!")
		}
		noFreeze || deepFreeze(state)
		emitter.emit(state, oldState)
	}

	if (init !== null) {
		if (typeof init === 'function') {
			state = (init as StoreInitializer<TypeState>)(get, set)
		} else if (typeof init === 'object') {
			state = { ...init }
		} else {
			state = init
		}
		noFreeze || deepFreeze(state)
	}

	const subscribe: Store<TypeState>['subscribe'] = (listener, equalityCheck) => {
		throwIfDestroyed("Can't subscribe to a destroyed store")
		return emitter.subscribe(listener, equalityCheck)
	}

	const destroy: Store<TypeState>['destroy'] = () => {
		emitter.clear()
		set(null as any)
		destroyed = true
	}

	const getScopeStore: Store<TypeState>['getScopeStore'] = (path:ScopePath<TypeState>) => {
		return getScopeStoreFromPath({ get, set, subscribe, isDestroyed }, path)
	}
	const store:any = { get, set, subscribe, destroy, getScopeStore, isDestroyed }
	store.extends = (extenders?: StoreExtender<TypeState>[]) => extendStore(store, extenders ? [...new Set([...defaultExtenders, ...extenders])]  : defaultExtenders)

	return store as Store<TypeState>
}

/**
 * Add StoreExtenders as default extenders. Default extenders are automatically applied when you call the Store.extends() method.
 * To reset to no extenders at all you can pass null as parameter.
 */
createStore.setDefaultExtenders = (extenders:StoreExtender<any>[]|null) => {
	defaultExtenders = extenders ?  [...new Set([...defaultExtenders, ...extenders])] : []
}
