#!/usr/bin/env node
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@actions/core");
var aws_sdk_1 = __importDefault(require("aws-sdk"));
var elasticbeanstalk_1 = __importDefault(require("aws-sdk/clients/elasticbeanstalk"));
var AWSEbsEnvType = 'aws:elasticbeanstalk:application:environment';
function initLogs() {
    console.info = function (msg, data) { return console.log("::info::" + msg, data); };
    console.error = function (msg, data) { return console.log("::error::" + msg, data); };
    console.warn = function (msg, data) { return console.log("::warning::" + msg, data); };
    console.log("Check-ebs-env-variables: GitHub Action for checking AWS Elastic Beanstalk environment's variables.");
}
function parseArgs() {
    var region = (process.env.INPUT_REGION || '').trim();
    var accessKeyId = (process.env.INPUT_AWS_ACCESS_KEY || '').trim();
    var secretAccessKey = (process.env.INPUT_AWS_SECRET_KEY || '').trim();
    var environmentName = (process.env.INPUT_ENVIRONMENT_NAME || '').trim();
    var applicationName = (process.env.INPUT_APPLICATION_NAME || '').trim();
    if (!region) {
        console.error('Error: Region was not specified in the arguments with.');
        process.exit(1);
    }
    if (!environmentName) {
        console.error("Error: Environment's name was not specified in the arguments with.");
        process.exit(1);
    }
    if (!accessKeyId) {
        console.error('Error: AWS Access Key was not specified in the arguments with.');
        process.exit(1);
    }
    if (!secretAccessKey) {
        console.error('Error: AWS Secret Key was not specified in the arguments with.');
        process.exit(1);
    }
    if (!applicationName) {
        console.error("Error: Application's name was not specified in the arguments with.");
        process.exit(1);
    }
    return {
        region: region,
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
        environmentName: environmentName,
        applicationName: applicationName,
    };
}
function connectToAWS(_a) {
    var region = _a.region, onSuccess = _a.onSuccess, accessKeyId = _a.accessKeyId, secretAccessKey = _a.secretAccessKey;
    var config = new aws_sdk_1.default.Config({
        region: region,
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
    });
    aws_sdk_1.default.config.update({ region: region, accessKeyId: accessKeyId, secretAccessKey: secretAccessKey });
    config.getCredentials(function (error) {
        if (error) {
            console.error('Checking failed: Error while authenticating in AWS.', { stack: error.stack });
            process.exit(1);
        }
        onSuccess();
    });
}
function getEBSEnvVariables(_a) {
    var environmentName = _a.environmentName, applicationName = _a.applicationName;
    var ebsParams = {
        EnvironmentName: environmentName,
        ApplicationName: applicationName,
    };
    var elasticbeanstalk = new elasticbeanstalk_1.default();
    elasticbeanstalk.describeConfigurationSettings(ebsParams, function (err, data) {
        if (err) {
            console.error('Error: An issue during getting the env configuration settings.', __assign({}, err));
            process.exit(1);
        }
        if ((data.ConfigurationSettings || []).length !== 0) {
            var configuration = (data.ConfigurationSettings || [])[0];
            var OptionSettings = configuration.OptionSettings;
            var envVariables = OptionSettings.filter(function (option) {
                return option.Namespace === AWSEbsEnvType;
            }).map(function (option) { return ({
                name: option.OptionName,
                value: option.Value,
            }); });
            core_1.setOutput('ebs_env_var', envVariables);
            process.exit(0);
        }
        console.error("Error: The Env name " + environmentName + " of the application " + applicationName + " does not have any configuration.", { data: data });
        process.exit(1);
    });
}
function init() {
    initLogs();
    var _a = parseArgs(), region = _a.region, accessKeyId = _a.accessKeyId, secretAccessKey = _a.secretAccessKey, environmentName = _a.environmentName, applicationName = _a.applicationName;
    console.group('Checking the AWS EBS environment with arguments:');
    console.log("          Environment's name: ", environmentName);
    console.log('                  AWS Region: ', region);
    console.log("          Application's Name: ", applicationName);
    console.groupEnd();
    connectToAWS({
        region: region,
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
        onSuccess: function () { return getEBSEnvVariables({ environmentName: environmentName, applicationName: applicationName }); },
    });
}
init();
