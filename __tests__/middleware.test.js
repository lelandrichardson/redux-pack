import middleware from '../src/middleware';
import { KEY, LIFECYCLE } from '../src/constants';

describe('middleware', () => {
  let store;
  let next;
  let dispatch;
  let getState;

  beforeEach(() => {
    dispatch = jest.fn();
    getState = jest.fn(() => ({ test: 'state' }));
    next = jest.fn();
    store = {
      dispatch,
      getState,
    };
  });

  describe('null actions', () => {
    it('should handle null actions', () => {
      const result = middleware(store)(next)(null);
      expect(result).toBe(null);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle undefined actions', () => {
      const result = middleware(store)(next)(undefined);
      expect(result).toBe(null);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('plain actions', () => {
    it('should pass plain actions to next middleware', () => {
      const action = { type: 'TEST_ACTION', payload: 'data' };
      middleware(store)(next)(action);
      expect(next).toHaveBeenCalledWith(action);
    });

    it('should return the result of next middleware', () => {
      const action = { type: 'TEST_ACTION' };
      next.mockReturnValue('next-result');
      const result = middleware(store)(next)(action);
      expect(result).toBe('next-result');
    });
  });

  describe('promise actions', () => {
    it('should handle promise actions', () => {
      const promise = Promise.resolve('success-data');
      const action = {
        type: 'FETCH_DATA',
        promise,
        payload: { id: 1 },
        meta: { extra: 'info' },
      };

      const result = middleware(store)(next)(action);

      // Should return a promise
      expect(result).toBeInstanceOf(Promise);

      // Should dispatch START action immediately
      expect(dispatch).toHaveBeenCalledTimes(1);
      const startCall = dispatch.mock.calls[0][0];
      expect(startCall.type).toBe('FETCH_DATA');
      expect(startCall.payload).toEqual({ id: 1 });
      expect(startCall.meta[KEY.LIFECYCLE]).toBe(LIFECYCLE.START);
      expect(startCall.meta[KEY.TRANSACTION]).toBeDefined();
      expect(startCall.meta.extra).toBe('info');
    });

    it('should dispatch SUCCESS action when promise resolves', async () => {
      const promise = Promise.resolve('success-data');
      const action = {
        type: 'FETCH_DATA',
        promise,
        payload: { id: 1 },
        meta: { extra: 'info' },
      };

      await middleware(store)(next)(action);

      // Should have dispatched START and SUCCESS
      expect(dispatch).toHaveBeenCalledTimes(2);

      const successCall = dispatch.mock.calls[1][0];
      expect(successCall.type).toBe('FETCH_DATA');
      expect(successCall.payload).toBe('success-data');
      expect(successCall.meta[KEY.LIFECYCLE]).toBe(LIFECYCLE.SUCCESS);
      expect(successCall.meta[KEY.TRANSACTION]).toBeDefined();
      expect(successCall.meta.startPayload).toEqual({ id: 1 });
      expect(successCall.meta.extra).toBe('info');
    });

    it('should dispatch FAILURE action when promise rejects', async () => {
      const error = new Error('test error');
      const promise = Promise.reject(error);
      const action = {
        type: 'FETCH_DATA',
        promise,
        payload: { id: 1 },
        meta: { extra: 'info' },
      };

      await middleware(store)(next)(action);

      // Should have dispatched START and FAILURE
      expect(dispatch).toHaveBeenCalledTimes(2);

      const failureCall = dispatch.mock.calls[1][0];
      expect(failureCall.type).toBe('FETCH_DATA');
      expect(failureCall.payload).toBe(error);
      expect(failureCall.error).toBe(true);
      expect(failureCall.meta[KEY.LIFECYCLE]).toBe(LIFECYCLE.FAILURE);
      expect(failureCall.meta[KEY.TRANSACTION]).toBeDefined();
      expect(failureCall.meta.startPayload).toEqual({ id: 1 });
      expect(failureCall.meta.extra).toBe('info');
    });

    it('should preserve the same transaction ID across lifecycle', async () => {
      const promise = Promise.resolve('data');
      const action = {
        type: 'FETCH_DATA',
        promise,
      };

      await middleware(store)(next)(action);

      const startTransaction = dispatch.mock.calls[0][0].meta[KEY.TRANSACTION];
      const successTransaction = dispatch.mock.calls[1][0].meta[KEY.TRANSACTION];

      expect(startTransaction).toBe(successTransaction);
    });

    it('should return promise result with payload on success', async () => {
      const promise = Promise.resolve('success-data');
      const action = {
        type: 'FETCH_DATA',
        promise,
      };

      const result = await middleware(store)(next)(action);

      expect(result).toEqual({ payload: 'success-data' });
    });

    it('should return promise result with error on failure', async () => {
      const error = new Error('test error');
      const promise = Promise.reject(error);
      const action = {
        type: 'FETCH_DATA',
        promise,
      };

      const result = await middleware(store)(next)(action);

      expect(result).toEqual({ error: true, payload: error });
    });
  });

  describe('event hooks', () => {
    it('should call onStart hook when promise starts', () => {
      const onStart = jest.fn();
      const promise = Promise.resolve('data');
      const action = {
        type: 'FETCH_DATA',
        promise,
        payload: { id: 1 },
        meta: { onStart },
      };

      middleware(store)(next)(action);

      expect(onStart).toHaveBeenCalledTimes(1);
      expect(onStart).toHaveBeenCalledWith({ id: 1 }, getState);
    });

    it('should call onSuccess hook when promise resolves', async () => {
      const onSuccess = jest.fn();
      const promise = Promise.resolve('success-data');
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onSuccess },
      };

      await middleware(store)(next)(action);

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith('success-data', getState);
    });

    it('should call onFailure hook when promise rejects', async () => {
      const onFailure = jest.fn();
      const error = new Error('test error');
      const promise = Promise.reject(error);
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onFailure },
      };

      await middleware(store)(next)(action);

      expect(onFailure).toHaveBeenCalledTimes(1);
      expect(onFailure).toHaveBeenCalledWith(error, getState);
    });

    it('should call onFinish hook with true when promise succeeds', async () => {
      const onFinish = jest.fn();
      const promise = Promise.resolve('data');
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onFinish },
      };

      await middleware(store)(next)(action);

      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(onFinish).toHaveBeenCalledWith(true, getState);
    });

    it('should call onFinish hook with false when promise fails', async () => {
      const onFinish = jest.fn();
      const promise = Promise.reject(new Error('error'));
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onFinish },
      };

      await middleware(store)(next)(action);

      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(onFinish).toHaveBeenCalledWith(false, getState);
    });

    it('should call all hooks in correct order on success', async () => {
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

      await middleware(store)(next)(action);

      expect(calls).toEqual(['start', 'success', 'finish']);
    });

    it('should call all hooks in correct order on failure', async () => {
      const calls = [];
      const onStart = jest.fn(() => calls.push('start'));
      const onFailure = jest.fn(() => calls.push('failure'));
      const onFinish = jest.fn(() => calls.push('finish'));

      const promise = Promise.reject(new Error('error'));
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onStart, onFailure, onFinish },
      };

      await middleware(store)(next)(action);

      expect(calls).toEqual(['start', 'failure', 'finish']);
    });

    it('should not throw if hook throws an error', () => {
      const consoleError = console.error;
      console.error = jest.fn();

      const onStart = jest.fn(() => {
        throw new Error('hook error');
      });

      const promise = Promise.resolve('data');
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onStart },
      };

      expect(() => {
        middleware(store)(next)(action);
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith(expect.any(Error));

      console.error = consoleError;
    });

    it('should continue dispatching even if hook throws', async () => {
      const consoleError = console.error;
      console.error = jest.fn();

      const onStart = jest.fn(() => {
        throw new Error('hook error');
      });

      const promise = Promise.resolve('data');
      const action = {
        type: 'FETCH_DATA',
        promise,
        meta: { onStart },
      };

      await middleware(store)(next)(action);

      // Should still dispatch START and SUCCESS
      expect(dispatch).toHaveBeenCalledTimes(2);

      console.error = consoleError;
    });
  });

  describe('action without meta', () => {
    it('should handle promise action without meta', async () => {
      const promise = Promise.resolve('data');
      const action = {
        type: 'FETCH_DATA',
        promise,
      };

      await middleware(store)(next)(action);

      expect(dispatch).toHaveBeenCalledTimes(2);

      const startCall = dispatch.mock.calls[0][0];
      expect(startCall.meta[KEY.LIFECYCLE]).toBe(LIFECYCLE.START);

      const successCall = dispatch.mock.calls[1][0];
      expect(successCall.meta[KEY.LIFECYCLE]).toBe(LIFECYCLE.SUCCESS);
    });
  });

  describe('non-promise objects with then method', () => {
    it('should not treat non-promises with then as promises if not callable', () => {
      const action = {
        type: 'TEST_ACTION',
        promise: { then: 'not-a-function' },
      };

      middleware(store)(next)(action);

      expect(next).toHaveBeenCalledWith(action);
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('should treat thenable objects as promises', () => {
      const thenable = {
        then: jest.fn(),
      };

      const action = {
        type: 'TEST_ACTION',
        promise: thenable,
      };

      middleware(store)(next)(action);

      expect(thenable.then).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
