/*
Copyright © 2023 Jonathan Gotti <jgotti at jgotti dot org>
SPDX-FileType: SOURCE
SPDX-License-Identifier: MIT
SPDX-FileCopyrightText: 2023 Jonathan Gotti <jgotti@jgotti.org>
*/
import { describe, it, expect } from "vitest"
import { createStore } from "../store"
import { useStore, useReducer } from "./basics"

const testState = {mum: {name: "mummy", age:32}, dad: {name:"daddy", age:34}}
const reducer = <T extends typeof testState>(state:T, action:{type:string, [k:string]:any}):T => {
	switch(action.type) {
		case 'setMummyAge': return {...state, mum: {...state.mum, age: action.age}}
		default: throw new Error("Unkown action type")
	}
}
const personReducer = <T>(state: T, action:{type:string, [k:string]:any}):T => {
	switch(action.type) {
		case 'setAge': return {...state, age: action.age}
		case 'setName': return {...state, name: action.name}
		default: throw new Error("Unkown action type")
	}
}

describe("Extension: basic: ", () => {
	describe("useStore", () => {
		it("should return the current state and a setter for the vaue", () => {
			const store = createStore<{name:string}>({name: "John Doe"})
			const [snapshot, setter] = useStore(store)
			expect(snapshot).toStrictEqual({name: "John Doe"})
			expect(setter).toBeTypeOf("function")
			setter({name:"Jane Doe"})
			expect(snapshot).toStrictEqual({name: "John Doe"})
			expect(store.get()).toStrictEqual({name: "Jane Doe"})
			const nameStore = store.getScopeStore("name")
		})
	})
	describe("useReducer", () => {
		it("should return a dispatch method for given reducer", () => {
			const store = createStore(testState)
			const dispatch = useReducer(store, reducer)
			dispatch({type:"setMummyAge", age:20})
			expect(store.get()).toStrictEqual({
				...testState,
				mum: {...testState.mum, age:20}
			})
			expect(() => dispatch({type: "unknown"})).toThrow()
		})
		it("should work on a scoped store", () => {
			const store = createStore(testState)
			const dispatch = useReducer(store.getScopeStore("mum"), personReducer)
			dispatch({type:"setAge", age:18})
			expect(store.get()).toStrictEqual({
				...testState,
				mum: {...testState.mum, age:18}
			})
			expect(() => dispatch({type: "unknown"})).toThrow()
		})
	})
})