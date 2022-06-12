import { Message } from "T-REx-UI/components/Feedback"
import { Code } from "../../../../.storybook/Code"

export default {
  title: 'utils/store',
	isComponent: false,
	parameters: {
		viewMode: 'story',
		options: {showPanel: false},
		a11y: { disable: true },
		controls: {disable: true},
		theme: {disable: true},
	}
}

export const Store = () => {
	return <>
		<h1>Store</h1>
		<h2>Introduction</h2>
		<p>
			T-REx-UI comes with own store implementation.
			This is a really simple store you can use with or without react.
			It is written in typescript and should be typesage, you will have full code completion when working with it if your IDE supports it.
		</p>

		<h2>Create a store</h2>
		<p>
			To use it simply create a store like this:
			<Code lang="ts">{`const myStore = createStore({fullname: 'John Doe', age: 18})`}</Code>
			Or use an ScopeInitializer function
			<Code lang="ts">{`
const myStoreInit = (get, set) => {
	return {
		fullname: 'John Doe',
		age: 18,
		setAge(age) { set({...get(), age }) },
		setName(fullname) { set({...get(), fullname }) },
	}
}
const myStore = createStore(myStoreInit)
		`}</Code>
		</p>

		<h2>Using the store</h2>

		<h3>Get a snapshot of the store state</h3>
		<Code lang="ts">{`myStore.get()`}</Code>

		<h3>Set a new state</h3>
		<p>You can set a new state by directly providing a new state</p>
		<Code lang="ts">{`myStore.set({fullname:'John Doe', age:21})`}</Code>
		<p>Or use a functionnal approach. This is the prefered method.</p>
		<Code lang="ts">{`myStore.set((state) => {...state, age:21})`}</Code>

		<h3>Listen to changes</h3>
		<p>You can subscribe to store changes by using it's subscribe method</p>
		<Code lang="ts">{`
const changeListener = (newState, oldState) => { console.log("state changed") }
const unsubscribe = myStore.subscribe(changeListener)
// later stop listnening for change by calling unsubscribe()
		`}</Code>

		<h3>Stop using the store</h3>
		<p>The destroy method will unbound any listener previously attached to the store and reset the store value to null</p>
		<Message severity="warning" withSeverityIcon>
			Any call to the store following destroy will throw an Error !
			<br />
			You should discard any reference to the store or it's subset in your code after that.
		</Message>
		<Code lang="ts">{`myStore.destroy()`}</Code>


		<h3>Working with a scoped subset of a store</h3>
		<p>
			One nice feature of T-REx-UI is the ability to work seamlessly on a subset of a store.
			Working on a subset of a store will ease performance optimisation in react by avoiding too many rerenders.
			This is possible due to the fact that scoped store will only listen to change inside their scope not the whole store.
		</p>
		<Code lang="ts">{`
const myStore = createStore({mum: {name: 'Jane', age: 24}, dad: {name: 'John', age: 25}})
const mumStore = myStore.getScopeStore('mum') //<-- you will have completion for path too
const dadNameStore = myStore.getScopeStore('dad.name')
		`}</Code>
		<p>
			Returned scoped store will provide the same interface than a normal store but no destroy method.
			So you can even get a scope store from another one
			<Code lang="ts">{`const mumAgeStore = mumStore.getScopeStore('age')`}</Code>
		</p>

		<h2>Integration with react</h2>
		<p>
			In order to ease usage of Store in react we provide two methods to help you createSyncStore and useSyncStore.
			See hooks/useSyncStore for more details.
		</p>
	</>
}
