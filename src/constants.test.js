import { KEY, LIFECYCLE } from './constants';

describe('constants', () => {
  describe('KEY', () => {
    it('should export LIFECYCLE key', () => {
      expect(KEY.LIFECYCLE).toBe('redux-pack/LIFECYCLE');
    });

    it('should export TRANSACTION key', () => {
      expect(KEY.TRANSACTION).toBe('redux-pack/TRANSACTION');
    });

    it('should have exactly 2 keys', () => {
      expect(Object.keys(KEY)).toHaveLength(2);
    });
  });

  describe('LIFECYCLE', () => {
    it('should export START lifecycle', () => {
      expect(LIFECYCLE.START).toBe('start');
    });

    it('should export SUCCESS lifecycle', () => {
      expect(LIFECYCLE.SUCCESS).toBe('success');
    });

    it('should export FAILURE lifecycle', () => {
      expect(LIFECYCLE.FAILURE).toBe('failure');
    });

    it('should have exactly 3 lifecycles', () => {
      expect(Object.keys(LIFECYCLE)).toHaveLength(3);
    });
  });
});
