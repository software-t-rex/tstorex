# TstoREx

An agnostic, small, dependence free, state management library

This is a really simple store implementation you can use with vanilla-js or with any frontend framework like react.
It is written in typescript and should be type safe, you will have full code completion when working with it if your IDE supports it.

## Features
* Immutability of states (can be turned off if you really want it).
* Observability, so you can listen to any change in the store.
* Scoping:
    * Access to a subset of the store using dot notation (store.getScopeStore("my.nested.property")).
    * Add listeners for changes that occur on that scope only.
    * Get/set directly to that scope without remembering the full path of the scope.
* Extensible, we provide some official recipes to extend the usage of the store, and you can write your own.
* Small, the store itself is about 1kB gziped, while official recipes is less than 2.5kB.

## Install

### From CDN
The easiest way to try and get started with TstoREx is simply by using a good old script tag within your html page, using CDN.

with [jsdelivr](https://www.jsdelivr.com/): 

	- main file: https://cdn.jsdelivr.net/npm/@t-rex.software/tstorex[@version]/index.js
	- official recipes: https://cdn.jsdelivr.net/npm/@t-rex.software/tstorex[@version]/recipes.js
	- [@version] can be omit, @latest or a fixed version ie: v0.0.1

with [unpkg](https://unpkg.com/):

	- https://unpkg.com/@t-rex.software/tstorex[@version]/index.js
	- https://unpkg.com/@t-rex.software/tstorex[@version]/recipes.js
	- [@version] should be replaced with a fixed version ie: 0.0.1

In both case you can also download d.ts files by replacing the file extension.


```html
<!-- import as an esm module  -->
<script type="module">
 	import {createStore} from "https://unpkg.com/@t-rex.software/tstorex/index.js"
	// you can also load pre-made official recipes this way
	import { bindInput } from "https://unpkg.com/@t-rex.software/tstorex/recipes.js"
	const store = createStore()
</script>
```

### From npm
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

Or use a ScopeInitializer function: 
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

### Options

The ```createStore``` function can take a second options parameter. They are there to use TstoREx in specific situations, which most users should not encounter in normal use. But they can come in handy rare occasions so here they are:

#### noFreeze
By default state in store are made immutable (deeply frozen), unless this options is set to true.
You should not need to set this option to true, unless you have a very specific use case.

It can be useful to use this options if you're dealing with big objects and are looking to boost performance by not freezing objects. In such case, our recommendation is to keep it false at least in development mode, to ensure your usage of the store don't break immutability. 

#### noStrictEqual
Setting a store to a strictly equal state (===) won't do anything and will just be ignored, so it won't trigger any change listener.
Passing noStrictEqual option to true will throw an error if you try to set to the current state to itself, unless it's a primitive value.

This won't affect the behavior of ScopedStore (which will always trigger change listeners).

This can be helpful in development if you want to be sure you don't call set when it's useless.

#### noWarn
If you initialize a store with a state that is not a plain object, array or primitive value,
TstoREx will complain about it. You can set this option to true to disable this warning.

The only purpose of this is to allow you to deal with non plain objects, like class instances.
This is not the intended use for TstoREx and you need to be really careful about the way you use the store and the object stored in it. This option allow you to bypass the check and assume that you know what you are doing.

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
The subscribe method can take an options parameter like this: 
```ts
const unsubscribe = myStore.subscribe(changeListener, {
	// only interested on change if fullName is not the same
	equalityCheck: (newState, oldState) => newState.fullName === oldState.fullName,
	// set initCall to true will issue a first call at subscription time where new and old state will be the same
	// this is sometimes usefull to init a side effect and listen for changes in the future.
	initCall: true
})
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
Working on a subset of a store will ease performance optimisation in react by avoiding too many re-renders.
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
const unsubscribe = mumAgeStore.subscribe((newAge, oldAge) => console.log(`Mum age changed from ${oldAge} to ${newAge}`))
```
## Recipes 
We wanted TstoREx to be easily extensible for common use cases, and we come with some pre-made recipes to help you integrate TstoREx to your application. you can find more information on the [Official Recipes page](./src/recipes/README.md).

You will find the following pre-made recipes:
* useStore: retrieve a snapshot and a setter in a react useState style,
* useReducer: easily reuse existing redux-like reducers.
* bindAttribute and bindInput: easy two way data binding
* historize: help you implement undo/redo features
* mutate: modify your state as if it was a mutable object, re-use immerjs style recipes.
* bindStyleProp, bindStyleProps, bindClassName: allow to easily update element styles properties from store values

## Side notes
- In order to benefits correct typing detection your tsconfig.json compilerOptions.moduleResolution should be set to "node16" or "nodenext".


## Contributing
Contributions are welcome, but please make small independent commits when you contribute, it makes the review process a lot easier for me.

## Funding / Sponsorship
If you like my work, and find it useful to you or your company, you can sponsors my work here: [become sponsors to the project](https://github.com/sponsors/malko).
