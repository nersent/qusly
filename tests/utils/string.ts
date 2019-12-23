import { expect } from 'chai';
import 'mocha';

import { makeId, getValidDate } from '../../src/utils/string';

describe('String utils', () => {
  describe('makeId', () => {
    it('returns a string of 32 characters', () => {
      const str = makeId(32);
      expect(str).length(32);
    });

    it('returns a string of 1 character', () => {
      const str = makeId(1, 'a');
      expect(str).equal('a');
    });

    it('returns an empty string', () => {
      const str = makeId(0);
      expect(str).equal('');
    });
  });

  describe('getValidDate', () => {
    it('supports js date format', () => {
      const str = new Date().toDateString();
      const date = getValidDate(str).toDateString();

      expect(date).equals(str);
    });

    it('supports unix date format', () => {
      const date = getValidDate('Oct 24 17:51');

      // TODO: node-ssh doesn't seems to support year in file listenings
      // expect(date.getFullYear()).equals(19);
      expect(date.getMonth()).equals(9);
      expect(date.getDate()).equals(24);

      expect(date.getHours()).equals(17);
      expect(date.getMinutes()).equals(51);
    });

    it('supports ms-dos date format', () => {
      it('AM', () => {
        const date = getValidDate('08-11-19 02:46AM');

        expect(date.getFullYear()).equals(2019);
        expect(date.getMonth()).equals(10);
        expect(date.getDate()).equals(8);

        expect(date.getHours()).equals(2);
        expect(date.getMinutes()).equals(46);
      });

      it('PM', () => {
        const date = getValidDate('21-12-02 17:54PM');

        expect(date.getFullYear()).equals(2002);
        expect(date.getMonth()).equals(11);
        expect(date.getDate()).equals(21);

        expect(date.getHours()).equals(17);
        expect(date.getMinutes()).equals(54);
      });
    });
  });
});
