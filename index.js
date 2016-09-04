'use strict';

// Ensure our .env file is loaded before anything else
require('dotenv').config();

const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const LOGIN_URL = 'https://www.nestpensions.org.uk/pkmslogin.form';
const MEMBER_URL = 'https://www.nestpensions.org.uk/schemeweb/NestWeb/faces/secure/common/pages/loginResolver.xhtml';
const FUND_URL = 'https://www.nestpensions.org.uk/schemeweb/NestWeb/faces/secure/FE/pages/fundValueLanding.xhtml';

let Promise = require("bluebird");
let request = require("request");
let cheerio = require('cheerio');

let jar = request.jar();
let nestRequest = request.defaults({simple:false, jar:jar});
Promise.promisifyAll(nestRequest);

function login() {
    console.log('Logging in...');
    let formData = {};
    formData.username = USERNAME;
    formData.password = PASSWORD;
    formData['login-form-type'] = 'pwd';
    return nestRequest.postAsync({uri:LOGIN_URL, form:formData});
}

function getMemberPage() {
    console.log('Getting member page...');
    return nestRequest.getAsync({url:MEMBER_URL});
}

function getFundPage() {
    console.log('Getting fund page...');
    return nestRequest.getAsync({url:FUND_URL});
} 

function showResult(fundDom) {
    console.log('Reading Dom...');
    let $ = cheerio.load(fundDom.body);
    let fundValueHTML = $('#fundValueLanding .content').text();
    let matchedValue = /\£([0-9\.]+)\s/.exec(fundValueHTML);
    let fundValue = matchedValue[1];
    console.log('Your fund value is £' + fundValue);
    return fundValue;
}

function lambdaTrigger(event, context, callback) {
    if (USERNAME === undefined || PASSWORD === undefined) {
        return callback('Username or password is not defined. Check your .env file');
    }
    login()
        .then(getMemberPage)
        .then(getFundPage)
        .then(showResult)
        .then(x => callback(null, 'Value retrieved sucessfully'))
        .catch(console.error.bind(console));
}

module.exports = {
    handler:lambdaTrigger
};