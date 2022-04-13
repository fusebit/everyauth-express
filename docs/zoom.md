# Zoom

EveryAuth is the easiest way to call Zoom APIs from your app without learning OAuth. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding Zoom support to your app.

## Authorize access to Zoom

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to Zoom APIs
router.use(
  "/zoom",
  everyauth.authorize("zoom", {
    finishedUrl: "/zoom/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/zoom/finished", (req, res) => {
  res.send("Thank you for authorizing access to Zoom!");
});
```

When you want users of your app to authorize access to Zoom so that your app can call Zoom APIs on their behalf, redirect their browser to the `/zoom` endpoint above.

## Call Zoom APIs

After a user has authorized your app to call Zoom APIs, you can use any generic HTTP client for Node.js SDK to make the call. 

But first, use EveryAuth to resolve the identifier of the user of your app to Zoom credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get Zoom credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("zoom", userId);
```

The Zoom credential returned has the following schema:

```javascript
{
  "accessToken": "ey...", // Current access token to Zoom APIs
  "native": {
    "scope": "meeting:read user_info:read", // Scopes that were granted
    "timestamp": 1649813289772, // Time the credential was established
    "expires_at": 1649816888772, // Time the access token expires
    "access_token": "ey..." // Current access token to Zoom APIs
  },
}```

## Configure Zoom service

The shared Zoom OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call [Zoom APIs](https://marketplace.zoom.us/docs/api-reference/introduction/) right away. 

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth client in Zoom](https://marketplace.zoom.us/docs/guides/build/oauth-app/), and then use the EveyAuth CLI to configure the Zoom service to use it:

```bash
everyauth service set zoom \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The Zoom APIs](https://marketplace.zoom.us/docs/api-reference/introduction/)  
[Create Zoom OAuth client](https://marketplace.zoom.us/docs/guides/build/oauth-app/)  
[Fusebit](https://fusebit.io)
