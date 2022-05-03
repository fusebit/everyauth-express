const express = require("express");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const cookieSession = require("cookie-session");
const mustacheExpress = require("mustache-express");

const asana = require("asana");
const { google } = require("googleapis");
const everyauth = require("@fusebit/everyauth-express");

const app = express();
const port = 3000;
const SERVICES = ['asana', 'google'];

app.engine("mustache", mustacheExpress());
app.set("view engine", "mustache");
app.set("views", __dirname + "/views");
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieSession({ name: "session", secret: "secret" }));

// Initialize auth route for every service
SERVICES.forEach((service) => {

  app.use(
    `/${service}/authorize/:userId`,
    everyauth.authorize(service, {
      finishedUrl: `/tasks`,
      mapToUserId: (req) => req.params.userId,
    })
  );

});

// Check if all sessions are completed
const isAllSessionsComplete = (req, res, next) => {
  let isSessionComplete = true;

  SERVICES.forEach((service) => {
    // If any one service is missing, set it to False
    if (!req.session[`${service}UserId`]) {
      isSessionComplete = false;
    }
  });
  res.locals.fullyAuthenticated = isSessionComplete;
  return next();
}

// Set Session UserId for service
const setSession = (req, res, next) => {

  // If it returns a userID, retreive Service Name
  if (req.query.userId) {
    // Service Name will only be returned after an auth has been completed
    const serviceName = req.query.serviceId;
    if (!serviceName) {
      return res.redirect(`/`);
    }
    req.session[`${serviceName}UserId`] = req.query.userId;
  }
  return next();
};

// Check is all sessions are complete
const ensureSession = (req, res, next) => {

  SERVICES.forEach((service) => {
    // For the missing service, redirect to authorization flow for that service
    if (!req.session[`${service}UserId`]) {
      return res.redirect(`/${service}/authorize/${req.query.userId}`);
    }
  });
  return next();
};

app.get("/", isAllSessionsComplete, (req, res) => {

  if (res.locals.fullyAuthenticated) {
    return res.redirect(`/tasks`);
  }
  return res.render("index", { userId: uuidv4() });
});


app.get("/tasks", setSession, ensureSession, async (req, res) => {
  // Retrieve an always fresh access token using userId
  const asanaCredentials = await everyauth.getIdentity("asana", req.session.asanaUserId);
  const googleCredentials = await everyauth.getIdentity("google", req.session.googleUserId);

  // Call Asana API
  const asanaClient = asana.Client.create().useAccessToken(
    asanaCredentials.accessToken
  );

  const me = await asanaClient.users.me();
  const workspace = me.workspaces[0].gid;
  const assignee = me.gid;

  const tasks = await asanaClient.tasks.getTasks({ workspace, assignee });

  const taskGIDs = tasks.data.map((tasks) => ({
    taskGID: tasks.gid,
  }));

  const taskDetails = [];
  for (const gid of taskGIDs) {
    const task = await asanaClient.tasks.getTask(gid.taskGID);
    taskDetails.push({
      taskName: task.name,
      taskNotes: task.notes,
      taskDueDate: task.due_on,
    });
  }

  // Call Google API
  const myAuth = new google.auth.OAuth2();
  myAuth.setCredentials({ access_token: googleCredentials.accessToken });
  google.options({ auth: myAuth });

  const calendar = google.calendar({ version: "v3" });
  const calendarEvents = await calendar.events.list({
    auth: myAuth,
    calendarId: "primary",
    timeMin: new Date(),
  });

  const calendarEventsList = calendarEvents.data.items.map((calendarItem) => {
    // Google Calendar API Returns Inconsistent Start Times
    // So this is a workaround to handle the data and normalize it
    var startTimeFromNow = "";
    if (!calendarItem.start) {
      startTimeFromNow = "";
    } else if (calendarItem.start.dateTime) {
      startTimeFromNow = moment(calendarItem.start.dateTime).fromNow();
    } else if (calendarItem.start.date) {
      startTimeFromNow = moment(calendarItem.start.date).fromNow();
    }
    return {
      summary: calendarItem.summary,
      description: calendarItem.description,
      startTime: startTimeFromNow,
    };
  });

  res.render("tasklist", { TaskListData: { taskDetails, calendarEventsList } });

});


// Add a new event to a calendar by ID
app.post('/tasks/calendar/', setSession, ensureSession, async (req, res) => {
  // Retrieve access token using userId from session
  const userCredentials = await everyauth.getIdentity('google', req.session.googleUserId);

  // Retrieve QuickAddText or use a Default Fallback
  const quickAddText = req.body.quickadd || 'New Event Added by Fusebit for Tomorrow at Noon';
  console.log(quickAddText);

  // Call Google API
  const myAuth = new google.auth.OAuth2();
  myAuth.setCredentials({ access_token: userCredentials.accessToken });
  google.options({ auth: myAuth });

  // Quick Add a New Event
  const calendar = google.calendar({ version: 'v3' });
  const addQuickEvent = await calendar.events.quickAdd({
    auth: myAuth,
    calendarId: 'primary',
    text: quickAddText,
  });

  res.redirect(`/tasks`);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
