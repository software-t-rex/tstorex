/*
Copyright © 2023 Jonathan Gotti <jgotti at jgotti dot org>
SPDX-FileType: SOURCE
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2023 Jonathan Gotti <jgotti@jgotti.org>
*/
import type { StoreInterface } from "../type";
type RequireAtLeastOne<T> = { [K in keyof T]:
  { [L in K]: T[L] } &
  { [L in Exclude<keyof T, K>]?: T[L] }
}[keyof T];

type ValueProps = {
	value?: string
	valueAsNumber?: number
	valueAsDate?: Date | null
	checked?: boolean
	files?: FileList | null
	selectedIndex?: number
}
type ValueAccessor = 'value' | 'valueAsNumber' | 'valueAsDate' | 'checked' | 'files' | 'selectedIndex'
type ValueType<VAccessor> = ValueProps[VAccessor extends ValueAccessor ? VAccessor : 'value']
export type BindAbleInputElement = HTMLElement & RequireAtLeastOne<ValueProps>

interface BindInputOptionsInterface <TypeState, VAccessor extends ValueAccessor>{
	/** list of input events to listen to (default to 'change') */
	events: string[],
	valueAccessor: VAccessor
	/**
	 * Will receive new value emitted by input event, and return the new value to set in the store.
	 * It will also receive the event object as second parameter.
	 * It should return the new value to set in the store.
	 */
	inputToStore?: (inputVal: ValueType<VAccessor>) => TypeState
	/**
	 * Will receive new state emit by change to the store and return the new input value to set
	 */
	storeToInput?: (newState: TypeState) => ValueType<VAccessor>
}
export type BindInputOptions<T> = string | string[] | Partial<BindInputOptionsInterface<T, ValueAccessor>>

const readOptions = <T>(options:BindInputOptions<T>):BindInputOptionsInterface<T, ValueAccessor> & {valueAccessor: ValueAccessor}=> {
	if (typeof options === 'string' || Array.isArray(options)) {
		options = { events: typeof options === "string" ? [options] : options}
	} else if (typeof options !== 'object') {
		console.error('bindInput received bad options format default to {events: ["change"]}')
		options = { events: ['change']}
	}
	if (!Array.isArray(options.events)) {
		options.events = typeof options.events === 'string' ? [options.events] : ['change']
	}
	if (!options.valueAccessor) {
		options.valueAccessor = 'value'
	}
	const { events, valueAccessor, inputToStore, storeToInput } = options
	return { events, valueAccessor, inputToStore, storeToInput }
}

/**
 * Bind an html input to a store
 *
 */
export const bindInput = <T>(store: StoreInterface<T>, input:BindAbleInputElement, options:BindInputOptions<T> = 'change') => {
	const init = store.get()
	const { events, valueAccessor, inputToStore, storeToInput } = readOptions(options)
	const getInputValue = () => {
		const v = input?.[valueAccessor]
		return (inputToStore ? inputToStore(v) : v) as T
	}
	const getStoreValue = () => {
		const v = store.get()
		return (storeToInput ? storeToInput(v) : v ) as ValueType<typeof valueAccessor>
	}

	if ((init === undefined || init === '') && input[valueAccessor]) {
		store.set(getInputValue())
	} else if (init !== undefined && init !== '') {
		input[valueAccessor] = getStoreValue() as any
	}

	const inputListener = () => {
		const oldState = store.get()
		const newState = getInputValue()
		if (oldState !== newState) {
			store.set(newState)
		}
	}

	events.forEach((event) => {
		input.addEventListener(event, inputListener)
	})
	const unsubscribe = store.subscribe((newValue:any) => {
		if (storeToInput) {
			newValue = storeToInput(newValue)
		}
		if (input[valueAccessor] !== newValue) {
			input[valueAccessor] = newValue
		}
	})
	return () => {
		events.forEach((event) => input.removeEventListener(event, inputListener))
		unsubscribe()
	}
}
