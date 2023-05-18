import { PathProp, PathValue } from "../types/Paths"

export type NextState<TypeState> = TypeState | ((state:TypeState)=>TypeState)
export type StoreInitializer<TypeState> = ( get: ()=>TypeState, set: (nextState: NextState<TypeState>)=>void ) => TypeState
export type changeListener<TypeState> = (newState: TypeState, oldState?: TypeState) => void
export interface Store<TypeState> {
	/** get snapshot state */
	get: () => TypeState
	/** set a new state into the store */
	set: (nextState: NextState<TypeState>) => void
	/** bind a listener which will be call on any change on state in store */
	subscribe: (listener: changeListener<TypeState>) => () => void
	/** return a child store scoped to only a part of the initial state and with no destroy method */
	getScopeStore?: <Key extends PathProp<TypeState>>(propName: Key) => Store<PathValue<TypeState, Key>>
	/** unbind all listener bound to the store and reset state value to null */
	destroy?: () => void
    isDestroyed: () => boolean
}
export interface TranferableScope<TypeState> extends Omit<Store<TypeState>, 'destroy' | 'getScopeStore'>{}