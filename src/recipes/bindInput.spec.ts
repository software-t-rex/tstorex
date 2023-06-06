/**
 * @vitest-environment jsdom
 * // must use js-dom happy-dom has only getter for valueAs* properties
 */
import { describe, it, expect, vi } from "vitest"
import { createStore } from "../store"
import { BindAbleInputElement, bindInput } from "./bindInput"
interface Person {
	firstName: string
	lastName: string
	age: number
}
const testData:Person = {
		firstName: "John",
		lastName: "Doe",
		age: 42
}

const setup = <T>(markup:string, storeInitializer:T) => {
	document.body.innerHTML = markup
	const input = document.body.querySelector('*') as BindAbleInputElement // select first child
	return {
		store: createStore(storeInitializer),
		input,
		changeValue: (value: string) => { input.value = value; input.dispatchEvent(new Event("change"))},
		changeValueAsNumber: (value: number) => { input.valueAsNumber = value; input.dispatchEvent(new Event("change"))},
		changeValueAsDate: (value: Date) => { input.valueAsDate = value; input.dispatchEvent(new Event("change"))},
		changeChecked: (value: boolean) => { input.checked = value; input.dispatchEvent(new Event("change"))},
		changeSelectedIndex: (value: number) => { input.selectedIndex = value; input.dispatchEvent(new Event("change"))},
	}
}

describe("bindInput", () => {
	it("should bind an input element to a store in both way", async () => {
		 const { store, input, changeValue } = setup('<input type="text" />', testData)
		 const unbind = bindInput(store.getScopeStore("firstName"), input)
		 expect(input.value).toBe("John")
		 // changing input should change store
		 changeValue("Jane")
		 expect(store.get().firstName).toBe("Jane")
		 expect(input.value).toBe("Jane")
		 // changing store should change input
		 store.set((s) => ({...s,  firstName: "Jake" }))
		 expect(store.get().firstName).toBe("Jake")
		 expect(input.value).toBe("Jake")
		 // unbind should remove listener
		 unbind()
		 store.set((s) => ({...s,  firstName: "noone" }))
		 expect(input.value).toBe("Jake")
		 changeValue("nobody")
		 expect(store.get().firstName).toBe("noone")
	})

	describe("when store value is set", async () => {
		const { store, input } = setup('<input type="text" />', testData)
		let storeName = store.getScopeStore("firstName")
		let unbind
		const reset = (storeNameValue) => {
			unbind?.()
			storeName.set(storeNameValue)
			unbind = bindInput(storeName, input)
		}
		it("to a non empty value should set input with empty value to that value", () => {
			reset("John")
			expect(input.value).toBe("John")
			expect(storeName.get()).toBe("John")
		})
		it("to non empty value on bind should set input with non empty value to that value", () => {
			reset("Jane")
			expect(input.value).toBe("Jane")
			expect(storeName.get()).toBe("Jane")
		})
		it("to an empty value and input has a non empty value, input value should prevail", () => {
			reset("")
			expect(input.value).toBe("Jane")
			expect(storeName.get()).toBe("Jane")
		})
	})

	describe("Options.", () => {
		describe("valueAccessor", () => {
			it("should allow 'valueAsNumber'", () => {
				const { store, input, changeValueAsNumber } = setup('<input type="number" />', testData)
				const unbind = bindInput(store.getScopeStore("age"), input, { valueAccessor: 'valueAsNumber' })
				expect(input.valueAsNumber).toBe(testData.age)
				changeValueAsNumber(18)
				expect(input.valueAsNumber).toBe(18)
				expect(store.get().age).toBe(18)
				store.set((s) => ({...s, age: 21 }))
				expect(input.valueAsNumber).toBe(21)
				expect(store.get().age).toBe(21)
				unbind()
			})
			it("should allow 'valueAsDate'", () => {
				const weddingDay = new Date("2010-10-10")
				const targetDateString = new Date("2018-10-10").toISOString()
				const targetDateString2 = new Date("2011-10-10").toISOString()
				const { store, input, changeValueAsDate } = setup('<input type="date" />', {...testData, weddingDay})
				const unbind = bindInput(store.getScopeStore("weddingDay"), input, { valueAccessor: 'valueAsDate' })
				expect(input.valueAsDate?.toISOString()).toBe(weddingDay.toISOString())
				changeValueAsDate(new Date("2018-10-10"))
				expect(input.valueAsDate?.toISOString()).toBe(targetDateString)
				expect(store.get().weddingDay?.toISOString()).toBe(targetDateString)
				store.set((s) => ({...s, weddingDay: new Date("2011-10-10") }))
				expect(input.valueAsDate?.toISOString()).toBe(targetDateString2)
				expect(store.get().weddingDay?.toISOString()).toBe(targetDateString2)
				unbind()
			})
			it("should allow 'checked'", () => {
				const married = false
				const { store, input, changeChecked } = setup('<input type="checkbox" />', {...testData, married})
				const targetDateString = new Date("2018-10-10").toISOString()
				const unbind = bindInput(store.getScopeStore("married"), input, { valueAccessor: 'checked' })
				expect(input.checked).toBe(married)
				changeChecked(true)
				expect(input.checked).toBe(true)
				expect(store.get().married).toBe(true)
				store.set((s) => ({...s, married: false }))
				expect(input.checked).toBe(false)
				expect(store.get().married).toBe(false)
				unbind()
			})
			it("should allow 'selectedIndex' for HTMLSelectElement", () => {
				const selected = 1
				const { store, input, changeSelectedIndex } = setup('<select><option>0</option><option>1</option><option>2</option></select>', {...testData, selected})
				const unbind = bindInput(store.getScopeStore("selected"), input, { valueAccessor: 'selectedIndex' })
				expect(input.selectedIndex).toBe(1)
				changeSelectedIndex(2)
				expect(input.selectedIndex).toBe(2)
				expect(store.get().selected).toBe(2)
				store.set((s) => ({...s, selected: 0 }))
				expect(input.selectedIndex).toBe(0)
				expect(store.get().selected).toBe(0)
				unbind()
			})
		})
		describe("events", () => {
			it("should allow to react on other events than 'change'", () => {
				const { store, input, changeValue } = setup('<input type="text" />', testData)
				const unbind = bindInput(store.getScopeStore("firstName"), input, { events: ['blur'] })
				expect(input.value).toBe("John")
				changeValue("Jane")
				expect(store.get().firstName).toBe("John")
				input.dispatchEvent(new Event('blur'))
				expect(store.get().firstName).toBe("Jane")
				unbind()
			})
		})
		describe("inputToStore", () => {
			it('should allow to tranform value before storing', () => {
				const { store, input, changeValue } = setup('<input type="text" />', testData)
				const nameStore = store.getScopeStore("firstName")
				const unbind = bindInput(nameStore, input, {
					valueAccessor: 'value',
					inputToStore: (v) => {
						return v ? String(v).toUpperCase() : ""
					}
				})
				expect(input.value).toBe("John")
				expect(nameStore.get()).toBe("John")
				changeValue("Jane")
				expect(store.get().firstName).toBe("JANE")
				unbind()
			})
		})
		describe("storeToInput", () => {
			it('should allow to tranform value before setting input', () => {
				const { store, input, changeValue } = setup('<input type="text" />', testData)
				const nameStore = store.getScopeStore("firstName")
				const unbind = bindInput(nameStore, input, {
					valueAccessor: 'value',
					storeToInput: (v) => {
						return v ? String(v).toUpperCase() : ""
					}
				})
				expect(input.value).toBe("JOHN")
				expect(nameStore.get()).toBe("John")
				nameStore.set("Jane")
				expect(store.get().firstName).toBe("Jane")
				expect(input.value).toBe("JANE")
				unbind()
			})
		})
		it("should accept a string eventName as options", () => {
			const { store, input, changeValue } = setup('<input type="text" />', testData)
			const unbind = bindInput(store.getScopeStore("firstName"), input, 'blur')
			expect(input.value).toBe("John")
			changeValue("Jane")
			expect(store.get().firstName).toBe("John")
			input.dispatchEvent(new Event('blur'))
			expect(store.get().firstName).toBe("Jane")
			unbind()
		})
		it("should accept an array of string eventNames as options", () => {
			const { store, input, changeValue } = setup('<input type="text" />', testData)
			const unbind = bindInput(store.getScopeStore("firstName"), input, ['blur', 'keypress'])
			expect(input.value).toBe("John")
			changeValue("Jane")
			expect(store.get().firstName).toBe("John")
			input.dispatchEvent(new Event('blur'))
			expect(store.get().firstName).toBe("Jane")
			changeValue("Jake")
			expect(store.get().firstName).toBe("Jane")
			input.dispatchEvent(new Event('change'))
			expect(store.get().firstName).toBe("Jane")
			input.dispatchEvent(new Event('keypress'))
			expect(store.get().firstName).toBe("Jake")
			unbind()
		})
		it("should log an error if options is not a string, string[], or object", () => {
			const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
			const { store, input } = setup('<input type="text" />', testData)
			const unbind = bindInput(store.getScopeStore("firstName"), input, 1 as any)
			expect(spy).toHaveBeenLastCalledWith('bindInput received bad options format default to {events: ["change"]}')
			spy.mockRestore()
		})
	})
})