import { expect } from 'chai';
import * as sinon from 'sinon';
import 'mocha';

import { delay, checkTime, getTime } from '../../src/utils/tests';
import { TaskManager } from '../../src/models/task-manager';

const getSyncTest = async (splits: number) => {
  const manager = new TaskManager(splits);

  const start = getTime();

  const first = await manager.handle(delay('a', 10));
  const second = await manager.handle(delay('b', 5));
  const third = await manager.handle(delay('c', 10));

  expect(first).equals('a');
  expect(second).equals('b');
  expect(third).equals('c');

  expect(checkTime(start, null, 25)).equals(true);
}

const getAsyncTest = async (splits: number, time = 40, delays = [10, 10, 10, 10], log = false) => {
  const manager = new TaskManager(splits);

  const start = getTime();

  const [first, second, third, fourth] = await Promise.all([
    manager.handle(delay('a', delays[0])),
    manager.handle(delay('b', delays[1])),
    manager.handle(delay('c', delays[2])),
    manager.handle(delay('d', delays[3]))
  ]);

  expect(first).equals('a');
  expect(second).equals('b');
  expect(third).equals('c');
  expect(fourth).equals('d');

  const end = getTime(start);

  if (log) console.log(`Time: ${end}`);

  expect(checkTime(start, end, time)).equals(true);
}

describe('TaskManager', () => {
  describe('synchronous splitting', () => {
    it('1 split', async () => {
      await getSyncTest(1);
    });

    it('4 splits', async () => {
      await getSyncTest(4);
    });
  });

  describe('asynchronous splitting with the same delay', () => {
    it('1 split', async () => {
      await getAsyncTest(1);
    });

    it('2 splits', async () => {
      await getAsyncTest(2, 20);
    });

    it('3 splits', async () => {
      await getAsyncTest(3, 20);
    });

    it('4 splits', async () => {
      await getAsyncTest(4, 10);
    });

    it('8 splits', async () => {
      await getAsyncTest(8, 10);
    });
  });

  describe('asynchronous splitting different delays', () => {
    it('1 split', async () => {
      await getAsyncTest(1, 30, [10, 5, 5, 10]);
    });

    it('2 splits', async () => {
      await getAsyncTest(2, 20, [10, 5, 5, 10]);
    });

    it('3 splits', async () => {
      await getAsyncTest(3, 15, [10, 5, 5, 10]);
    });

    it('4 splits', async () => {
      await getAsyncTest(4, 10, [10, 5, 5, 10]);
    });

    it('8 splits', async () => {
      await getAsyncTest(4, 10, [10, 5, 5, 10]);
    });
  });
});
