import { OrganizationEvent } from "@aws-sdk/client-health";
import { HealthAPI } from "./healthClass";
import { postSlackMessage } from "./slack-webhook-api";

type OrganizationEventWithAccountId = {
  accountId?: string;
} & OrganizationEvent;

type eventType = {
  minutesStartFrom?: number;
};
const slackWebhookPath = process.env.slackWebhook || "";
const interval = process.env.interval || "";

const generateSlackMessage = (event: OrganizationEventWithAccountId) => {
  const {
    arn,
    eventScopeCode,
    eventTypeCode,
    eventTypeCategory,
    region,
    service,
    accountId,
  } = event;
  const baseUrl =
    eventTypeCategory === "scheduledChange"
      ? "https://phd.aws.amazon.com/phd/home#/dashboard/scheduled-changes"
      : eventTypeCategory === "issue"
      ? "https://phd.aws.amazon.com/phd/home#/dashboard/open-issues"
      : eventTypeCategory === "accountNotification"
      ? "https://phd.aws.amazon.com/phd/home#/dashboard/other-notifications"
      : "";

  const slackMessage = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "orgHealth",
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*accountId:*\n${accountId}`,
        },
        {
          type: "mrkdwn",
          text: `*region:*\n${region}`,
        },
      ],
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*service:*\n${service}`,
        },
        {
          type: "mrkdwn",
          text: `*eventTypeCode:*\n${eventTypeCode}`,
        },
        {
          type: "mrkdwn",
          text: `*eventScopeCode:*\n${eventScopeCode}`,
        },
        {
          type: "mrkdwn",
          text: `*eventTypeCategory:*\n${eventTypeCategory}`,
        },
      ],
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*url:*\n${baseUrl}?eventID=${arn}&eventTab=details`,
        },
      ],
    },
  ];
  return slackMessage;
};

export const handler = async (event: eventType) => {
  const heatlhApi = new HealthAPI();
  const fromTime = new Date();
  const now = new Date();
  const diff = event.minutesStartFrom || Number(interval);
  fromTime.setMinutes(now.getMinutes() - diff);
  // 期間中の全イベントを取得
  const allEvents = await heatlhApi.describeEventsForOrganizationAll(
    fromTime,
    now
  );
  console.log("INFO:", JSON.stringify(allEvents));
  // 通知対象をselect
  const notifyEvents = allEvents.filter((event) => {
    return heatlhApi.isNotifyTargetEvent(event);
  });

  // account_specificのeventを取得
  const notifyEventsAccountSpecific = notifyEvents.filter((event) => {
    return heatlhApi.isEventScopeCodeAccoutSpecific(event);
  });

  // account_specificのeventにアカウントID情報を付与;
  const notifyEventsWithAccountId: OrganizationEventWithAccountId[] = [];
  await Promise.all(
    notifyEventsAccountSpecific.map(async (event) => {
      const accountIds =
        await heatlhApi.describeAffectedAccountsForOrganizationAll(event);
      const eventsWithAccountId = heatlhApi.addAffectedAccounts(
        event,
        accountIds
      );
      notifyEventsWithAccountId.push(...eventsWithAccountId);
    })
  );

  // account_specificでないeventを取得
  const notifyEventsNotAccountSpecific = notifyEvents.filter((event) => {
    return !heatlhApi.isEventScopeCodeAccoutSpecific(event);
  });

  // event毎に通知
  const eventIds = notifyEventsWithAccountId.concat(
    notifyEventsNotAccountSpecific
  );
  const res = await Promise.all(
    eventIds.map(async (event) => {
      try {
        const res = await postSlackMessage(
          generateSlackMessage(event),
          slackWebhookPath
        );
        console.log("res:", res);
      } catch (e) {
        console.log(`error:${e}`);
      }
    })
  );
  return 200;
};