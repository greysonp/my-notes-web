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
    gdrive.checkAuth(true, handleAuthResult);
  }

  function handleAuthClick(event) {
    gdrive.checkAuth(false, handleAuthResult);
    return false;
  }

  function handleAuthResult(err, result) {
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
              },
              _rootFile.icon = 'material-icons ic-folder-open faded'
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
            items.createNote = {
              label: 'New Note',
              action: function() {
                onCreateNoteClick(file);
              }
            };
            items.createFolder = {
              label: 'New Folder',
              action: function() {
                onCreateFolderClick(file);
              }
            };
          }
          items.rename = {
            label: 'Rename',
            action: function() {
              onRenameClick(file);
            }
          };
          items.delete = {
            label: 'Delete',
            action: function() {
              onDeleteClick(file);
            }
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
    $('#file-tree').on('select_node.jstree', function(e, data) {
      var file = _files[data.node.id];
      if (file.mimeType != gdrive.MIMETYPE_FOLDER) {
        _activeFile = file;
        showFile(file);
      }
    });

    $('#file-tree').on('open_node.jstree', function(e, data) {
      $('#file-tree').jstree(true).set_icon(data.node.id, 'material-icons ic-folder-open faded');
    });
    $('#file-tree').on('close_node.jstree', function(e, data) {
      $('#file-tree').jstree(true).set_icon(data.node.id, 'material-icons ic-folder faded');
    });
  }

  function resetFileTree() {
    $('#file-tree').jstree('destroy');
    initFileTree();
  }

  function listFiles(rootfile, callback) {
    gdrive.listFiles(rootfile, function(resp) {
      var files = resp.files;
      if (files && files.length > 0) {
        for (var i = 0; i < files.length; i++) {
          var file = files[i];
          file.children = (file.mimeType == gdrive.MIMETYPE_FOLDER);
          if (file.mimeType != gdrive.MIMETYPE_FOLDER) {
            file.icon = 'material-icons ic-insert-drive-file faded';
          } else {
            file.icon = 'material-icons ic-folder faded'
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
    clearInterval(_saveTimerId);
    gdrive.getFileContents(file, function(body) {
      _$editor.val(body);
      _oldEditorValue = body;
      loadEditor();
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
      autofocus: true,
      autoDownloadFontAwesome: false,
      toolbar: [{
        name: 'bold',
        action: SimpleMDE.toggleBold,
        className: 'material-icons ic ic-format-bold waves-effect',
        title: 'Bold'
      },
      {
        name: 'italic',
        action: SimpleMDE.toggleItalic,
        className: 'material-icons ic ic-format-italic waves-effect',
        title: 'Italic'
      },
      {
        name: 'heading',
        action: SimpleMDE.toggleHeadingSmaller,
        className: 'material-icons ic ic-title waves-effect',
        title: 'Heading'
      },
      '|',
      {
        name: 'quote',
        action: SimpleMDE.toggleBlockquote,
        className: 'material-icons ic ic-format-quote waves-effect',
        title: 'Quote'
      },
      {
        name: 'unordered-list',
        action: SimpleMDE.toggleUnorderedList,
        className: 'material-icons ic ic-format-list-bulleted waves-effect',
        title: 'Generic List'
      },
      {
        name: 'ordered-list',
        action: SimpleMDE.toggleOrderedList,
        className: 'material-icons ic ic-format-list-numbered waves-effect',
        title: 'Ordered List'
      },
      '|',
      {
        name: 'link',
        action: SimpleMDE.drawLink,
        className: 'material-icons ic ic-insert-link waves-effect',
        title: 'Create Link'
      },
      {
        name: 'image',
        action: SimpleMDE.drawImage,
        className: 'material-icons ic ic-image waves-effect',
        title: 'Insert Image'
      },
      '|',
      {
        name: 'preview',
        action: SimpleMDE.togglePreview,
        className: 'material-icons ic ic-remove-red-eye no-disable waves-effect',
        title: 'Toggle Preview'
      },
      {
        name: 'side-by-side',
        action: function(e) {
          SimpleMDE.toggleSideBySide(e);
          updateFileTreeZ();
        },
        className: 'material-icons ic ic-flip no-disable waves-effect',
        title: 'Toggle Side-by-Side'
      },
      {
        name: 'fullscreen',
        action: function(e) {
          SimpleMDE.toggleFullScreen(e);
          updateFileTreeZ();
        },
        className: 'material-icons ic ic-fullscreen no-disable no-mobile waves-effect',
        title: 'Toggle Fullscreen'
      },
      '|',
      {
        name: 'guide',
        action: function() { window.open('https://simplemde.com/markdown-guide'); },
        className: 'material-icons ic-help waves-effect',
        title: 'Toggle Fullscreen (F11)'
      }]
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

  function formatNoteName(name) {
    if (!name.endsWith('.md')) {
      name += '.md';
    }
    return name;
  }

  function isFullscreen() {
    return _simplemde.isSideBySideActive() || _simplemde.isFullscreenActive() || document.querySelector('.CodeMirror-sided') != null;
  }

  function updateFileTreeZ() {
    var fileTree = document.querySelector('#file-tree');
    fileTree.style.zIndex = isFullscreen() ? -1 : 200;
  }


  // ========================================================================
  // Event Listeners
  // ========================================================================

  function onCreateNoteClick(parent) {
    var name = formatNoteName(prompt('New note name'));

    gdrive.createFile(name, parent, gdrive.MIMETYPE_MARKDOWN, function(file) {
      resetFileTree();
    });
  }

  function onCreateFolderClick(parent) {
    var name = prompt('New folder name');
    gdrive.createFile(name, parent, gdrive.MIMETYPE_FOLDER, function(file) {
      resetFileTree();
    });
  }

  function onSetRootFolderClick(file) {
    localStorage.setItem(KEY_ROOT_ID, file.id);
    resetFileTree();
  }

  function onDeleteClick(file) {
    var message = '';
    if (file.mimeType == gdrive.MIMETYPE_FOLDER) {
      message = 'Are you sure you want to delete the \'' + file.name + '\' folder? All contents will also be deleted.';
    } else {
      message = 'Are you sure you want to delete ' + file.name + '?';
    }
    if (window.confirm(message)) {
      gdrive.deleteFile(file, function(result) {
        resetFileTree();
      });
    }
  }

  function onRenameClick(file) {
    var name = prompt('New name');
    if (file.mimeType != gdrive.MIMETYPE_FOLDER) {
      name = formatNoteName(name);
    }
    gdrive.renameFile(file, name, function(result) {
      resetFileTree();
    });
  }

  exports.handleAuthClick = handleAuthClick;
  exports.checkAuth = checkAuth;

})(this.main);

function checkAuth() {
  main.checkAuth();
}
