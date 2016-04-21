// Your Client ID can be retrieved from your project in the Google
// Developer Console, https://console.developers.google.com
var CLIENT_ID = '1087423722494-rcd7j3q163q3ov0mqpqou43mles7sr4j.apps.googleusercontent.com';

var SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];

var MIMETYPE_FOLDER = 'application/vnd.google-apps.folder';

var _rootfile = null;
var _files = {};

/**
 * Check if current user has authorized this application.
 */
function checkAuth() {
  gapi.auth.authorize(
    {
      'client_id': CLIENT_ID,
      'scope': SCOPES.join(' '),
      'immediate': true
    }, handleAuthResult);
}

/**
 * Handle response from authorization server.
 *
 * @param {Object} authResult Authorization result.
 */
function handleAuthResult(authResult) {
  var authorizeDiv = document.getElementById('authorize-div');
  if (authResult && !authResult.error) {
    // Hide auth UI, then load client library.
    authorizeDiv.style.display = 'none';
    loadDriveApi();
  } else {
    // Show auth UI, allowing the user to initiate authorization by
    // clicking authorize button.
    authorizeDiv.style.display = 'inline';
  }
}

/**
 * Initiate auth flow in response to user clicking authorize button.
 *
 * @param {Event} event Button click event.
 */
function handleAuthClick(event) {
  gapi.auth.authorize(
    {client_id: CLIENT_ID, scope: SCOPES, immediate: false},
    handleAuthResult);
  return false;
}

/**
 * Load Drive API client library.
 */
function loadDriveApi() {
  gapi.client.load('drive', 'v3', getRootFile);
}

function getRootFile() {
  var request = gapi.client.drive.files.get({
    'fileId': 'root',
    'fields': 'id, name, mimeType'
  });

  request.execute(function(resp) {
    _rootfile = resp;
    _rootfile.children = {};
    addToFiles(_rootfile);
    listFiles(_rootfile);
  });
}

/**
 * Print files.
 */
function listFiles(rootfile) {
  var request = gapi.client.drive.files.list({
    'corpus': 'user',
    'orderBy': 'folder,name',
    'q': "'" + rootfile.id + "' in parents and trashed=false",
    'fields': "nextPageToken, files(id, name, mimeType)",
    'pageSize': 100
  });

  request.execute(function(resp) {
    var files = resp.files;
    if (files && files.length > 0) {
      var children = {};
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        children[file.id] = file;
        file.children = {};
        addToFiles(file);
      }
      rootfile.children = children;
    }
    $('#file-tree').empty();
    renderFiles(_rootfile, 0);
  });
}

function addToFiles(file) {
  _files[file.id] = file;
}

function renderFiles(rootfile, indent) {
  var files = rootfile.children;
  var keys = Object.keys(files);
  for (var i = 0; i < keys.length; i++) {
    var file = files[keys[i]];
    var div = $('<div></div>')
      .data('id', file.id)
      .text(file.name)
      .css('padding-left', (15 * indent) + 'px');

    if (file.mimeType == MIMETYPE_FOLDER) {
      div.addClass('folder')
      div.click(function() {
        listFiles(_files[$(this).data('id')]);
      });
    } else {
      div.click(function() {
        console.log(_files[$(this).data('id')]);
      });
    }
    $('#file-tree').append(div);
    if (Object.keys(file.children).length > 0) {
      renderFiles(file, indent + 1);
    }
  }
}
