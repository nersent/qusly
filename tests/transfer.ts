import 'mocha';
import * as sinon from 'sinon';
import { expect } from 'chai';

import { Transfer } from '../src/transfer';
import { ITransferInfo, ITransfer, ITransferProgress } from '../src/interfaces';

describe('Transfer', () => {
  describe('elapsed()', () => {
    it('returns time in seconds since start', () => {
      // @ts-ignore
      const instance = new Transfer();

      instance.startTime = Date.now() - 1000;

      expect(Math.trunc(instance.elapsed)).equals(1);
    });
  });

  describe('speed()', () => {
    it('returns speed of a transfer in bytes per second', () => {
      // @ts-ignore
      const instance = new Transfer();

      instance.startTime = Date.now() - 2000;
      instance['bytes'] = 1024 * 1024;

      expect(instance.speed).equals(1024 * 512);
    });

    it('returns 0 if elapsed time is 0', () => {
      // @ts-ignore
      const instance = new Transfer();

      expect(instance.speed).equals(0);
    });
  });

  describe('eta()', () => {
    it('returns estimated time arrival in seconds', () => {
      // @ts-ignore
      const instance = new Transfer({ totalBytes: 1024 * 1024 });

      instance.startTime = Date.now() - 2000;
      instance['bytes'] = 1024 * 512;

      expect(instance.eta).equals(2);
    });

    it('returns null if speed is 0', () => {
      // @ts-ignore
      const instance = new Transfer();

      expect(instance.eta).equals(null);
    });
  });

  describe('handleProgress()', () => {
    it('updates sent bytes', () => {
      // @ts-ignore
      const instance = new Transfer({}, { quiet: true });

      instance.handleProgress(1024);

      expect(instance['bytes']).equals(1024);
    });

    it('triggers progress listener', () => {
      const transfer: ITransfer = {
        id: 0,
        localPath: 'local',
        remotePath: 'remote',
      };

      const info: ITransferInfo = {
        ...transfer,
        totalBytes: 1024 * 1024,
        startAt: 0,
      };

      const progress: ITransferProgress = {
        bytes: 1024 * 512,
        totalBytes: info.totalBytes,
        eta: 2,
        percent: 50,
        speed: 262144,
      };

      const listener = sinon.fake();

      // @ts-ignore
      const instance = new Transfer(info, { quiet: false }, listener);

      instance.startTime = Date.now() - 2000;

      instance.handleProgress(1024 * 512);

      expect(listener.calledOnceWithExactly({ ...transfer }, progress)).equals(
        true,
        `Didin\'t emit event correctly`,
      );
    });

    it("doesn't trigger progress listener, if quiet mode is enabled", () => {
      const listener = sinon.fake();

      // @ts-ignore
      const transfer = new Transfer({}, { quiet: true }, listener);

      transfer.handleProgress(1024);

      expect(listener.called).equals(
        false,
        'Progress listener should not be triggered',
      );
    });
  });
});
