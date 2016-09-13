'use strict';

require('dotenv').config();
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const AWS_REGION = process.env.AWS_REGION;
const LAMBDA_ENV_DETECT = 'AWS_LAMBDA_FUNCTION_VERSION';
const LOGIN_URL = 'https://www.nestpensions.org.uk/pkmslogin.form';
const LOGIN_REDIRECT = 'https://www.nestpensions.org.uk/schemeweb/NestWeb/faces/secure/common/pages/loginResolver.xhtml';
const FUND_URL = 'https://www.nestpensions.org.uk/schemeweb/NestWeb/faces/secure/FE/pages/fundValueLanding.xhtml';
const IS_LAMBDA = process.env.hasOwnProperty(LAMBDA_ENV_DETECT);

let Promise = require("bluebird");
let request = require("request");
let cheerio = require('cheerio');
let uuid = require('uuid');
let AWS = require('aws-sdk');
let nest = Promise.promisifyAll(request.defaults({jar:request.jar()}));
let dynamo = Promise.promisifyAll(new AWS.DynamoDB.DocumentClient({region:AWS_REGION}));

/**
 * Log in to NEST, storing the authorization cookie
 */
function login() {
  let formData = {
    username: USERNAME,
    password: PASSWORD,
    ['login-form-type']: 'pwd'
  };
  return nest.postAsync({uri:LOGIN_URL, form:formData})
}

/**
 * Validate a NEST login response based on the headers
 * @param loginResponse {object} The HTTP response from a login request
 */
function validateLogin(loginResponse) {
  if (loginResponse.headers.location !== LOGIN_REDIRECT) throw new Error('Login failed');
}

/**
 * Follow the NEST login redirect
 */
function resolveLogin() {
  return nest.getAsync(LOGIN_REDIRECT);
}

/**
 * Load the NEST fund page
 */
function getFundPage() {
  return nest.getAsync(FUND_URL);
}

/**
 * Find the fund value in the fund page DOM
 * @param fundPageResponse {object} The HTTP response from the fund page
 */
function getFundValue(fundPageResponse) {
  try {
    let $ = cheerio.load(fundPageResponse.body);
    let fundValueHTML = $('#fundValueLanding .content').text();
    let matchedValue = /\£([0-9\.]+)\s/.exec(fundValueHTML);
    return +matchedValue[1];
  } catch (error) {
    throw new Error(`Could not find fund value in ${fundPageResponse.req.path}`);
  }
}

/**
 * Create and insert value entry
 */
function createTableEntry(value) {
  if (!IS_LAMBDA) return  value;

  let id = uuid.v1();
  let timestamp = +new Date;
  var params = {
    Item: {id, timestamp, value},
    TableName: 'NestData'
  };
  return dynamo.putAsync(params);
}

/**
 * Do all the things.
 *
 * @param event {object} The event that triggered this Lambda job
 * @param context {object} The Lambda context
 * @param callback {object} The Lambda callback
 */
function lambdaTrigger(event, context, callback) {
  login()
    .then(validateLogin)
    .then(resolveLogin)
    .then(getFundPage)
    .then(getFundValue)
    .then(createTableEntry)
    .then(value => callback(null, value))
    .catch(error => callback(error));
}

/**
 * If we're running outside of Lambda, invoke the handler
 */
if (!IS_LAMBDA) {
  console.log('Local environment detected, running lambda...');
  lambdaTrigger(null, null, console.log.bind(console));
}

module.exports = {
  handler:lambdaTrigger
};
