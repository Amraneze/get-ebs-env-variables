#!/usr/bin/env node
import { setOutput } from '@actions/core';
import AWS from 'aws-sdk';
import ElasticBeanstalk from 'aws-sdk/clients/elasticbeanstalk';

const AWSEbsEnvType = 'aws:elasticbeanstalk:application:environment';

function initLogs(): void {
  console.info = (msg: string, data: any) => console.log(`::info::${msg}`, data);
  console.error = (msg: string, data: any) => console.log(`::error::${msg}`, data);
  console.warn = (msg: string, data: any) => console.log(`::warning::${msg}`, data);
  console.log(
    "Check-ebs-env-variables: GitHub Action for checking AWS Elastic Beanstalk environment's variables.",
  );
}

function parseArgs(): {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  environmentName: string;
  applicationName: string;
} {
  const region: string = (process.env.INPUT_REGION || '').trim();
  const accessKeyId: string = (process.env.INPUT_AWS_ACCESS_KEY || '').trim();
  const secretAccessKey: string = (process.env.INPUT_AWS_SECRET_KEY || '').trim();
  const environmentName: string = (process.env.INPUT_ENVIRONMENT_NAME || '').trim();
  const applicationName: string = (process.env.INPUT_APPLICATION_NAME || '').trim();

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
    region,
    accessKeyId,
    secretAccessKey,
    environmentName,
    applicationName,
  };
}

function connectToAWS({
  region,
  onSuccess,
  accessKeyId,
  secretAccessKey,
}: {
  region: string;
  onSuccess: Function;
  accessKeyId: string;
  secretAccessKey: string;
}): void {
  const config = new AWS.Config({
    region,
    accessKeyId,
    secretAccessKey,
  });
  AWS.config.update({ region, accessKeyId, secretAccessKey });
  config.getCredentials((error) => {
    if (error) {
      console.error('Checking failed: Error while authenticating in AWS.', { stack: error.stack });
      process.exit(1);
    }
    onSuccess();
  });
}

function getEBSEnvVariables({
  environmentName,
  applicationName,
}: {
  environmentName: string;
  applicationName: string;
}) {
  const ebsParams: ElasticBeanstalk.Types.DescribeConfigurationSettingsMessage = {
    EnvironmentName: environmentName,
    ApplicationName: applicationName,
  };

  const elasticbeanstalk: ElasticBeanstalk = new ElasticBeanstalk();
  elasticbeanstalk.describeConfigurationSettings(
    ebsParams,
    (err, data: ElasticBeanstalk.Types.ConfigurationSettingsDescriptions) => {
      if (err) {
        console.error('Error: An issue during getting the env configuration settings.', {
          ...err,
        });
        process.exit(1);
      }
      if ((data.ConfigurationSettings || []).length !== 0) {
        const [configuration]: Array<ElasticBeanstalk.Types.ConfigurationSettingsDescription> =
          data.ConfigurationSettings || [];
        const { OptionSettings }: any = configuration;
        const envVariables = OptionSettings.filter(
          (option: ElasticBeanstalk.Types.ConfigurationOptionSetting) =>
            option.Namespace === AWSEbsEnvType,
        ).map((option: ElasticBeanstalk.Types.ConfigurationOptionSetting) => ({
          [`${option.OptionName}`]: `${option.Value}`,
        }));
        setOutput('ebs_env_var', envVariables);
        process.exit(0);
      }
      console.error(
        `Error: The Env name ${environmentName} of the application ${applicationName} does not have any configuration.`,
        { data },
      );
      process.exit(1);
    },
  );
}

function init(): void {
  initLogs();
  const { region, accessKeyId, secretAccessKey, environmentName, applicationName } = parseArgs();

  console.group('Checking the AWS EBS environment with arguments:');
  console.log("          Environment's name: ", environmentName);
  console.log('                  AWS Region: ', region);
  console.log("          Application's Name: ", applicationName);
  console.groupEnd();

  connectToAWS({
    region,
    accessKeyId,
    secretAccessKey,
    onSuccess: () => getEBSEnvVariables({ environmentName, applicationName }),
  });
}

init();
