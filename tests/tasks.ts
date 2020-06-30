import 'mocha';
import * as sinon from 'sinon';
import { expect } from 'chai';

import { TasksManager } from '../src/tasks';
import { ITaskChange, ITask } from '../src/interfaces';

import { delay } from './utils/delay';

describe('Tasks', () => {
  describe('setWorker()', () => {
    it('sets up workers', () => {
      const instance = new TasksManager();
      const groups = ['all', 'transfer', 'misc'];

      instance.setWorkers(...groups);

      const instanceWorkers = instance['workers'];

      expect(instanceWorkers.length).equals(
        groups.length,
        'Workers should be the same size',
      );

      expect(instanceWorkers.map((r) => r.group)).eqls(
        groups,
        'Groups should be the same',
      );
    });
  });

  describe('getWorker()', () => {
    it('returns the first available worker with specified group', () => {
      const instance = new TasksManager();
      const availableWorkerGroup = 'transfer';

      instance['workers'] = [
        { index: 0, group: 'all' },
        { index: 1, group: 'transfer', paused: true },
        { index: 2, group: 'transfer', busy: true },
        { index: 3, group: 'all', busy: true },
        { index: 4, group: 'transfer' },
        { index: 5, group: 'transfer' },
        { index: 6, group: 'all' },
      ];

      const worker = instance['getWorker'](availableWorkerGroup);

      expect(worker.index).equals(4, 'Found wrong worker');
      expect(worker.busy).not.equals(true, 'Worker should not be busy');
      expect(worker.paused).not.equals(true, 'Worker should not be paused');
      expect(worker.group).equals(
        availableWorkerGroup,
        'Worker group is invalid',
      );
    });

    it('handles custom filter', () => {
      const instance = new TasksManager();

      instance.workerFilter = (worker, group) => {
        return (
          worker.group === 'all' ||
          (!group && worker.group === 'misc') ||
          worker.group === group
        );
      };

      instance['workers'] = [
        { index: 0, group: 'all' },
        { index: 1, group: 'transfer', paused: true },
        { index: 2, group: 'transfer', busy: true },
        { index: 3, group: 'all', busy: true },
        { index: 4, group: 'transfer' },
        { index: 5, group: 'transfer' },
        { index: 6, group: 'all' },
        { index: 7, group: 'misc', paused: true },
        { index: 7, group: 'misc', busy: true },
        { index: 8, group: 'misc' },
      ];

      expect(instance['getWorker']('misc').index).equals(0);
      expect(instance['getWorker']('transfer').index).equals(0);

      instance['workers'][0].busy = true;
      instance['workers'][6].busy = true;

      expect(instance['getWorker']('misc').index).equals(8);
      expect(instance['getWorker']('transfer').index).equals(4);

      instance['workers'][6].busy = false;

      expect(instance['getWorker']('all').index).equals(6);
    });

    it('returns undefined when all workers are not available', () => {
      const instance = new TasksManager();

      instance.workerFilter = (worker, group) => true;

      instance['workers'] = [
        { index: 1, group: 'all', paused: true },
        { index: 2, group: 'all', busy: true },
        { index: 3, group: 'all', busy: true },
      ];

      expect(instance['getWorker']('all')).equals(undefined);
    });
  });

  describe('getWorker()', () => {
    const groups = ['all', 'misc', 'transfer', 'files', 'misc'];

    it('returns all workers when indexies are not given', () => {
      const instance = new TasksManager();

      instance.setWorkers(...groups);

      expect(instance['getWorkers']()).equals(instance['workers']);
    });

    it('returns workers with specified indexies', () => {
      const instance = new TasksManager();

      instance.setWorkers(...groups);

      const workers = instance['workers'];

      expect(instance['getWorkers']([0, 2, 4])).eqls([
        workers[0],
        workers[2],
        workers[4],
      ]);
    });
  });

  describe('workersCheck()', () => {
    it('throws an error when workers are not set up', () => {
      const instance = new TasksManager();

      expect(instance['workersCheck'].bind(instance)).to.throw();
    });

    it("doesn't throw an error if workers are set up", () => {
      const instance = new TasksManager();

      instance.setWorkers('all');

      expect(instance['workersCheck'].bind(instance)).not.to.throw();
    });
  });

  describe('pauseWorkers()', () => {
    const groups = ['a', 'a', 'a', 'a', 'a'];

    it('pauses all workers', () => {
      const instance = new TasksManager();

      instance.setWorkers(...groups);
      instance.pauseWorkers();

      const pausedWorkers = instance['workers'].filter((r) => r.paused);

      expect(pausedWorkers).eqls(instance['workers']);
    });

    it('pauses specified workers', () => {
      const instance = new TasksManager();
      const indexes = [0, 1, 4];

      instance.setWorkers(...groups);
      instance.pauseWorkers(...indexes);

      const pausedWorkers = instance['workers']
        .filter((r) => r.paused)
        .map((r) => r.index);

      expect(pausedWorkers).eqls(indexes);
    });
  });

  describe('resumeWorkers()', () => {
    const groups = ['a', 'a', 'a', 'a', 'a'];

    it('resumes all workers', () => {
      const instance = new TasksManager();

      instance.setWorkers(...groups);
      instance.pauseWorkers();
      instance.resumeWorkers();

      const pausedWorkers = instance['workers'].filter((r) => r.paused);

      expect(pausedWorkers.length).equals(0);
    });

    it('resumes specified workers', () => {
      const instance = new TasksManager();

      instance.setWorkers(...groups);
      instance.pauseWorkers(0, 1, 4);
      instance.resumeWorkers(0, 4);

      const pausedWorkers = instance['workers']
        .filter((r) => r.paused)
        .map((r) => r.index);

      expect(pausedWorkers).eqls([1]);
    });

    it('processes next tasks', () => {
      const instance = new TasksManager();
      const spy = sinon.spy(instance, 'processNext' as any);

      instance.setWorkers(...groups);
      instance.resumeWorkers();

      expect(spy.calledOnce).equals(
        true,
        'After workers have been resumed, the next tasks should be processed',
      );
    });
  });

  describe('deleteTasks()', () => {});

  describe('deleteAllTasks()', () => {});

  describe('deleteAllTasks()', () => {
    const queue: ITask[] = [
      { id: 0, group: 'first' },
      { id: 1, group: 'second' },
      { id: 2, group: 'third' },
    ];

    it('deletes queue entirely', () => {
      const instance = new TasksManager();

      instance['queue'] = [...queue];
      instance.deleteAllTasks();
    });

    it('finishes tasks', () => {
      const instance = new TasksManager();
      const spy = sinon.spy(instance, 'finishTask' as any);

      instance['queue'] = [...queue];
      instance.deleteAllTasks();

      expect(spy.calledThrice).equals(true);

      const calls = spy.getCalls();

      calls.forEach((r, index) => {
        expect(r.args[0]).equals(
          queue[index].id,
          `Didn't finish task correctly`,
        );
      });
    });
  });

  describe('createTaskId()', () => {
    it('creates unique id', () => {
      const instance = new TasksManager();

      const prevId = instance['taskCounter'];
      const id = instance.createTaskId();

      expect(prevId !== id).equals(true);
      expect(id).to.be.a('number');
    });
  });

  describe('finishTask()', () => {
    it('emits an event', () => {
      const instance = new TasksManager();
      const id = 0;
      const data = { message: 'hello there' };
      const error = new Error();

      const listener = sinon.fake();

      instance.once('change', listener);
      instance['finishTask'](id, data, error);

      expect(
        listener.calledOnceWithExactly({
          taskId: id,
          type: 'finished',
          data,
          error,
        } as ITaskChange),
      ).equals(true, `Didn't emit event correctly`);
    });
  });

  describe('handle()', () => {
    it('has correct queue size and execute order using one worker', (done) => {
      const instance = new TasksManager();
      let str = '';

      const enqueue = (message: string) => {
        return instance.handle(() => {
          str += message;
        }, 'a');
      };

      instance.setWorkers('a');
      instance.pauseWorkers(0);

      enqueue('a');
      enqueue('b');
      enqueue('c');

      instance.handle((e) => {
        expect(str).equals('abc', 'Incorrect execute order');
        done();
      }, 'a');

      expect(instance['queue'].length).equals(4, 'Incorrect queue size');

      expect(instance['queue'].map((r) => r.group)).eqls(
        ['a', 'a', 'a', 'a'],
        'Incorrect queue order',
      );

      instance.resumeWorkers(0);
    });

    it('has correct execute order when throttling', (done) => {
      const instance = new TasksManager();

      let str = '';
      let counter = 0;

      instance.setWorkers('a', 'b');

      const enqueue = (message: string, timeout = 0) => async () => {
        await delay(timeout);

        str += message;
        counter++;

        if (counter === 5) {
          expect(str).equals('abcde');
          done();
        }
      };
      instance.handle(enqueue('d', 10), 'a');
      instance.handle(enqueue('e'), 'a');
      instance.handle(enqueue('a'), 'b');
      instance.handle(enqueue('b', 1), 'b');
      instance.handle(enqueue('c'), 'b');
    });
  });
});
