# Asana

EveryAuth is the easiest way to call Asana APIs from your app without learning OAuth. Make sure to follow [EveryAuth setup instructions](../README.md) before adding Asana support to your app.

## Authorize access to Asana

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to Asana APIs
router.use(
  "/asana",
  everyauth.authorize("slack", {
    finishedUrl: "/asana/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.use("/asana/finished", (req, res) => {
  res.send("Thank you for authorizing access to Asana!");
});
```

When you want users or your app to authorize access to Asana APIs so that your app can call Asana APIs on their behalf, redirect their browser to the `/asana` endpoint above.

## Call Asana APIs

After a user has authorized your app to call Asana APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the <a href="https://www.npmjs.com/package/asana" target="_blank">asana</a> npm module:

```javascript
import everyauth from "@fusebit/everyauth-express";
import asana from "asana";

// Get Asana credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("asana", userId);

// Create Asana SDK
const asanaClient = asana.Client.create().useAccessToken(
  userCredentials.accessToken
);

// Call Asana API
const me = await asanaClient.users.me();
```

## Configure Asana service

To use your own OAuth client with Everyauth, fist <a href="https://developers.asana.com/docs/register-an-application" target="_blank">create an OAuth application in Asana</a>, and then use the EveyAuth CLI to configure the Asana service:

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
