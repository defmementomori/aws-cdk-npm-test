#!/usr/bin/env node
import "source-map-support/register";
import { App, Tags } from "aws-cdk-lib";

import { OrgHealthStack } from "../lib/OrgHealthStack";

const app = new App();
Tags.of(app).add("repository", "OrgDetectiveGuardrail");

//  root account , specific region
new OrgHealthStack(app, "OrgHealthStack", {
  env: { region: "us-east-1" },
  orgHealthMinutesInterval: "30",
  orgHealthSlackWebHookPath: "",
});
