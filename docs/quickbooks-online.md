# QuickBooks

EveryAuth is the easiest way to call QuickBooks APIs from your app without learning OAuth. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding QuickBooks support to your app.

## Authorize access to QuickBooks

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to QuickBooks APIs
router.use(
  "/quickbooks-online",
  everyauth.authorize("quickbooks-online", {
    finishedUrl: "/quickbooks-online/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/quickbooks-online/finished", (req, res) => {
  res.send("Thank you for authorizing access to QuickBooks!");
});
```

When you want users of your app to authorize access to QuickBooks so that your app can call QuickBooks APIs on their behalf, redirect their browser to the `/quickbooks-online` endpoint above.

## Call QuickBooks APIs

After a user has authorized your app to call QuickBooks APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the [node-quickbooks](https://www.npmjs.com/package/node-quickbooks) npm module.

First, use EveryAuth to resolve the identifier of the user of your app to QuickBooks credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get QuickBooks credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("quickbooks-online", userId);
```

The QuickBooks credential returned has the following schema:

```javascript
{
  "accessToken": "ey...", // Current access token to QuickBooks APIs
  "native": {
    "params": {
      "realmId": "9130353034440156" // The QuickBooks company ID
    },
    "timestamp": 1649811288395, // Time the credential was established
    "expires_at": 1649814888395, // Time the access token expires
    "access_token": "ey...", // Current access token to QuickBooks APIs
  },
}```

Then, instantiate the QuickBooks client and make the API calls you want:

```javascript
import Client from 'node-quickbooks';

// Call QuickBooks API
const quickBooksClient = new Client({
  useSandbox: true, // false
  debug: true, // false
  token: userCredentials.accessToken,
  realmId: userCredentials.params?.realmId,
  oauthversion: '2.0',
});
const accounts = await quickBooksClient.findAccounts();
const customers = await quickBooksClient.findCustomers({ fetchAll: true });
```

## Configure QuickBooks service

The shared QuickBooks OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call QuickBooks APIs right away. The following OAuth scopes are included:
* com.intuit.quickbooks.accounting

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth client in QuickBooks](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0), and then use the EveyAuth CLI to configure the QuickBooks service to use it:

```bash
everyauth service set quickbooks-online \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The node-quickbooks npm module](https://www.npmjs.com/package/node-quickbooks)  
[Create QuickBooks OAuth client](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)  
[Fusebit](https://fusebit.io)
