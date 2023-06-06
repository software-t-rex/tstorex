import { vi, describe, it, expect, expectTypeOf, assertType } from "vitest"
import { createStore } from "../store"
import { StoreHistoryAPI, historize } from "./historize"

interface Person {
	firstName: string
	lastName: string
	age: number
}
const john:Person = {
	firstName: "John",
	lastName: "Doe",
	age: 42
}
const jane:Person = {
	firstName: "Jane",
	lastName: "Black",
	age: 40
}
const jack:Person = {
	firstName: "Jack",
	lastName: "Bower",
	age: 58
}


describe("historize", () => {
	it("should return a StoreHistoryAPI", () => {
		const store = createStore(john)
		const history = historize(store)
		assertType<StoreHistoryAPI<Person>>(history)
	})
	it("should update history on store change", () => {
		const store = createStore(john)
		const history = historize(store)
		expect(history.state).toEqual(john)
		expect(history.length).toEqual(1)
		expect(history.backLength).toEqual(0)
		expect(history.forwardLength).toEqual(0)
		store.set(jane)
		expect(history.state).toEqual(jane)
		expect(history.length).toEqual(2)
		expect(history.backLength).toEqual(1)
		expect(history.forwardLength).toEqual(0)
		history.destroy()
	})
	it("should work for Array state", () => {
		const store = createStore([1, 2, 3])
		const history = historize(store)
		expect(history.state).toEqual([1, 2, 3])
		expect(history.length).toEqual(1)
		expect(history.backLength).toEqual(0)
		expect(history.forwardLength).toEqual(0)
		store.set([4, 5, 6])
		expect(history.state).toEqual([4, 5, 6])
		expect(history.length).toEqual(2)
		expect(history.backLength).toEqual(1)
		expect(history.forwardLength).toEqual(0)
		history.back()
		expect(history.state).toEqual([1, 2, 3])
		expect(history.length).toEqual(2)
		expect(history.backLength).toEqual(0)
		expect(history.forwardLength).toEqual(1)
		history.destroy()
	})
	describe('StoreHistoryAPI', () => {
		describe('state', () => {
			it("should return current state", () => {
				const store = createStore(john)
				const history = historize(store)
				expect(history.state).toEqual(john)
				store.set(jane)
				expect(history.state).toEqual(jane)
			})
		})
		describe('length', () => {
			it("should return the total number of steps of history (both back and forward)", () => {
				const store = createStore(john)
				const history = historize(store)
				expect(history.length).toEqual(1)
				store.set(jane)
				expect(history.length).toEqual(2)
				store.set(jack)
				expect(history.length).toEqual(3)
				history.back()
				expect(history.length).toEqual(3)
			})
		})
		describe('backLength', () => {
			it("should return the number of steps back in history", () => {
				const store = createStore(john)
				const history = historize(store)
				expect(history.backLength).toEqual(0)
				store.set(jane)
				expect(history.backLength).toEqual(1)
				store.set(jack)
				expect(history.backLength).toEqual(2)
				history.back()
				expect(history.backLength).toEqual(1)
				history.back()
				expect(history.backLength).toEqual(0)
				history.back()
				expect(history.backLength).toEqual(0)
			})
		})
		describe('forwardLength', () => {
			it("should return the number of steps forward in history", () => {
				const store = createStore(john)
				const init = store.get()
				const history = historize(store)
				expect(history.forwardLength).toEqual(0)
				store.set(jane)
				expect(history.forwardLength).toEqual(0)
				store.set(jack)
				expect(history.forwardLength).toEqual(0)
				history.back()
				expect(history.forwardLength).toEqual(1)
				history.back()
				expect(history.forwardLength).toEqual(2)
				expect(history.backLength).toEqual(0)
				history.back() // we're back to init state
				expect(history.forwardLength).toEqual(2)
				expect(history.backLength).toEqual(0)
			})
		})
		describe('pushState()', () => {
			it("should push state to history", () => {
				const store = createStore(john)
				const history = historize(store)
				history.pushState(jane)
				expect(store.get()).toEqual(jane)
				expect(history.state).toEqual(jane)
			})
			it("should make history.forwardLength = 0", () => {
				const store = createStore(john)
				const history = historize(store)
				history.pushState(jane)
				expect(history.forwardLength).toEqual(0)
			})
			it("should allow to get back in history", () => {
				const store = createStore(john)
				const history = historize(store)
				history.pushState(jane)
				history.pushState(jack)
				expect(store.get()).toEqual(jack)
				history.back()
				expect(store.get()).toEqual(jane)
				history.back()
				expect(store.get()).toEqual(john)
			})
		})
		describe('go()', () => {
			it("should go to a specific step in history", () => {
				const store = createStore(john)
				const history = historize(store)
				history.pushState(jane)
				history.pushState(jack)
				expect(store.get()).toEqual(jack)
				expect(history.state).toEqual(jack)
				history.go(-1)
				expect(store.get()).toEqual(jane)
				expect(history.state).toEqual(jane)
				history.go(-1)
				expect(store.get()).toEqual(john)
				expect(history.state).toEqual(john)
				history.go(2)
				expect(store.get()).toEqual(jack)
				expect(history.state).toEqual(jack)
			})
			it("should not go beyond the first step in history", () => {
				const store = createStore(john)
				const history = historize(store)
				history.pushState(jane)
				history.pushState(jack)
				expect(store.get()).toEqual(jack)
				history.go(-1)
				expect(store.get()).toEqual(jane)
				history.go(-1)
				expect(store.get()).toEqual(john)
				history.go(-1)
				expect(store.get()).toEqual(john)
			})
			it("should not go beyond the last step in history", () => {
				const store = createStore(john)
				const history = historize(store)
				history.pushState(jane)
				history.pushState(jack)
				expect(store.get()).toEqual(jack)
				history.go(1)
				expect(store.get()).toEqual(jack)
			})
		})
		describe('back() / undo()', () => {
			it("should go back 1 step in history", () => {
				const store = createStore(john)
				const history = historize(store)
				history.pushState(jane)
				history.pushState(jack)
				expect(store.get()).toEqual(jack)
				history.back()
				expect(store.get()).toEqual(jane)
				history.undo()
				expect(store.get()).toEqual(john)
			})
		})
		describe('forward() / redo()', () => {
			it("should go forward 1 step in history", () => {
				const store = createStore(john)
				const history = historize(store)
				history.pushState(jane)
				history.pushState(jack)
				history.go(-2)
				expect(store.get()).toEqual(john)
				history.forward()
				expect(store.get()).toEqual(jane)
				history.redo()
				expect(store.get()).toEqual(jack)
			})
		})
		describe('destroy()', () => {
			it("should make history api unusable", () => {
				const store = createStore(john)
				const history = historize(store)
				history.pushState(jane)
				history.destroy()
				expect(history.state).toEqual(null)
				expect(history.length).toEqual(0)
				expect(history.backLength).toEqual(0)
				expect(history.forwardLength).toEqual(0)
				const methods = ['pushState', 'back', 'undo', 'forward', 'redo', 'go', 'destroy']
				for(let i=0; i<methods.length; i++) {
					expect(history[methods[i]]).toThrow(/.*destroyed StoreHistoryAPI.*/)
				}
			})
		})
	})
	describe('options', () => {
		describe("maxSize", () => {
			it("should limit the number of steps in history", () => {
				const store = createStore(john)
				const history = historize(store, { maxSize: 2 })
				history.pushState(jane)
				expect(history.length).toEqual(2)
				history.pushState(jack)
				expect(history.length).toEqual(2)
				history.back()
				expect(history.backLength).toEqual(0)
				expect(history.state).toEqual(jane)
				history.back()
				expect(history.state).toEqual(jane)
			})
			it("should throw if maxSize is not a number or is less than 1", () => {
				const store = createStore(john)
				//@ts-ignore
				expect(() => historize(store, { maxSize: 'foo' })).toThrow(/.*maxSize must be a number greater than 0.*/)
				expect(() => historize(store, { maxSize: 0 })).toThrow(/.*maxSize must be a number greater than 0.*/)
			})
		})
		describe("initHistory", () => {
			it("should allow to initialize history with given back states", () => {
				const store = createStore(john)
				const history = historize(store, { initHistory: [jane, jack] })
				expect(store.get()).toEqual(john)
				expect(history.state).toEqual(john)
				expect(history.length).toEqual(3)
				history.back()
				expect(store.get()).toEqual(jack)
				expect(history.state).toEqual(jack)
				expect(history.backLength).toEqual(1)
				history.back()
				expect(store.get()).toEqual(jane)
				expect(history.state).toEqual(jane)
				expect(history.backLength).toEqual(0)
			})
			it("should throw if initHistory is not an array", () => {
				const store = createStore(john)
				//@ts-ignore
				expect(() => historize(store, { initHistory: 'foo' })).toThrow(/.*initHistory must be an array.*/)
			})
		})
	})
})
