import { expect } from 'chai';
import 'mocha';

import { calcElapsed, calcEta } from '../../src/utils/network';

describe('Network utils', () => {
  describe('calcElapsed', () => {
    it('returns elapsed time', () => {
      const seconds = 6;
      const time = new Date().getTime() - seconds * 1000;

      const elapsed = calcElapsed(time);

      expect(Math.floor(elapsed)).equals(seconds);
    });
  });

  describe('calcEta', () => {
    it('returns estimated time arrival', () => {
      const eta = calcEta(5, 2, 10);

      expect(eta).equals(20);
    });
  });
});
