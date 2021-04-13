const _ = require('lodash');
const path = require('path');
const axios = require('axios');
const {expect} = require('chai');

const ProxyRpc = require('..');
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

  it('endpoint', async () => {
    const {status, data} = await axios.get(`http://localhost:${WORKER_PORT}/foo`);

    expect(status).to.be.equal(200);
    expect(data).to.be.equal('bar');
  });

  it('healthz', async () => {
    const {status, data} = await axios.get(`http://localhost:${WORKER_PORT}/healthz`);

    expect(status).to.be.equal(200);
    expect(data).to.be.equal('ok');
  });

  it('short path', async () => {
    const sum = await client.add.arg(1, 2);
    expect(sum).to.be.equal(3);
  });

  it('long path', async () => {
    const sum = await client.add.obj({x: 1, y: 2});
    expect(sum).to.be.equal(3);
  });

  it('not found', async () => {
    try {
      await client.add.arr();
    } catch (error) {
      const {writable} = Object.getOwnPropertyDescriptor(error, 'message');

      expect(writable).to.be.equal(true);

      expect(error).to.deep.include({
        status: 404,
        name: 'RpcError',
        message: 'Not Found',
        code: 'proxy.rpc.error',
        trace: [
          `localhost:${WORKER_PORT}/add.arr`,
        ],
      });
    }
  });

  it('internal error', async () => {
    try {
      await client.err.thr.base();
    } catch (error) {
      const {writable} = Object.getOwnPropertyDescriptor(error, 'message');

      expect(writable).to.be.equal(true);

      expect(error).to.deep.include({
        status: 500,
        name: 'RpcError',
        message: 'Simple error',
        code: 'proxy.rpc.error',
        trace: [
          `localhost:${WORKER_PORT}/err.thr.base`,
        ],
      });
    }
  });

  it('http error', async () => {
    try {
      await client.err.thr.http();
    } catch (error) {
      const {writable} = Object.getOwnPropertyDescriptor(error, 'message');

      expect(writable).to.be.equal(true);

      expect(error).to.deep.include({
        status: 400,
        name: 'RpcError',
        message: 'Bad request',
        code: 'proxy.rpc.error',
        trace: [
          `localhost:${WORKER_PORT}/err.thr.http`,
        ],
      });
    }
  });

  it('not found error', async () => {
    try {
      await client.err.thr.notFound();
    } catch (error) {
      const {writable} = Object.getOwnPropertyDescriptor(error, 'message');

      expect(writable).to.be.equal(true);

      expect(error).to.deep.include({
        status: 404,
        name: 'RpcError',
        message: 'Not Found',
        code: 'proxy.rpc.error',
        trace: [
          `localhost:${WORKER_PORT}/err.thr.notFound`,
        ],
      });
    }
  });

  it('native error', async () => {
    try {
      await ProxyRpc.at('localhost:9999', {logger}).foo.bar(1);
    } catch (error) {
      const {writable} = Object.getOwnPropertyDescriptor(error, 'message');

      expect(writable).to.be.equal(true);

      expect(error).to.deep.include({
        name: 'RpcError',
        message: 'connect ECONNREFUSED 127.0.0.1:9999',
        code: 'proxy.rpc.error',
        data: "[1]",
        trace: [
          'localhost:9999/foo.bar'
        ],
      });
    }
  });
});
