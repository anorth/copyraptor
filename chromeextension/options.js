// Saves options to chrome.storage
function saveOptions() {
  var host = document.getElementById('host').value;
  chrome.storage.local.set({
    host: host
  }, function () {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Saved.';
    setTimeout(function () {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.local.get({
    host: 'prod'
  }, function (items) {
    document.getElementById('host').value = items.host;
  });
}
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
