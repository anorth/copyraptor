
window.copyraptor = window.copyraptor || {};
window.copyraptor.store = function () {
  'use strict';

  var blobHost = 'https://devstore.copyraptor.com.s3.amazonaws.com';

  function save(site, data, success, failure) {
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', blobHost + '/' + site, true);
    xhr.onload = function(e) {
      if (this.status == 200) {
        success(this.responseText);
      } else {
        failure(e);
      }
    };

    xhr.send(JSON.stringify(data));
  }

  function load(site, success, failure) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', blobHost + '/' + site, true);
    xhr.responseType = "json";
    xhr.onload = function(e) {
      if (this.status == 200) {
        success(this.response);
      } else {
        failure(e);
      }
    };

    xhr.send();
  }

  return {
    save: save,
    load: load
  };
}();

