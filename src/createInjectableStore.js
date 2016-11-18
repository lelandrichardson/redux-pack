const { createStore, combineReducers } = require('redux');

const FAKE_INITIAL_REDUCER_NAMESPACE = '___FAKE_REDUCER_NAMESPACE___';
const IDENTITY_REDUCER = (state = null) => state;

const createInjectableStore = (preloadedState, enhancer) => {

  const reducers = {
    // putting this here because `combineReducers` will complain if there isn't at least
    // one reducer initially.
    [FAKE_INITIAL_REDUCER_NAMESPACE]: IDENTITY_REDUCER,
  };
  const store = createStore(combineReducers(reducers, preloadedState, enhancer));

  const inject = (namespace, reducer) => {
    if (reducers[namespace]) {
      throw new Error(
        `Attempting to register a reducer for namespace '${namespace} more than once.`
      );
    }
    if (reducers[FAKE_INITIAL_REDUCER_NAMESPACE]) {
      // since we have a reducer now, we can go ahead and get rid of this reducer
      delete reducers[FAKE_INITIAL_REDUCER_NAMESPACE];
    }
    reducers[namespace] = reducer;
    store.replaceReducer(combineReducers(reducers));
  };

  return {
    ...store,
    inject,
  };
};

module.exports = createInjectableStore;
