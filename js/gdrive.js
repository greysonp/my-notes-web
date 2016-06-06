this.gdrive = this.gdrive || {};
(function(exports) {

  // Your Client ID can be retrieved from your project in the Google
  // Developer Console, https://console.developers.google.com
  var CLIENT_ID = '1087423722494-rcd7j3q163q3ov0mqpqou43mles7sr4j.apps.googleusercontent.com';

  var SCOPES = ['https://www.googleapis.com/auth/drive'];

  var MIMETYPE_FOLDER = 'application/vnd.google-apps.folder';
  var MIMETYPE_MARKDOWN = 'text/x-markdown';
  var MIMETYPE_TEXT = 'text/plain';

  var STATUS_OK = 200;
  var STATUS_INVALID_TOKEN = 401;
  var STATUS_FORBIDDEN = 403;

  var _accessToken = null;

  function checkAuth(immediate, callback) {
    gapi.auth.authorize({
        client_id: CLIENT_ID,
        scope: SCOPES.join(' '),
        immediate: immediate
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
      corpus: 'user',
      orderBy: 'folder,name',
      q: "'" + rootfile.id + "' in parents and trashed=false and (mimeType='" + MIMETYPE_FOLDER + "' or mimeType='" + MIMETYPE_MARKDOWN + "' or mimeType='" + MIMETYPE_TEXT + "')",
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: 200
    }).then(function(response) {
      callback(response.result);
    }, function(reason) {
      handleError(reason, function() {
        listFiles(rootfile, callback);
      });
    });
  }

  function saveFile(file, contents, callback) {
    network.request({
      url: 'https://www.googleapis.com/upload/drive/v3/files/' + file.id + '?uploadType=media',
      method: 'PATCH',
      contentType: MIMETYPE_MARKDOWN,
      data: contents,
      headers: {
        'Authorization': 'Bearer ' + _accessToken
      }
    }, function(err, response) {
      if (err) {
        // Format the response to look like the gdrive response
        return handleError({ xhr: xhr, status: xhr.status }, function() {
          saveFile(file, contents, callback);
        });
      }
      callback();
    });
  }

  function getFileMetadata(fileId, callback) {
    var request = gapi.client.drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType'
    }).then(function(response) {
      callback(response.result);
    }, function(reason) {
      handleError(reason, function() {
        getFileMetadata(fileId, callback);
      });
    });
  }

  function getFileContents(file, callback) {
    var request = gapi.client.drive.files.get({
      fileId: file.id,
      alt: 'media'
    }).then(function(response) {
      // Need to read in the text as UTF-8, as default encoding for text/* mimeTypes is iso-8859-1
      // For explaination on how this works, see http://ecmanaut.blogspot.co.uk/2006/07/encoding-decoding-utf8-in-javascript.html
      callback(decodeURIComponent(escape(response.body)));
    }, function(reason) {
      handleError(reason, function() {
        getFileContents(file, callback);
      });
    });
  }

  function createFile(name, parent, mimeType, callback) {
    gapi.client.drive.files.create({
      name: name,
      parents: [parent.id],
      mimeType: mimeType,
      fields: 'id, name, mimeType',
      useContentAsIndexableText: true
    }).then(function(response) {
      callback(response.result);
    }, function(reason) {
      handleError(reason, function() {
        createFile(name, parent, mimeType, callback);
      });
    });
  }

  function deleteFile(file, callback) {
    gapi.client.drive.files.delete({
      fileId: file.id
    }).then(function(response) {
      callback(response.result);
    }, function(reason) {
      handleError(reason, function() {
        deleteFile(file, callback);
      })
    });
  }

  function renameFile(file, name, callback) {
    gapi.client.drive.files.update({
      fileId: file.id,
      name: name
    }).then(function(response) {
      callback(response.result);
    }, function(reason) {
      handleError(response, function() {
        renameFile(file, name, callback);
      });
    });
  }

  function handleError(reason, onRetry) {
    console.warn('Handling error with status: ' + reason.status);
    if (reason.status == STATUS_INVALID_TOKEN || reason.status == STATUS_FORBIDDEN) {
      // We had an auth error. Try getting a new token.
      console.warn('Trying to re-auth with immediate=true');
      checkAuth(true, function(error, result) {
        if (error) {
          // Immediate (i.e. no pop-up) didn't work. They must have revoked authorization. Try the pop-up.
          console.warn('Re-auth failed, trying again with immediate=false');
          checkAuth(false, function(error, result) {
            if (error) {
              // That didn't work either! We're out of luck :(
              console.error(error);
              alert('Had auth error, but couldn\'t fix it :( Backup your work, then try refreshing the page.');
            } else {
              onRetry()
            }
          });
        } else {
          onRetry();
        }
      });
    } else {
      console.error(reason);
      alert('Experienced an unhandled error. Check console.');
    }
  }

  // Exports
  exports.checkAuth = checkAuth;
  exports.loadApi = loadApi;
  exports.listFiles = listFiles;
  exports.saveFile = saveFile;
  exports.deleteFile = deleteFile;
  exports.renameFile = renameFile;
  exports.getFileMetadata = getFileMetadata;
  exports.getFileContents = getFileContents;
  exports.createFile = createFile;
  exports.MIMETYPE_FOLDER = MIMETYPE_FOLDER;
  exports.MIMETYPE_MARKDOWN = MIMETYPE_MARKDOWN;
  exports.MIMETYPE_TEXT = MIMETYPE_TEXT;

})(this.gdrive);
