'use strict';

// Ensure our .env file is loaded before anything else
require('dotenv').config();

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const LOGIN_URL = 'https://www.nestpensions.org.uk/pkmslogin.form';
const LOGIN_REDIRECT = 'https://www.nestpensions.org.uk/schemeweb/NestWeb/faces/secure/common/pages/loginResolver.xhtml';
const FUND_URL = 'https://www.nestpensions.org.uk/schemeweb/NestWeb/faces/secure/FE/pages/fundValueLanding.xhtml';

let Promise = require("bluebird");
let request = require("request");
let cheerio = require('cheerio');

let jar = request.jar();
let nestRequest = request.defaults({simple:false, jar:jar});
Promise.promisifyAll(nestRequest);

function login() {
    let formData = {
        username: USERNAME,
        password: PASSWORD,
        ['login-form-type']: 'pwd'
    };
    return nestRequest.postAsync({uri:LOGIN_URL, form:formData})
}

function validateLogin(loginResponse) {
    if (loginResponse.headers.location !== LOGIN_REDIRECT) throw new Error('Login failed');
}

function getMemberPage() {
    return nestRequest.getAsync(LOGIN_REDIRECT);
}

function getFundPage() {
    return nestRequest.getAsync(FUND_URL);
}

function showResult(fundPage) {
    try {
        let $ = cheerio.load(fundPage.body);
        let fundValueHTML = $('#fundValueLanding .content').text();
        let matchedValue = /\£([0-9\.]+)\s/.exec(fundValueHTML);
        return matchedValue[1];
    } catch (error) {
        throw new Error(`Could not find fund value in ${fundPage.req.path}`);
    }
}

function lambdaTrigger(event, context, callback) {
    let exitWithResult = value => callback(null, value);
    let exitWithError = error => callback(error);
    login()
        .then(validateLogin)
        .then(getMemberPage)
        .then(getFundPage)
        .then(showResult)
        .then(exitWithResult)
        .catch(exitWithError);
}

module.exports = {
    handler:lambdaTrigger
};