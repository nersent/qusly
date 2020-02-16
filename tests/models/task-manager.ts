import { expect } from 'chai';
import 'mocha';

import { TaskManager } from '../../src/models/task-manager';

describe('TaskManager concurrent test', () => {
  it('should resolve tasks in a certain order', async () => {
    const manager = new TaskManager(3);
    let str = '';

    const [first, second, third] = await Promise.all([
      manager.handle(() => {
        str += 'a';
        return str;
      }),
      manager.handle(() => {
        str += 'b';
        return str;
      }),
      manager.handle(() => {
        str += 'c';
        return str;
      }),
    ]);

    expect(first).equals('a');
    expect(second).equals('ab');
    expect(third).equals('abc');
    expect(str).equals('abc');
  });
});
