const express = require("express");
const { google } = require("googleapis");
const everyauth = require("@fusebit/everyauth-express");
const { v4: uuidv4 } = require("uuid");
const cookieSession = require("cookie-session");
const mustacheExpress = require("mustache-express");
const app = express();
const port = 3000;

app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");
app.set("views", __dirname + "/views");
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieSession({ name: "session", secret: "secret" }));

const moment = require("moment");

// Main Landing Page with Google Sign-In
app.get("/", (req, res) => {
  if (req.session.userId) {
    return res.redirect(`/google/calendarlist`);
  }
  return res.render("index", { userId: uuidv4() });
});

// Sign In Button redirects to Google OAuth Flow
app.use(
  "/google/authorize/:userId",
  everyauth.authorize("google", {
    // EveryAuth will automatically redirect to this route after authenticate
    finishedUrl: "/google/calendarlist",
    // The user ID of the authenticated user the credentials will be associated with
    mapToUserId: (req) => req.params.userId,
  })
);

// User needs to select a calendar they want to view
app.get("/google/calendarlist", async (req, res) => {
  // If coming via authorization redirect (first time), set cookie
  if (req.query.userId) {
    req.session.userId = req.query.userId;
  }

  // Get userID from authorization redirect or via cookie session
  const userId = req.query.userId || req.session.userId;

  // If there is no userId, redirect to main landing page to sign in
  if (!userId) {
    return res.redirect("/");
  }

  // Retrieve access token using userId
  const userCredentials = await everyauth.getIdentity("google", userId);

  // Call Google API
  const myAuth = new google.auth.OAuth2();
  myAuth.setCredentials({ access_token: userCredentials.accessToken });
  google.options({ auth: myAuth });

  // Get list of calendars
  const calendar = google.calendar({ version: "v3" });
  const calendarList = await calendar.calendarList.list({
    auth: myAuth,
    calendarId: "primary",
  });

  // Render calendar list page
  const calendarsList = calendarList.data.items.map((calendarItem) => {
    return {
      id: encodeURIComponent(calendarItem.id),
      summary: calendarItem.summary,
    };
  });

  res.render("calendarlist", { calendarsListData: calendarsList });
});

// Display a list of events from that calendar
app.get("/google/calendar/events/:calendarId", async (req, res) => {
  // Get userID from authorization redirect or via cookie session
  const userId = req.session.userId;

  // If there is no userId, redirect to main landing page to sign in
  if (!userId) {
    return res.redirect("/");
  }

  // Retrieve access token using userId
  const userCredentials = await everyauth.getIdentity("google", userId);

  const myCalendarId = req.params.calendarId;
  const today = new Date();

  // Call Google API
  const myAuth = new google.auth.OAuth2();
  myAuth.setCredentials({ access_token: userCredentials.accessToken });
  google.options({ auth: myAuth });

  const calendar = google.calendar({ version: "v3" });
  const calendarEvents = await calendar.events.list({
    auth: myAuth,
    calendarId: myCalendarId,
    timeMin: today,
  });
  //console.log(calendarEvents);

  const calendarEventsList = calendarEvents.data.items.map((calendarItem) => {
    return {
      summary: calendarItem.summary,
      description: calendarItem.description,
      startTime: calendarItem.start,
    };
  });

  res.render("eventlist", {
    EventListData: { calendarEventsList, myCalendarId },
  });
});

// Add a new event to a calendar by ID
app.post("/google/calendar/events/:id", async (req, res) => {
  // Get userID from authorization redirect or via cookie session
  const userId = req.session.userId;

  // If there is no userId, redirect to main landing page to sign in
  if (!userId) {
    return res.redirect("/");
  }

  const myCalendarId = req.params.id;
  const userCredentials = await everyauth.getIdentity("google", userId);

  // Call Google API
  const myAuth = new google.auth.OAuth2();
  myAuth.setCredentials({ access_token: userCredentials.accessToken });
  google.options({ auth: myAuth });

  // Quick Add a New Event
  const calendar = google.calendar({ version: "v3" });
  const addQuickEvent = await calendar.events.quickAdd({
    auth: myAuth,
    calendarId: myCalendarId,
    text: req.body.quickadd,
  });

  res.redirect(`/google/calendar/events/${myCalendarId}`);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
