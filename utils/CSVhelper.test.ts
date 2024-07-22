import { parseSymbol } from './CSVHelper';

describe('parseSymbol', () => {
  it('parses symbols as expected', () => {
    [
      {
        symbol: 'ABCD 01JAN24 10.5 P',
        expectation: ['ABCD 01JAN24 10.5 P', 'ABCD', '01JAN24', '10.5', 'P'],
      },
      {
        symbol: 'ABCD1 10FEB24 200 C',
        expectation: ['ABCD1 10FEB24 200 C', 'ABCD1', '10FEB24', '200', 'C'],
      },
    ].forEach(({ symbol, expectation }) => {
      // Use `Array.from` to convert the RegExp result (an array-like object) into a true array
      expect(Array.from(parseSymbol(symbol)!)).toEqual(expectation);
    });
  });
});
