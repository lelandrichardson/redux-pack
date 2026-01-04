import middleware from './middleware';
import { KEY, LIFECYCLE } from './constants';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

describe('middleware', () => {
  let store;
  let next;
  let invoke;

  beforeEach(() => {
    store = {
      dispatch: jest.fn(),
      getState: jest.fn(() => ({ test: 'state' })),
    };
    next = jest.fn();
    invoke = (action) => middleware(store)(next)(action);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('null actions', () => {
    it('should handle null action', () => {
      const result = invoke(null);
      expect(result).toBeNull();
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle undefined action', () => {
      const result = invoke(undefined);
      expect(result).toBeNull();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('plain actions', () => {
    it('should pass through plain actions', () => {
      const action = { type: 'PLAIN_ACTION', payload: 'data' };
      invoke(action);

      expect(next).toHaveBeenCalledWith(action);
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should return result from next middleware', () => {
      const action = { type: 'PLAIN_ACTION' };
      next.mockReturnValue('next-result');

      const result = invoke(action);

      expect(result).toBe('next-result');
    });
  });

  describe('promise actions', () => {
    it('should handle promise action', async () => {
      const promise = Promise.resolve('success-data');
      const action = {
        type: 'FETCH_DATA',
        payload: { id: 1 },
        promise,
      };

      const result = invoke(action);

      // Should dispatch START action immediately
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'FETCH_DATA',
        payload: { id: 1 },
        meta: {
          [KEY.LIFECYCLE]: LIFECYCLE.START,
          [KEY.TRANSACTION]: 'mock-uuid-1234',
        },
      });

      // Wait for promise to resolve
      await result;

      // Should dispatch SUCCESS action
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'FETCH_DATA',
        payload: 'success-data',
        meta: {
          startPayload: { id: 1 },
          [KEY.LIFECYCLE]: LIFECYCLE.SUCCESS,
          [KEY.TRANSACTION]: 'mock-uuid-1234',
        },
      });

      expect(store.dispatch).toHaveBeenCalledTimes(2);
    });

    it('should handle rejected promise', async () => {
      const error = new Error('Network error');
      const promise = Promise.reject(error);
      promise.catch(() => {}); // Prevent unhandled rejection
      const action = {
        type: 'FETCH_DATA',
        promise,
      };

      const result = invoke(action);

      // Should dispatch START action
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'FETCH_DATA',
        payload: undefined,
        meta: {
          [KEY.LIFECYCLE]: LIFECYCLE.START,
          [KEY.TRANSACTION]: 'mock-uuid-1234',
        },
      });

      // Wait for promise to reject
      await result;

      // Should dispatch FAILURE action
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'FETCH_DATA',
        payload: error,
        error: true,
        meta: {
          startPayload: undefined,
          [KEY.LIFECYCLE]: LIFECYCLE.FAILURE,
          [KEY.TRANSACTION]: 'mock-uuid-1234',
        },
      });

      expect(store.dispatch).toHaveBeenCalledTimes(2);
    });

    it('should return promise that resolves with payload', async () => {
      const promise = Promise.resolve('data');
      const action = { type: 'TEST', promise };

      const result = await invoke(action);

      expect(result).toEqual({ payload: 'data' });
    });

    it('should return promise that resolves with error info on rejection', async () => {
      const error = new Error('Failed');
      const promise = Promise.reject(error);
      promise.catch(() => {}); // Prevent unhandled rejection
      const action = { type: 'TEST', promise };

      const result = await invoke(action);

      expect(result).toEqual({ error: true, payload: error });
    });

    it('should preserve meta properties', async () => {
      const promise = Promise.resolve('data');
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: {
          custom: 'value',
          another: 123,
        },
      };

      await invoke(action);

      // Check START action
      expect(store.dispatch).toHaveBeenNthCalledWith(1, {
        type: 'FETCH_DATA',
        payload: undefined,
        meta: {
          custom: 'value',
          another: 123,
          [KEY.LIFECYCLE]: LIFECYCLE.START,
          [KEY.TRANSACTION]: 'mock-uuid-1234',
        },
      });

      // Check SUCCESS action
      expect(store.dispatch).toHaveBeenNthCalledWith(2, {
        type: 'FETCH_DATA',
        payload: 'data',
        meta: {
          custom: 'value',
          another: 123,
          startPayload: undefined,
          [KEY.LIFECYCLE]: LIFECYCLE.SUCCESS,
          [KEY.TRANSACTION]: 'mock-uuid-1234',
        },
      });
    });
  });

  describe('event hooks', () => {
    it('should call onStart hook', async () => {
      const onStart = jest.fn();
      const promise = Promise.resolve('data');
      const action = {
        type: 'FETCH_DATA',
        payload: { id: 1 },
        promise,
        meta: { onStart },
      };

      await invoke(action);

      expect(onStart).toHaveBeenCalledWith({ id: 1 }, store.getState);
    });

    it('should call onSuccess hook', async () => {
      const onSuccess = jest.fn();
      const promise = Promise.resolve('success-data');
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onSuccess },
      };

      await invoke(action);

      expect(onSuccess).toHaveBeenCalledWith('success-data', store.getState);
    });

    it('should call onFailure hook', async () => {
      const onFailure = jest.fn();
      const error = new Error('Failed');
      const promise = Promise.reject(error);
      promise.catch(() => {}); // Prevent unhandled rejection
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onFailure },
      };

      await invoke(action);

      expect(onFailure).toHaveBeenCalledWith(error, store.getState);
    });

    it('should call onFinish hook with true on success', async () => {
      const onFinish = jest.fn();
      const promise = Promise.resolve('data');
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onFinish },
      };

      await invoke(action);

      expect(onFinish).toHaveBeenCalledWith(true, store.getState);
    });

    it('should call onFinish hook with false on failure', async () => {
      const onFinish = jest.fn();
      const promise = Promise.reject(new Error('Failed'));
      promise.catch(() => {}); // Prevent unhandled rejection
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onFinish },
      };

      await invoke(action);

      expect(onFinish).toHaveBeenCalledWith(false, store.getState);
    });

    it('should not crash if hook throws error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const onSuccess = jest.fn(() => {
        throw new Error('Hook error');
      });
      const promise = Promise.resolve('data');
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onSuccess },
      };

      await expect(invoke(action)).resolves.toBeDefined();
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it('should call multiple hooks in correct order', async () => {
      const calls = [];
      const onStart = jest.fn(() => calls.push('start'));
      const onSuccess = jest.fn(() => calls.push('success'));
      const onFinish = jest.fn(() => calls.push('finish'));

      const promise = Promise.resolve('data');
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onStart, onSuccess, onFinish },
      };

      await invoke(action);

      expect(calls).toEqual(['start', 'success', 'finish']);
    });

    it('should not call success hooks on failure', async () => {
      const onSuccess = jest.fn();
      const onFailure = jest.fn();
      const promise = Promise.reject(new Error('Failed'));
      promise.catch(() => {}); // Prevent unhandled rejection
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onSuccess, onFailure },
      };

      await invoke(action);

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onFailure).toHaveBeenCalled();
    });
  });

  describe('promise detection', () => {
    it('should detect promise with then method', () => {
      const promise = { then: jest.fn() };
      const action = { type: 'TEST', promise };

      invoke(action);

      expect(store.dispatch).toHaveBeenCalled();
    });

    it('should not treat action with non-function then as promise', () => {
      const action = { type: 'TEST', promise: { then: 'not-a-function' } };

      invoke(action);

      expect(next).toHaveBeenCalled();
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should handle action with undefined promise property', () => {
      const action = { type: 'TEST', promise: undefined };

      invoke(action);

      expect(next).toHaveBeenCalled();
      expect(store.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('transaction IDs', () => {
    it('should use same transaction ID for all lifecycle actions', async () => {
      const promise = Promise.resolve('data');
      const action = { type: 'TEST', promise };

      await invoke(action);

      const startCall = store.dispatch.mock.calls[0][0];
      const successCall = store.dispatch.mock.calls[1][0];

      expect(startCall.meta[KEY.TRANSACTION]).toBe('mock-uuid-1234');
      expect(successCall.meta[KEY.TRANSACTION]).toBe('mock-uuid-1234');
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid sequential promise actions', async () => {
      const promise1 = Promise.resolve('data1');
      const promise2 = Promise.resolve('data2');

      const action1 = { type: 'FETCH_1', promise: promise1 };
      const action2 = { type: 'FETCH_2', promise: promise2 };

      const result1 = invoke(action1);
      const result2 = invoke(action2);

      await Promise.all([result1, result2]);

      // Should dispatch actions for both promises
      expect(store.dispatch).toHaveBeenCalledTimes(4); // 2 start, 2 success
    });

    it('should work with async/await pattern', async () => {
      const promise = (async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'async-data';
      })();

      const action = { type: 'ASYNC_FETCH', promise };

      const result = await invoke(action);

      expect(result.payload).toBe('async-data');
      expect(store.dispatch).toHaveBeenCalledTimes(2);
    });

    it('should preserve startPayload in success action', async () => {
      const startPayload = { id: 1, name: 'test' };
      const promise = Promise.resolve('result');
      const action = {
        type: 'FETCH',
        payload: startPayload,
        promise,
      };

      await invoke(action);

      const successCall = store.dispatch.mock.calls[1][0];
      expect(successCall.meta.startPayload).toEqual(startPayload);
    });

    it('should preserve startPayload in failure action', async () => {
      const startPayload = { id: 1, name: 'test' };
      const promise = Promise.reject(new Error('Failed'));
      promise.catch(() => {}); // Prevent unhandled rejection
      const action = {
        type: 'FETCH',
        payload: startPayload,
        promise,
      };

      await invoke(action);

      const failureCall = store.dispatch.mock.calls[1][0];
      expect(failureCall.meta.startPayload).toEqual(startPayload);
    });
  });
});
