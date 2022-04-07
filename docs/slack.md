# Slack

EveryAuth is the easiest way to call Slack APIs from your app without learning OAuth. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding Slack support to your app.

## Authorize access to Slack

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to Slack APIs
router.use(
  "/slack",
  everyauth.authorize("slack", {
    finishedUrl: "/slack/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/slack/finished", (req, res) => {
  res.send("Thank you for authorizing access to Slack!");
});
```

When you want users of your app to authorize access to Slack so that your app can call Slack APIs on their behalf, redirect their browser to the `/slack` endpoint above.

## Call Slack APIs

After a user has authorized your app to call Slack APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the [@slack/web-api](https://www.npmjs.com/package/@slack/web-api) npm module.

First, use EveryAuth to resolve the identifier of the user of your app to Slack credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get Slack credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("slack", userId);
```

Then, instantiate the Slack client and make the API calls you want:

```javascript
import { WebClient } from '@slack/web-api';

// Call Slack API
const slackClient = new WebClient(credentials.accessToken);
await slackClient.chat.postMessage({
  text: 'Hello world from EveryAuth!',
  channel: "#general",
});
```

## Configure Slack service

The shared Slack OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call Slack APIs right away. The following OAuth scopes are included:
* chat:write 
* users:read 
* channels:read 
* channels:join 
* chat:write.public 
* files:write

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth app in Slack](https://api.slack.com/authentication/basics), and then use the EveyAuth CLI to configure the Slack service to use it:

```bash
everyauth service set slack \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The @slack/web-api npm module](https://www.npmjs.com/package/@slack/web-api)  
[Create Slack OAuth app](https://api.slack.com/authentication/basics)  
[Fusebit](https://fusebit.io)
