# StackOverflow

EveryAuth is the easiest way for your app to access StackOverflow APIs. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding StackOverflow support to your app.

## Authorize access to StackOverflow

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to StackOverflow APIs
router.use(
  "/stackoverflow",
  everyauth.authorize("stackoverflow", {
    finishedUrl: "/stackoverflow/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/stackoverflow/finished", (req, res) => {
  res.send("Thank you for authorizing access to StackOverflow!");
});
```

When you want users of your app to authorize access to StackOverflow so that your app can call StackOverflow APIs on their behalf, redirect their browser to the `/stackoverflow` endpoint above.

## Call StackOverflow APIs

After a user has authorized your app to call [StackOverflow APIs](https://api.stackexchange.com/docs), you can use any generic HTTP client for Node.js SDK to make the call. 

But first, use EveryAuth to resolve the identifier of the user of your app to StackOverflow credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get StackOverflow credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("stackoverflow", userId);
```

The StackOverflow credential returned has the following schema:

```javascript
{
  "accessToken": "(0wR...", // Current access token to StackOverflow APIs
  "native": {
    "timestamp": 1649812976996, // Time the credential was established
    "client_key": "V)1...", // The Stack Overflow client key
    "access_token": "(0wR..." // Current access token to StackOverflow APIs
  },
}
```

## Configure StackOverflow service

The shared StackOverflow OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call StackOverflow APIs right away. The following OAuth scopes are included:
* read_inbox 
* private_info 
* no_expiry

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth client in StackOverflow](https://developers.stackoverflow.com/adwords/api/docs/guides/authentication), and then use the EveyAuth CLI to configure the StackOverflow service to use it:

```bash
everyauth service set stackoverflow \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The StackOverflow APIs](https://api.stackexchange.com/docs)  
[Create StackOverflow OAuth client](https://developers.stackoverflow.com/adwords/api/docs/guides/authentication)  
[Fusebit](https://fusebit.io)
