# Asana

EveryAuth is the easiest way for your app to access Asana APIs. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding Asana support to your app.

## Authorize access to Asana

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to Asana APIs
router.use(
  "/asana",
  everyauth.authorize("asana", {
    finishedUrl: "/asana/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/asana/finished", (req, res) => {
  res.send("Thank you for authorizing access to Asana!");
});
```

When you want users of your app to authorize access to Asana so that your app can call Asana APIs on their behalf, redirect their browser to the `/asana` endpoint above.

## Call Asana APIs

After a user has authorized your app to call Asana APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the [asana](https://www.npmjs.com/package/asana) npm module.

First, use EveryAuth to resolve the identifier of the user of your app to Asana credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get Asana credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("asana", userId);
```

The Asana credential returned has the following schema:

```javascript
{
  "accessToken": "ey...", // Current access token to Asana APIs
  "native": {
    "data": { // Asana user who granted authorization
      "id": 1200684930687806,
      "gid": "1200684930687806",
      "name": "Tomasz Janczuk",
      "email": "tomek@fusebit.io"
    },
    "timestamp": 1649806353248, // Time the credential was established
    "expires_at": 1649809953248, // Expiration time of the access token
    "access_token": "ey..." // Current access token to Asana APIs
  },
}
```

Then, instantiate the Asana client and make the API calls you want:

```javascript
import asana from "asana";

// Create Asana SDK
const asanaClient = asana.Client.create().useAccessToken(
  userCredentials.accessToken
);

// Call Asana API
const me = await asanaClient.users.me();
```

## Configure Asana service

The shared Asana OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call Asana APIs right away. 

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth application in Asana](https://developers.asana.com/docs/register-an-application), and then use the EveyAuth CLI to configure the Asana service to use it:

```bash
everyauth service set asana \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The asana npm module](https://www.npmjs.com/package/asana)  
[Create Asana OAuth application](https://developers.asana.com/docs/register-an-application)  
[Fusebit](https://fusebit.io)
