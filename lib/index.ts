import { Construct } from 'constructs';
import {
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodejs,
  aws_events as events,
  aws_events_targets as eventsTargets,
  Duration,
} from "aws-cdk-lib";

export interface AwsCdkNpmTestProps {
  orgHealthMinutesInterval: string;
  orgHealthSlackWebHookPath: string;
}

export class AwsCdkNpmTest extends Construct {

  constructor(scope: Construct, id: string, props: AwsCdkNpmTestProps ) {
    super(scope, id);
      const { orgHealthMinutesInterval, orgHealthSlackWebHookPath } = props;
  
      const roleLambda = new iam.Role(this, "roleLambda", {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      });
      roleLambda.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambdaExecute")
      );
      roleLambda.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSHealthFullAccess")
      );
      const healthLambda = new lambdaNodejs.NodejsFunction(this, "orgHealth", {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: "lambda/health/handler.ts",
        handler: "handler",
        environment: {
          slackWebhook: orgHealthSlackWebHookPath,
          interval: orgHealthMinutesInterval,
        },
        role: roleLambda,
        timeout: Duration.seconds(300),
      });
      const eventsRule = new events.Rule(this, "events", {
        schedule: events.Schedule.cron({
          minute: `0/${orgHealthMinutesInterval}`,
        }),
        targets: [
          new eventsTargets.LambdaFunction(healthLambda, { retryAttempts: 2 }),
        ],
      });
    
  }
}
