const fs = require('fs');
const path = require('path');
const sha1 = require('sha1');
const dotenv = require('dotenv');
const info = require(path.resolve(process.cwd(), 'package.json'));

const {NODE_ENV} = process.env;

const ENV_PATH = path.resolve(process.cwd(), '.env');
const ENV_OVERRIDE_PATH = path.resolve(process.cwd(), `.env.${NODE_ENV}`);

const getAppVersion = () => {
  const parts = process.cwd().split('/');
  const dir = parts[parts.length - 1];

  const matches = dir.match(/(.*)-([0-9]{4})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})/);

  if (!matches) {
    return { date: null, version: null };
  }

  return {
    version: matches[1],
    date: new Date(+matches[2], +matches[3] - 1, +matches[4], +matches[5], +matches[6], +matches[7]),
  };
};

const getAppDeps = () => info.dependencies;

const getAppVariables = () => {
  const variables = {};

  [ENV_PATH, ENV_OVERRIDE_PATH].forEach((filepath) => {
    if (fs.existsSync(filepath)) {
      Object.assign(variables, dotenv.parse(fs.readFileSync(filepath)));
    }
  });

  for (const key in variables) {
    variables[key] = sha1(variables[key]);
  }

  return variables;
};

module.exports = {
  IsAlive: {
    IsAlive: true,
    FrameworkVersion: process.version.substr(1),
    AppVersion: getAppVersion().version,
    AppCompilationDate: getAppVersion().date,
    EnvInfo: '',
    EnvVariablesSha1: getAppVariables(),
  },

  Dependencies: {
    DependenciesMap: getAppDeps(),
  },
};