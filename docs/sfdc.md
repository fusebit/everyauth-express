# Salesforce

EveryAuth is the easiest way for your app to access Salesforce APIs. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding Salesforce support to your app.

## Authorize access to Salesforce

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to Salesforce APIs
router.use(
  "/sfdc",
  everyauth.authorize("sfdc", {
    finishedUrl: "/sfdc/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/sfdc/finished", (req, res) => {
  res.send("Thank you for authorizing access to Salesforce!");
});
```

When you want users of your app to authorize access to Salesforce so that your app can call Salesforce APIs on their behalf, redirect their browser to the `/sfdc` endpoint above.

## Call Salesforce APIs

After a user has authorized your app to call Salesforce APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the [jsforce](https://www.npmjs.com/package/jsforce) npm module.

First, use EveryAuth to resolve the identifier of the user of your app to Salesforce credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get Salesforce credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("sfdc", userId);
```

The Salesforce credential returned has the following schema:

```javascript
{
  "accessToken": "00D4...", // Current access token to Salesforce APIs
  "native": {
    "id": "https://login.salesforce.com/id/00D4x0000031lIEEAY/00...",
    "scope": "refresh_token api", // Scopes that were granted
    "timestamp": 1649812195558, // Time the credential was established
    "expires_at": 1649815795558, // Time the credential was established
    "access_token": "00D4...", // Current access token to Salesforce APIs
    "instance_url": "https://fusebit-dev-ed.my.salesforce.com"
  },
}
```

Then, instantiate the Salesforce client and make the API calls you want:

```javascript
import jsforce from 'jsforce';

// Call Salesforce API
const sfdcClient = new jsforce.Connection({
  instanceUrl: userCredentials.native.instance_url,
  accessToken: userCredentials.accessToken,
});
const contacts = await sfdcClient.query('SELECT name, email FROM Contact');
```

## Configure Salesforce service

The shared Salesforce OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call Salesforce APIs right away. The following OAuth scopes are included:
* api

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth client in Salesforce](https://developer.salesforce.com/docs/atlas.en-us.api_streaming.meta/api_streaming/code_sample_auth_oauth.htm), and then use the EveyAuth CLI to configure the Salesforce service to use it:

```bash
everyauth service set sfdc \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The jsforce npm module](https://www.npmjs.com/package/jsforce)  
[Create Salesforce OAuth client](https://developer.salesforce.com/docs/atlas.en-us.api_streaming.meta/api_streaming/code_sample_auth_oauth.htm)  
[Fusebit](https://fusebit.io)
