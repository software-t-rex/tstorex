import { NextState, StoreInterface } from "../type"

interface TypeAction { type: string, [k:string]:any }
interface Reducer<TypeState> { (state: TypeState, action: TypeAction): TypeState }

/**
 * useStore allow to get and set the state from a store in a react hook fashion.
 * Usage:
 * ```ts
 * const store = createStore({name: "John Doe", age: 42})
 * const [state, setState] = useStore(store)
 * const [name, setName] = useStore(store.getScopeStore("name"))
 * ```
 */
export const useStore = <T>({get, set}:StoreInterface<T>) => [get(), set] as [T, (nextState: NextState<T>) => void]

/**
 * allow to return a dispatch method to dispatch action to a given Reducer.
 * Usage:
 * ```ts
 * const store = createStore({name: "John Doe", age: 42})
 * const reducer = (state, action) => { switch(action.type) {
 * 	case "GROW": return {...state, age:state.age+1} } ;
 * 	default: throw new Error("Unknown action type")
 * }
 * const dispatch = useReducer(store, reducere)
 * dispatch({type:"GROW"})
 * ```
 */
export const useReducer = <T>(store: StoreInterface<T>, reducer: Reducer<T>) => (action: TypeAction) => store.set(reducer(store.get(), action))
