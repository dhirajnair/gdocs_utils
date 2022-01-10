//https://developers.google.com/apps-script/api/quickstart/nodejs

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const { on } = require('events');

// If modifying these scopes, delete token.json.
//const SCOPES = ['https://www.googleapis.com/auth/script.projects'];
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Apps Script API.
  //authorize(JSON.parse(content), callAppsScript);
  authorize(JSON.parse(content), process);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

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
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * TODO
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

function process(auth) {
  var lineReader = require('readline').createInterface({
    input: require('fs').createReadStream('input_for_download.txt')
  });

  lineReader.on('line', function (line) {
    download(auth,line);
  });
}

async function download(auth, id) {
  const driveService = google.drive({ version: 'v3', auth });
  
  var fileId = id;

  var dest = fs.createWriteStream('download/' + fileId + '_t1.docx');
  let resp = await driveService.files.export({
    fileId: fileId,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }, { responseType: 'stream' });

  resp.data.on('end', function () {
    console.log('Downloaded file:', id);
    upload(auth,id);
  }).on('error', function (err) {
    console.log('Error during download', err);
  }).pipe(dest);
}

function upload(auth,id){
  const driveService = google.drive({ version: 'v3', auth });
  var fileId = id;

  let fileMetadata = {
    'name': fileId + '_copy1.doc',
    'parents': ['1-NZS3DOWJgfA6ogP1K7GtP2ZAPdpqPgm']
  }

  let media = {
    mimeType: 'application/vnd.google-apps.document',
    body: fs.createReadStream('download/' + fileId + '_t1.docx')
  }

  driveService.files.create({
    resource: fileMetadata,
    media: media,
    fields: '*'
  }, function (err, file) {
    if (err) {
      // Handle error
      console.error(err);
    } else {
      console.log('Uploaded file:', file.data.id);
    }
  });
}