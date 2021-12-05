import * as lodash from "lodash";
import {
  HealthClient,
  DescribeEventsForOrganizationCommand,
  DescribeAffectedAccountsForOrganizationCommand,
  OrganizationEvent,
} from "@aws-sdk/client-health";

import { notifyEventTypeCodes, notifyRegionType } from "./consts";

type OrganizationEventWithAccountId = {
  accountId?: string;
} & OrganizationEvent;

export class HealthAPI {
  private readonly client: HealthClient;
  constructor() {
    this.client = new HealthClient({});
  }


  describeEventsForOrganizationAll = async (startTime: Date, endTime: Date) => {
    const command = new DescribeEventsForOrganizationCommand({
      filter: {
        lastUpdatedTime: { from: startTime, to: endTime },
      },
      maxResults: 100,
    });

    let next = "init";
    const events = [];
    while (next) {
      const res = await this.client.send(command);
      command.input.nextToken = res.nextToken;
      next = res.nextToken || "";
      events.push(...(res.events || []));
    }
    return events;
  };

  isNotifyTargetEvent = (event: OrganizationEvent) => {
    if (event.region || "" in notifyEventTypeCodes) {
      return (
        this.isTargetEventTypeCodesSpecificRegion(
          event,
          event.region as notifyRegionType
        ) && this.isTargetStatusCode(event)
      );
    }
    return false;
  };

  private isTargetStatusCode = (event: OrganizationEvent) => {
    const notifyStatusCode = ["open", "upcoming", "closed"];
    const eventStatusCode = event.statusCode || "";
    return notifyStatusCode.includes(eventStatusCode);
  };

  private isTargetEventTypeCodesSpecificRegion = (
    event: OrganizationEvent,
    region: notifyRegionType
  ) => {
    const eventTypeCode = event.eventTypeCode || "";
    return notifyEventTypeCodes[region]
      ? notifyEventTypeCodes[region].includes(eventTypeCode)
      : false;
  };

  
  isEventScopeCodeAccoutSpecific = (event: OrganizationEvent) => {
    const eventScopeCode = event.eventScopeCode || "";
    return eventScopeCode === "ACCOUNT_SPECIFIC";
  };

  
  describeAffectedAccountsForOrganizationAll = async (
    event: OrganizationEvent
  ) => {
    const command = new DescribeAffectedAccountsForOrganizationCommand({
      eventArn: event.arn,
    });

    let next = "init";
    let accountIds: string[] = [];
    while (next) {
      const res = await this.client.send(command);
      command.input.nextToken = res.nextToken;
      next = res.nextToken || "";
      accountIds = accountIds.concat(res.affectedAccounts || []);
    }
    return accountIds;
  };

  
  addAffectedAccounts = (
    event: OrganizationEventWithAccountId,
    accountIds: string[]
  ) => {
    let events: OrganizationEventWithAccountId[] = [];
    accountIds.map((accountId) => {
      event["accountId"] = accountId;
      events.push(lodash.cloneDeep(event));
    });

    return events;
  };
}