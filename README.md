# Redux Pack

Sensible promise handling and middleware for redux

`redux-pack` is a library that introduces promise-based middleware that allows async actions based on the lifecycle of a promise to be declarative.

Async actions in redux are often done using `redux-thunk` or other middlewares. The problem with this approach is that it makes it too easy to use `dispatch` sequentially, and dispatch multiple "actions" as the result of the same interaction/event, where they probably should have just been a single action dispatch.

This can be problematic because we are treating several dispatches as all part of a single transaction, but in reality, each dispatch causes a separate rerender of the entire component tree, where we not only pay a huge performance penalty, but also risk the redux store being in an inconsistent state.

`redux-pack` helps prevent us from making these mistakes, as it doesn't give us the power of a `dispatch` function, but allows us to do all of the things we were doing before.

To give you some more context into the changes, Here are some examples/information about the old way and new way of doing things below:

### Data Fetching with redux-thunk (old way)

Before this change, you would create individual action constants for each lifecycle of the promise, and use `redux-thunk` to dispatch before the promise, and when it resolves/rejects.
```js
// types.js
export const LOAD_FOO_STARTED = 'LOAD_FOO_STARTED';
export const LOAD_FOO_SUCCESS = 'LOAD_FOO_SUCCESS';
export const LOAD_FOO_FAILED = 'LOAD_FOO_FAILED';
```
```js
// actions.js
export function loadFoo(id) {
  return dispatch => {
    dispatch({ type: LOAD_FOO_STARTED, payload: id });
    return Api.getFoo(id).then(foo => {
      dispatch({ type: LOAD_FOO_SUCCESS, payload: foo });
    }).catch(error => {
      dispatch({ type: LOAD_FOO_FAILED, error: true, payload: error });
    });
  };
}
```

In the reducer, you would handle each action individually in your reducer:
```js
// reducer.js
export function fooReducer(state = initialState, action) {
  const { type, payload } = action;
  switch (type) {
    case LOAD_FOO_STARTED:
      return state
        .set('isLoading', true)
        .set('fooError', null);
    case LOAD_FOO_SUCCESS:
      return state
        .set('isLoading', false)
        .set('foo', payload);
    case LOAD_FOO_FAILED:
      return state
        .set('isLoading', false)
        .set('fooError', payload);
    default:
      return state;
  }
}
```


### Data fetching with redux-pack (new way)

With redux-pack, we only need to define a single action constant for the entire promise lifecycle, and then return the promise directly with a `promise` namespace specified:

```js
// types.js
export const LOAD_FOO = 'LOAD_FOO';
```
```js
// actions.js
export function loadFoo(id) {
  return {
    type: LOAD_FOO,
    promise: Api.getFoo(id),
  };
}
```

In the reducer, you handle the action with redux-pack's `handle` function, where you can specify several smaller "reducer" functions for each lifecycle. `finish` is called for both resolving/rejecting, `start` is called at the beginning, `success` is called on resolve, `failure` is called on reject, and `always` is called for all of them.
```js
// reducer.js
import { handle } from 'redux-pack';

export function fooReducer(state = initialState, action) {
  const { type, payload } = action;
  switch (type) {
    case LOAD_FOO: return handle(state, action, {
      start: s => s
        .set('isLoading', true)
        .set('fooError', null),
      finish: s => s.set('isLoading', false),
      failure: s => s.set('fooError', payload),
      success: s => s.set('foo', payload),
    });
    default:
      return state;
  }
}
```


### Logging (before/after)

Often times we want to log whether an action succeeded or not etc. We are able to handle this now using the `onSuccess` or `onFailure` meta options:

**Before:**

```js
// actions.js
export function loadFoo(id) {
  return dispatch => {
    dispatch(loadFooStart());
    Api.getFoo(id).then(response => {
      dispatch(loadFooSucceeded(response);
      logSuccess(response);
    }).catch(error => dispatch(loadFooFailed(error)));
  };
}
```

**After:**

```js
// actions.js
export function loadFoo(id) {
  return {
    type: LOAD_FOO,
    promise: Api.getFoo(id),
    meta: {
      onSuccess: (response) => logSuccess(response)
    },
  };
}
```
