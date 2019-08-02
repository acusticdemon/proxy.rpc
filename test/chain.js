const _ = require('lodash');
const path = require('path');
const { expect } = require('chai');

const ProxyRpc = require('../index');
const { forkAsync } = require('./helpers/child');

const workerPath = path.resolve(__dirname, './servers/worker.js');
const supervisorPath = path.resolve(__dirname, './servers/supervisor.js');

// mute logs
const logger = {
  info: _.noop,
  error: _.noop,
};

const WORKER_PORT = 9900;
const SUPERVISOR_PORT = 9901;

describe('proxy.rpc.chain', async () => {
  let worker, supervisor, client;

  before(async () => {
    [worker, supervisor] = await Promise.all([
      forkAsync(workerPath, {
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        env: {
          PORT: WORKER_PORT,
        }
      }),
      forkAsync(supervisorPath, {
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        env: {
          PORT: SUPERVISOR_PORT,
        },
      }),
    ]);

    client = ProxyRpc.at(`localhost:${SUPERVISOR_PORT}`, {
      logger,
    });
  });

  after(() => {
    worker.kill();
    supervisor.kill();
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
    const sum = await client.add.obj({ x: 1, y: 2 })
    expect(sum).to.be.equal(3);
  });

  it('not found', async () => {
    try {
      await client.not.found();
    } catch (error) {
      expect(error).to.include({
        code: 404,
        message: `proxy.rpc.error in path localhost:${SUPERVISOR_PORT}:/not.found proxy.rpc.error in path localhost:${WORKER_PORT}:/not.found Not Found`,
      });
    }
  });

  it('internal error', async () => {
    try {
      await client.err.thr.base();
    } catch (error) {
      expect(error).to.include({
        code: 500,
        message: `proxy.rpc.error in path localhost:${SUPERVISOR_PORT}:/err.thr.base proxy.rpc.error in path localhost:${WORKER_PORT}:/err.thr.base Simple error`,
      });
    }
  });

  it('http error', async () => {
    try {
      await client.err.thr.http();
    } catch (error) {
      expect(error).to.include({
        code: 400,
        message: `proxy.rpc.error in path localhost:${SUPERVISOR_PORT}:/err.thr.http proxy.rpc.error in path localhost:${WORKER_PORT}:/err.thr.http Bad request`,
      });
    }
  });
});
