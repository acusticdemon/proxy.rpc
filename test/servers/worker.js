const _ = require('lodash');
const {RpcError} = require('../../errors');
const {runAsync} = require('../helpers/rpc');

const {PORT: port = 9900} = process.env;

class HttpError extends RpcError {
  constructor(status, message) {
    super({
      message,
    });

    this.status = status;
  }
}

const controller = {};

const add = (x, y) => x + y;

_.set(controller, 'noop', _.noop);
_.set(controller, 'add.arg', add);
_.set(controller, 'add.obj', ({x, y}) => add(x, y));
_.set(controller, 'err.thr.base', () => { throw new Error('Simple error'); });
_.set(controller, 'err.thr.http', () => { throw new HttpError(400, 'Bad request') });

runAsync(controller, {
  port,
  endpoints: {
    '/foo': (req, res) => {
      res.end('bar');
    }
  }
});
