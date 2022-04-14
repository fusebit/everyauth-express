# Google

EveryAuth is the easiest way for your app to access Google APIs. Make sure to follow the [EveryAuth setup instructions](../README.md) before adding Google support to your app.

## Authorize access to Google

Add the following route to your Express app using EveryAuth middleware:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Add support for users to authorize access to Google APIs
router.use(
  "/google",
  everyauth.authorize("google", {
    finishedUrl: "/google/finished",
    mapToUserId: async (req) => "user-123", // req.user.id in production
  })
);

router.get("/google/finished", (req, res) => {
  res.send("Thank you for authorizing access to Google!");
});
```

When you want users of your app to authorize access to Google so that your app can call Google APIs on their behalf, redirect their browser to the `/google` endpoint above.

## Call Google APIs

After a user has authorized your app to call Google APIs, you can use any Node.js SDK to make the call. EveryAuth recommends you use the [googleapis](https://www.npmjs.com/package/googleapis) npm module.

First, use EveryAuth to resolve the identifier of the user of your app to Google credentials:

```javascript
import everyauth from "@fusebit/everyauth-express";

// Get Google credentials for a specific user of your app
const userId = "user-123"; // req.user.id in production
const userCredentials = await everyauth.getIdentity("google", userId);
```

The Google credential returned has the following schema:

```javascript
{
  "accessToken": "ya...", // Current access token to Google APIs
  "native": {
    "scope": "https://www.googleapis.com/auth/userinfo.email ...", // Scopes that were granted
    "id_token": "ey...", // Current Google ID token
    "timestamp": 1649810201718, // Time the credential was established
    "expires_at": 1649813800718, // Time the access token expires
    "access_token": "ya..." // Current access token to Google APIs
  },
}
```

Then, instantiate the Google client and make the API calls you want:

```javascript
import { google } from 'googleapis';

// Call Google API
const auth = new google.auth.OAuth2();
auth.setCredentials({ access_token: userCredentials.accessToken });
google.options({ auth });

const me = await google.people('v1').people.get({
  resourceName: 'people/me',
  personFields: 'emailAddresses,addresses,externalIds,interests',
});
```

## Configure Google service

The shared Google OAuth client that EveryAuth provides out of the box supports basic permissions that allow you to call Google APIs right away. The following OAuth scopes are included:
* openid
* profile
* https://www.googleapis.com/auth/userinfo.email

If you need to address more advanced scenarios, you need to create your own OAuth client and configure EveryAuth to use it. First [create an OAuth client in Google](https://developers.google.com/adwords/api/docs/guides/authentication), and then use the EveyAuth CLI to configure the Google service to use it:

```bash
everyauth service set google \
  --scope "{your-scopes}" \
  --clientId "{your-client-id}" \
  --clientSecret "{your-client-secret}
```

## Resources

[Introduction to EveryAuth](../README.md)  
[The googleapis npm module](https://www.npmjs.com/package/googleapis)  
[Create Google OAuth client](https://developers.google.com/adwords/api/docs/guides/authentication)  
[Fusebit](https://fusebit.io)
