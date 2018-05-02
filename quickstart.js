var mqtt = require('mqtt')

const ALARM_TOPIC = 'alarm'
const DEBUG_TOPIC = 'debug'
const REQUEST_TOPIC = 'request'
const DEVICE = 'server'

const fs = require('fs');
const mkdirp = require('mkdirp');
const readline = require('readline');
const {google} = require('googleapis');
const OAuth2Client = google.auth.OAuth2;
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_PATH = 'credentials.json';
var CREDENTIALS;
var client = {}

  // Load client secrets from a local file.
  fs.readFile('mqtt_credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials
    var mqtt_cred = JSON.parse(content)
    const {broker_url, client_username, client_password} = mqtt_cred
    
    client = mqtt.connect(broker_url, {
      username: client_username,
      password: client_password
    })
    
    // When we connect to the MQTT broker, subscribe to the desired topics and
    //   publish that the server is listening to DEBUG
    client.on('connect', function () {
      console.log(DEVICE + ' is connected to MQTT')
    
      client.subscribe(DEBUG_TOPIC)
      client.publish(DEBUG_TOPIC, DEVICE + ' began listening to topic: ' + DEBUG_TOPIC + ' at ' + new Date().toString())
    
      client.subscribe(REQUEST_TOPIC)  
    })
    
    // When we recieve a published message
    client.on('message', function (topic, message) {
      // if the message is a request then initialize communication with google
      if(topic === REQUEST_TOPIC) { 
        console.log('\n++++++++++begin getting events+++++++++++')     
        // We must begin with authoriation every time otherwhise we will not 
        //   have access to events added after the first authorization
        connectAndGetStuffFromGoogle()
      }
      else if(topic === DEBUG_TOPIC) // if debug then print message to terminal
        console.log('Debug Message: ' + message.toString())
    })
  });

/**
 * Authorize request from google then request calendar events
 */
function connectAndGetStuffFromGoogle() {
// Load client secrets from a local file.
fs.readFile('client_secret.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  CREDENTIALS = JSON.parse(content)
  authorize(CREDENTIALS, listEvents);
}); 
}

/* Code from Google API Tutorials */
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return callback(err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  const calendar = google.calendar({version: 'v3', auth});
  calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, {data}) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = data.items;
    if (events.length) {
      console.log('Upcoming events:');
      events.map((event, i) => {
        // if the event is an all day event by definition it isnt an alarm
        if(typeof event.start.dateTime != 'undefined') {
          const start = event.start.dateTime || event.start.date;
          console.log(`${event.summary}`);
          console.log('Event starts at ' + start)
          client.publish(ALARM_TOPIC, start.toString())   
        }
      });
    } else {
      console.log('No upcoming events found.');
    }
  });
}