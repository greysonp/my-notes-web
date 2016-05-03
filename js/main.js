this.main = this.main || {};

(function(exports) {

  var SAVE_INTERVAL_MS = 5000;
  var KEY_ROOT_ID = 'my-notes';

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
        gdrive.loadApi(initFileTree);
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

  function initFileTree() {
    // Setup jstree to query gdrive
    $('#file-tree').jstree({
      core: {
        data: function(node, cb) {
          if (node.id == '#') {
            var storedRoot = localStorage.getItem(KEY_ROOT_ID);
            gdrive.getFileMetadata(storedRoot != null ? storedRoot : 'root', function(response) {
              _rootFile = response;
              _rootFile.state = {
                opened: true
              }
              addToFiles(_rootFile);
              listFiles(_rootFile, cb);
            });
          } else {
            listFiles(_files[node.id], cb);
          }
        }
      },
      contextmenu: {
        items: function(node, cb) {
          var file = _files[node.id];

          // Construct the menu items. They must be added in the order we want them to appear, which is why we can't
          // group all of the folder ones together, for instance.
          var items = {};
          if (file.mimeType == gdrive.MIMETYPE_FOLDER) {
            items.create = {
              label: 'New Note',
              action: function() {
                onCreateFileClick(file);
              }
            };
            items.createDir = {
              label: 'New Folder',
              action: function() {
                alert('Coming soon.');
              },
              _disabled: true
            };
          }
          items.rename = {
            label: 'Rename',
            action: function() {
              alert('Coming soon.');
            },
            _disabled: true
          };
          items.delete = {
            label: 'Delete',
            action: function() {
              alert('Coming soon.');
            },
            _disabled: true
          };
          if (file.mimeType == gdrive.MIMETYPE_FOLDER) {
            items.setRoot = {
              label: 'Set as Root Folder',
              separator_before: true,
              action: function() {
                onSetRootFolderClick(file);
              }
            }
          }
          cb(items);
        }
      },
      plugins: [
        'contextmenu'
      ]
    });

    // Add event to handle opening of files
    $('#file-tree').on('select_node.jstree', function (e, data) {
      var file = _files[data.node.id];
      if (file.mimeType != gdrive.MIMETYPE_FOLDER) {
        _activeFile = file;
        showFile(file);
      }
    });
  }

  function listFiles(rootfile, callback) {
    gdrive.listFiles(rootfile, function(resp) {
      var files = resp.files;
      if (files && files.length > 0) {
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          file.children = (file.mimeType == gdrive.MIMETYPE_FOLDER);
          if (file.mimeType != gdrive.MIMETYPE_FOLDER) {
            file.icon = 'jstree-file';
          }
          addToFiles(file);
        }
        rootfile.children = files;
      }
      if (callback) {
        callback(rootfile);
      }
    });
  }

  function addToFiles(file) {
    file.text = file.name;
    _files[file.id] = file;
  }

  function showFile(file) {
    console.log(file);
    clearInterval(_saveTimerId);
    gdrive.getFileContents(file, function(body) {
      _$editor.val(body);
      _oldEditorValue = body;
      loadEditor();
    }, function(reason) {
      console.error(reason);
      alert('Error showing file, check console.');
    });
  }

  function loadEditor() {
    $('#editor-container *').not('#editor').remove();
    _$editorContainer.show();
    _simplemde = new SimpleMDE({
      element: document.getElementById('editor'),
      spellChecker: false,
      forceSync: true,
      indentWithTabs: false,
      autofocus: true
    });
    _saveTimerId = setInterval(function() {
      saveFile(_activeFile, _$editor.val());
    }, SAVE_INTERVAL_MS);
  }

  function saveFile(file, contents) {
    if (contents == _oldEditorValue) return;
    _oldEditorValue = contents;

    gdrive.saveFile(file, contents, function(data) {
      console.log('Saved file.');
    }, function() {
      alert('Error saving file.');
    });
  }

  function onCreateFileClick(file) {
    console.log(file);
  }

  function onSetRootFolderClick(file) {
    localStorage.setItem(KEY_ROOT_ID, file.id);
    $('#file-tree').jstree('destroy');
    initFileTree();
  }

  exports.handleAuthClick = handleAuthClick;
  exports.checkAuth = checkAuth;

})(this.main);

function checkAuth() {
  main.checkAuth();
}
