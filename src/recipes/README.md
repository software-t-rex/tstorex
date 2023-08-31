# TstorEX recipes

## Official recipes
You will find here a bunch of provided recipes that you may use to assist you with your store related experience.

Apart removeProp and setProp who will require the _getScopeStore_ to be implemented,
**these recipes can be used with other store libraries** provided they implement similar interface (_get_, _set_, _subscribe_). Feel free to do so, they are all licensed under the MIT license which is a permissive open source license.

For more details on how to use them don't hesitate to take a look at the specs files or the source code which should contains example in comments. Your IDE code completion should help too.

### basics
#### useStore:
Use it like a useState react hook, it will return the current state of the store and a method to change it's value:
```ts
const [state, setState] = useStore(myStore)

```
#### useReducer:
It returns a dispatch method that can be used to trigger reducer action on the given store
```ts
const counterReducer = (state, action) => {
	switch(action.type) {
		case 'increment': return {count:state.count+1}
		case 'decrement': return {count:state.count-1}
		default: throw new Error('unknown action')
	}
}
const countStore = createStore({count:0})
const dispatch = useReducer(countStore, counterReducer)
dispatch({type:'increment'})

```

### bindAttribute:
Allow you to make a 2 way data binding between a store<string> or a scopedStore<string> to an HTMLElement attribute
```ts
const myStore = createStore({userId:1, username: "malko"})
const unbind = bindAttribute(myStore.getScopeStore('userId'), myDivElement, 'data-userid')
myStore.set((s) => {...s, userId:2})
console.log(myDivElement.getAttribute('data-userid')) // 2
myDivElement.setAttribute('data-userid', 3)
console.log(myStore.get().userId) // 3
unbind() // stop sync
```

### bindInput:
Allow you to make a 2 way data binding between a store and an HTMLInputElement (or
HTMLSelectElement, HTMLTextAreaElement)
```ts
const unbind = bindInput(myStore.getScopeStore('name'), inputElement)
// whenever inputElement trigger a change event the store is updated
// if store is set to a new value then inputElement will reflect that value.
```

### bindStorage:
Can restore state from given storage (sessionStorage or localStorage) and sync storage when store state changes.
```ts
const settingsStore = createStore({darkmode:0, animate: 1})
const unbind = bindStorage(store, {key:"settings", storage: localStorage})
// will restore value from localStorage unless options restore is set to false
// now any change to userSettings will be stored in localStorage for future usage

// if you run twice this code first time it will be {darkMode:0, animate: 1}
// and it will be {darkmode:1, animate: 1} on second run.
console.log(store.get())
settingsStore.set({darkmode:1, animate:1})

```

### historize:
Returns a StoreHistoryAPI that will allow you to implement undo/redo easily.
```ts
const myStore = createStore('init')
const historyApi = historize(myStore, {maxSize:100})
console.log(historyApi.state) // 'init'
historyApi.pushState("step 1") // store.set("step 1) will do the same
console.log(historyApi.state) // 'step 1'
console.log(history.backLength) // 1
historyApi.back() // or alias historyApi.undo()
console.log(historyApi.state) // 'init'
console.log(history.backLength) // 0
console.log(history.forwardLength) // 1
historyApi.forward() // or alias historyApi.redo()
console.log(historyApi.state) // 'step 1'
```
You can save history for future restoration with ```const savePoint = historyApi.history```. To start with a saved history just pass it in the options of historize call like this: ```const historyApi = historize(myStore, {initHistory: savePoint, maxSize:100})```


### mutate:
This is inspired from immerjs and also provide a _produce_ method.
It allow you to use immerjs style recipes to modify a draft state directly.
Beware that it will only work for simple dataset, and is clearly not intended to
be used with more complex types. But it really comes in handy in most cases.
For more complex usage you should probably fallback to store.set method instead.
```ts
const store = createStore({
	name: "John",
	age: 42,
	children: [
		{name:"Jack", age:18}
	]
})
mutate(store, (s) => {
	// change a prop directly
	s.name = "Jane"
	// add new ones
	s.pet = "cat"
	// even remove the prop
	delete s.age
	// work with nested props too
	s.children[0].age = 11
})
console.log(store.get()) // { name: 'Jane', pet: 'cat', children: [{ name: "Jack", age: 11 }] }

```

It comes with two simple recipes (not immerjs style recipe) removeProp and setProp that work like this:
```ts
// both of them can handle nested properties
removeProp(myStore, "age")
setProp(myStore, "name", "john")
```

## third party recipe
Want your own recipe to appear here, open a merge request on this file with a link to your extension repository.


## Recipe authoring
TstoREx recipes are only functions that take a store as first parameter and do something with it. It's easy to imagine new use cases and to make a new recipe from it. In order to better understand how this work you can just take a look at existing recipes. Feel free to contact me directly if you want more guidance on how to write one, or simply to discuss about one you would want to make.