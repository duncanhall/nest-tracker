'use strict';

// Ensure our credentials are loaded at startup
require('dotenv').config();
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;

const LAMBDA_ENV_DETECT = 'AWS_LAMBDA_FUNCTION_VERSION';
const LOGIN_URL = 'https://www.nestpensions.org.uk/pkmslogin.form';
const LOGIN_REDIRECT = 'https://www.nestpensions.org.uk/schemeweb/NestWeb/faces/secure/common/pages/loginResolver.xhtml';
const FUND_URL = 'https://www.nestpensions.org.uk/schemeweb/NestWeb/faces/secure/FE/pages/fundValueLanding.xhtml';

let Promise = require("bluebird");
let request = require("request");
let cheerio = require('cheerio');

// Use the same cookie jar for all requests to persist authentication
let nestRequest = Promise.promisifyAll(request.defaults({jar:request.jar()}));

/**
 * Logs in to NEST, storing the authorization cookie
 */
function login() {
  let formData = {
    username: USERNAME,
    password: PASSWORD,
    ['login-form-type']: 'pwd'
  };
  return nestRequest.postAsync({uri:LOGIN_URL, form:formData})
}

/**
 * Validates a NEST login response based on the headers
 * @param loginResponse {object} The HTTP response from a login request
 */
function validateLogin(loginResponse) {
  if (loginResponse.headers.location !== LOGIN_REDIRECT) throw new Error('Login failed');
}

/**
 * Follows the NEST login redirect
 */
function resolveLogin() {
  return nestRequest.getAsync(LOGIN_REDIRECT);
}

/**
 * Loads the NEST fund page
 */
function getFundPage() {
  return nestRequest.getAsync(FUND_URL);
}

/**
 * Finds the fund value in the fund page DOM
 * @param fundPageResponse {object} The HTTP response from the fund page
 */
function getFundValue(fundPageResponse) {
  try {
    let $ = cheerio.load(fundPageResponse.body);
    let fundValueHTML = $('#fundValueLanding .content').text();
    let matchedValue = /\£([0-9\.]+)\s/.exec(fundValueHTML);
    return matchedValue[1];
  } catch (error) {
    throw new Error(`Could not find fund value in ${fundPageResponse.req.path}`);
  }
}

/**
 * Do all the things.
 *
 * @param event {object} The event that triggered this Lambda job
 * @param context {object} The Lambda context
 * @param callback {object} The Lambda callback
 */
function lambdaTrigger(event, context, callback) {
  let exitWithResult = value => callback(null, value);
  let exitWithError = error => callback(error);
  login()
    .then(validateLogin)
    .then(resolveLogin)
    .then(getFundPage)
    .then(getFundValue)
    .then(exitWithResult)
    .catch(exitWithError);
}

/**
 * If we're running outside of Lambda, invoke the handler
 */
if (!process.env.hasOwnProperty(LAMBDA_ENV_DETECT)) {
  console.log('Local environment detected, running lambda...');
  lambdaTrigger(null, null, console.log.bind(console));
}

module.exports = {
  handler:lambdaTrigger
};
