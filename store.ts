import type { PathKey, Store, StoreInitializer } from './type'


const createChangeEmitter = () => {
	const subscriptions = new Map<Symbol, Function>()
	return {
		emit: (newState, oldState) => subscriptions.forEach((fn) => fn(newState, oldState)),
		subscribe: (fn: (newState, oldState: any) => void) => {
			const key = Symbol()
			subscriptions.set(key, fn)
			return () => subscriptions.delete(key)
		},
		clear: () => { subscriptions.clear() }
	}
}

/** extract a scoped store from given store and property name in store  */
const getScopedStore = <TypeState, Key extends keyof TypeState>(store: Partial<Store<TypeState>>, propName: Key): Store<TypeState[Key]> => {
	const get: Store<TypeState[Key]>['get'] = () => store.get()[propName]

	const set: Store<TypeState[Key]>['set'] = (nextState) => {
		const state = store.get()
		const newState = (nextState instanceof Function) ? nextState(state[propName]) : nextState
		store.set({ ...state, [propName]: newState })
	}

	const subscribe: Store<TypeState[Key]>['subscribe'] = (listener) => {
		const _listener = (newState, oldState) => {
			newState?.[propName] !== oldState?.[propName] && listener(newState?.[propName], oldState?.[propName])
		}
		return store.subscribe(_listener)
	}

	const getScopeStore: Store<TypeState[Key]>['getScopeStore'] = (path) => {
		return getScopeStoreFromPath({ get, set, subscribe }, path as any)
	}

	return { get, set, subscribe, getScopeStore }
}

const getScopeStoreFromPath = <T, Path extends PathKey<T> & string>(store: Partial<Store<T>>, path: Path) => {
	const props = path.split('.')
	const scope = props.reduce(
		<T,>(_store: Store<T>, propName: keyof T) => getScopedStore(_store, propName)
		, store as any
	)
	return scope
}

/**
 * # createStore
 * can be called with an initial state value or a StoreInitializer and will return a new Store
 * return store expose the following methods:
 * - **get()**: return a snapshot of state in the store
 * - **set(nexState)**: set a new state in the store
 * - **subscribe(listner(newState, oldState))**: to be notified of state change in the store
 * - **getScopeStore(path)**: return a child store scoped to given path and without destroy method
 * - **destroy()**: unsubscibe all listener and reste store state to null, any attempt to manipulate
 *   the store or any of its child store after that will throw.
 *   The store can't be re-used and any reference in your code to the store or any of its child should be dropped.
 */
export const createStore = <TypeState,>(init: StoreInitializer<TypeState> | TypeState = null): Store<TypeState> => {
	let destroyed = false
	let state: TypeState = null
	const emitter = createChangeEmitter()
	const throwIfDestroyed = (msg: string = null) => {
		if (destroyed) {
			throw new Error(msg || "Can't access a destroyed store")
		}
	}

	const get: Store<TypeState>['get'] = () => {
		throwIfDestroyed("Can't read from a destroyed store")
		return state
	}

	const set: Store<TypeState>['set'] = (nextState) => {
		const oldState = state
		throwIfDestroyed("Can't set a destroyed store")
		if (nextState instanceof Function) {
			state = nextState(state)
		} else {
			state = nextState
		}
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
	}

	const subscribe: Store<TypeState>['subscribe'] = (listener) => {
		throwIfDestroyed("Can't subscribe to a destroyed store")
		return emitter.subscribe(listener)
	}

	const destroy: Store<TypeState>['destroy'] = () => {
		emitter.clear()
		set(null)
		destroyed = true
	}

	const getScopeStore: Store<TypeState>['getScopeStore'] = (path) => {
		return getScopeStoreFromPath({ get, set, subscribe }, path as any)
	}

	return { get, set, subscribe, destroy, getScopeStore }
}