var db = require('./db');
var config = require('./config');
var async = require('./lib/async').async;
var fs = require('fs');

var npm = require('./lib/npm/npm.js');

try {
    fs.lstatSync(config.npm_working_folder)
} catch (e) {
    fs.mkdirSync(config.npm_working_folder, 460);
    fs.mkdirSync(config.npm_working_folder + "/bin", 460);
    fs.mkdirSync(config.npm_working_folder + "/man", 460);
    fs.mkdirSync(config.npm_working_folder + "/root", 460);
    fs.mkdirSync(config.npm_working_folder + "/cache", 460);
    fs.mkdirSync(config.npm_working_folder + "/prefix", 460);
}

npm.load({
    binroot: config.npm_working_folder + "/bin",
    manroot: config.npm_working_folder + "/man",
    root: config.npm_working_folder + "/root",
    cache: config.npm_working_folder + "/cache",
    globalconfig: config.npm_working_folder + "/global_config_file",
    prefix: config.npm_working_folder + "/prefix",
    userconfig: config.npm_working_folder + "/user_config_file",
    userignorefile: config.npm_working_folder + "/user_ignore_file"
}, function (err) {
    //npm.commands.build = console.log;
    //npm.commands['run-script'] = console.log;
    //Object.defineProperty(npm.commands, "build", { get: function () { return console.log; }});
    //Object.defineProperty(npm.commands, "run-script", { value: console.log });
    var original_npm = npm.commands;
    npm.commands = {}; // more hacks, to make npm safe
    for(var c in original_npm) {
	(function (c) {
	    Object.defineProperty(npm.commands, c, { get : function () {
		console.log("=======================================================================loading command", c);
		if(c == "build" || c == "run-script")
		    return console.log;
		return function () {
		    console.log.apply(this, arguments);
		    original_npm[c].apply(this, arguments);
		};
	    }});
	})(c);
    }

    npm.commands.install(['7digital-api'], console.log)
/*
    console.log("loaded npm");
    npm.commands.search([], function (err, list) {
	console.log("retreved list");
	var c=10;
	for(var a in list) {
	    npm.commands.info([a], function (err, info) {
		for(var names in info) { // why must I use this hack
		    info = info[names][''];
		    break;
		}
		if(typeof info.versions == "string") info.versions = [ info.versions ];
		console.log(info.name, info.versions);
		npm.commands.install([info.name], console.log);
	    });
	    if(!c--) return;
	}
    });
    */
});