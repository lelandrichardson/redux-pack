import { createStore, applyMiddleware } from 'redux';
import middleware from './middleware';
import handle from './handle';
import { KEY, LIFECYCLE } from './constants';

describe('redux-pack integration', () => {
  describe('complete flow with Redux store', () => {
    it('should handle a successful promise action', async () => {
      // Setup reducer
      const initialState = {
        isLoading: false,
        data: null,
        error: null,
      };

      const reducer = (state = initialState, action) => {
        const { type } = action;
        switch (type) {
          case 'FETCH_DATA':
            return handle(state, action, {
              start: (prevState) => ({
                ...prevState,
                isLoading: true,
                error: null,
              }),
              finish: (prevState) => ({
                ...prevState,
                isLoading: false,
              }),
              success: (prevState, a) => ({
                ...prevState,
                data: a.payload,
              }),
              failure: (prevState, a) => ({
                ...prevState,
                error: a.payload,
              }),
            });
          default:
            return state;
        }
      };

      // Create store with redux-pack middleware
      const store = createStore(reducer, applyMiddleware(middleware));

      // Initial state
      expect(store.getState()).toEqual(initialState);

      // Dispatch promise action
      const promise = Promise.resolve({ id: 1, name: 'Test Data' });
      const result = store.dispatch({
        type: 'FETCH_DATA',
        promise,
      });

      // Should be loading
      expect(store.getState()).toEqual({
        isLoading: true,
        data: null,
        error: null,
      });

      // Wait for promise to resolve
      await result;

      // Should have data and not be loading
      expect(store.getState()).toEqual({
        isLoading: false,
        data: { id: 1, name: 'Test Data' },
        error: null,
      });
    });

    it('should handle a failed promise action', async () => {
      const initialState = {
        isLoading: false,
        data: null,
        error: null,
      };

      const reducer = (state = initialState, action) => {
        const { type } = action;
        switch (type) {
          case 'FETCH_DATA':
            return handle(state, action, {
              start: (prevState) => ({
                ...prevState,
                isLoading: true,
                error: null,
              }),
              finish: (prevState) => ({
                ...prevState,
                isLoading: false,
              }),
              failure: (prevState, a) => ({
                ...prevState,
                error: a.payload.message,
              }),
            });
          default:
            return state;
        }
      };

      const store = createStore(reducer, applyMiddleware(middleware));

      const error = new Error('Network error');
      const promise = Promise.reject(error);
      // Prevent unhandled rejection
      promise.catch(() => {});

      const result = store.dispatch({
        type: 'FETCH_DATA',
        promise,
      });

      // Should be loading
      expect(store.getState().isLoading).toBe(true);

      // Wait for promise to reject
      await result;

      // Should have error and not be loading
      expect(store.getState()).toEqual({
        isLoading: false,
        data: null,
        error: 'Network error',
      });
    });

    it('should handle multiple concurrent promise actions', async () => {
      const initialState = {
        users: { isLoading: false, data: null },
        posts: { isLoading: false, data: null },
      };

      const reducer = (state = initialState, action) => {
        const { type } = action;
        switch (type) {
          case 'FETCH_USERS':
            return {
              ...state,
              users: handle(state.users, action, {
                start: (prevState) => ({ ...prevState, isLoading: true }),
                finish: (prevState) => ({ ...prevState, isLoading: false }),
                success: (prevState, a) => ({ ...prevState, data: a.payload }),
              }),
            };
          case 'FETCH_POSTS':
            return {
              ...state,
              posts: handle(state.posts, action, {
                start: (prevState) => ({ ...prevState, isLoading: true }),
                finish: (prevState) => ({ ...prevState, isLoading: false }),
                success: (prevState, a) => ({ ...prevState, data: a.payload }),
              }),
            };
          default:
            return state;
        }
      };

      const store = createStore(reducer, applyMiddleware(middleware));

      const usersPromise = Promise.resolve([{ id: 1, name: 'User 1' }]);
      const postsPromise = Promise.resolve([{ id: 1, title: 'Post 1' }]);

      const result1 = store.dispatch({ type: 'FETCH_USERS', promise: usersPromise });
      const result2 = store.dispatch({ type: 'FETCH_POSTS', promise: postsPromise });

      // Both should be loading
      expect(store.getState().users.isLoading).toBe(true);
      expect(store.getState().posts.isLoading).toBe(true);

      await Promise.all([result1, result2]);

      // Both should have data
      expect(store.getState()).toEqual({
        users: {
          isLoading: false,
          data: [{ id: 1, name: 'User 1' }],
        },
        posts: {
          isLoading: false,
          data: [{ id: 1, title: 'Post 1' }],
        },
      });
    });
  });

  describe('event hooks with Redux store', () => {
    it('should call event hooks with getState', async () => {
      const hooks = {
        onStart: jest.fn(),
        onSuccess: jest.fn(),
        onFinish: jest.fn(),
      };

      const reducer = (state = { value: 42 }, action) => {
        if (action.type === 'FETCH') {
          return handle(state, action, {
            success: (prevState) => ({ ...prevState, loaded: true }),
          });
        }
        return state;
      };

      const store = createStore(reducer, applyMiddleware(middleware));

      const promise = Promise.resolve('data');
      await store.dispatch({
        type: 'FETCH',
        promise,
        meta: hooks,
      });

      // All hooks should be called with getState function
      expect(hooks.onStart).toHaveBeenCalled();
      expect(hooks.onSuccess).toHaveBeenCalled();
      expect(hooks.onFinish).toHaveBeenCalled();

      // Verify getState returns current state
      const getState = hooks.onSuccess.mock.calls[0][1];
      expect(typeof getState).toBe('function');
      expect(getState().value).toBe(42);
    });

    it('should handle side effects in hooks', async () => {
      const sideEffects = [];

      const reducer = (state = {}, action) => {
        if (action.type === 'SUBMIT') {
          return handle(state, action, {
            start: (prevState) => ({ ...prevState, submitting: true }),
            success: (prevState) => ({ ...prevState, submitted: true }),
            finish: (prevState) => ({ ...prevState, submitting: false }),
          });
        }
        return state;
      };

      const store = createStore(reducer, applyMiddleware(middleware));

      const promise = Promise.resolve({ id: 123 });
      await store.dispatch({
        type: 'SUBMIT',
        promise,
        meta: {
          onStart: () => sideEffects.push('analytics:submit_started'),
          onSuccess: (result) => sideEffects.push(`analytics:submit_success:${result.id}`),
          onFinish: (success) => sideEffects.push(`cleanup:${success}`),
        },
      });

      expect(sideEffects).toEqual([
        'analytics:submit_started',
        'analytics:submit_success:123',
        'cleanup:true',
      ]);
    });
  });

  describe('always handler', () => {
    it('should call always handler for all lifecycles', async () => {
      const alwaysCalls = [];

      const reducer = (state = {}, action) => {
        if (action.type === 'TEST') {
          return handle(state, action, {
            start: (prevState) => prevState,
            success: (prevState) => prevState,
            always: (prevState) => {
              alwaysCalls.push(action.meta[KEY.LIFECYCLE]);
              return prevState;
            },
          });
        }
        return state;
      };

      const store = createStore(reducer, applyMiddleware(middleware));

      const promise = Promise.resolve('data');
      await store.dispatch({ type: 'TEST', promise });

      expect(alwaysCalls).toEqual([LIFECYCLE.START, LIFECYCLE.SUCCESS]);
    });
  });

  describe('complex state transformations', () => {
    it('should handle paginated data loading', async () => {
      const initialState = {
        items: [],
        page: 1,
        isLoading: false,
        hasMore: true,
      };

      const reducer = (state = initialState, action) => {
        if (action.type === 'LOAD_MORE') {
          return handle(state, action, {
            start: (prevState) => ({
              ...prevState,
              isLoading: true,
            }),
            success: (prevState, a) => ({
              ...prevState,
              items: [...prevState.items, ...a.payload.items],
              page: prevState.page + 1,
              hasMore: a.payload.hasMore,
            }),
            finish: (prevState) => ({
              ...prevState,
              isLoading: false,
            }),
          });
        }
        return state;
      };

      const store = createStore(reducer, applyMiddleware(middleware));

      // Load first page
      const promise1 = Promise.resolve({
        items: [{ id: 1 }, { id: 2 }],
        hasMore: true,
      });
      await store.dispatch({ type: 'LOAD_MORE', promise: promise1 });

      expect(store.getState()).toEqual({
        items: [{ id: 1 }, { id: 2 }],
        page: 2,
        isLoading: false,
        hasMore: true,
      });

      // Load second page
      const promise2 = Promise.resolve({
        items: [{ id: 3 }, { id: 4 }],
        hasMore: false,
      });
      await store.dispatch({ type: 'LOAD_MORE', promise: promise2 });

      expect(store.getState()).toEqual({
        items: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
        page: 3,
        isLoading: false,
        hasMore: false,
      });
    });

    it('should handle optimistic updates', async () => {
      const initialState = {
        items: [
          { id: 1, text: 'Item 1', saved: true },
        ],
      };

      const reducer = (state = initialState, action) => {
        if (action.type === 'UPDATE_ITEM') {
          return handle(state, action, {
            start: (prevState) => {
              // Optimistically update the item
              const { id, text } = action.payload;
              return {
                ...prevState,
                items: prevState.items.map((item) => (item.id === id
                  ? { ...item, text, saved: false }
                  : item)),
              };
            },
            success: (prevState, a) => {
              // Mark as saved
              const { id } = a.payload;
              return {
                ...prevState,
                items: prevState.items.map((item) => (item.id === id
                  ? { ...item, saved: true }
                  : item)),
              };
            },
            failure: (prevState, a) => {
              // Revert on failure
              const originalItem = a.meta.startPayload;
              return {
                ...prevState,
                items: prevState.items.map((item) => (item.id === originalItem.id
                  ? originalItem
                  : item)),
              };
            },
          });
        }
        return state;
      };

      const store = createStore(reducer, applyMiddleware(middleware));

      const promise = Promise.resolve({ id: 1 });
      await store.dispatch({
        type: 'UPDATE_ITEM',
        payload: { id: 1, text: 'Updated Item 1' },
        promise,
      });

      expect(store.getState().items[0]).toEqual({
        id: 1,
        text: 'Updated Item 1',
        saved: true,
      });
    });
  });

  describe('chaining promises', () => {
    it('should allow dispatching new actions in hooks', async () => {
      const reducer = (state = { step: 0 }, action) => {
        switch (action.type) {
          case 'STEP_ONE':
            return handle(state, action, {
              success: (prevState) => ({ ...prevState, step: 1 }),
            });
          case 'STEP_TWO':
            return handle(state, action, {
              success: (prevState) => ({ ...prevState, step: 2 }),
            });
          default:
            return state;
        }
      };

      const store = createStore(reducer, applyMiddleware(middleware));

      const promise1 = Promise.resolve('step1-data');
      await store.dispatch({
        type: 'STEP_ONE',
        promise: promise1,
        meta: {
          onSuccess: () => {
            const promise2 = Promise.resolve('step2-data');
            store.dispatch({ type: 'STEP_TWO', promise: promise2 });
          },
        },
      });

      // Allow async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(store.getState().step).toBe(2);
    });
  });

  describe('error boundary', () => {
    it('should not crash Redux when promise action fails', async () => {
      const reducer = (state = { error: null }, action) => {
        if (action.type === 'FETCH') {
          return handle(state, action, {
            failure: (prevState, a) => ({
              ...prevState,
              error: a.payload.message,
            }),
          });
        }
        return state;
      };

      const store = createStore(reducer, applyMiddleware(middleware));

      const error = new Error('API Error');
      const promise = Promise.reject(error);
      // Prevent unhandled rejection
      promise.catch(() => {});

      // Should not throw
      await expect(store.dispatch({
        type: 'FETCH',
        promise,
      })).resolves.toBeDefined();

      expect(store.getState().error).toBe('API Error');
    });
  });
});
