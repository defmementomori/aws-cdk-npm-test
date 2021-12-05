import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as AwsCdkNpmTest from '../lib/index';

test('lambda function created', () => {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, "TestStack");
  // WHEN
  new AwsCdkNpmTest.AwsCdkNpmTest(stack, 'MyTestConstruct',{
    orgHealthMinutesInterval:"30",
    orgHealthSlackWebHookPath: "/service/xxx"  
  });
  // THEN
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: "nodejs14.x"
  });
});
