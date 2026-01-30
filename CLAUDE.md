# CLAUDE.md - AI Assistant Guide for redux-pack

## Project Overview

redux-pack is a Redux middleware library that provides promise-based async action handling. It simplifies async actions by allowing developers to dispatch a single action with a `promise` property, automatically handling the lifecycle states (start, success, failure) without manual dispatch calls.

**Key Benefits:**
- Single action type instead of multiple (e.g., `LOAD_FOO` vs `LOAD_FOO_STARTED/SUCCESS/FAILED`)
- Prevents anti-pattern of multiple sequential dispatches
- Built-in lifecycle handling via the `handle()` reducer helper
- Event hooks for side effects (`onStart`, `onSuccess`, `onFailure`, `onFinish`)

## Repository Structure

```
redux-pack/
├── src/                    # Source code (ES6)
│   ├── index.js           # Main entry - exports middleware, handle, KEY, LIFECYCLE
│   ├── middleware.js      # Redux middleware that intercepts promise actions
│   ├── handle.js          # Reducer helper for handling lifecycle states
│   └── constants.js       # KEY and LIFECYCLE constants
├── lib/                    # Built output (gitignored, created by babel)
├── .eslintrc              # ESLint config (extends airbnb)
├── .babelrc               # Babel config (react-native preset)
└── package.json           # Project config
```

## Development Commands

```bash
npm run lint      # Run ESLint (this is what `npm test` runs)
npm run build     # Transpile src/ to lib/ using Babel
npm run prepublish # Runs build before npm publish
```

**Note:** The test script only runs linting. There are no unit tests in this repository.

## Code Architecture

### Main Exports (`src/index.js`)
- `middleware` - Redux middleware to apply with `applyMiddleware()`
- `handle(state, action, handlers)` - Reducer helper function
- `KEY` - Object with `LIFECYCLE` and `TRANSACTION` property keys
- `LIFECYCLE` - Object with `START`, `SUCCESS`, `FAILURE` constants

### Middleware (`src/middleware.js`)
The middleware intercepts actions with a `promise` property and:
1. Dispatches an action with `LIFECYCLE.START` on the meta object
2. Waits for promise resolution/rejection
3. Dispatches `LIFECYCLE.SUCCESS` or `LIFECYCLE.FAILURE` accordingly
4. Calls event hooks (`onStart`, `onSuccess`, `onFailure`, `onFinish`) from action's meta
5. Includes a unique `transactionId` (UUID) for tracking related dispatches

### Handle Helper (`src/handle.js`)
Reducer utility that maps lifecycle states to handler functions:
- `start` - Called on `LIFECYCLE.START`
- `success` - Called on `LIFECYCLE.SUCCESS`
- `failure` - Called on `LIFECYCLE.FAILURE`
- `finish` - Called on both success and failure
- `always` - Called for all lifecycle states

Handlers receive `(state, action)` and must return new state.

## Code Conventions

### JavaScript Style
- ES6 syntax with Babel transpilation
- Airbnb ESLint configuration with custom rules:
  - `no-console: 0` - Console allowed (removed in build)
  - `arrow-parens: 0` - Disabled for Flow compatibility
  - `prefer-object-spread` - Required (plugin)
- Module pattern: CommonJS exports (`module.exports`)
- Imports: ES6 import syntax

### Action Structure
Actions dispatched through redux-pack follow this shape:
```javascript
{
  type: 'ACTION_TYPE',
  promise: Promise,           // Required for async handling
  payload: any,               // Optional initial payload
  meta: {                     // Optional
    onStart: (payload, getState) => {},
    onSuccess: (result, getState) => {},
    onFailure: (error, getState) => {},
    onFinish: (success, getState) => {},
  }
}
```

### Internal Action Meta Keys
- `meta['redux-pack/LIFECYCLE']` - Current lifecycle state
- `meta['redux-pack/TRANSACTION']` - UUID for tracking action lifecycle
- `meta.startPayload` - Original payload preserved in success/failure actions

## Testing Patterns

When testing reducers with redux-pack actions, create test helpers:
```javascript
import { LIFECYCLE, KEY } from 'redux-pack';

function makePackAction(lifecycle, { type, payload, meta = {} }) {
  return {
    type,
    payload,
    meta: { ...meta, [KEY.LIFECYCLE]: lifecycle },
  };
}

// Usage:
const action = makePackAction(LIFECYCLE.START, { type: 'FOO', payload: data });
```

## Dependencies

**Runtime:**
- `deline` - Template string formatting
- `invariant` - Development assertions
- `uuid` - Transaction ID generation

**Peer:**
- `redux` - Any version

## CI/CD

- Travis CI for Node.js 6
- Script runs `npm test` (linting only)

## Important Notes for AI Assistants

1. **No unit tests exist** - Only linting is performed. Any test additions would need a test framework setup.
2. **Build output is gitignored** - The `lib/` directory is generated, don't commit it.
3. **Invariant checks** - Development-only assertions via `invariant()` - these throw in dev but are stripped in production builds.
4. **Event hooks are try/caught** - Errors in `meta.onSuccess` etc. are logged but don't break dispatch flow.
5. **Null actions are allowed** - Middleware returns null for null actions (thunk-like conditional dispatch pattern).
