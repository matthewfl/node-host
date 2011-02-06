// this file is loaded as a sub process to take the code from an application and deploy it

var db = require('./db'),
sandbox = require('./sandbox'),
config = require('./config'),
fs = requre('fs');

var user = process.argv[1];
var fileName = process.argv[2];

function run_git() {
    
}


// check the lock file of the git dir
fs.stat(config.gitLockFile, function (err, Lock) {
    if(err) {
	var checkLock = setInterval(function () {
	    fs.stat(config.gitLockFile, function (err, Lock) {
		if(!err) return;
		
	    });
	},250);
    }else{
	
    }
});