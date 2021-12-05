import { Construct } from "constructs";
import {
  Stack,
  StackProps,
  aws_iam as iam,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambdaNodejs,
  aws_events as events,
  aws_events_targets as eventsTargets,
  Duration,
} from "aws-cdk-lib";

type Props = {
  orgHealthMinutesInterval: string;
  orgHealthSlackWebHookPath: string;
} & StackProps;

export class OrgHealthStack extends Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);
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