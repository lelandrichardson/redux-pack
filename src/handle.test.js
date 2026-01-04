import handle from './handle';
import { KEY, LIFECYCLE } from './constants';

// Helper to create action with redux-pack lifecycle
function makePackAction(lifecycle, { type, payload, meta = {} }) {
  return {
    type,
    payload,
    meta: {
      ...meta,
      [KEY.LIFECYCLE]: lifecycle,
    },
  };
}

describe('handle', () => {
  const initialState = {
    isLoading: false,
    data: null,
    error: null,
  };

  describe('START lifecycle', () => {
    it('should handle start lifecycle', () => {
      const action = makePackAction(LIFECYCLE.START, {
        type: 'FETCH_DATA',
        payload: { id: 1 },
      });

      const handlers = {
        start: (prevState) => ({
          ...prevState,
          isLoading: true,
          error: null,
        }),
      };

      const result = handle(initialState, action, handlers);

      expect(result).toEqual({
        isLoading: true,
        data: null,
        error: null,
      });
    });

    it('should call always handler on start', () => {
      const action = makePackAction(LIFECYCLE.START, {
        type: 'FETCH_DATA',
      });

      const handlers = {
        start: (prevState) => ({ ...prevState, isLoading: true }),
        always: (prevState) => ({ ...prevState, timestamp: Date.now() }),
      };

      const result = handle(initialState, action, handlers);

      expect(result.isLoading).toBe(true);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('SUCCESS lifecycle', () => {
    it('should handle success lifecycle', () => {
      const action = makePackAction(LIFECYCLE.SUCCESS, {
        type: 'FETCH_DATA',
        payload: { id: 1, name: 'test' },
      });

      const handlers = {
        success: (prevState, a) => ({
          ...prevState,
          data: a.payload,
        }),
      };

      const result = handle(initialState, action, handlers);

      expect(result).toEqual({
        isLoading: false,
        data: { id: 1, name: 'test' },
        error: null,
      });
    });

    it('should call finish handler after success', () => {
      const action = makePackAction(LIFECYCLE.SUCCESS, {
        type: 'FETCH_DATA',
        payload: { data: 'test' },
      });

      const handlers = {
        success: (prevState) => ({ ...prevState, data: 'success' }),
        finish: (prevState) => ({ ...prevState, isLoading: false }),
      };

      const result = handle(initialState, action, handlers);

      expect(result.data).toBe('success');
      expect(result.isLoading).toBe(false);
    });

    it('should call always handler after success', () => {
      const action = makePackAction(LIFECYCLE.SUCCESS, {
        type: 'FETCH_DATA',
        payload: 'data',
      });

      const handlers = {
        success: (prevState) => ({ ...prevState, data: 'success' }),
        always: (prevState) => ({ ...prevState, touched: true }),
      };

      const result = handle(initialState, action, handlers);

      expect(result.data).toBe('success');
      expect(result.touched).toBe(true);
    });
  });

  describe('FAILURE lifecycle', () => {
    it('should handle failure lifecycle', () => {
      const action = makePackAction(LIFECYCLE.FAILURE, {
        type: 'FETCH_DATA',
        payload: new Error('Network error'),
      });

      const handlers = {
        failure: (prevState, a) => ({
          ...prevState,
          error: a.payload,
        }),
      };

      const result = handle(initialState, action, handlers);

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Network error');
    });

    it('should call finish handler after failure', () => {
      const action = makePackAction(LIFECYCLE.FAILURE, {
        type: 'FETCH_DATA',
        payload: new Error('Failed'),
      });

      const handlers = {
        failure: (prevState) => ({ ...prevState, error: 'failed' }),
        finish: (prevState) => ({ ...prevState, isLoading: false }),
      };

      const result = handle(initialState, action, handlers);

      expect(result.error).toBe('failed');
      expect(result.isLoading).toBe(false);
    });

    it('should call always handler after failure', () => {
      const action = makePackAction(LIFECYCLE.FAILURE, {
        type: 'FETCH_DATA',
        payload: new Error('Failed'),
      });

      const handlers = {
        failure: (prevState) => ({ ...prevState, error: 'failed' }),
        always: (prevState) => ({ ...prevState, touched: true }),
      };

      const result = handle(initialState, action, handlers);

      expect(result.error).toBe('failed');
      expect(result.touched).toBe(true);
    });
  });

  describe('handler combinations', () => {
    it('should handle all lifecycle stages', () => {
      const handlers = {
        start: (prevState) => ({ ...prevState, isLoading: true }),
        success: (prevState) => ({ ...prevState, data: 'success' }),
        failure: (prevState) => ({ ...prevState, error: 'error' }),
        finish: (prevState) => ({ ...prevState, isLoading: false }),
        always: (prevState) => ({ ...prevState, touched: true }),
      };

      // Test start
      const startAction = makePackAction(LIFECYCLE.START, { type: 'TEST' });
      const afterStart = handle(initialState, startAction, handlers);
      expect(afterStart).toEqual({
        isLoading: true,
        data: null,
        error: null,
        touched: true,
      });

      // Test success
      const successAction = makePackAction(LIFECYCLE.SUCCESS, { type: 'TEST' });
      const afterSuccess = handle(afterStart, successAction, handlers);
      expect(afterSuccess).toEqual({
        isLoading: false,
        data: 'success',
        error: null,
        touched: true,
      });
    });

    it('should preserve state when handlers are not defined', () => {
      const action = makePackAction(LIFECYCLE.START, { type: 'TEST' });
      const result = handle(initialState, action, {});
      expect(result).toEqual(initialState);
    });
  });

  describe('error handling', () => {
    it('should throw error when handler returns undefined in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const action = makePackAction(LIFECYCLE.START, { type: 'TEST' });
      const handlers = {
        start: () => undefined,
      };

      expect(() => handle(initialState, action, handlers)).toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should throw error when no lifecycle is present', () => {
      const action = { type: 'TEST', payload: 'test' };
      const handlers = { start: (state) => state };

      expect(() => handle(initialState, action, handlers)).toThrow();
    });

    it('should throw error for invalid handler keys in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const action = makePackAction(LIFECYCLE.START, { type: 'TEST' });
      const handlers = {
        invalidKey: (state) => state,
      };

      expect(() => handle(initialState, action, handlers)).toThrow();

      process.env.NODE_ENV = originalEnv;
    });

    it('should throw error when handler is not a function', () => {
      const action = makePackAction(LIFECYCLE.START, { type: 'TEST' });
      const handlers = {
        start: 'not a function',
      };

      expect(() => handle(initialState, action, handlers)).toThrow();
    });
  });

  describe('action and state immutability', () => {
    it('should not mutate the original state', () => {
      const originalState = { ...initialState };
      const action = makePackAction(LIFECYCLE.START, { type: 'TEST' });
      const handlers = {
        start: (prevState) => ({ ...prevState, isLoading: true }),
      };

      handle(initialState, action, handlers);

      expect(initialState).toEqual(originalState);
    });

    it('should pass action to handlers', () => {
      const action = makePackAction(LIFECYCLE.SUCCESS, {
        type: 'FETCH_DATA',
        payload: { id: 1 },
      });

      const handlers = {
        success: (prevState, a) => {
          expect(a).toBe(action);
          return { ...prevState, data: a.payload };
        },
      };

      handle(initialState, action, handlers);
    });
  });

  describe('complex state transformations', () => {
    it('should handle nested state updates', () => {
      const complexState = {
        users: {
          list: [],
          loading: false,
        },
        meta: {
          lastFetch: null,
        },
      };

      const action = makePackAction(LIFECYCLE.SUCCESS, {
        type: 'FETCH_USERS',
        payload: [{ id: 1, name: 'User 1' }],
      });

      const handlers = {
        success: (prevState, a) => ({
          ...prevState,
          users: {
            ...prevState.users,
            list: a.payload,
          },
        }),
        finish: (prevState) => ({
          ...prevState,
          users: {
            ...prevState.users,
            loading: false,
          },
        }),
        always: (prevState) => ({
          ...prevState,
          meta: {
            ...prevState.meta,
            lastFetch: Date.now(),
          },
        }),
      };

      const result = handle(complexState, action, handlers);

      expect(result.users.list).toHaveLength(1);
      expect(result.users.loading).toBe(false);
      expect(result.meta.lastFetch).toBeDefined();
    });
  });
});
