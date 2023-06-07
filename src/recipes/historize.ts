/*
Copyright © 2023 Jonathan Gotti <jgotti at jgotti dot org>
SPDX-FileType: SOURCE
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2023 Jonathan Gotti <jgotti@jgotti.org>
*/
import { StoreInterface } from "../type"

export interface HistorizeOptions<T> {
	// How many history steps should be kept (default: 100), current state count for 1 step.
	// It will discard oldest history steps if the limit is reached.
	maxSize?: number,
	// Initial history state (default: [store.get()]).
	// Allow to initialize with a given history stack.
	initHistory?: T[]
}

export type StoreHistoryAPI<TypeState = any> = {
	/** return the length of current history */
	readonly length: number
	/** return the max number of steps you can move forward */
	readonly forwardLength: number
	/** return the max number of steps you can move backward */
	readonly backLength: number
	/** return the current store state */
	readonly state: TypeState
	/** set the store state to given relative position in the history (go(-1) is the same as calling back()) */
	go: (relativePosition: number) => void
	/** set the store state to the previous state (equivalent to calling go(-1)) */
	back: () => void
	/** alias of back */
	undo: () => void
	/** set the store state to the next state (equivalent to calling go(1)) */
	forward: () => void
	/** alias of forward */
	redo: () => void
	/** set the store state to given state and move history forward. (equivalent to calling store.set(newState)) */
	pushState: (state: TypeState) => void
	/** destroy the StoreHistoryAPI instance and stop listening for changes in the store */
	destroy: () => void
}

/**
 * return a StoreHistoryAPI instance
 */
export const historize = <TypeState>(store:StoreInterface<TypeState>, opts:HistorizeOptions<TypeState> = {maxSize:100}) => {
	const { get, set, subscribe } = store
	const { maxSize=100, initHistory=[] } = opts
	if (typeof maxSize !== 'number' || maxSize < 1) {
		throw new Error("historize: maxSize must be a number greater than 0")
	} else if (!Array.isArray(initHistory)) {
		throw new Error("historize: initHistory must be an array")
	}
	// push initial state to history
	let initialState = get()
	if (Array.isArray(initialState)) {
		initialState = [...initialState] as TypeState
	} else if (initialState && typeof initialState === 'object') {
		initialState = {...initialState}
	}
	initHistory.push(initialState)

	// init history
	const history: TypeState[] = [...initHistory.slice(-maxSize)]
	let historyIndex = history.length - 1
	let moving = false

	const unsubscibe = subscribe((newState) => {
		if (!moving && history) {
			history.splice(++historyIndex) // remove any forward history
			history.push(newState)
			if (history.length > maxSize) {
				history.splice(0, history.length - maxSize)
				historyIndex = history.length - 1
			}
		}
	})

	const go = (relativePosition:number) => {
		const nextHistoryIndex = Math.max(0, Math.min(history.length -1, historyIndex + relativePosition))
		if (nextHistoryIndex === historyIndex) {
			return
		}
		historyIndex = nextHistoryIndex
		moving = true
		set(history[historyIndex])
		moving = false
	}

	const back = () => go(-1)
	const forward = () => go(1)
	const pushState = set
	const throwDestroyed = () => { throw new Error('Error calling method on a destroyed StoreHistoryAPI instance.') }

	const destroyApi = (api:Partial<StoreHistoryAPI>): asserts api is {
		length: 0,
		forwardLength: 0,
		backLength: 0,
		state: null
	} => {
		unsubscibe()
		history.splice(0)
		historyIndex = 0
		Object.defineProperty(api, 'state', { get: () => null })
		api.go = throwDestroyed
		api.back = throwDestroyed
		api.undo = throwDestroyed
		api.forward = throwDestroyed
		api.redo = throwDestroyed
		api.pushState = throwDestroyed
		api.destroy = throwDestroyed
	}

	const api = {
		go, back, forward, pushState,
		undo: back,
		redo: forward,
		get length() { return Number(history.length) },
		get forwardLength() { return history.length > 0? history.length - (historyIndex+1) : 0 },
		get backLength() { return historyIndex },
		get state() { return get() },
		destroy: () => destroyApi(api)
	}

	return api
}