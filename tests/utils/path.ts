import { expect } from 'chai';
import * as sinon from 'sinon';
import 'mocha';
import { promises as fs } from 'fs';

import * as pathUtils from '../../src/utils/path';

describe('Path utils', () => {
  describe('formatPath', () => {
    it('supports start path', () => {
      const str = pathUtils.formatPath('/var/www', { name: 'test' });

      expect(str).equals('/var/www/test');
    });

    it('supports no start path', () => {
      const str = pathUtils.formatPath('', { name: 'test' });

      expect(str).equals('/test');
    });
  });

  describe('checkIfExists', () => {
    const sandbox = sinon.createSandbox();

    afterEach(sandbox.restore);

    it('returns false if path does\'t exists', async () => {
      sandbox.stub(fs, 'access').throws();

      const exists = await pathUtils.checkIfExists('/var/www/');

      expect(exists).equals(false);
    });

    it('returns true if path does exists', async () => {
      sandbox.stub(fs, 'access');

      const exists = await pathUtils.checkIfExists('/var/www/');

      expect(exists).equals(true);
    });
  });

  describe('ensureExists', () => {
    const sandbox = sinon.createSandbox();

    afterEach(sandbox.restore);

    it('creates a new directory', async () => {
      const localPath = '/user/root';

      const checkIfExistsStub = sandbox.stub(pathUtils, 'checkIfExists').returns(false as any);
      const mkdirSpy = sandbox.stub(fs, 'mkdir');

      await pathUtils.ensureExists(localPath);

      expect(checkIfExistsStub.calledOnceWith(localPath)).equals(true);
      expect(mkdirSpy.calledOnce).equals(true);
    });

    it('doesn\'t create a new directory', async () => {
      const checkIfExistsStub = sandbox.stub(pathUtils, 'checkIfExists').returns(true as any);
      const mkdirSpy = sandbox.stub(fs, 'mkdir');

      await pathUtils.ensureExists('/user/root');

      expect(checkIfExistsStub.calledOnce).equals(true);
      expect(mkdirSpy.calledOnce).equals(false);
    });
  });
});
