const { normalize } = require('normalizr');

function isPromise(obj) {
  return obj && typeof obj.then === 'function';
}

function handlePromise(dispatch, action) {
  const { type, payload, meta } = action;
  const { schema } = (meta || {});

  // TODO: in dev, check if schema is actually a schema

  dispatch({
    type,
    payload: null,
    start: true,
    meta: {
      ...meta,
    },
  });

  const success = data => {
    let extraMeta = schema ? normalize(data, schema) : {};
    dispatch({
      type,
      payload: data,
      success: true,
      meta: {
        ...meta,
        ...extraMeta,
      },
    });
  };

  const failure = error => {
    dispatch({
      type,
      payload: error,
      error: true,
      meta: {
        ...meta,
      },
    });
  };

  // return the promise. In this case, when users dispatch an action with a promsie
  // payload, they can `.then` it, since it will return a promise.
  return payload.then(success, failure);
}

const middleware = store => next => action => {
  if (isPromise(action.payload)) {
    return handlePromise(store.dispatch, action);
  }

  return next(action);
};


module.exports = middleware;
