# Atlassian

EveryAuth is the easiest way to call Atlassian APIs from your app without learning OAuth. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding Atlassian support to your app.

## Authorize access to Atlassian

**NOTE** For the authorization to succeed using the shared OAuth client EveryAuth provides, your Atlassian subscription must contain a Jira and Confluence workspace. 

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to Atlassian APIs
router.use(
  "/atlassian",
  everyauth.authorize("atlassian", {
    finishedUrl: "/atlassian/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/atlassian/finished", (req, res) => {
  res.send("Thank you for authorizing access to Atlassian!");
});
```

When you want users of your app to authorize access to Atlassian so that your app can call Atlassian APIs on their behalf, redirect their browser to the `/atlassian` endpoint above.

## Call Atlassian APIs

After a user has authorized your app to call Atlassian APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the [superagent](https://www.npmjs.com/package/superagent) npm module to make generic HTTP calls.

First, use EveryAuth to resolve the identifier of the user of your app to Atlassian credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get Atlassian credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("atlassian", userId);
```

The Atlassian credential returned has the following schema:

```javascript
{
  "accessToken": "ey...", // Current access token to Atlassian APIs
  "native": {
    "scope": "search:confluence ...", // Scopes that were granted
    "timestamp": 1649886028422, // Time the credential was established
    "expires_at": 1649889628422, // Time the access token expires
    "access_token": "ey..." // Current access token to Atlassian APIs
  },
}
```

Then, make the API calls you want using the generic superagent HTTP client:

```javascript
import Superagent from 'superagent';

// Call Atlassian API
const response = await Superagent
    .get('https://api.atlassian.com/me')
    .set('Authorization', `Bearer ${userCredentials.accessToken}`);
const me = response.body;

```

## Configure Atlassian service

The shared Atlassian OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call Atlassian APIs right away. The following OAuth scopes are included:
* read:jira-user
* read:jira-work
* manage:jira-webhook
* search:confluence
* read:me

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth 2.0 application in Atlassian](https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/), and then use the EveyAuth CLI to configure the Atlassian service to use it:

```bash
everyauth service set atlassian \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The superagent npm module](https://www.npmjs.com/package/superagent)  
[Create Atlassian OAuth 2.0 application](https://developer.atlassian.com/cloud/confluence/oauth-2-3lo-apps/)  
[Fusebit](https://fusebit.io)
