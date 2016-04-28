this.main = this.main || {};

(function(exports) {

  var SAVE_INTERVAL_MS = 5000;

  var _rootFile = null;
  var _files = {};
  var _simplemde = null;
  var _activeFile = null;
  var _$editor = null;
  var _$editorContainer = null;
  var _saveTimerId = 0;
  var _oldEditorValue = null;

  $(document).ready(init);

  function init() {
    _$editor = $('#editor');

    _$editorContainer = $('#editor-container');
    _$editorContainer.hide();
  }

  function checkAuth() {
    gdrive.checkAuth(function(err, result) {
      var authorizeDiv = document.getElementById('authorize-div');
      if (!err && result) {
        // Hide auth UI, then load client library.
        authorizeDiv.style.display = 'none';
        gdrive.loadApi(getRootFile);
      } else {
        // Show auth UI, allowing the user to initiate authorization by
        // clicking authorize button.
        authorizeDiv.style.display = 'inline';
      }
    });
  }

  function handleAuthClick(event) {
    checkAuth();
    return false;
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
    gdrive.listFiles(rootfile, function(resp) {
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
    })
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

      if (file.mimeType == gdrive.MIMETYPE_FOLDER) {
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
    gdrive.getFileContents(file, function(body) {
      _$editor.val(body);
      _oldEditorValue = body;

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
    gdrive.saveFile(file, contents, function(data) {
      console.log('success!');
      console.log(data);
    }, function() {
      alert('Error saving file.');
    });
  }

  exports.handleAuthClick = handleAuthClick;
  exports.checkAuth = checkAuth;

})(this.main);

function checkAuth() {
  main.checkAuth();
}
