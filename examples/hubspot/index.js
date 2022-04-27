const express = require('express');
const { Client } = require('@hubspot/api-client');
const everyauth = require('@fusebit/everyauth-express');

const app = express();
const port = 3000;
const serviceId = 'hubspot';
const userId = 'usr-123'; // normally determined through authorization
const tenantId = 'contoso'; // organization/project userId is part of

app.get('/', (req, res) => {
  res.redirect('/integrations');
});

// The management page that shows connected services
app.get(`/integrations`, async (req, res) => {
  // Check if the user's organization has already authorized access to SFDC
  const credentials = await everyauth.getIdentity(serviceId, { tenantId });
  if (credentials) {
    // Present options to reconnect or disconnect, and test
    res.send(`
            <h2>HubSpot</h2>
            <p>Service connected</p>
            <form action="/integrations/hubspot/connect">
                <input type="submit" value="Reconnect" />
            </form>
            <form action="/integrations/hubspot/disconnect">
                <input type="submit" value="Disconnect" />
            </form>
            <form action="/newsletter/signup">
                <input type="submit" value="Test newsletter signup" />
            </form>
        `);
  } else {
    // Present option to connect
    res.send(`
            <h2>HubSpot</h2>
            <p>Service not connected</p>
            <form action="/integrations/hubspot/connect">
                <input type="submit" value="Connect" />
            </form>
        `);
  }
});

// Endpoint that initiates authorization process to HubSpot
app.use(
  '/integrations/hubspot/connect',
  everyauth.authorize(serviceId, {
    finishedUrl: '/integrations/hubspot/connected',
    mapToTenantId: (req) => tenantId,
    mapToUserId: (req) => userId,
  })
);

// Endpoint redirected to when HubSpot authorization process has completed
app.get('/integrations/hubspot/connected', (req, res) => {
  if (req.query.error) {
    res.send(`<p>There was an error authorizing access to HubSpot: ${req.query.error}<p>`);
  } else {
    res.redirect('/integrations');
  }
});

// Endpoint used to disconnect from a service
app.get('/integrations/hubspot/disconnect', async (req, res) => {
  await everyauth.deleteIdentities(serviceId, { tenantId });
  res.redirect('/integrations');
});

// Test page that contains a newsletter signup form and postback logic
app.get('/newsletter/signup', async (req, res) => {
  if (req.query.email) {
    // Process form submission
    const credentials = await everyauth.getIdentity(serviceId, { tenantId });
    if (credentials) {
      // HubSpot is connected, create a Contact record
      const hubspotClient = new Client({ accessToken: credentials.accessToken });
      const contact = await hubspotClient.crm.contacts.basicApi.create({
        properties: {
          email: req.query.email,
        },
      });
      res.send(`Thank you for signing up to the newsletter!<br>HubSpot ID: ${contact.id}`);
    } else {
      res.send(`Thank you for signing up to the newsletter!<br>HubSpot Contact not created (HubSpot not connected).`);
    }
  } else {
    // Send signup form
    res.send(`
        <h2>Newsletter signup</h2>
        <form>
            <input type="email" placeholder="Email" name="email"/>
            <input type="submit" value="Subscribe" />
        </form>
    `);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
