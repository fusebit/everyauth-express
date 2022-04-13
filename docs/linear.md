# Linear

EveryAuth is the easiest way to call Linear APIs from your app without learning OAuth. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding Linear support to your app.

## Authorize access to Linear

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to Linear APIs
router.use(
  "/linear",
  everyauth.authorize("linear", {
    finishedUrl: "/linear/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/linear/finished", (req, res) => {
  res.send("Thank you for authorizing access to Linear!");
});
```

When you want users of your app to authorize access to Linear so that your app can call Linear APIs on their behalf, redirect their browser to the `/linear` endpoint above.

## Call Linear APIs

After a user has authorized your app to call Linear APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the [@linear/sdk](https://www.npmjs.com/package/@linear/sdk) npm module.

First, use EveryAuth to resolve the identifier of the user of your app to Linear credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get Linear credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("linear", userId);
```

The Linear credential returned has the following schema:

```javascript
{
  "accessToken": "lin_oauth_89...", // Current access token to Linear APIs
  "native": {
    "scope": ["read","write"], // Scopes that were granted
    "timestamp": 1649810730286, // Time the credential was established
    "expires_at": 1965516329286, // Time the access token expires
    "access_token": "lin_oauth_89..." // Current access token to Linear APIs
  },
}
```

Then, instantiate the Linear client and make the API calls you want:

```javascript
import { LinearClient } from '@linear/sdk';

// Call Linear API
const linearClient = new LinearClient({ accessToken: credentials.accessToken });

const me = await linearClient.viewer;
const myIssues = await me.assignedIssues();
```

## Configure Linear service

The shared Linear OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call Linear APIs right away. The following OAuth scopes are included:
* read
* write

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth client in Linear](https://developers.linear.app/docs/oauth/authentication), and then use the EveyAuth CLI to configure the Linear service to use it:

```bash
everyauth service set linear \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The @linear/sdk npm module](https://www.npmjs.com/package/@linear/sdk)  
[Create Linear OAuth client](https://developers.linear.app/docs/oauth/authentication)  
[Fusebit](https://fusebit.io)
