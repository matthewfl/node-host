var db = require('./db');
var child = require('child_process');
db._isMaster();


var front = child.spawn('node', ['front-end.js']);

front.on('exit', function (code) {
    front = child.spawn('node', ['front-end.js']);
});
