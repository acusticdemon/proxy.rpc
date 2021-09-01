const sha1 = require('sha1');
const info = require('../package.json');

const SYSTEM_KEYS = [
  'HOME',
  'LANG',
  'LC_CTYPE',
  'LC_TERMINAL',
  'LC_TERMINAL_VERSION',
  'LOGNAME',
  'LS_COLORS',
  'MAIL',
  'NODE_ENV',
  'OLDPWD',
  'PATH',
  'PWD',
  'SHELL',
  'SHLVL',
  'SUDO_COMMAND',
  'SUDO_GID',
  'SUDO_UID',
  'SUDO_USER',
  'TERM',
  'USER',
  'USERNAME',
  '_',
];

const getAppVersion = () => info.version;
const getAppDeps = () => info.dependencies;

const getAppVariables = () => {
  const variables = {};

  for (const key in process.env) {
    if (!SYSTEM_KEYS.includes(key)) {
      variables[key] = sha1(process.env[key]);
    }
  }

  return variables;
};

const getAppVersionAt = () => {
  const matches = process.cwd().match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);

  if (!matches) return null;

  return new Date(+matches[1], +matches[2] - 1, +matches[3], +matches[4], +matches[5], +matches[6])
};

module.exports = {
  getAppVersion,
  getAppDeps,
  getAppVariables,
  getAppVersionAt,
};