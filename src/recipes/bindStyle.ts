/*
Copyright © 2023 Jonathan Gotti <jgotti at jgotti dot org>
SPDX-FileType: SOURCE
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2023 Jonathan Gotti <jgotti@jgotti.org>
*/
import { StoreInterface } from "../type"

export interface BindStyleOptions {
	/** 
	 * if true will auto unbind when element is removed from the dom (default to false)
	 * 
	 * ⚠ Warning this will use a MutationObserver on the parent node so:
	 * - it will be unbind asynchronously
	 * - elmt must be added to parent before calling binding function
	 */
	autoUnbindOnRemoved?: boolean
}

export interface BindClassNameOptions extends BindStyleOptions{
	/** prefix to use for className */
	prefix?: string
}


const classCleaner = (classList:DOMTokenList, prefix:string|undefined) => {
	if (!prefix) { return }
	for (const className of classList.values()) {
		if (className.startsWith(prefix)) {
			classList.remove(className)
		}
	}
}

const classSetter = (classList:DOMTokenList, prefix:string|undefined, value:string) => {
	classList.add(prefix ? `${prefix}${value}` : value)
}

const styleApply = (elmt:HTMLElement, styleProps:Record<string, CSSStyleValue|string>) => {
	for (const [styleProp, value] of Object.entries(styleProps)) {
		const propName = styleProp.replace(/([A-Z])/g, "-$1").toLocaleLowerCase()
		if (value!==undefined) {
			elmt.style.setProperty(propName, String(value))
		} else {
			elmt.style.removeProperty(propName)
		}
	}
}

/**
 * call callback when element is removed from the dom.
 * elmt must be added to parent before calling this function
 * @param elmt 
 * @param callback 
 */
const onElmtRemoved = (elmt: HTMLElement, callback: () => void) => {
	let disconnect: ()=>void = () => {}
	const observer = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
			if (mutation.type === "childList" && mutation.removedNodes.length > 0 && Array.from(mutation.removedNodes).includes(elmt)) {
				callback()
				disconnect()
			}
		})
	})
	disconnect = () => observer.disconnect()
	observer.observe(elmt.parentElement || document.body, { childList: true })
}

/**
 * bindClassName allow to bind a store value to a className of an HTMLElement
 * this is a one way binding from store to className
 * Usage:
 * ```ts
 * const store = createStore({loading: true, theme: "dark"})
 * const unbindLoadingClass = bindClassName(store.getScopeStore("loading"), document.body, {prefix: "loading-"})
 * const unbindThemeClass = bindClassName(store.getScopeStore("theme"), document.body, {autoUnbindOnRemoved: true})
 * ```
 * it returns an unbind function to remove the binding and remove the className from the element
 */
export const bindClassName = <T extends string|boolean>(store:StoreInterface<T>, elmt:HTMLElement, options?:BindClassNameOptions) => {
	const {
		prefix, 
		autoUnbindOnRemoved=false
	} = options || {}
	const storeInitVal = store.get()
	classCleaner(elmt.classList, prefix)
	if (storeInitVal!==undefined) {
		elmt.classList.add(prefix ? `${prefix}${storeInitVal}` : String(storeInitVal))
	}
	const unbindStoreListener = store.subscribe((newState, oldState) => {
		if (prefix) {
			classCleaner(elmt.classList, prefix)
		} else {
			elmt.classList.remove(String(oldState))
		}
		if (newState!==undefined) {
			classSetter(elmt.classList, prefix, String(newState))
		}
	})
	const unbind = () => {
		unbindStoreListener()
		if (prefix) {
			classCleaner(elmt.classList, prefix)
		} else {
			elmt.classList.remove(String(store.get()))
		}
	}
	autoUnbindOnRemoved && onElmtRemoved(elmt, unbind)
	return unbind  
}

/**
 * bindStyle allow to bind a store value to a style property of an HTMLElement
 * this is a one way binding from store to style
 * Usage:
 * ```ts
 * const store = createStore({color: "red", fontSize: "12px"})
 * const unbindColorStyle = bindStyle(store.getScopeStore("color"), document.body, "color")
 * const unbindFontSizeStyle = bindStyle(store.getScopeStore("fontSize"), document.body, "font-size")
 * ```
 */
export const bindStyleProp = <T extends CSSStyleValue|string>(store:StoreInterface<T>, elmt:HTMLElement, styleProp:string, options?:BindStyleOptions) => {
	const storeInitVal = store.get()
	if (storeInitVal!==undefined) {
		elmt.style.setProperty(styleProp, String(storeInitVal))
	}
	const unbind = store.subscribe((newState) => {
		if (newState!==undefined) {
			elmt.style.setProperty(styleProp, String(newState))
		}
	})
	options?.autoUnbindOnRemoved && onElmtRemoved(elmt, unbind)
	return unbind
}

/**
 * bindStyles allow to bind a store value to multiple style properties of an HTMLElement
 * - this is a one way binding from store to style
 * - properties names can be in camelCase or kebab-case
 * Usage:
 * ```ts
 * const store = createStore({color: "red", fontSize: "12px"})
 * const unbindStyles = bindStyles(store, elmt, {autoUnbindOnRemoved: true})
 * ```
 */
export const bindStyleProps = <T extends Record<string, CSSStyleValue|string>>(store:StoreInterface<T>, elmt:HTMLElement, options?:BindStyleOptions) => {
	styleApply(elmt, store.get())
	const unbind = store.subscribe((newState) => styleApply(elmt, newState))
	options?.autoUnbindOnRemoved && onElmtRemoved(elmt, unbind)
	return unbind
}
