const _ = require('lodash');
const errors = require('errors');

const {runAsync} = require('../helpers/rpc');

const {PORT: port = 9900} = process.env;

const controller = {};
const add = (x, y) => x + y;

_.set(controller, 'noop', _.noop);
_.set(controller, 'add.arg', add);
_.set(controller, 'add.obj', ({x, y}) => add(x, y));
_.set(controller, 'err.thr.base', () => { throw new Error('Simple error'); });
_.set(controller, 'err.thr.http', () => { throw new errors.Http400Error('Bad request') });

runAsync(controller, {
  port,
  endpoints: {
    '/foo': () => 'bar'
  }
});
