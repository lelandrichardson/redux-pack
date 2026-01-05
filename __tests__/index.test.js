import reduxPack from '../src/index';
import middleware from '../src/middleware';
import handle from '../src/handle';
import { KEY, LIFECYCLE } from '../src/constants';

describe('index (main exports)', () => {
  it('should export middleware', () => {
    expect(reduxPack.middleware).toBeDefined();
    expect(reduxPack.middleware).toBe(middleware);
  });

  it('should export handle', () => {
    expect(reduxPack.handle).toBeDefined();
    expect(reduxPack.handle).toBe(handle);
  });

  it('should export KEY', () => {
    expect(reduxPack.KEY).toBeDefined();
    expect(reduxPack.KEY).toBe(KEY);
  });

  it('should export LIFECYCLE', () => {
    expect(reduxPack.LIFECYCLE).toBeDefined();
    expect(reduxPack.LIFECYCLE).toBe(LIFECYCLE);
  });

  it('should export all expected keys', () => {
    const expectedKeys = ['middleware', 'handle', 'KEY', 'LIFECYCLE'];
    const actualKeys = Object.keys(reduxPack);
    expect(actualKeys.sort()).toEqual(expectedKeys.sort());
  });

  it('should have KEY.LIFECYCLE constant', () => {
    expect(reduxPack.KEY.LIFECYCLE).toBe('redux-pack/LIFECYCLE');
  });

  it('should have KEY.TRANSACTION constant', () => {
    expect(reduxPack.KEY.TRANSACTION).toBe('redux-pack/TRANSACTION');
  });

  it('should have LIFECYCLE.START constant', () => {
    expect(reduxPack.LIFECYCLE.START).toBe('start');
  });

  it('should have LIFECYCLE.SUCCESS constant', () => {
    expect(reduxPack.LIFECYCLE.SUCCESS).toBe('success');
  });

  it('should have LIFECYCLE.FAILURE constant', () => {
    expect(reduxPack.LIFECYCLE.FAILURE).toBe('failure');
  });

  it('middleware should be a function', () => {
    expect(typeof reduxPack.middleware).toBe('function');
  });

  it('handle should be a function', () => {
    expect(typeof reduxPack.handle).toBe('function');
  });
});
