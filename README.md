# Redux Pack

Sensible promise handling and middleware for redux

`redux-pack` is a library that introduces promise-based middleware that allows async actions based on the lifecycle of a promise to be declarative.

Async actions in redux are often done using `redux-thunk` or other middlewares. The problem with this approach is that it makes it too easy to use `dispatch` sequentially, and dispatch multiple "actions" as the result of the same interaction/event, where they probably should have just been a single action dispatch.

This can be problematic because we are treating several dispatches as all part of a single transaction, but in reality, each dispatch causes a separate rerender of the entire component tree, where we not only pay a huge performance penalty, but also risk the redux store being in an inconsistent state.

`redux-pack` helps prevent us from making these mistakes, as it doesn't give us the power of a `dispatch` function, but allows us to do all of the things we were doing before.

To give you some more context into the changes, here are some examples/information about the old way and new way of doing things below:

Ready to use it? Jump straight to the [How-To and API doc](#how-to)

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
      return {
        ...state,
        isLoading: true,
        fooError: null
      };
    case LOAD_FOO_SUCCESS:
      return {
        ...state,
        isLoading: false,
        foo: payload
      };
    case LOAD_FOO_FAILED:
      return {
        ...state,
        isLoading: false,
        fooError: payload
      };
    default:
      return state;
  }
}
```


**Note:** The example uses `{ ...state }` syntax that is called [Object rest spread properties](https://github.com/sebmarkbage/ecmascript-rest-spread). If you'd prefer the API of [Immutable.js](https://facebook.github.io/immutable-js/), you could write code like the following:

```js
switch (type) {
  case LOAD_FOO_STARTED:
    return state
      .set('isLoading', true)
      .set('fooError', null);
  case LOAD_FOO_SUCCESS:
    // ...
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
    case LOAD_FOO:
      return handle(state, action, {
        start: prevState => ({
          ...prevState,
          isLoading: true,
          fooError: null
        }),
        finish: prevState => ({ ...prevState, isLoading: false }),
        failure: prevState => ({ ...prevState, fooError: payload }),
        success: prevState => ({ ...prevState, foo: payload }),
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

## How to


### Install

The first step is to add `redux-pack` in your project

```sh
npm install -S redux-pack

# or

yarn add redux-pack
```

### Setup the middleware

The `redux-pack` middleware is the heart of `redux-pack`. As the following example shows, it installs like most middlewares:

```js
import { createStore, applyMiddleware } from 'redux'
import { middleware as reduxPackMiddleware } from 'redux-pack'
import thunk from 'redux-thunk'
import createLogger from 'redux-logger'
import rootReducer from './reducer'

const logger = createLogger()
const store = createStore(
  rootReducer,
  applyMiddleware(thunk, reduxPackMiddleware, logger)
)
```

_Note that it should probably be one of the first middleware to run, here it would run just after `thunk` and before `logger`._

### Using the `handle()` helper

Let's start with the function signature: `handle(state, action, handlers) → newState`

As you can see, it takes 3 arguments:

1. state: the current state in your reducer
2. action: the action that should be handled
3. handlers: a object mapping the promise lifecycle steps to reducer functions
  * the steps names are: `start`, `finish`, `failure`, `success` and `always`
  * every handler function should be of the form: `state => state`

Here is a minimalist example:

```js
import { handle } from 'redux-pack';
import { getFoo } from '../api/foo';

const LOAD_FOO = 'LOAD_FOO';
const initialState = {
  isLoading: false,
  error: null,
  foo: null,
};

export function fooReducer(state = initialState, action) {
  const { type, payload } = action;
  switch (type) {
    case LOAD_FOO:
      return handle(state, action, {
        start: prevState => ({ ...prevState, isLoading: true, error: null, foo: null }),
        finish: prevState => ({ ...prevState, isLoading: false }),
        failure: prevState => ({ ...prevState, error: payload }),
        success: prevState => ({ ...prevState, foo: payload }),
        always: prevState => prevState, // unnecessary, for the sake of example
      });
    default:
      return state;
  }
}

export function loadFoo() {
  return {
    type: LOAD_FOO,
    promise: getFoo(),
  }
}
```

**Note:** The example uses `{ ...state }` syntax that is called [Object rest spread properties](https://github.com/sebmarkbage/ecmascript-rest-spread).

### Adding side-effects with event hooks

You might want to add side effects (like sending analytics events or navigate to different views) based on promise results.

`redux-pack` lets you do that through event hooks functions. These are functions attached to the `meta` attribute of the original action. They are called with two parameters:

1. the matching step payload (varies based on the step, details below)
2. the `getState` function

Here are the available hooks and their associated payload:

* `onStart`, called with the initial action `payload` value
* `onFinish`, called with `true` if the promise resolved, `false` otherwise
* `onSuccess`, called with the promise resolution value
* `onFailure`, called with the promise error

Here is an example usage to send analytics event when the user `doesFoo`:

```js
import { sendAnalytics } from '../analytics';
import { doFoo } from '../api/foo';

export function userDoesFoo() {
  return {
    type: DO_FOO,
    promise: doFoo(),
    meta: {
      onSuccess: (result, getState) => {
        const userId = getState().currentUser.id;
        const fooId = result.id;
        sendAnalytics('USER_DID_FOO', {
          userId,
          fooId,
        });
      }
    }
  }
}
```



### Testing

At the moment, testing reducers and action creators with `redux-pack` does 
require understanding a little bit about its implementation. The `handle`
method uses a special `KEY.LIFECICLE` property on the `meta` object on the
action that denotes the lifecycle of the promise being handled.

Right now it is suggested to make a simple helper method to make testing
easier. Simple test code might look something like this:

```js
import { LIFECYCLE, KEY } from 'redux-pack';
import FooReducer from '../path/to/FooReducer';

// this utility method will make an action that redux pack understands
function makePackAction(lifecycle, { type, payload, meta={} }) {
  return {
    type,
    payload,
    meta: {
      ...meta,
      [KEY.LIFECYCLE]: lifecycle,
    },
  }
}

// your test code would then look something like...
const initialState = { ... };
const expectedEndState = { ... };
const action = makePackAction(LIFECYCLE.START, { type: 'FOO', payload: { ... } });
const endState = FooReducer(initialState, action);
assertDeepEqual(endState, expectedEndState);
```
