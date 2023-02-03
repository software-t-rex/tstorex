import { createStore } from "./store"
import { StoreInitializer } from "./type"

const testState = {data: {person: {fullname: 'John Doe', age: 18}}}
const testStateString = '{"data":{"person":{"fullname":"John Doe","age":18}}}'
const testState2 = {
	mum: {fullname: 'Jane Doe', age: 43},
	dad: {fullname: 'John Doe', age: 41},
}

describe('createStore', () => {
	it('should correctly init store state from value', () => {
		const store = createStore<any>(testState)
		expect(JSON.stringify(store.get())).toBe(testStateString)
		store.set({foo:'bar'})
		expect(JSON.stringify(store.get())).toBe('{"foo":"bar"}')
		store.set(1)
		expect(store.get()).toBe(1)
	})
	it('should correctly init store state from function', () => {
		const store = createStore((get, set) => testState)
		expect(JSON.stringify(store.get())).toBe(testStateString)
	})
	it('should pass working getter and setter to initializer function', () => {
		const initializer = (get, set) => ({
			...testState2,
			getMumName: () => get().mum.fullname,
			setIronDad: () => {
				const oldState:any = get()
				set({
					...oldState,
					dad:{...oldState.dad, fullname: 'Tony Stark'}
				})
			}
		})
		const store = createStore(initializer)
		expect(store.get().getMumName()).toBe('Jane Doe')
		store.get().setIronDad()
		expect(store.get().dad.fullname).toBe('Tony Stark')
	})
	it('should throw when trying to set its own state', () => {
		const store = createStore(testState)
		expect(() => store.set(store.get())).toThrow()
		expect(() => store.set((s) => s)).toThrow()
	})
	it('should correctly init store state from no value', () => {
		const store = createStore()
		expect(store.get()).toBe(null)
		store.set(1)
		expect(store.get()).toBe(1)
	})
	it('should allow to subscribe to change on the store', () => {
		const store = createStore()
		const listener = jest.fn()
		store.subscribe(listener)
		store.set(() => 1)
		expect(listener).toBeCalledTimes(1)
		expect(listener).toBeCalledWith(1,null)
		expect(store.get()).toBe(1)
	})
	it('should allow to destroy the store', () => {
		const store = createStore<any>({foo: 'bar'})
		const listener = jest.fn()
		store.subscribe(listener)
		store.destroy()
		try{ store.set(1) } catch (e) {}
		expect(listener).not.toHaveBeenCalled()
		expect(store.isDestroyed()).toBe(true)
	})
	it('should throw when trying to manipulate a destroyed store', () => {
		const store = createStore<any>({foo: 'bar'})
		store.destroy()
		expect(() => store.set(1)).toThrow()
		expect(() => store.get()).toThrow()
		expect(() => store.subscribe(() => {})).toThrow()
	})
	it('state should be immutable', () => {
		const store = createStore(testState2)
		const state = store.get()
		expect(() => state.mum = null).toThrow()
		store.set({...testState2, mum: {...testState2.mum, age:0}})
		expect(() => store.get().mum = null).toThrow()
		const subStore = store.getScopeStore('dad')
		const dad = subStore.get()
		expect(() => dad.fullname = 'John Snow').toThrow()
		subStore.set({...dad, fullname: 'John Black'})
		expect(Object.isFrozen(store.get().dad)).toBe(true)
	})
	describe('store.subscribe', () => {
		it('should allow to be notified when state change', () => {
			const store = createStore(testState2)
			const listener = jest.fn()
			store.subscribe(listener)
			store.set((s) => ({...s, mum: {fullname: 'Jane Black', age: s.mum.age}}))
			const state2 = store.get()
			expect(listener).toHaveBeenCalledTimes(1)
			expect(listener).toHaveBeenCalledWith(state2, testState2)
			store.set((s) => ({...s, dad: {fullname: 'John Black', age: s.dad.age}}))
			const state3 = store.get()
			expect(listener).toHaveBeenCalledTimes(2)
			expect(listener).toHaveBeenCalledWith(state3, state2)
		})
		it('should return a method to stop listener', () => {
			const store = createStore(testState)
			const listener = jest.fn()
			const unbind = store.subscribe(listener)
			store.set({data: {person: null}})
			expect(listener).toHaveBeenCalledTimes(1)
			unbind()
			store.set({data: {person: {fullname: 'John Snow', age: 32}}})
			expect(listener).toHaveBeenCalledTimes(1)
			store.destroy()
		})
	})

	describe('store.getScopeStore', () => {
		it('should give access to only a subset of the store', () => {
			const store = createStore<typeof testState>(testState)
			const subStore = store.getScopeStore('data')
			expect(subStore.get().person.fullname).toBe('John Doe')
		})
		it('should respect parent store destroy state', () => {
			const store = createStore(testState2)
			const mumStore = store.getScopeStore('mum')
			store.destroy()
			expect(() => mumStore.get()).toThrow()
			expect(() => mumStore.subscribe(() => {})).toThrow()
			expect(() => mumStore.set({fullname: 'Jamy Doe', age: 42})).toThrow()
			expect(mumStore.isDestroyed()).toBe(true)
		})
		it('should trigger listener only on subset change', () => {
			const store = createStore(testState2)
			const mumStore = store.getScopeStore('mum')
			const dadStore = store.getScopeStore('dad')
			const listener1 = jest.fn()
			const listener2 = jest.fn()
			const newMum = {fullname:'Jane Doe', age: 44}
			mumStore.subscribe(listener1)
			dadStore.subscribe(listener2)
			expect(mumStore.get().fullname).toBe('Jane Doe')
			expect(dadStore.get().age).toBe(41)
			mumStore.set((s) => ({...s, age: 44}))
			expect(mumStore.get()).toMatchObject(newMum)
			expect(listener1).toHaveBeenCalledTimes(1)
			expect(listener1).toHaveBeenCalledWith(newMum, testState2.mum)
			expect(listener2).not.toHaveBeenCalled()
			store.set((s) => ({...s, dad: {...s.dad, age: 54}}))
			expect(listener2).toHaveBeenCalledTimes(1)
			expect(listener2).toHaveBeenCalledWith({fullname: 'John Doe', age: 54}, testState2.dad)
			expect(listener1).toHaveBeenCalledTimes(1)
		})
		it('should trigger parent store listener on change', () => {
			const store = createStore(testState2)
			const mumStore = store.getScopeStore('mum')
			const listener = jest.fn()
			store.subscribe(listener)
			mumStore.set((s) => ({...s, age: 18}))
			expect(listener).toHaveBeenCalledTimes(1)
			expect(listener).toHaveBeenCalledWith(
				{...testState2, mum: {...testState2.mum, age: 18}},
				testState2
			)
		})
		it('should trigger scoped listener on parent store change if change is in scope', () => {
			const store = createStore(testState2)
			const mumStore = store.getScopeStore('mum')
			const listener = jest.fn()
			mumStore.subscribe(listener)
			store.set((s) => ({...s, dad: {...s.dad, age: 18}}))
			expect(listener).not.toHaveBeenCalled()
			store.set((s) => ({...s, mum: {...s.mum, age: 18}}))
			expect(listener).toHaveBeenCalledTimes(1)
			expect(listener).toHaveBeenCalledWith({fullname: 'Jane Doe', age:18}, testState2.mum)
		})
		it('should work with path too', () => {
			const store = createStore(testState)
			const personStore = store.getScopeStore('data.person')
			const listener = jest.fn()
			expect(personStore.get()).toStrictEqual({fullname: 'John Doe', age: 18})
			personStore.subscribe(listener)
			store.set((s) => ({...s, data: {...s.data, pet: "bill" }}))
			expect(listener).not.toHaveBeenCalled()
			store.set((s) => ({...s, data: {...s.data, person: {...s.data.person, age:25} }}))
			expect(listener).toHaveBeenCalledTimes(1)
			expect(listener).toHaveBeenCalledWith({fullname: 'John Doe', age:25}, {fullname: 'John Doe', age:18})
			expect(personStore.get()).toStrictEqual({fullname: 'John Doe', age:25})
			personStore.set(null)
			expect(listener).toHaveBeenCalledTimes(2)
			expect(listener).toHaveBeenCalledWith(null, {fullname: 'John Doe', age:25})
			expect(personStore.get()).toStrictEqual(null)
			expect(store.get()).toStrictEqual({data:{person:null, pet: 'bill'}})
		})
		it('should allow to get store for non already exisiting path', () => {
			const store = createStore<typeof testState & {pet?:{name:string}}>(testState)
			const scopeStore = store.getScopeStore('pet')
			expect(scopeStore.get()).toBe(undefined)
		})
		it('should notify a store for non already exisiting path when it become available', () => {
			const listener = jest.fn()
			const store = createStore<typeof testState & {pet?:{name:string}}>(testState)
			const scopeStore = store.getScopeStore('pet')
			scopeStore.subscribe(listener)
			expect(scopeStore.get()).toBe(undefined)
			store.set((s) => ({...s, pet: {name: 'bill'} }))
			expect(listener).toHaveBeenCalled()
			expect(scopeStore.get()).toStrictEqual({name: 'bill'})
		})
	})

	describe('scoped store that are not in path anymore', () => {
		it('should be notified that value goes to undefined', () => {
			const listener = jest.fn()
			const store = createStore(testState)
			const personStore = store.getScopeStore('data.person')
			personStore.subscribe(listener)
			store.set({data:null})
			expect(listener).toHaveBeenCalledWith(undefined, testState.data.person)
			expect(personStore.get()).toBe(undefined)
		})
		it('should get notified with new value if in path again', () => {
			const listener = jest.fn()
			const store = createStore(testState)
			const personStore = store.getScopeStore('data.person')
			personStore.subscribe(listener)
			store.set({data:null})
			const jane = {fullname: 'Jane Black', age: 18}
			store.set({data: {person: jane}})
			expect(listener).toHaveBeenCalledWith(jane, undefined)
			expect(personStore.get()).toStrictEqual(jane)
		})
	})

	describe('nested scoped store', () => {
		it('should work as expected', () => {
			// quick all in on test to check it's working as intended
			const observer1 = jest.fn()
			const observer2 = jest.fn()
			const observer3 = jest.fn()
			const store = createStore(testState)
			const scopeStore = store.getScopeStore('data')
			const nestedStore = scopeStore.getScopeStore('person.fullname')
			expect(nestedStore.get()).toBe('John Doe')
			store.subscribe(observer1)
			scopeStore.subscribe(observer2)
			nestedStore.subscribe(observer3)
			nestedStore.set('Jack Black')
			expect(observer1).toHaveBeenCalled()
			expect(observer2).toHaveBeenCalled()
			expect(observer3).toHaveBeenCalled()
			scopeStore.set({person:null})
			expect(observer1).toHaveBeenCalledTimes(2)
			expect(observer2).toHaveBeenCalledTimes(2)
			expect(observer3).toHaveBeenCalledTimes(2)
			expect(observer2).toHaveBeenCalledWith({person:null}, {person: {fullname: 'Jack Black', age:18}})
			expect(observer3).toHaveBeenCalledWith(undefined, 'Jack Black')
			store.set({data:{person: {fullname: 'Jane Doe', age: 23}}})
			expect(observer1).toHaveBeenCalledTimes(3)
			expect(observer2).toHaveBeenCalledTimes(3)
			expect(observer3).toHaveBeenCalledTimes(3)
			expect(nestedStore.get()).toBe('Jane Doe')
		})
		it('should preserve Array ancestors as Array', () => {
			const store = createStore({parents: [testState2.dad, testState2.mum]})
			const mumStoreName = store.getScopeStore('parents.1.fullname')
			expect(mumStoreName.get()).toBe('Jane Doe')
			mumStoreName.set('Jane Fonda')
			expect(mumStoreName.get()).toBe('Jane Fonda')
			expect(Array.isArray(store.get().parents)).toBe(true)
		})
	})

})