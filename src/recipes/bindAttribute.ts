/*
Copyright © 2023 Jonathan Gotti <jgotti at jgotti dot org>
SPDX-FileType: SOURCE
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2023 Jonathan Gotti <jgotti@jgotti.org>
*/
import { StoreInterface } from "../type"

/**
 * Only applicable to string value store
 * it will make a 2 way data binding between the store value and the attribute of the element and return an unbind function
 * Usage:
 * ```ts
 * const store = createStore({username: "John"})
 * const element = document.querySelector("div#hello")
 * const unbind = bindAttribute(store.getScopeStore("username"), element, "data-hello")
 * // now the attribute data-hello of the div#hello will always be in sync with the store value
 *
 * unbind()
 * // now the attribute data-hello of the div#hello will not be in sync with the store value anymore
 * ```
 */
export const bindAttribute = <TypeState extends string|undefined|null>(store: StoreInterface<TypeState>, element:HTMLElement, attributeName:string) => {
	// initial sync values for store & attribute
	const storeInitVal = store.get()
	const attrInitVal = element.getAttribute(attributeName)
	if (storeInitVal || (storeInitVal==="" && attrInitVal === null)) {
		element.setAttribute(attributeName, storeInitVal)
	} else if (attrInitVal !== null && !storeInitVal) {
		store.set(attrInitVal as TypeState)
	}
	// observe attribute changes
	const mutationObserver = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
			if (mutation.type === "attributes" && mutation.attributeName === attributeName) {
				const newState = (mutation.target as HTMLElement).getAttribute(attributeName) as TypeState
				store.get() !== newState && store.set(newState)
			}
		})
	})
	mutationObserver.observe(element, { attributes: true, attributeFilter: [attributeName] })
	// observe store changes
	const unsubscribe = store.subscribe((newState) => {
		if (newState === undefined || newState === null) {
			element.removeAttribute(attributeName)
		} else {
			element.setAttribute(attributeName, String(newState))
		}
	})
	return () => {
		mutationObserver.disconnect()
		unsubscribe()
	}
}