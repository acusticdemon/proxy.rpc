const _ = require('lodash');
const path = require('path');
const {expect} = require('chai');

const ProxyRpc = require('../index');
const {forkAsync} = require('./helpers/child');

const workerPath = path.resolve(__dirname, './servers/worker.js');

// mute logs
const logger = {
  info: _.noop,
  error: _.noop,
};

const WORKER_PORT = 9900;

describe('proxy.rpc', async () => {
  let worker, client;

  before(async () => {
    worker = await forkAsync(workerPath, {
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      env: {
        PORT: WORKER_PORT,
      },
    });

    client = ProxyRpc.at(`localhost:${WORKER_PORT}`, {
      logger,
    });
  });

  after(() => {
    worker.kill();
  });

  it('direct fn', async () => {
    const res = await client.noop();
    expect(res).to.be.equal('ok');
  });

  it('short path', async () => {
    const sum = await client.add.arg(1, 2);
    expect(sum).to.be.equal(3);
  });

  it('long path', async () => {
    const sum = await client.add.obj({x: 1, y: 2})
    expect(sum).to.be.equal(3);
  });

  it('not found', async () => {
    try {
      await client.add.arr();
    } catch (error) {
      expect(error).to.include({
        code: 404,
        message: `proxy.rpc.error in path localhost:${WORKER_PORT}:/add.arr Not Found`,
      });
    }
  });

  it('internal error', async () => {
    try {
      await client.err.thr.base();
    } catch (error) {
      expect(error).to.include({
        code: 500,
        message: `proxy.rpc.error in path localhost:${WORKER_PORT}:/err.thr.base Simple error`,
      });
    }
  });

  it('http error', async () => {
    try {
      await client.err.thr.http();
    } catch (error) {
      expect(error).to.include({
        code: 400,
        message: `proxy.rpc.error in path localhost:${WORKER_PORT}:/err.thr.http Bad request`,
      });
    }
  });
});
