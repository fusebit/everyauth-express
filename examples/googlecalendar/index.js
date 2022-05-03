const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const express = require('express');
const cookieSession = require('cookie-session');
const mustacheExpress = require('mustache-express');

const { google } = require('googleapis');

const everyauth = require('@fusebit/everyauth-express');

const port = 3000;
const app = express();

app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieSession({ name: 'session', secret: 'secret' }));

// Render Google Login Button if there's no session
// Redirect the user to their calendar if there's a session
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect(`/google/calendarlist`);
  }
  return res.render('index', { userId: uuidv4() });
});

// Sign In Button redirects to Google OAuth Flow
app.use(
  '/google/authorize/:userId',
  everyauth.authorize('google', {
    // EveryAuth will automatically redirect to this route after authenticate
    finishedUrl: '/google/calendarlist',
    // The user ID of the authenticated user the credentials will be associated with
    mapToUserId: (req) => req.params.userId,
  })
);

// Get userId from the authorization redirect or via session if already authorized.
const handleSession = (req, res, next) => {
  if (req.query.userId) {
    req.session.userId = req.query.userId;
  }
  if (!req.session.userId) {
    return res.redirect('/');
  }
  return next();
};

// Render the user's Calendar list, so it can select the specific Calendar's events to view
app.get('/google/calendarlist', handleSession, async (req, res) => {
  // Retrieve an always fresh access token using userId
  const userCredentials = await everyauth.getIdentity('google', req.session.userId);

  // Call Google API
  const myAuth = new google.auth.OAuth2();
  myAuth.setCredentials({ access_token: userCredentials.accessToken });
  google.options({ auth: myAuth });

  // Get list of calendars
  const calendar = google.calendar({ version: 'v3' });
  const calendarList = await calendar.calendarList.list({
    auth: myAuth,
    calendarId: 'primary',
  });

  // Render calendar list page
  const calendarsList = calendarList.data.items.map((calendarItem) => {
    return {
      id: encodeURIComponent(calendarItem.id),
      summary: calendarItem.summary,
    };
  });

  res.render('calendarlist', { calendarsListData: calendarsList });
});

// Display a list of events from a specific calendar
app.get('/google/calendar/events/:calendarId', handleSession, async (req, res) => {
  // Retrieve access token using userId from session
  const userCredentials = await everyauth.getIdentity('google', req.session.userId);

  // Retrieve Calendar ID or Default to Primary Calendar
  const myCalendarId = req.params.calendarId || 'primary';
  const today = new Date();

  // Call Google API
  const myAuth = new google.auth.OAuth2();
  myAuth.setCredentials({ access_token: userCredentials.accessToken });
  google.options({ auth: myAuth });

  const calendar = google.calendar({ version: 'v3' });
  const calendarEvents = await calendar.events.list({
    auth: myAuth,
    calendarId: myCalendarId,
    timeMin: today,
  });

  const calendarEventsList = calendarEvents.data.items.map((calendarItem) => {


    // Google Calendar API Returns Inconsistent Start Times
    // So this is a workaround to handle the data and normalize it
    let startTimeFromNow = '';
    if (!calendarItem.start) {
      startTimeFromNow = '';
    } 
    else if (calendarItem.start.dateTime) {
      startTimeFromNow = moment(calendarItem.start.dateTime).fromNow();
    }
    else if (calendarItem.start.date) {
      startTimeFromNow = moment(calendarItem.start.date).fromNow();
    }
    return {
      summary: calendarItem.summary,
      description: calendarItem.description,
      startTime: startTimeFromNow,
    };
  });


  res.render('eventlist', {
    EventListData: { calendarEventsList, myCalendarId },
  });
});

// Add a new event to a calendar by ID
app.post('/google/calendar/events/:calendarId', handleSession, async (req, res) => {
  // Retrieve access token using userId from session
  const userCredentials = await everyauth.getIdentity('google', req.session.userId);

  // Retrieve Calendar ID or Default to Primary Calendar
  const myCalendarId = req.params.calendarId || 'primary';

  // Retrieve QuickAddText or use a Default Fallback
  const quickAddText = req.body.quickadd || 'New Event Added by Fusebit';

  // Call Google API
  const myAuth = new google.auth.OAuth2();
  myAuth.setCredentials({ access_token: userCredentials.accessToken });
  google.options({ auth: myAuth });

  // Quick Add a New Event
  const calendar = google.calendar({ version: 'v3' });
  const addQuickEvent = await calendar.events.quickAdd({
    auth: myAuth,
    calendarId: myCalendarId,
    text: quickAddText,
  });

  res.redirect(`/google/calendar/events/${myCalendarId}`);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
