/*
Copyright © 2023 Jonathan Gotti <jgotti at jgotti dot org>
SPDX-FileType: SOURCE
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2023 Jonathan Gotti <jgotti@jgotti.org>
*/
/**
 * @vitest-environment happy-dom
 * // don't use jsdom as mutation observer are not triggered properly (delayed and with latest values)
 */
import { describe, it, expect, vi } from "vitest"
import { createStore } from "../store"
import { bindClassName, bindStyleProp, bindStyleProps } from "./bindStyle"
import { after, before } from "node:test"


// return a sorted classnames string
const getClassNames = (elmt: HTMLElement) => elmt.className.split(/\s+/).sort((a, b) => a > b ? 1 : -1).join(" ")
// bind a callback when an element is removed from the dom
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


describe("bindClassName", () => {
	it("should bind a store value to a className of an HTMLElement", () => {
		const store = createStore({loading: true, theme: "dark"})
		const loadingStore = store.getScopeStore("loading")
		const themeStore = store.getScopeStore("theme")
		const elmt = document.createElement("div")
		document.body.appendChild(elmt)
		const unbindLoadingClass = bindClassName(loadingStore, elmt, {prefix: "loading-"})
		const unbindThemeClass = bindClassName(themeStore, elmt)
		expect(getClassNames(elmt)).toBe("dark loading-true")
		loadingStore.set(false)
		expect(getClassNames(elmt)).toBe("dark loading-false")
		themeStore.set("light")
		expect(getClassNames(elmt)).toBe("light loading-false")
		elmt.remove()
		expect(getClassNames(elmt)).toBe("light loading-false")
		store.set({loading: true, theme: "dark"})
		expect(getClassNames(elmt)).toBe("dark loading-true")
		unbindLoadingClass()
		unbindThemeClass()
	})
	it("should return a function to unbind the binding (and remove the className)", () => {
		const themeStore = createStore("dark")
		const elmt = document.createElement("div")
		document.body.appendChild(elmt)
		const unbind = bindClassName(themeStore, elmt)
		expect(elmt.className).toBe("dark")
		themeStore.set("light")
		expect(elmt.className).toBe("light")
		unbind()
		themeStore.set("dark")
		expect(elmt.className).toBe("")
	})
	// must test async as mutation observer are async
	it("should auto unbind when element is removed from the dom when autoUnbindOnRemoved=true ", async () => {
		const themeStore = createStore("dark")
		const elmt = document.createElement("span")
		elmt.id = "test"
		document.body.appendChild(elmt)
		let removed = false
		onElmtRemoved(elmt, () => removed = true)
		const unbind = bindClassName(themeStore, elmt, {autoUnbindOnRemoved: true})
		expect(elmt.className).toBe("dark")
		themeStore.set("light")
		expect(elmt.className).toBe("light")
		elmt.remove()
		// need to wait for mutation observer to be triggered
		await vi.waitUntil(() => removed, {timeout:500})
		themeStore.set("dark")
		expect(elmt.className).toBe("")
	})
})

describe("bindStyle", () => {
	it("should bind a store value to a style property of an HTMLElement", () => {
		const colorStore = createStore("red")
		const elmt = document.createElement("div")
		const unbind = bindStyleProp(colorStore, elmt, "color")
		expect(elmt.style.color).toBe("red")
		colorStore.set("blue")
		expect(elmt.style.color).toBe("blue")
		unbind()
	})
	it("should return a function to unbind the binding", () => {
		const colorStore = createStore("red")
		const elmt = document.createElement("div")
		const unbind = bindStyleProp(colorStore, elmt, "color")
		expect(elmt.style.color).toBe("red")
		unbind()
		colorStore.set("green")
		expect(elmt.style.color).toBe("red")
	})
	// must test async as mutation observer are async
	it("should auto unbind when element is removed from the dom when autoUnbindOnRemoved=true ", async () => {
		const colorStore = createStore("red")
		const elmt = document.createElement("div")
		let removed = false
		onElmtRemoved(elmt, () => removed = true)
		document.body.appendChild(elmt)
		bindStyleProp(colorStore, elmt, "color", {autoUnbindOnRemoved: true})
		expect(elmt.style.color).toBe("red")
		colorStore.set("blue")
		expect(elmt.style.color).toBe("blue")
		elmt.remove()
		await vi.waitUntil(() => removed, {timeout:500})
		colorStore.set("green")
		expect(elmt.style.color).toBe("blue")
	})
})

describe("bindStyles", () => {
	it("should bind a store value to multiple style properties of an HTMLElement", () => {
		const store = createStore<Record<string, string>>({maxWidth: "10rem", color: "black", 'background-color': "white"})
		const elmt = document.createElement("div")
		const unbind = bindStyleProps(store, elmt)
		expect(elmt.style.color).toBe("black")
		expect(elmt.style.backgroundColor).toBe("white")
		expect(elmt.style.maxWidth).toBe("10rem")
		store.set({color: "blue", maxWidth: "200px", backgroundColor: "red"})
		expect(elmt.style.color).toBe("blue")
		expect(elmt.style.backgroundColor).toBe("red")
		expect(elmt.style.maxWidth).toBe("200px")
		unbind()
	})
	it("should return a function to unbind the binding", () => {
		const store = createStore<Record<string, string>>({color: "black"})
		const elmt = document.createElement("div")
		const unbind = bindStyleProps(store, elmt)
		expect(elmt.style.color).toBe("black")
		unbind()
		store.set({color: "blue"})
		expect(elmt.style.color).toBe("black")
	})
	// must test async as mutation observer are async
	it("should auto unbind when element is removed from the dom when autoUnbindOnRemoved=true ", async () => {
		const store = createStore<Record<string, string>>({color: "black"})
		const elmt = document.createElement("div")
		let removed = false
		onElmtRemoved(elmt, () => removed = true)
		document.body.appendChild(elmt)
		bindStyleProps(store, elmt, {autoUnbindOnRemoved: true})
		expect(elmt.style.color).toBe("black")
		store.set({color: "blue"})
		elmt.remove()
		await vi.waitUntil(() => removed, {timeout:500})
		expect(elmt.style.color).toBe("blue")
		store.set({color: "green"})
		expect(elmt.style.color).toBe("blue")
	})
})