import { KEY, LIFECYCLE } from '../src/constants';

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

    it('should have namespaced keys to avoid collisions', () => {
      expect(KEY.LIFECYCLE).toContain('redux-pack/');
      expect(KEY.TRANSACTION).toContain('redux-pack/');
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

    it('should have exactly 3 lifecycle states', () => {
      expect(Object.keys(LIFECYCLE)).toHaveLength(3);
    });

    it('should have unique lifecycle values', () => {
      const values = Object.values(LIFECYCLE);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});
