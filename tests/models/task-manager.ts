import { expect } from 'chai';
import * as sinon from 'sinon';
import 'mocha';

import { TaskManager } from '../../src/models/task-manager';

const fn = (str: string) => () => {
  return str;
}

const delay = (ms: number) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

const currentTime = (time?: number | [number, number]) => {
  if (!time) return process.hrtime();
  const end = process.hrtime(time as any);
  return Math.floor((end[0] * 1000) + (end[1] / 1000000));
}

const validate = (start: number | [number, number], delay: number, padding = 3) => {
  const time = currentTime(start) as number;
  return Math.abs(time - delay) <= padding;
}

describe('TaskManager', () => {
  describe('supports splitting', () => {
    const sandbox = sinon.createSandbox();

    afterEach(sandbox.restore);

    it('1 split', async () => {
      const manager = new TaskManager(1);

      const res = await Promise.all([manager.handle(fn('a')), manager.handle(fn('b')), manager.handle(fn('c'))]);

      expect(res[0]).equals('a');
      expect(res[1]).equals('b');
      expect(res[2]).equals('c');
    });

    it('2 splits', async () => {
      const manager = new TaskManager(2);

      const res = await Promise.all([manager.handle(fn('a')), manager.handle(fn('b')), manager.handle(fn('c'))]);

      expect(res[0]).equals('a');
      expect(res[1]).equals('b');
      expect(res[2]).equals('c');
    });

    it('3 splits', async () => {
      const manager = new TaskManager(3);

      const res = await Promise.all([manager.handle(fn('a')), manager.handle(fn('b')), manager.handle(fn('c'))]);

      expect(res[0]).equals('a');
      expect(res[1]).equals('b');
      expect(res[2]).equals('c');
    });

    it('4 splits', async () => {
      const manager = new TaskManager(4);

      const res = await Promise.all([manager.handle(fn('a')), manager.handle(fn('b')), manager.handle(fn('c'))]);

      expect(res[0]).equals('a');
      expect(res[1]).equals('b');
      expect(res[2]).equals('c');
    });

    it('time delay with 1 split', async () => {
      const manager = new TaskManager(1);

      const start = currentTime();

      await manager.handle(delay(10));
      await manager.handle(delay(10));
      await manager.handle(delay(10));

      expect(validate(start, 30)).equals(true);
    });

    it('time delay with 3 splits', async () => {
      const manager = new TaskManager(3);

      const start = currentTime();

      await Promise.all([manager.handle(delay(10)), manager.handle(delay(10)), manager.handle(delay(10))]);

      expect(validate(start, 10)).equals(true);
    });
  });
});
