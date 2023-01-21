import flatten from './flatten';

describe('utils', () => {
  describe('flattenObject', () => {
    it('flattens objects of depth 0', () => {
      const example = {
        key: 'value',
        otherKey: 'otherValue',
      };
      expect(flatten(example)).toEqual({
        key: 'value',
        otherKey: 'otherValue',
      });
    });

    it('flattens objects of depth 1', () => {
      const example = {
        zero: {
          one: 'value1',
          two: 'value2',
        },
        otherKey: 'otherValue',
      };
      expect(flatten(example)).toEqual({
        zeroOne: 'value1',
        zeroTwo: 'value2',
        otherKey: 'otherValue',
      });
    });

    it('flattens objects of depth 2', () => {
      const example = {
        zero: {
          one: 'value1',
          two: 'value2',
          three: {
            four: 'value4',
            five: 'value5',
          },
        },
        otherKey: 'otherValue',
      };
      expect(flatten(example)).toEqual({
        zeroOne: 'value1',
        zeroTwo: 'value2',
        zeroThreeFour: 'value4',
        zeroThreeFive: 'value5',
        otherKey: 'otherValue',
      });
    });

    // TODO
    // it('handles duplicate keys', () => {});
  });
});
