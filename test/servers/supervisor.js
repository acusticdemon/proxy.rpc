const _ = require('lodash');

const ProxyRpc = require('../../index');
const {runAsync} = require('../helpers/rpc');

const {WORKER_PORT = 9900, PORT: port = 9901} = process.env;

const controller = {};
const worker = ProxyRpc.at(`localhost:${WORKER_PORT}`);
const proxy = (path) => _.set(controller, path, _.partial(_.invoke, worker, path));

_.set(controller, 'noop', async () => worker.noop());
_.set(controller, 'not.found', async () => worker.not.found());
_.set(controller, 'err.thr.base', async () => worker.err.thr.base());
_.set(controller, 'err.thr.http', async () => worker.err.thr.http());
_.set(controller, 'add.obj', async (...args) => worker.add.obj(...args));
_.set(controller, 'add.arg', async (...args) => worker.add.arg(...args));

runAsync(controller, {
  port,
});
