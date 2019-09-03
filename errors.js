const errors = require('errors');

// disable stacktraces for errors
errors.stacks(false);

// define exported RpcError constructor
const RpcError = errors.create({
  code: 'proxy.rpc.error',
  name: 'RpcError',
});

module.exports = {
  RpcError,
};
