/**
 * @jest-environment happy-dom
 */
import { describe, it, expect } from "vitest"
import { createStore } from "../store"
import { bindStorage } from "./bindStorage"

const john = {
	firstName: "John",
	lastName: "Doe",
	age: 42
}
const jane = {
	firstName: "Jane",
	lastName: "Black",
	age: 40
}
const jack = {
	firstName: "Jack",
	lastName: "Bower",
	age: 58
}


describe("bindStorage", () => {
	it("should NOT update storage on init if restore = false and storage is not set", () => {
		const store = createStore(john)
		const unbind = bindStorage(store, { key: "test", storage: sessionStorage, restore: false })
		expect(sessionStorage.getItem("test")).toEqual(null)
		unbind()
	})
	it("should update storage on init if restore = true and storage is not set", () => {
		const store = createStore(john)
		const unbind = bindStorage(store, { key: "test", storage: sessionStorage })
		expect(sessionStorage.getItem("test")).toEqual(JSON.stringify(john))
		unbind()
	})
	it("should restore value from storage if any", () => {
		const store = createStore(null)
		sessionStorage.setItem("test", JSON.stringify(jane))
		const unbind = bindStorage(store, { key: "test", storage: sessionStorage })
		expect(store.get()).toEqual(jane)
	})
	it("should update storage on store change", () => {
		const store = createStore(john)
		sessionStorage.clear()
		const unbind = bindStorage(store, { key: "test", storage: sessionStorage, restore: false})
		expect(sessionStorage.getItem("test")).toEqual(null)
		expect(store.get()).toEqual(john)
		store.set(jack)
		expect(sessionStorage.getItem("test")).toEqual(JSON.stringify(jack))
		unbind()
	})
	it("should return a function to unbind", () => {
		const store = createStore(john)
		sessionStorage.clear()
		const unbind = bindStorage(store, { key: "test", storage: sessionStorage})
		expect(sessionStorage.getItem("test")).toEqual(JSON.stringify(john))
		expect(store.get()).toEqual(john)
		store.set(jack)
		expect(sessionStorage.getItem("test")).toEqual(JSON.stringify(jack))
		unbind()
		store.set(jane)
		expect(sessionStorage.getItem("test")).toEqual(JSON.stringify(jack))
	})
})