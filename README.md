# TstoREx

This is a really simple store implementation you can use with vanilla-js or with any frontend framework like react.
It is written in typescript and should be type safe, you will have full code completion when working with it if your IDE supports it.

## Features
* Immutability of states (can be turned off if you really want it).
* Observability, so you can listen to any change in the store.
* Scoping
    * Access to a subset of the store using dot notation (store.getScopeStore("my.nested.property"))
    * Add listeners for changes that occur on that scope only
    * Get/set directly to that scope without remembering the full path of the scope
* Extensible, we provide some official recipes to extend the usage of the store, and you can write your own

## Install
The easiest way to try and get started with TstoREx is simply by using a good old script tag within your html page, using CDN like jsdlivr or unpkg.

```html
<!-- import as an esm module  -->
<script type="module">
    // choose your prefered cdn 
	// jsdlivr: https://cdn.jsdelivr.net/npm/@t-rex.software/tstorex/index.js
	// or 
	// unpkg: https://unpkg.com/@t-rex.software/tstorex/index.js
    import {createStore} from "https://unpkg.com/@t-rex.software/tstorex/index.js"
	// you can also load pre-made official recipes this way
	import { bindInput } from "https://unpkg.com/@t-rex.software/tstorex/recipes.js"

</script>
```

You can either install it from your favorite package manager, this will allow tree checking for your build process.
```sh
# using npm
npm install @t-rex.software/tstorex
# or pnpm 
pnpm add @t-rex.software/tstorex
# or yarn
yarn add @t-rex.software/tstorex
```

## Create a store

To use it simply create a store like this: ```const myStore = createStore({fullname: 'John Doe', age: 18})`}```.

Or use an ScopeInitializer function: 
```ts
const myStoreInit = (get, set) => {
	return {
		fullname: 'John Doe',
		age: 18,
		setAge(age) { set(state => ({...state, age })) },
		setName(fullname) { set({...get(), fullname }) },
	}
}
const myStore = createStore(myStoreInit)
```

## Using the store

### Get a snapshot of the store state
```ts
const snapshot = myStore.get()
```

### Set a new state
You can set a new state by directly providing a new state
```ts
myStore.set({fullname:'John Doe', age:21})
```
Or use a functional approach. This is the preferred method if you don't want to forget some existing properties.
```ts
myStore.set((state) => {...state, age:21})
```

### Listen for changes
You can subscribe to store changes by using it's subscribe method
```ts
const changeListener = (newState, oldState) => { console.log("state changed") }
const unsubscribe = myStore.subscribe(changeListener)
// later stop listnening for change by calling unsubscribe()
```
### Stop using the store
The destroy method will unbound any listener previously attached to the store and reset the store value to null
> ⚠ warning: Any call to the store following destroy will throw an Error !
>
> You should discard any reference to the store or it's subset in your code after that.
```ts
myStore.destroy()
```
You can check a store destroyed state like this: ```myStore.isDestroyed()```

### Working with a scoped subset of a store
One nice feature of TstoREx is the ability to work seamlessly on a subset of a store.
Working on a subset of a store will ease performance optimisation in react by avoiding too many rerenders.
This is possible due to the fact that scoped store will only listen for change inside their scope not the whole store.
```ts
const myStore = createStore({mum: {name: 'Jane', age: 24}, dad: {name: 'John', age: 25}})
const mumStore = myStore.getScopeStore('mum') //<-- you will have completion for path too
const dadNameStore = myStore.getScopeStore('dad.name')
```
Returned scoped store will provide the same interface than a normal store but no destroy method.
So you can even get a scope store from another one
```ts
const mumAgeStore = mumStore.getScopeStore('age')
```
## Recipes 
We wanted TstoREx to be easily extensible for common use cases, and we come with some pre-made recipes to help you integrate TstoREx to your application. you can find more information on the [Official Recipes page](./src/recipes/README.md).

You will find the following pre-made recipes:
* useStore: retrieve a snapshot and a setter in a react useState style,
* useReducer: easily reuse existing redux-like reducers.
* bindAttribute and bindInput: easy two way data binding
* historize: help you implement undo/redo features
* mutate: modify your state as if it was a mutable object, re-use immerjs style recipes.

## Side notes
- In order to benefits correct typing detection your tsconfig.json compilerOptions.moduleResolution should be set to "node16" or "nodenext".


## Contributing
Contributions are welcome, but please make small independent commits when you contribute, it makes the review process a lot easier for me.

## Funding / Sponsorship
If you like my work, and find it useful to you or your company, you can sponsors my work here: [become sponsors to the project](https://github.com/sponsors/malko).
