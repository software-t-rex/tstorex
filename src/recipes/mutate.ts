/*
Copyright © 2023 Jonathan Gotti <jgotti at jgotti dot org>
SPDX-FileType: SOURCE
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2023 Jonathan Gotti <jgotti@jgotti.org>
*/
import { ScopePath, ScopeValue, Store } from "../type"

const innerDraftSymbol = Symbol('draft')

/** API inspiration from immer (implem is not) */
interface Draft<T> {
	state: T,
	draft: T,
	isModified: () => boolean,
	setModified: () => void,
	[innerDraftSymbol]: any,
}
type PropIdentifier = string | number | symbol

/** A recipe can modify a draftState received directly or return a totally new state. */
type Recipe<T> = (draftState: T) => void | any

/** basic shallowCopy */
const shallowCopy = (val: any) => {
	if (Array.isArray(val)) { return [...val] }
	if (val && typeof val === 'object') { return { ...val } }
	return val
}
/** method to return a proper object from a draftProxy */
const unProxyDraft = (draftState: any) => {
	if (draftState && typeof draftState === 'object') {
		Object.entries(draftState).forEach(([prop, val]) => {
			if (val && typeof val === 'object' && (innerDraftSymbol in val)) {
				draftState[prop] = draftState[prop][innerDraftSymbol]
			}
		})
	}
	return draftState
}
/* Proxy handler methods for draftProxy */
const draftHandler: ProxyHandler<any> = {
	ownKeys<T>(target: Draft<T>) { return Reflect.ownKeys(target.draft as Object) },
	has<T>(target: Draft<T>, prop: PropIdentifier) {
		if (prop === innerDraftSymbol) {
			return true
		}
		return prop in (target.draft as Object)
	},
	get<T>(target: Draft<T>, prop: PropIdentifier) {
		const { draft } = target as Draft<any>
		if (prop === innerDraftSymbol || prop === 'toJSON') {
			const res = target.isModified() ? unProxyDraft(draft) : target.state
			return prop === innerDraftSymbol
				? res
				: 'toJSON' in target ? target.toJSON : () => res
		}
		if (typeof draft[prop] === 'object' && !(innerDraftSymbol in draft[prop])) {
			const draftedProp = createDraft(draft[prop], target)
			draft[prop] = draftedProp
		}
		return draft[prop]
	},
	set<T>(target: Draft<T>, prop: PropIdentifier, value: any) {
		target.setModified()
		;(target.draft as any)[prop] = value
		return true
	},
	deleteProperty<T>(target: Draft<T>, prop: PropIdentifier) {
		target.setModified()
		return delete (target.draft as any)?.[prop]
	}
}
/** return a new draftProxy */
const createDraft = <T>(state: T, context?: Draft<T>): Draft<T> => {
	let modified = false
	const contextSetModified = context?.setModified
	const setModified = () => {
		if (!modified) {
			contextSetModified?.()
			modified = true
		}
	}
	const draft = {
		[innerDraftSymbol]:true,
		state,
		draft: shallowCopy(state),
		isModified: () => modified,
		setModified,
	}
	return new Proxy(draft, draftHandler as ProxyHandler<Draft<T>>)
}
const isDraftable = (o: any) => {
	const type = Object.prototype.toString.call(o).match(/\[object ([a-zA-Z]+)\]/)?.[1]
	return type === 'Object' || type === 'Array'
}
const throwIfNotDraftable = (o: any, prefix:string = 'createDraft') => {
	if (!isDraftable(o)) {
		throw new Error(`${prefix}: state must be a plain object or an array`)
	}
}
/**
 * take a recipe (draftState) => void | newState
 * the recipe can modify the draftState received directly
 * or return a totally new state.
 * Beware it can return the original state object if no mutation happened on the draft
 */
export const produce = <T>(state: T, recipe: Recipe<T>) => {
	throwIfNotDraftable(state, 'produce Error')
	const draft = createDraft(state)
	const res = recipe(draft as any)
	if (typeof res === 'object' && innerDraftSymbol in res) {
		throw new Error('produce ERROR: recipe must not return draft object')
	}
	return res === undefined ? draft[innerDraftSymbol] : res
}

/**
 * take a recipe (draftState) => void | newState
 * @example
 * ```js
 * import {mutateExtender} from 'store/extensions'
 * const store = createStore({firstName: 'John', lastName: 'Doe'})
 * const onlyFullNameRecipe = (draft) => {
 * 	 draft.fullName = `${draft.firstName} ${draft.lastName}`
 * 	 delete draft.firstName
 *   delete draft.lastName
 *   // for this example you could have done this instead:
 *   // return {fullName: `${draft.firstName} ${draft.lastName}`}
 * }
 * mutate(store, onlyFullNameRecipe)
 * console.log(store.get().fullName) // John Doe
 * ```
 * if anything other than undefined is returned by the recipe it will be considered as the new state to assign
 * the recipe received a draftState that can be freely manipulated
 * Warning: this method is intended to work with simple dataset objects like JSON objects
 *   manipilating other values than plain objects or arrays is not in the scope.
 *   It's perfect to add/remove/update properties on a plain object.
 *   So if you need to define properties (Object.defineProperty)
 *   or manipulate promises, maps, sets or more complex objects,
 *   you should use the standard store.set method instead.
 *   Anyway if you encounter a case that don't work don't hesitate to report
 *   and we will decide if we want to handle it or not.
 */
export const mutate = <TypeState>(store: Store<TypeState>, recipe: (draftState: TypeState) => void | TypeState) => {
	const state = store.get()
	throwIfNotDraftable(state, 'mutate Error')
	const newState = produce(state, recipe)
	newState !== state && store.set(newState)
}

/**
 * remove a given property from the store
 * You can point nested properties using dot notation ie: removeProp(store, "pet.name")
 */
export const removeProp = <TypeState>(store: Store<TypeState>, prop: ScopePath<TypeState>) => {
	const props = prop.split('.')
	const lastKey = props.pop() as string
	let {get, set} = store as any
	let newState;
	if (!props.length) {
		newState = shallowCopy(get())
	} else {
		({get, set} = store.getScopeStore(props.join('.') as any))
		newState = shallowCopy(get())
	}
	delete newState?.[lastKey]
	set(newState)
}

/**
 * set a given property in the store to given value
 * You can point nested properties using dot notation ie: ```setProp(store, "pet.name", "Rex")```
 */
export const setProp = <TypeState, Key extends ScopePath<TypeState>>(store: Store<TypeState>, prop: Key, value: ScopeValue<TypeState, Key>) => {
	const props = prop.split('.')
	const lastKey = props.pop() as string
	let newState;
	let {get, set} = store as any
	if (!props.length) {
		newState = shallowCopy(get())
	} else {
		({get, set} = store.getScopeStore(props.join('.') as any))
		newState = shallowCopy(get())
	}
	newState[lastKey] = value
	set(newState)
}
