this.main = this.main || {};

(function(exports) {
  // Your Client ID can be retrieved from your project in the Google
  // Developer Console, https://console.developers.google.com
  var CLIENT_ID = '1087423722494-rcd7j3q163q3ov0mqpqou43mles7sr4j.apps.googleusercontent.com';

  var SCOPES = ['https://www.googleapis.com/auth/drive'];

  var MIMETYPE_FOLDER = 'application/vnd.google-apps.folder';
  var MIMETYPE_MARKDOWN = 'text/x-markdown';
  var MIMETYPE_TEXT = 'text/plain';

  var SAVE_INTERVAL_MS = 5000;

  var _rootFile = null;
  var _files = {};
  var _simplemde = null;
  var _activeFile = null;
  var _$editor = null;
  var _$editorContainer = null;
  var _saveTimerId = 0;
  var _accessToken = null;
  var _oldEditorValue = null;

  $(document).ready(init);

  function init() {
    _$editor = $('#editor');

    _$editorContainer = $('#editor-container');
    _$editorContainer.hide();
  }

  function checkAuth() {
    gapi.auth.authorize(
      {
        'client_id': CLIENT_ID,
        'scope': SCOPES.join(' '),
        'immediate': true
      }, handleAuthResult);
  }

  function handleAuthResult(authResult) {
    _accessToken = authResult.access_token;

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

  function handleAuthClick(event) {
    gapi.auth.authorize(
      {client_id: CLIENT_ID, scope: SCOPES, immediate: false},
      handleAuthResult);
    return false;
  }

  function loadDriveApi() {
    gapi.client.load('drive', 'v3', getRootFile);
  }

  function getRootFile() {
    var request = gapi.client.drive.files.get({
      'fileId': 'root',
      'fields': 'id, name, mimeType'
    });

    request.execute(function(resp) {
      _rootFile = resp;
      _rootFile.children = {};
      addToFiles(_rootFile);
      listFiles(_rootFile);
    });
  }

  function listFiles(rootfile) {
    var request = gapi.client.drive.files.list({
      'corpus': 'user',
      'orderBy': 'folder,name',
      'q': "'" + rootfile.id + "' in parents and trashed=false and (mimeType='" + MIMETYPE_FOLDER + "' or mimeType='" + MIMETYPE_MARKDOWN + "' or mimeType='" + MIMETYPE_TEXT + "')",
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
      renderFiles(_rootFile, 0);
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
          var folder = _files[$(this).data('id')];
          if (Object.keys(folder.children).length == 0) {
            listFiles(folder);
          } else {
            folder.children = {};
            $('#file-tree').empty();
            renderFiles(_rootFile, 0);
          }
        });
      } else {
        div.click(function() {
          _activeFile = _files[$(this).data('id')];
          showFile(_activeFile);
        });
      }
      $('#file-tree').append(div);
      if (Object.keys(file.children).length > 0) {
        renderFiles(file, indent + 1);
      }
    }
  }

  function showFile(file) {
    console.log(file);
    clearInterval(_saveTimerId);
    var request = gapi.client.drive.files.get({
      'fileId': file.id,
      'alt': 'media'
    }).then(function(response) {
      _$editor.val(response.body);
      loadEditor();
    }, function(reason) {
      alert(reason);
    });
  }

  function loadEditor() {
    $('#editor-container *').not('#editor').remove();
    _simplemde = new SimpleMDE({
      element: document.getElementById('editor'),
      spellChecker: false,
      forceSync: true,
      indentWithTabs: false,
      autofocus: true
    });
    _$editorContainer.show();
    _saveTimerId = setInterval(function() {
      saveFile(_activeFile, _$editor.val());
    }, SAVE_INTERVAL_MS);
  }

  function saveFile(file, contents) {
    if (contents == _oldEditorValue) return;
    _oldEditorValue = contents;

    $.ajax({
      url: 'https://www.googleapis.com/upload/drive/v3/files/' + file.id + '?uploadType=media',
      type: 'PATCH',
      contentType: MIMETYPE_MARKDOWN,
      data: contents,
      headers: {
        'Authorization': 'Bearer ' + _accessToken
      },
      success: function(data) {
        console.log('success!');
        console.log(data);
      },
      error: function() {
        alert('Error saving file.');
      }
    });
  }

  exports.handleAuthClick = handleAuthClick;
  exports.checkAuth = checkAuth;

})(this.main);

function checkAuth() {
  main.checkAuth();
}
