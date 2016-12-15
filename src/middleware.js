import { KEY, LIFECYCLE } from './constants';

let i = 0;

const uuid = () => {
  i += 1;
  return `.p${i}`;
};

function isPromise(obj) {
  return !!obj && typeof obj.then === 'function';
}

function handleEventHook(meta, hook, ...args) {
  if (meta && meta[hook] && typeof meta[hook] === 'function') {
    // we want to make sure that an "eventHook" doesn't cause a dispatch to fail, so we wrap it
    // with a try..catch. In dev, we `console.error` which will result in a redbox.
    try {
      meta[hook](...args);
    } catch (e) {
      console.error(e);
    }
  }
}

function removePromiseFromMeta(originalMeta) {
  if (!originalMeta) return undefined;
  // eslint-disable-next-line no-unused-vars
  const { promise, ...meta } = originalMeta;
  return meta;
}

function handlePromise(dispatch, getState, action, promise) {
  const { type, payload, meta } = action;
  const metaWithoutPromise = removePromiseFromMeta(meta);
  // it is sometimes useful to be able to track the actions and associated promise lifecycle with a
  // sort of unique identifier. This is that.
  const transactionId = uuid();
  const startPayload = payload;

  dispatch({
    type,
    payload,
    meta: {
      ...metaWithoutPromise,
      [KEY.LIFECYCLE]: LIFECYCLE.START,
      [KEY.TRANSACTION]: transactionId,
    },
  });
  handleEventHook(meta, 'onStart', payload, getState);

  const success = data => {
    dispatch({
      type,
      payload: data,
      meta: {
        ...metaWithoutPromise,
        startPayload,
        [KEY.LIFECYCLE]: LIFECYCLE.SUCCESS,
        [KEY.TRANSACTION]: transactionId,
      },
    });
    handleEventHook(metaWithoutPromise, 'onSuccess', data, getState);
    handleEventHook(metaWithoutPromise, 'onFinish', true, getState);
  };

  const failure = error => {
    dispatch({
      type,
      payload: error,
      error: true,
      meta: {
        ...metaWithoutPromise,
        startPayload,
        [KEY.LIFECYCLE]: LIFECYCLE.FAILURE,
        [KEY.TRANSACTION]: transactionId,
      },
    });
    handleEventHook(metaWithoutPromise, 'onFailure', error, getState);
    handleEventHook(metaWithoutPromise, 'onFinish', false, getState);
  };

  // return the promise. In this case, when users dispatch an action with a promise
  // payload, they can `.then` it, since it will return a promise.
  // NOTE(lmr):
  // it's debatable whether or not we want `.then(success, failure)`
  // versus `.then(success).catch(failure)`
  return promise.then(success, failure);
}

const middleware = store => next => action => {
  // a common use case for redux-thunk is to conditionally dispatch an action. By allowing for null,
  // we satisfy this use case without people having to use redux-thunk.
  if (action == null) {
    return null;
  }

  // this is the convention-based promise middleware. Ideally, all "async actions" would go through
  // this pathway.

  const promise = (action.meta && action.meta.promise) || action.promise;
  if (isPromise(promise)) {
    return handlePromise(store.dispatch, store.getState, action, promise);
  }

  // this is the "vanilla redux" pathway. These are plain old actions that will get sent to reducers
  return next(action);
};


module.exports = middleware;
