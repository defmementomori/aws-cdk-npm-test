import * as https from "https";

// TODO: 型を定義する
/* eslint-disable @typescript-eslint/no-explicit-any */
export const postSlackMessage = (
  messages: any[],
  webhookUrl: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "hooks.slack.com",
      path: webhookUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    };
    const req = https.request(options, (_) => {
      resolve("Success");
    });
    req.on("error", (e) => {
      reject(e.message);
    });
    // send the request
    req.write(
      JSON.stringify({
        blocks: messages,
      })
    );
    req.end();
  });
};
