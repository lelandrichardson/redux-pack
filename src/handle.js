const VALID_KEYS = {
  start: true,
  success: true,
  fail: true,
  finish: true,
};

function verifyHandlers(handlers, action) {
  Object.keys(handlers).forEach(key => {
    if (!VALID_KEYS[key]) {
      throw new Error(
        `The handler for action ${action.type} had a ${key} property defined, but this is not ` +
        `a valid key for a redux-pack handler. Valid keys are: ${Object.keys(VALID_KEYS)}`
      );
    }
  })
}

function safeMap(state, fn, action, name) {
  switch (typeof fn) {
    case 'function':
      const result = fn(state);
      if (result === undefined) {
        throw new Error(
          `The ${name} handler for action ${action.type} is expected to return a new state object.`
        );
      }
      return result;
    case 'undefined':
      return state;
    default:
      // if we've dropped into this case, we've got a problem. Someone is setting
      // things on the handler object they aren't supposed to.
      throw new Error(
        `The ${name} handler for action ${action.type} is expected to be a function, ` +
        `but found ${typeof fn} instead.`
      );
  }
}

function handle(action, startingState, handlers) {
  // TODO: validate in dev only
  verifyHandlers(handlers, action);

  let state = startingState;
  if (action.start === true) {
    state = safeMap(state, handlers.start, action, 'start');
  }
  if (action.success === true) {
    state = safeMap(state, handlers.success, action, 'success');
    state = safeMap(state, handlers.finish, action, 'finish');
  }
  if (action.error === true) {
    state = safeMap(state, handlers.fail, action, 'fail');
    state = safeMap(state, handlers.finish, action, 'finish');
  }
  state = safeMap(state, handlers.always, action, 'always');
  return state;
}


module.exports = handle;
