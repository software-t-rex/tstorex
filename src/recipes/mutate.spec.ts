/*
Copyright © 2023 Jonathan Gotti <jgotti at jgotti dot org>
SPDX-FileType: SOURCE
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2023 Jonathan Gotti <jgotti@jgotti.org>
*/
import { describe, it, expect, vi } from "vitest"
import { createStore } from "../store"
import { produce, removeProp, setProp, mutate } from "./mutate"

const john = {
	name: "John",
	age: 42
}
const NotDraftableErrorMatcher = "state must be a plain object or an array"

describe("produce", () => {
	it("should allow recipes to mutate the received state", () => {
		const mutated = produce({ name: "John", age: 42 }, (draft) => {
			draft.name = "Jane"
			draft.age = 44
		})
		expect(mutated).toEqual({ name: "Jane", age: 44 })
		const mutated2 = produce(mutated, (draft) => {
			delete draft.age
			draft.pet = "cat"
		})
		expect(mutated2).toEqual({ name: "Jane", pet: "cat" })
		expect(mutated).toEqual({ name: "Jane", age: 44 })
	})
	it("should not mutate the original object", () => {
		const o = { name: "John" }
		Object.freeze(o)
		const mutated = produce(o, (draft) => {
			draft.name = "Jane"
		})
		expect(mutated).toEqual({ name: "Jane" })
		expect(o).toEqual({ name: "John" })
	})
	it("should allow to return a brand new object", () => {
		const mutated = produce({ name: "John" }, () => {
			return { name: "Jane", age: 44 }
		})
		expect(mutated).toEqual({ name: "Jane", age: 44 })
	})
	it("should allow to mutate nested properties", () => {
		const mutated = produce<{ address: { street: string, city?: string } }>({ address: { street: "Main St", city: "Paris" } }, (draft) => {
			draft.address.street = "Wall St"
			delete draft.address.city;
		})
		expect(mutated).toEqual({ address: { street: "Wall St" } })
	})
	it("should return SAME object (same ref) If no mutation applyed", () => {
		const o = { name: "John" }
		const mutated = produce(o, (s) => { })
		expect(mutated === o).toBe(true)
	})
	it("should throw if draft is returned", () => {
		const o = { name: "John" }
		expect(() => produce(o, (s) => {
			s.name = "Jane"
			return s
		})).toThrow("recipe must not return draft")
	})
	it("should work with array", () => {
		const mutated = produce([1, 2, 3], (draft) => {
			draft.push(4)
		})
		expect(mutated).toEqual([1, 2, 3, 4])
	})
	it("should throw if state is not draftable", () => {
		expect(() => produce(42, (s) => { })).toThrow(NotDraftableErrorMatcher)
		expect(() => produce("a string", (s) => { })).toThrow(NotDraftableErrorMatcher)
		expect(() => produce(new Date(), (s) => { })).toThrow(NotDraftableErrorMatcher)
	})
})

describe("removeProp", () => {
	it("should remove a property from state in given store", () => {
		const store = createStore(john)
		removeProp(store, "age")
		expect(store.get()).toEqual({ name: "John" })
		expect(store.get().age).toBeUndefined()
	})
	it("should allow to remove nested properties from given store", () => {
		const store = createStore({ address: { street: "Main St", city: "Paris" } })
		removeProp(store, "address.city")
		expect(store.get()).toEqual({ address: { street: "Main St" } })
		expect(store.get().address.city).toBeUndefined()
	})
})

describe("setProp", () => {
	it("should set a state property in given store", () => {
		const store = createStore(john)
		setProp(store, "age", 44)
		expect(store.get()).toEqual({ name: "John", age: 44 })
	})
	it("should allow to set nested properties into given store", () => {
		const store = createStore<{address:{street:string, city?:string}}>({ address: { street: "Main St" } })
		setProp(store, "address.city", "Paris")
		setProp(store, "address.street", "Wall St")
		expect(store.get()).toEqual({ address: { street: "Wall St", city: "Paris" } })
	})
})

describe("mutate", () => {
	it("should mutate the state in given store", () => {
		const store = createStore(john)
		mutate(store, (s) => {
			s.name = "Jane"
		})
		expect(store.get()).toEqual({ name: "Jane", age: 42 })
	})
	it("should allow to mutate nested properties into given store", () => {
		const store = createStore<{address:{street?:string, city?:string}}>({ address: { street: "Main St" } })
		mutate(store, (s) => {
			delete s.address.street
			s.address.city = "Paris"
		})
		expect(store.get()).toEqual({ address: { city: "Paris" } })
	})
	it("should allow to set a brand new object", () => {
		const store = createStore(john)
		mutate(store, () => {
			return { name: "Jane", age: 44 }
		})
		expect(store.get()).toEqual({ name: "Jane", age: 44 })
	})
	it("should not trigger any change if no mutation applyed", () => {
		const fn = vi.fn()
		const store = createStore(john)
		const unsubscibe = store.subscribe(() => {})
		expect(fn).not.toHaveBeenCalled()
		unsubscibe()
	})
	it("should throw if draft is returned", () => {
		const store = createStore(john)
		expect(() => mutate(store, (s) => {
			return s
		})).toThrow("recipe must not return draft")
	})
	it("should work with array", () => {
		const store = createStore([1, 2, 3])
		mutate(store, (s) => {
			s.push(4)
		})
		expect(store.get()).toEqual([1, 2, 3, 4])
	})
	it("should throw if state is not draftable", () => {
		expect(() => mutate(createStore("a string"), (s) => { })).toThrow(NotDraftableErrorMatcher)
		expect(() => mutate(createStore(42), (s) => { })).toThrow(NotDraftableErrorMatcher)
	})
})
