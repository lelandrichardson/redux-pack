import handle from '../src/handle';
import { KEY, LIFECYCLE } from '../src/constants';

describe('handle', () => {
  const initialState = { loading: false, data: null, error: null };

  describe('START lifecycle', () => {
    it('should call start handler on START lifecycle', () => {
      const startHandler = jest.fn((state) => ({ ...state, loading: true }));
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.START },
      };

      const result = handle(initialState, action, {
        start: startHandler,
      });

      expect(startHandler).toHaveBeenCalledWith(initialState, action);
      expect(result).toEqual({ loading: true, data: null, error: null });
    });

    it('should call always handler after start', () => {
      const alwaysHandler = jest.fn((state) => ({ ...state, timestamp: Date.now() }));
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.START },
      };

      const result = handle(initialState, action, {
        start: state => ({ ...state, loading: true }),
        always: alwaysHandler,
      });

      expect(alwaysHandler).toHaveBeenCalled();
      expect(result.loading).toBe(true);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('SUCCESS lifecycle', () => {
    it('should call success handler on SUCCESS lifecycle', () => {
      const successHandler = jest.fn((state, action) => ({
        ...state,
        loading: false,
        data: action.payload,
      }));
      const action = {
        type: 'FETCH_DATA',
        payload: { id: 1, name: 'Test' },
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.SUCCESS },
      };

      const result = handle(initialState, action, {
        success: successHandler,
      });

      expect(successHandler).toHaveBeenCalledWith(initialState, action);
      expect(result).toEqual({
        loading: false,
        data: { id: 1, name: 'Test' },
        error: null,
      });
    });

    it('should call finish handler after success', () => {
      const finishHandler = jest.fn((state) => ({ ...state, loading: false }));
      const action = {
        type: 'FETCH_DATA',
        payload: { id: 1 },
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.SUCCESS },
      };

      handle(initialState, action, {
        success: state => ({ ...state, data: { id: 1 } }),
        finish: finishHandler,
      });

      expect(finishHandler).toHaveBeenCalled();
    });

    it('should call always handler after success and finish', () => {
      const calls = [];
      const action = {
        type: 'FETCH_DATA',
        payload: { id: 1 },
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.SUCCESS },
      };

      handle(initialState, action, {
        success: (state) => {
          calls.push('success');
          return state;
        },
        finish: (state) => {
          calls.push('finish');
          return state;
        },
        always: (state) => {
          calls.push('always');
          return state;
        },
      });

      expect(calls).toEqual(['success', 'finish', 'always']);
    });
  });

  describe('FAILURE lifecycle', () => {
    it('should call failure handler on FAILURE lifecycle', () => {
      const failureHandler = jest.fn((state, action) => ({
        ...state,
        loading: false,
        error: action.payload,
      }));
      const error = new Error('test error');
      const action = {
        type: 'FETCH_DATA',
        payload: error,
        error: true,
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.FAILURE },
      };

      const result = handle(initialState, action, {
        failure: failureHandler,
      });

      expect(failureHandler).toHaveBeenCalledWith(initialState, action);
      expect(result).toEqual({
        loading: false,
        data: null,
        error,
      });
    });

    it('should call finish handler after failure', () => {
      const finishHandler = jest.fn((state) => ({ ...state, loading: false }));
      const action = {
        type: 'FETCH_DATA',
        payload: new Error('error'),
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.FAILURE },
      };

      handle(initialState, action, {
        failure: state => ({ ...state, error: true }),
        finish: finishHandler,
      });

      expect(finishHandler).toHaveBeenCalled();
    });

    it('should call always handler after failure and finish', () => {
      const calls = [];
      const action = {
        type: 'FETCH_DATA',
        payload: new Error('error'),
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.FAILURE },
      };

      handle(initialState, action, {
        failure: (state) => {
          calls.push('failure');
          return state;
        },
        finish: (state) => {
          calls.push('finish');
          return state;
        },
        always: (state) => {
          calls.push('always');
          return state;
        },
      });

      expect(calls).toEqual(['failure', 'finish', 'always']);
    });
  });

  describe('always handler', () => {
    it('should call always handler for START lifecycle', () => {
      const alwaysHandler = jest.fn(state => state);
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.START },
      };

      handle(initialState, action, {
        always: alwaysHandler,
      });

      expect(alwaysHandler).toHaveBeenCalledWith(initialState, action);
    });

    it('should call always handler for SUCCESS lifecycle', () => {
      const alwaysHandler = jest.fn(state => state);
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.SUCCESS },
      };

      handle(initialState, action, {
        always: alwaysHandler,
      });

      expect(alwaysHandler).toHaveBeenCalled();
    });

    it('should call always handler for FAILURE lifecycle', () => {
      const alwaysHandler = jest.fn(state => state);
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.FAILURE },
      };

      handle(initialState, action, {
        always: alwaysHandler,
      });

      expect(alwaysHandler).toHaveBeenCalled();
    });
  });

  describe('handler validation', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
    });

    it('should throw on invalid handler key in development', () => {
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.START },
      };

      expect(() => {
        handle(initialState, action, {
          invalid: state => state,
        });
      }).toThrow();
    });

    it('should throw if handler is not a function', () => {
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.START },
      };

      expect(() => {
        handle(initialState, action, {
          start: 'not-a-function',
        });
      }).toThrow();
    });

    it('should throw if handler returns undefined', () => {
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.START },
      };

      expect(() => {
        handle(initialState, action, {
          start: () => undefined,
        });
      }).toThrow();
    });
  });

  describe('missing lifecycle meta', () => {
    it('should throw if action has no lifecycle meta', () => {
      const action = {
        type: 'FETCH_DATA',
      };

      expect(() => {
        handle(initialState, action, {
          start: state => state,
        });
      }).toThrow();
    });

    it('should throw if action has empty meta', () => {
      const action = {
        type: 'FETCH_DATA',
        meta: {},
      };

      expect(() => {
        handle(initialState, action, {
          start: state => state,
        });
      }).toThrow();
    });
  });

  describe('state immutability', () => {
    it('should not mutate original state', () => {
      const state = { loading: false, data: null };
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.START },
      };

      const result = handle(state, action, {
        start: s => ({ ...s, loading: true }),
      });

      expect(state.loading).toBe(false);
      expect(result.loading).toBe(true);
    });
  });

  describe('undefined handlers', () => {
    it('should return state unchanged if handler is undefined', () => {
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.START },
      };

      const result = handle(initialState, action, {
        success: state => ({ ...state, data: 'test' }),
      });

      expect(result).toBe(initialState);
    });

    it('should apply only defined handlers', () => {
      const action = {
        type: 'FETCH_DATA',
        payload: { id: 1 },
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.SUCCESS },
      };

      const result = handle(initialState, action, {
        start: state => ({ ...state, loading: true }),
        success: state => ({ ...state, data: { id: 1 } }),
      });

      expect(result).toEqual({ loading: false, data: { id: 1 }, error: null });
    });
  });

  describe('complex state transitions', () => {
    it('should handle multiple handlers modifying state', () => {
      const action = {
        type: 'FETCH_DATA',
        payload: { id: 1, name: 'Test' },
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.SUCCESS },
      };

      const result = handle(
        { loading: true, data: null, error: null },
        action,
        {
          success: state => ({ ...state, loading: false, data: action.payload }),
          finish: state => ({ ...state, finishedAt: 12345 }),
          always: state => ({ ...state, lastAction: action.type }),
        }
      );

      expect(result).toEqual({
        loading: false,
        data: { id: 1, name: 'Test' },
        error: null,
        finishedAt: 12345,
        lastAction: 'FETCH_DATA',
      });
    });

    it('should pass updated state through handler chain', () => {
      const action = {
        type: 'FETCH_DATA',
        payload: { id: 1 },
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.SUCCESS },
      };

      const states = [];

      handle(initialState, action, {
        success: (state) => {
          states.push({ ...state });
          return { ...state, step: 1 };
        },
        finish: (state) => {
          states.push({ ...state });
          return { ...state, step: 2 };
        },
        always: (state) => {
          states.push({ ...state });
          return { ...state, step: 3 };
        },
      });

      expect(states[0]).toEqual(initialState);
      expect(states[1]).toEqual({ ...initialState, step: 1 });
      expect(states[2]).toEqual({ ...initialState, step: 2 });
    });
  });

  describe('valid handler keys', () => {
    it('should accept start handler', () => {
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.START },
      };

      expect(() => {
        handle(initialState, action, {
          start: state => state,
        });
      }).not.toThrow();
    });

    it('should accept success handler', () => {
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.SUCCESS },
      };

      expect(() => {
        handle(initialState, action, {
          success: state => state,
        });
      }).not.toThrow();
    });

    it('should accept failure handler', () => {
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.FAILURE },
      };

      expect(() => {
        handle(initialState, action, {
          failure: state => state,
        });
      }).not.toThrow();
    });

    it('should accept finish handler', () => {
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.SUCCESS },
      };

      expect(() => {
        handle(initialState, action, {
          finish: state => state,
        });
      }).not.toThrow();
    });

    it('should accept always handler', () => {
      const action = {
        type: 'FETCH_DATA',
        meta: { [KEY.LIFECYCLE]: LIFECYCLE.START },
      };

      expect(() => {
        handle(initialState, action, {
          always: state => state,
        });
      }).not.toThrow();
    });
  });
});
