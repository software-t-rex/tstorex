/*
Copyright © 2023 Jonathan Gotti <jgotti at jgotti dot org>
SPDX-FileType: SOURCE
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2023 Jonathan Gotti <jgotti@jgotti.org>
*/
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
		const unbind = bindStorage(store, { key: "test", restore: false })
		expect(sessionStorage.getItem("test")).toEqual(null)
		unbind()
	})
	it("should update storage on init if restore = true and storage is not set", () => {
		const store = createStore(john)
		const unbind = bindStorage(store, { key: "test" })
		expect(sessionStorage.getItem("test")).toEqual(JSON.stringify(john))
		unbind()
	})
	it("should restore value from storage if any", () => {
		const store = createStore(null)
		sessionStorage.setItem("test", JSON.stringify(jane))
		const unbind = bindStorage(store, { key: "test" })
		expect(store.get()).toEqual(jane)
	})
	it("should update storage on store change", () => {
		const store = createStore(john)
		sessionStorage.clear()
		const unbind = bindStorage(store, { key: "test", restore: false})
		expect(sessionStorage.getItem("test")).toEqual(null)
		expect(store.get()).toEqual(john)
		store.set(jack)
		expect(sessionStorage.getItem("test")).toEqual(JSON.stringify(jack))
		unbind()
	})
	it("should return a function to unbind", () => {
		const store = createStore(john)
		sessionStorage.clear()
		const unbind = bindStorage(store, { key: "test"})
		expect(sessionStorage.getItem("test")).toEqual(JSON.stringify(john))
		expect(store.get()).toEqual(john)
		store.set(jack)
		expect(sessionStorage.getItem("test")).toEqual(JSON.stringify(jack))
		unbind()
		store.set(jane)
		expect(sessionStorage.getItem("test")).toEqual(JSON.stringify(jack))
	})
	it("should accept a custom storage", () => {
		const store = createStore(john)
		const fakeStorage = {
			storage: {},
			getItem(key: string) {
				return key in this.storage ? this.storage[key] : null
			},
			setItem(key: string, value: string) {
				this.storage[key] = value
			},
		}
		const unbind = bindStorage(store, { key: "test", storage: fakeStorage })
		expect(fakeStorage.getItem("test")).toEqual(JSON.stringify(john))
		unbind()
	})
	it("should accept a custom serializer", () => {
		sessionStorage.clear()
		const store = createStore(john)
		const unbind = bindStorage(store.getScopeStore("firstName"), { key: "test", storage: sessionStorage, serializer: (value) => value.split('').reverse().join('') })
		expect(sessionStorage.getItem("test")).toEqual("nhoJ")
		unbind()
	})
	it("should accept a custom deserializer", () => {
		sessionStorage.clear()
		sessionStorage.setItem("test", "ettenaJ")
		const store = createStore(john)
		const unbind = bindStorage(store.getScopeStore("firstName"), { key: "test", storage: sessionStorage, deserializer: (value) => value.split('').reverse().join('') })
		expect(store.get().firstName).toEqual("Janette")
		unbind()
	})
	it("should throw if called with invalid options", () => {
		sessionStorage.clear()
		const store = createStore(john)
		//@ts-ignore
		expect(() => bindStorage(store)).toThrow("invalid options")
		//@ts-ignore
		expect(() => bindStorage(store, { key: "test", serializer: null })).toThrow("invalid options")
		//@ts-ignore
		expect(() => bindStorage(store, { key: "test", deserializer: null })).toThrow("invalid options")
		//@ts-ignore
		expect(() => bindStorage(store, { key: "test", storage: null })).toThrow()
	})
})