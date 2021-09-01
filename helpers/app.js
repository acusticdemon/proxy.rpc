const fs = require('fs');
const path = require('path');
const sha1 = require('sha1');
const dotenv = require('dotenv');
const info = require('../package.json');

const {NODE_ENV} = process.env;

const ENV_PATH = path.resolve(process.cwd(), '.env');
const ENV_OVERRIDE_PATH = path.resolve(process.cwd(), `.env.${NODE_ENV}`);

const getAppVersion = () => info.version;
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

const getAppVersionAt = () => {
  const matches = process.cwd().match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);

  if (!matches) return null;

  return new Date(+matches[1], +matches[2] - 1, +matches[3], +matches[4], +matches[5], +matches[6]);
};

module.exports = {
  version: getAppVersion(),
  versionAt: getAppVersionAt(),
  variables: getAppVariables(),
  deps: getAppDeps(),

  getAppVersion,
  getAppVersionAt,
  getAppVariables,
  getAppDeps,
};