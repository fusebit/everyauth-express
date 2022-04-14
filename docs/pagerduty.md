# PagerDuty

EveryAuth is the easiest way for your app to access PagerDuty APIs. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding PagerDuty support to your app.

## Authorize access to PagerDuty

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to PagerDuty APIs
router.use(
  "/pagerduty",
  everyauth.authorize("pagerduty", {
    finishedUrl: "/pagerduty/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/pagerduty/finished", (req, res) => {
  res.send("Thank you for authorizing access to PagerDuty!");
});
```

When you want users of your app to authorize access to PagerDuty so that your app can call PagerDuty APIs on their behalf, redirect their browser to the `/pagerduty` endpoint above.

## Call PagerDuty APIs

After a user has authorized your app to call PagerDuty APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the [@pagerduty/pdjs](https://www.npmjs.com/package/@pagerduty/pdjs) npm module.

First, use EveryAuth to resolve the identifier of the user of your app to PagerDuty credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get PagerDuty credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("pagerduty", userId);
```

The PagerDuty credential returned has the following schema:

```javascript
{
  "accessToken": "pdus+_0X...", // Current access token to PagerDuty APIs
  "native": {
    "scope": "openid write", // Scopes that were granted
    "id_token": "ey...", // The ID token of the authenticated user
    "timestamp": 1649810924162, // Time the credential was established
    "expires_at": 1681346924162, // Time the access token expires
    "access_token": "pdus+_0X..." // Current access token to PagerDuty APIs
  },
}
```

Then, instantiate the PagerDuty client and make the API calls you want:

```javascript
import { api } from '@pagerduty/pdjs';

// Call PagerDuty API
const pagerDutyClient = api({ token: userCredentials.accessToken, tokenType: 'bearer' });
const incidents = await pagerDutyClient.get('/incidents');
```

## Configure PagerDuty service

The shared PagerDuty OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call PagerDuty APIs right away. 

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth client in PagerDuty](https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTcz-o-auth-2-0-functionality), and then use the EveyAuth CLI to configure the PagerDuty service to use it:

```bash
everyauth service set pagerduty \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The @pagerduty/pdjs npm module](https://www.npmjs.com/package/@pagerduty/pdjs)  
[Create PagerDuty OAuth client](https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTcz-o-auth-2-0-functionality)  
[Fusebit](https://fusebit.io)
