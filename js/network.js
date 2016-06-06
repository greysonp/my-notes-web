this.network = this.network || {};

(function(exports) {


  function request(options, callback) {
    // Get stuff from options with defaults
    var url = options.url || '/';
    var method = options.method || 'GET';
    var contentType = options.contentType || 'application/json';
    var headers = options.headers || {};
    var data = options.data || {};

    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Content-Type', contentType);
    Object.keys(headers).forEach(function(key) {
      xhr.setRequestHeader(key, headers[key]);
    });

    xhr.onload = function() {
      if (xhr.status == 200) {
        callback(null, JSON.parse(xhr.responseText));
      } else {
        callback(xhr, null);
      }
    }
    xhr.send(contentType == 'application/json' ? JSON.stringify(data) : data);
  }

  // Exports
  exports.request = request;

})(this.network);
