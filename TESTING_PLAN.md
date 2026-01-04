# Redux-Pack Testing Plan

## Executive Summary

Redux-pack currently has **zero test coverage**. This plan outlines a comprehensive strategy to add thorough testing to the project, ensuring reliability, preventing regressions, and improving maintainability.

## Current State

- **Test Coverage**: 0%
- **Testing Framework**: None installed
- **Test Files**: 0
- **Test Script**: Only runs ESLint (no functional tests)
- **CI/CD**: Travis CI runs `npm test` (linting only)

## Objectives

1. Achieve >95% code coverage across all source files
2. Establish automated testing in CI/CD pipeline
3. Test all critical functionality and edge cases
4. Provide clear testing patterns for contributors
5. Ensure backward compatibility through comprehensive tests

---

## Phase 1: Testing Infrastructure Setup

### 1.1 Install Testing Dependencies

```bash
npm install --save-dev jest @types/jest
npm install --save-dev redux-mock-store
npm install --save-dev @babel/preset-env
```

**Why these tools?**
- **Jest**: Industry-standard, zero-config, built-in coverage, snapshot testing
- **redux-mock-store**: Purpose-built for testing Redux middleware
- **@babel/preset-env**: Ensures Jest can parse modern JavaScript

### 1.2 Configure Jest

Create `jest.config.js`:
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js', // Just exports, no logic
  ],
  coverageThresholds: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};
```

### 1.3 Update Babel Configuration

Update `.babelrc` to support Jest:
```json
{
  "presets": ["react-native"],
  "env": {
    "test": {
      "presets": [["@babel/preset-env", { "targets": { "node": "current" } }]]
    }
  }
}
```

### 1.4 Update package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "lint": "eslint ./",
    "validate": "npm run lint && npm run test:coverage"
  }
}
```

### 1.5 Update CI Configuration

Update `.travis.yml`:
```yaml
script:
  - npm run validate
after_success:
  - bash <(curl -s https://codecov.io/bash)  # Optional: for coverage reporting
```

---

## Phase 2: Test File Organization

```
src/
├── __tests__/
│   ├── middleware.test.js       # Middleware tests
│   ├── handle.test.js           # Handle function tests
│   ├── constants.test.js        # Constants tests
│   └── integration.test.js      # Full workflow tests
├── test-helpers/
│   ├── makePackAction.js        # Helper from README
│   └── mockStore.js             # Mock store setup
├── middleware.js
├── handle.js
├── constants.js
└── index.js
```

---

## Phase 3: Test Coverage by Module

### 3.1 Constants Tests (`constants.test.js`)

**Priority**: Low | **Complexity**: Simple | **Estimated Tests**: 5-8

Test coverage:
- ✅ `KEY.LIFECYCLE` has correct value
- ✅ `KEY.TRANSACTION` has correct value
- ✅ `LIFECYCLE.START` equals 'start'
- ✅ `LIFECYCLE.SUCCESS` equals 'success'
- ✅ `LIFECYCLE.FAILURE` equals 'failure'
- ✅ All keys are strings
- ✅ No duplicate values

**Sample Test Structure**:
```javascript
describe('constants', () => {
  describe('KEY', () => {
    it('should define LIFECYCLE key', () => {
      expect(KEY.LIFECYCLE).toBe('redux-pack/LIFECYCLE');
    });

    it('should define TRANSACTION key', () => {
      expect(KEY.TRANSACTION).toBe('redux-pack/TRANSACTION');
    });
  });

  describe('LIFECYCLE', () => {
    it('should define all lifecycle states', () => {
      expect(LIFECYCLE.START).toBe('start');
      expect(LIFECYCLE.SUCCESS).toBe('success');
      expect(LIFECYCLE.FAILURE).toBe('failure');
    });
  });
});
```

---

### 3.2 Middleware Tests (`middleware.test.js`)

**Priority**: CRITICAL | **Complexity**: High | **Estimated Tests**: 30-40

#### 3.2.1 Promise Detection Tests
- ✅ Detects native Promises
- ✅ Detects promise-like objects with `.then()`
- ✅ Rejects non-promise objects
- ✅ Handles null/undefined gracefully

#### 3.2.2 Promise Lifecycle Tests
- ✅ Dispatches START action when promise action received
- ✅ Dispatches SUCCESS action when promise resolves
- ✅ Dispatches FAILURE action when promise rejects
- ✅ Includes correct metadata in each lifecycle action
- ✅ Uses unique transaction IDs for each promise
- ✅ Passes through original action type
- ✅ Preserves action payload on SUCCESS
- ✅ Includes error in payload on FAILURE

#### 3.2.3 Non-Promise Action Tests
- ✅ Passes through non-promise actions unchanged
- ✅ Calls next middleware with original action
- ✅ Returns result from next middleware
- ✅ Handles actions without `promise` property

#### 3.2.4 Event Hook Tests
- ✅ Executes `onStart` hook when promise starts
- ✅ Executes `onSuccess` hook when promise resolves
- ✅ Executes `onFailure` hook when promise rejects
- ✅ Executes `onFinish` hook after success or failure
- ✅ Provides correct arguments to hooks (getState, dispatch, action)
- ✅ Handles missing hooks gracefully
- ✅ Continues execution if hook throws error
- ✅ Executes hooks in correct order

#### 3.2.5 Return Value Tests
- ✅ Returns the original promise
- ✅ Allows chaining with `.then()`
- ✅ Allows chaining with `.catch()`
- ✅ Preserves promise resolution value

#### 3.2.6 Edge Cases
- ✅ Handles null action
- ✅ Handles action without meta
- ✅ Handles simultaneous promises with different transaction IDs
- ✅ Handles promise that resolves immediately
- ✅ Handles promise that never resolves (timeout)
- ✅ Handles promise rejection with non-Error objects

**Sample Test Structure**:
```javascript
import configureStore from 'redux-mock-store';
import middleware from '../middleware';

const mockStore = configureStore([middleware]);

describe('middleware', () => {
  let store;

  beforeEach(() => {
    store = mockStore({});
  });

  describe('promise lifecycle', () => {
    it('should dispatch START, then SUCCESS for resolved promise', async () => {
      const promise = Promise.resolve('result');
      const action = {
        type: 'FETCH_USER',
        promise,
      };

      await store.dispatch(action);
      const actions = store.getActions();

      expect(actions).toHaveLength(2);
      expect(actions[0].meta['redux-pack/LIFECYCLE']).toBe('start');
      expect(actions[1].meta['redux-pack/LIFECYCLE']).toBe('success');
      expect(actions[1].payload).toBe('result');
    });

    it('should dispatch START, then FAILURE for rejected promise', async () => {
      const error = new Error('failed');
      const promise = Promise.reject(error);
      const action = {
        type: 'FETCH_USER',
        promise,
      };

      await store.dispatch(action).catch(() => {});
      const actions = store.getActions();

      expect(actions).toHaveLength(2);
      expect(actions[0].meta['redux-pack/LIFECYCLE']).toBe('start');
      expect(actions[1].meta['redux-pack/LIFECYCLE']).toBe('failure');
      expect(actions[1].payload).toBe(error);
    });
  });

  describe('event hooks', () => {
    it('should call onStart hook', async () => {
      const onStart = jest.fn();
      const promise = Promise.resolve();

      await store.dispatch({
        type: 'TEST',
        promise,
        meta: { onStart },
      });

      expect(onStart).toHaveBeenCalled();
    });
  });

  describe('non-promise actions', () => {
    it('should pass through actions without promise', () => {
      const action = { type: 'PLAIN_ACTION' };
      store.dispatch(action);

      expect(store.getActions()).toEqual([action]);
    });
  });
});
```

---

### 3.3 Handle Function Tests (`handle.test.js`)

**Priority**: CRITICAL | **Complexity**: Medium | **Estimated Tests**: 25-35

#### 3.3.1 Handler Validation Tests
- ✅ Accepts valid handler keys (start, success, failure, finish, always)
- ✅ Throws error for invalid handler keys (in development)
- ✅ Throws error for non-function handlers
- ✅ Validates handler return values (no undefined)

#### 3.3.2 Lifecycle Routing Tests
- ✅ Executes `start` handler for START lifecycle
- ✅ Executes `success` handler for SUCCESS lifecycle
- ✅ Executes `failure` handler for FAILURE lifecycle
- ✅ Executes `finish` handler after success
- ✅ Executes `finish` handler after failure
- ✅ Executes `always` handler for all lifecycles
- ✅ Ignores handlers when lifecycle doesn't match

#### 3.3.3 State Transformation Tests
- ✅ Passes starting state to handlers
- ✅ Returns new state from handler
- ✅ Passes action to handlers
- ✅ Chains state through multiple handlers
- ✅ Returns starting state when no handlers match

#### 3.3.4 Handler Execution Order Tests
- ✅ Executes handlers in order: lifecycle → finish → always
- ✅ Passes updated state between handlers
- ✅ Handles missing intermediate handlers

#### 3.3.5 Error Handling Tests
- ✅ Throws error when action missing lifecycle metadata
- ✅ Throws error when handler returns undefined (development)
- ✅ Provides helpful error messages
- ✅ Development vs production behavior

**Sample Test Structure**:
```javascript
import { handle } from '../handle';
import { KEY, LIFECYCLE } from '../constants';

describe('handle', () => {
  const makeAction = (lifecycle, payload) => ({
    type: 'TEST',
    payload,
    meta: {
      [KEY.LIFECYCLE]: lifecycle,
    },
  });

  describe('lifecycle routing', () => {
    it('should execute start handler for START lifecycle', () => {
      const state = { loading: false };
      const startHandler = jest.fn(() => ({ loading: true }));

      const newState = handle(state, makeAction(LIFECYCLE.START), {
        start: startHandler,
      });

      expect(startHandler).toHaveBeenCalledWith(state);
      expect(newState).toEqual({ loading: true });
    });

    it('should execute success and finish handlers for SUCCESS', () => {
      const state = { data: null, loading: true };
      const successHandler = jest.fn(s => ({ ...s, data: 'result' }));
      const finishHandler = jest.fn(s => ({ ...s, loading: false }));

      const newState = handle(state, makeAction(LIFECYCLE.SUCCESS, 'result'), {
        success: successHandler,
        finish: finishHandler,
      });

      expect(successHandler).toHaveBeenCalled();
      expect(finishHandler).toHaveBeenCalled();
      expect(newState).toEqual({ data: 'result', loading: false });
    });
  });

  describe('handler validation', () => {
    it('should throw error for invalid handler key', () => {
      expect(() => {
        handle({}, makeAction(LIFECYCLE.START), {
          invalid: () => {},
        });
      }).toThrow();
    });

    it('should throw error when handler returns undefined', () => {
      expect(() => {
        handle({}, makeAction(LIFECYCLE.START), {
          start: () => undefined,
        });
      }).toThrow();
    });
  });

  describe('error handling', () => {
    it('should throw error when action missing lifecycle metadata', () => {
      expect(() => {
        handle({}, { type: 'TEST' }, {});
      }).toThrow('redux-pack');
    });
  });
});
```

---

### 3.4 Integration Tests (`integration.test.js`)

**Priority**: HIGH | **Complexity**: High | **Estimated Tests**: 15-20

#### 3.4.1 Full Workflow Tests
- ✅ Complete middleware → reducer flow
- ✅ Multiple simultaneous promises
- ✅ Promise chaining with `.then()`
- ✅ Error propagation through promise chain
- ✅ Complex state transformations

#### 3.4.2 Real-World Scenarios
- ✅ API fetch with loading states
- ✅ Multiple dependent promises
- ✅ Optimistic updates with rollback on error
- ✅ Parallel promise execution
- ✅ Retry logic with promise

**Sample Test Structure**:
```javascript
import { createStore, applyMiddleware } from 'redux';
import middleware, { handle, LIFECYCLE } from '../index';

describe('integration tests', () => {
  it('should handle complete fetch workflow', async () => {
    const reducer = (state = { data: null, loading: false, error: null }, action) => {
      const { type } = action;

      if (type === 'FETCH_DATA') {
        return handle(state, action, {
          start: s => ({ ...s, loading: true, error: null }),
          success: s => ({ ...s, data: action.payload }),
          failure: s => ({ ...s, error: action.payload }),
          finish: s => ({ ...s, loading: false }),
        });
      }

      return state;
    };

    const store = createStore(reducer, applyMiddleware(middleware));

    // Dispatch promise action
    const promise = store.dispatch({
      type: 'FETCH_DATA',
      promise: Promise.resolve({ id: 1, name: 'Test' }),
    });

    // Should be loading
    expect(store.getState()).toEqual({
      data: null,
      loading: true,
      error: null,
    });

    // Wait for promise
    await promise;

    // Should have data
    expect(store.getState()).toEqual({
      data: { id: 1, name: 'Test' },
      loading: false,
      error: null,
    });
  });
});
```

---

## Phase 4: Test Helpers and Utilities

### 4.1 makePackAction Helper

Create `src/test-helpers/makePackAction.js`:
```javascript
import { KEY } from '../constants';

/**
 * Helper for creating redux-pack actions in tests
 * Based on README example
 */
export function makePackAction(lifecycle, { type, payload, meta = {} }) {
  return {
    type,
    payload,
    meta: {
      ...meta,
      [KEY.LIFECYCLE]: lifecycle,
    },
  };
}
```

### 4.2 Mock Store Helper

Create `src/test-helpers/mockStore.js`:
```javascript
import configureStore from 'redux-mock-store';
import middleware from '../middleware';

export function createMockStore(initialState = {}) {
  const mockStore = configureStore([middleware]);
  return mockStore(initialState);
}
```

---

## Phase 5: Coverage and Quality Metrics

### 5.1 Coverage Goals

| Module | Target Coverage | Priority |
|--------|----------------|----------|
| middleware.js | 100% | Critical |
| handle.js | 100% | Critical |
| constants.js | 100% | Low |
| Overall | >95% | - |

### 5.2 Quality Metrics

- **Test Execution Time**: <5 seconds for full suite
- **Test Isolation**: Each test should be independent
- **Test Clarity**: Descriptive test names following "should..." pattern
- **Mock Usage**: Minimal, only where necessary
- **Assertion Quality**: Specific assertions, avoid `toBeTruthy()`

### 5.3 Coverage Reporting

- Generate HTML coverage reports
- Add coverage badges to README
- Integrate with Codecov or Coveralls
- Fail CI if coverage drops below threshold

---

## Phase 6: Documentation and Maintenance

### 6.1 Testing Documentation

Add to README.md:
```markdown
## Development

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Writing Tests

This project uses Jest for testing. Test files are located in `src/__tests__/`.

To test reducers using redux-pack, use the `makePackAction` helper:

```javascript
import { makePackAction } from '../test-helpers/makePackAction';
import { LIFECYCLE } from '../constants';

const action = makePackAction(LIFECYCLE.SUCCESS, {
  type: 'FETCH_USER',
  payload: { id: 1, name: 'John' },
});
```
```

### 6.2 Contribution Guidelines

Update CONTRIBUTING.md (or create one):
```markdown
## Testing Requirements

All pull requests must:
- Include tests for new functionality
- Maintain or improve code coverage (>95%)
- Pass all existing tests
- Follow existing test patterns and conventions

Run `npm run validate` before submitting a PR.
```

### 6.3 Pre-commit Hooks (Optional)

Install husky and lint-staged:
```bash
npm install --save-dev husky lint-staged
```

Add to package.json:
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.js": ["eslint", "jest --bail --findRelatedTests"]
  }
}
```

---

## Phase 7: Implementation Timeline

### Sprint 1: Foundation (Days 1-2)
- ✅ Install testing dependencies
- ✅ Configure Jest and Babel
- ✅ Update package.json scripts
- ✅ Create test directory structure
- ✅ Write test helpers

### Sprint 2: Core Tests (Days 3-5)
- ✅ Write constants.test.js
- ✅ Write middleware.test.js (basic tests)
- ✅ Write handle.test.js (basic tests)
- ✅ Achieve >50% coverage

### Sprint 3: Comprehensive Coverage (Days 6-8)
- ✅ Complete middleware.test.js (all edge cases)
- ✅ Complete handle.test.js (all edge cases)
- ✅ Write integration.test.js
- ✅ Achieve >95% coverage

### Sprint 4: Polish and Documentation (Days 9-10)
- ✅ Update CI configuration
- ✅ Add coverage reporting
- ✅ Update README with testing info
- ✅ Create contribution guidelines
- ✅ Add coverage badges

---

## Risk Assessment and Mitigation

### Risk 1: Babel Configuration Conflicts
**Impact**: Tests may not run due to preset conflicts
**Mitigation**: Use `env.test` in .babelrc to separate test config from build config

### Risk 2: Breaking Changes Detection
**Impact**: Tests may pass but library behavior changes
**Mitigation**: Include integration tests with real Redux store, test return values and promise chains

### Risk 3: Async Test Complexity
**Impact**: Flaky or incorrect async tests
**Mitigation**: Always use async/await, ensure promises are awaited, use Jest's async support

### Risk 4: Mock Store Limitations
**Impact**: Tests may not catch real-world issues
**Mitigation**: Include integration tests with real Redux store in addition to mock store tests

---

## Success Criteria

The testing implementation will be considered successful when:

1. ✅ All source files have >95% code coverage
2. ✅ All critical functionality has explicit test coverage
3. ✅ CI/CD pipeline runs tests automatically
4. ✅ Test suite runs in <5 seconds
5. ✅ Documentation includes testing guidance
6. ✅ No regressions in existing functionality
7. ✅ Tests are maintainable and easy to understand
8. ✅ Coverage reports are generated and accessible

---

## Future Enhancements

### Performance Testing
- Benchmark middleware overhead
- Test with thousands of simultaneous promises
- Measure memory usage

### Compatibility Testing
- Test with different Redux versions
- Test with different promise implementations
- Test in Node.js and browser environments

### Visual Regression Testing
- If example app exists, add visual tests
- Test with Storybook components

### Mutation Testing
- Use Stryker to verify test quality
- Ensure tests catch actual bugs, not just pass

---

## Resources and References

- **Jest Documentation**: https://jestjs.io/
- **Redux Testing Guide**: https://redux.js.org/usage/writing-tests
- **redux-mock-store**: https://github.com/reduxjs/redux-mock-store
- **Testing Best Practices**: https://testingjavascript.com/

---

## Appendix A: Example Test Output

```bash
$ npm test

PASS  src/__tests__/constants.test.js
PASS  src/__tests__/handle.test.js
PASS  src/__tests__/middleware.test.js
PASS  src/__tests__/integration.test.js

Test Suites: 4 passed, 4 total
Tests:       87 passed, 87 total
Snapshots:   0 total
Time:        3.421s

Coverage summary:
Statements   : 98.5% ( 67/68 )
Branches     : 97.2% ( 35/36 )
Functions    : 100% ( 12/12 )
Lines        : 98.5% ( 66/67 )
```

---

## Appendix B: Testing Checklist

Use this checklist during implementation:

### Setup Phase
- [ ] Jest installed and configured
- [ ] redux-mock-store installed
- [ ] Babel configured for tests
- [ ] package.json scripts updated
- [ ] Test directory structure created
- [ ] Test helpers created

### Testing Phase
- [ ] constants.test.js written
- [ ] middleware.test.js written
- [ ] handle.test.js written
- [ ] integration.test.js written
- [ ] All tests passing
- [ ] Coverage >95%

### Integration Phase
- [ ] CI configuration updated
- [ ] Coverage reporting enabled
- [ ] README updated
- [ ] Coverage badges added
- [ ] Pre-commit hooks configured (optional)

### Documentation Phase
- [ ] Testing section in README
- [ ] Contribution guidelines updated
- [ ] Example tests documented
- [ ] Test helpers documented

---

**Document Version**: 1.0
**Last Updated**: 2026-01-04
**Author**: Claude
**Status**: Ready for Implementation
