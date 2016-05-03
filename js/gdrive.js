this.gdrive = this.gdrive || {};
(function(exports) {

  // Your Client ID can be retrieved from your project in the Google
  // Developer Console, https://console.developers.google.com
  var CLIENT_ID = '1087423722494-rcd7j3q163q3ov0mqpqou43mles7sr4j.apps.googleusercontent.com';

  var SCOPES = ['https://www.googleapis.com/auth/drive'];

  var MIMETYPE_FOLDER = 'application/vnd.google-apps.folder';
  var MIMETYPE_MARKDOWN = 'text/x-markdown';
  var MIMETYPE_TEXT = 'text/plain';

  var _accessToken = null;

  function checkAuth(callback) {
    gapi.auth.authorize(
      {
        'client_id': CLIENT_ID,
        'scope': SCOPES.join(' '),
        'immediate': true
      }, function(authResult) {
        _accessToken = authResult.access_token;
        callback(authResult.error, authResult);
      });
  }

  function loadApi(callback) {
    gapi.client.load('drive', 'v3', callback);
  }

  function listFiles(rootfile, callback) {
    var request = gapi.client.drive.files.list({
      'corpus': 'user',
      'orderBy': 'folder,name',
      'q': "'" + rootfile.id + "' in parents and trashed=false and (mimeType='" + MIMETYPE_FOLDER + "' or mimeType='" + MIMETYPE_MARKDOWN + "' or mimeType='" + MIMETYPE_TEXT + "')",
      'fields': "nextPageToken, files(id, name, mimeType)",
      'pageSize': 100
    });

    request.execute(callback);
  }

  function saveFile(file, contents, onSuccess, onError) {
    $.ajax({
      url: 'https://www.googleapis.com/upload/drive/v3/files/' + file.id + '?uploadType=media',
      type: 'PATCH',
      contentType: MIMETYPE_MARKDOWN,
      data: contents,
      headers: {
        'Authorization': 'Bearer ' + _accessToken
      },
      success: onSuccess,
      error: onError
    });
  }

  function getFileMetadata(fileId, callback) {
    var request = gapi.client.drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType'
    }).execute(callback);
  }

  function getFileContents(file, onSuccess, onFailure) {
    var request = gapi.client.drive.files.get({
      fileId: file.id,
      alt: 'media'
    }).then(function(response) {
      // Need to read in the text as UTF-8, as default encoding for text/* mimeTypes is iso-8859-1
      // For explaination on how this works, see http://ecmanaut.blogspot.co.uk/2006/07/encoding-decoding-utf8-in-javascript.html
      onSuccess(decodeURIComponent(escape(response.body)));
    }, onFailure);
  }

  function createFile(name, parent, callback) {
    gapi.client.drive.files.create({
        name: name,
        parents: [parent.id],
        mimeType: MIMETYPE_MARKDOWN,
        fields: 'id, name, mimeType',
        useContentAsIndexableText: true
    }).execute(function(file) {
      callback(file.result);
    });
  }

  // Defining exports
  exports.checkAuth = checkAuth;
  exports.loadApi = loadApi;
  exports.listFiles = listFiles;
  exports.saveFile = saveFile;
  exports.getFileMetadata = getFileMetadata;
  exports.getFileContents = getFileContents;
  exports.createFile = createFile;
  exports.MIMETYPE_FOLDER = MIMETYPE_FOLDER;
  exports.MIMETYPE_MARKDOWN = MIMETYPE_MARKDOWN;
  exports.MIMETYPE_TEXT = MIMETYPE_TEXT;

})(this.gdrive);
