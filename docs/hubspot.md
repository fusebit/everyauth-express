# HubSpot

EveryAuth is the easiest way for your app to access HubSpot APIs. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding HubSpot support to your app.

## Authorize access to HubSpot

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to HubSpot APIs
router.use(
  "/hubspot",
  everyauth.authorize("hubspot", {
    finishedUrl: "/hubspot/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/hubspot/finished", (req, res) => {
  res.send("Thank you for authorizing access to HubSpot!");
});
```

When you want users of your app to authorize access to HubSpot so that your app can call HubSpot APIs on their behalf, redirect their browser to the `/hubspot` endpoint above.

## Call HubSpot APIs

After a user has authorized your app to call HubSpot APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the [@hubspot/api-client](https://www.npmjs.com/package/@hubspot/api-client) npm module.

First, use EveryAuth to resolve the identifier of the user of your app to HubSpot credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get HubSpot credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("hubspot", userId);
```

The HubSpot credential returned has the following schema:

```javascript
{
  "accessToken": "CJ...", // Current access token to HubSpot APIs
  "native": {
    "timestamp": 1649810496650, // Time the credential was established
    "expires_at": 1649812296650, // Time the access token expires
    "access_token": "CJ..." // Current access token to HubSpot APIs
  },
}
```

Then, instantiate the HubSpot client and make the API calls you want:

```javascript
import { Client } from '@hubspot/api-client';

// Call HubSpot API
const hubspotClient = new Client({ accessToken: credentials.accessToken });

const contacts = await hubspotClient.crm.contacts.getAll();
```

## Configure HubSpot service

The shared HubSpot OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call HubSpot APIs right away. The following OAuth scopes are included:
* contacts

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth client in HubSpot](https://developers.hubspot.com/docs/api/working-with-oauth), and then use the EveyAuth CLI to configure the HubSpot service to use it:

```bash
everyauth service set hubspot \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The @hubspot/api-client npm module](https://www.npmjs.com/package/@hubspot/api-client)  
[Create HubSpot OAuth client](https://developers.hubspot.com/docs/api/working-with-oauth)  
[Fusebit](https://fusebit.io)
