import { createStore } from "./store"

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
	})
	it('should throw when trying to manipulate a destroyed store', () => {
		const store = createStore<any>({foo: 'bar'})
		store.destroy()
		expect(() => store.set(1)).toThrow()
		expect(() => store.get()).toThrow()
		expect(() => store.subscribe(() => {})).toThrow()
	})
	describe('store.subscribe', () => {
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
	})
})