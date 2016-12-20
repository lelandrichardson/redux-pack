import deline from 'deline';
import invariant from 'invariant';
import { KEY, LIFECYCLE } from './constants';

const VALID_KEYS = {
  start: true,
  success: true,
  failure: true,
  finish: true,
  always: true,
};

function verifyHandlers(handlers, action) {
  Object.keys(handlers).forEach(key => {
    invariant(VALID_KEYS[key], deline`
      The handler for action ${action.type} had a ${key} property defined, but this is not 
      a valid key for a redux-pack handler. Valid keys are: ${Object.keys(VALID_KEYS)}
    `);
  });
}

function safeMap(state, fn, action, name) {
  switch (typeof fn) {
    case 'function': {
      const result = fn(state, action);
      invariant(result !== undefined, deline`
        The ${name} handler for action ${action.type} is expected to return a new state object.
      `);
      return result;
    }
    case 'undefined':
      return state;
    default:
      // if we've dropped into this case, we've got a problem. Someone is setting
      // things on the handler object they aren't supposed to.
      invariant(false, deline`
        The ${name} handler for action ${action.type} is expected to be a function, 
        but found ${typeof fn} instead.
      `);
      return state;
  }
}

function handle(startingState, action, handlers) {
  if (process.env.NODE_ENV === 'development') {
    verifyHandlers(handlers, action);
  }
  const { meta } = action;
  const lifecycle = meta ? meta[KEY.LIFECYCLE] : null;

  if (lifecycle == null) {
    invariant(false, deline`
      You used redux-pack's \`handle(...)\` function on the action ${action.type}, however, it
      doesn't appear to be an action that was dispatched by redux-pack. This is likely an error.
    `);
    return startingState;
  }

  let state = startingState;
  switch (lifecycle) {
    case LIFECYCLE.START:
      state = safeMap(state, handlers.start, action, 'start');
      break;
    case LIFECYCLE.SUCCESS:
      state = safeMap(state, handlers.success, action, 'success');
      state = safeMap(state, handlers.finish, action, 'finish');
      break;
    case LIFECYCLE.FAILURE:
      state = safeMap(state, handlers.failure, action, 'failure');
      state = safeMap(state, handlers.finish, action, 'finish');
      break;
    default:
      // do nothing
      break;
  }
  state = safeMap(state, handlers.always, action, 'always');
  return state;
}


module.exports = handle;
