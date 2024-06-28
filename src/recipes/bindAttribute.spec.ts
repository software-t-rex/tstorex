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
import { describe, it, expect } from "vitest"
import { createStore } from "../store"
import { bindAttribute } from "./bindAttribute"
describe("bindAttribute", () => {
	it("should bind a Store<String> to an attribute in both direction", async () => {
		const store = createStore("John")
		const div = document.createElement("div")
		const unbind = bindAttribute(store, div, "data-name")
		expect(div.getAttribute('data-name')).toBe("John")
		store.set("Jane")
		expect(div.getAttribute('data-name')).toBe("Jane")
		div.setAttribute('data-name', "Jack")
		// need to wait for mutation observer to be triggered
		await new Promise((resolve) => setTimeout(resolve, 0))
		expect(store.get()).toBe("Jack")
		unbind()
		store.set("Jazz")
		expect(div.dataset.name).toBe("Jack")
		expect(store.get()).toBe("Jazz")
	})

	it("When attribute is not set should initialize attribute to store value if store value is set", () => {
		const store = createStore<string|undefined>(null)
		const div = document.createElement("div")
		const settup = (storeValue) => {
			div.removeAttribute("data-name")
			store.set(storeValue)
			const unbind = bindAttribute(store, div, "data-name")
			unbind()
		}
		settup("John")
		expect(div.getAttribute("data-name")).toBe("John")
		expect(store.get()).toBe("John")

		settup("") // empty string is a value
		expect(store.get()).toBe("")
		expect(div.getAttribute("data-name")).toBe("")

		// store has no value at all so attribute should not be set
		settup(undefined)
		expect(div.getAttribute("data-name")).toBe(null)
		expect(store.get()).toBe(undefined)

		settup(null)
		expect(store.get()).toBe(null)
		expect(div.getAttribute("data-name")).toBe(null)
	})

	it("When attribute is set to '' should initialize attribute to store value if store value is not empty but store will be set to empty string if null or undefined", () => {
		const store = createStore<string|undefined>(null)
		const div = document.createElement("div")
		const settup = (storeValue) => {
			div.setAttribute("data-name", "")
			store.set(storeValue)
			const unbind = bindAttribute(store, div, "data-name")
			unbind()
		}
		settup("John")
		expect(div.getAttribute("data-name")).toBe("John")
		expect(store.get()).toBe("John")

		settup("")
		expect(store.get()).toBe("")
		expect(div.getAttribute("data-name")).toBe("")

		// store is not set but we have an empty value set store to empty string
		settup(undefined)
		expect(div.getAttribute("data-name")).toBe("")
		expect(store.get()).toBe("")

		settup(null)
		expect(div.getAttribute("data-name")).toBe("")
		expect(store.get()).toBe("")

	})

	it("should initialize the store to attribute value if store value is empty and attibute is not", () => {
		const store = createStore<string|undefined>(null)
		const div = document.createElement("div")
		const settup = (storeValue:any) => {
			store.set(storeValue)
			div.setAttribute("data-name", "John")
			const unbind = bindAttribute(store, div, "data-name")
			unbind()
		}
		// store has a value it prevail on attribute value
		settup("Jane")
		expect(div.getAttribute("data-name")).toBe("Jane")
		expect(store.get()).toBe("Jane")

		// not empty value on attribute win over empty store value
		settup("")
		expect(div.getAttribute("data-name")).toBe("John")
		expect(store.get()).toBe("John")

		// store not set to a value should take attribute value
		settup(undefined)
		expect(div.getAttribute("data-name")).toBe("John")
		expect(store.get()).toBe("John")

		settup(null)
		expect(store.get()).toBe("John")
		expect(div.getAttribute("data-name")).toBe("John")
	})

	it("should remove attribute if store value is null or undefined", async () => {
		const store = createStore<{name:string, pet?: string}>({name: "John"})
		const element = document.createElement("div")
		const unbind = bindAttribute(store.getScopeStore("pet"), element, "data-test")
		expect(element.dataset.test).toBeUndefined()
		store.set((s) => ({...s,  pet: "dog" }))
		expect(element.dataset.test).toBe("dog")
		store.set((s) => {
			const {pet, ...rest} = s
			return rest
		})
		expect(element.dataset.test).toBeUndefined()
		expect(element.getAttribute('data-test')).toBeNull()
		unbind()
	})
})