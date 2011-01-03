var remote_end = "http://localhost/ajax";
var config_file = process.env.HOME + "/.jsapp";


var debug = console.log; // function () {}

var http = require('http');
var url = require('url');
var fs = require('fs');

var base64 = require('./base64.js').base64;

var config={};

function save_config() {
    fs.writeFileSync(config_file, JSON.stringify(config));
}

try {
    config = JSON.parse(fs.readFileSync(config_file));
    if(!config.user || !config.pass) throw 1;
    if(config.remote) config.remote = remote_end;
}catch(e) {
    console.log("There was a problem reading your config file, we are going to set it up now\nIf you do not all ready have an account, go to http://jsapp.us and press ctrl+l");
    var prompt = require('./prompt.js');
    prompt("JsApp username: ", config.user, false, function (err, user) {
	prompt("password: ", "", true, function (err, pass) {
	    config = {user: user, pass: base64.encode(pass), remote: remote_end};
	    _get_token(function () {console.log("You are now logged in");});
	});
    });
}

function _get_token (callback) {
    if(!config.pass || !config.user) {
	console.log("No logins");
	process.exit(2);
    }
    var u = url.parse(config.remote);
    var connect = http.createClient(u.port || 80, u.hostname);
    var send = JSON.stringify({
	"actions": [
	    {
		"action": "login",
		"user": config.user,
		"pass": base64.decode(config.pass)
	    }
	]
    });
    var request = connect.request('POST', u.pathname, {
	'host': u.hostname,
	'Content-length': send.length
    });
    debug(">", send);
    request.write(send);
    request.on('response', function (response) {
	var data="";
	response.on('data', function (d) {data+=d;});
	response.on('end', function () {
	    debug("<", data);
	    var j = JSON.parse(data);
	    if(!j.data[0].ok) {
		console.log("Your login has been rejected");
		config.pass = null;
		save_config();
		process.exit(2);
	    }else{
		config.token = base64.encode(j.data[0].token);
		save_config();
		callback();
	    }
	});
    });
}

function send(action, callback) {
    callback = callback || function () {};
    var u = url.parse(config.remote);
    var connect = http.createClient(u.port || 80, u.hostname);
    var s = JSON.stringify({
	"user": config.user,
	"token": base64.decode(config.token),
	"actions": [
	    action
	]
    });
    var request = connect.request('POST', u.pathname, {
	'host': u.hostname,
	'Content-length': s.length
    });
    debug(">", s);
    request.write(s);
    request.on('response', function (response) {
	var data="";
	response.on('data', function (d) {data+=d;});
	response.on('end', function () {
	    debug("<", data);
	    var j = JSON.parse(data);
	    if(j.user != config.user) {
		_get_token(function () {
		    send(action, callback);
		});
	    }else{
		callback(j.data[0]);
	    }
	});
    });
}

var help = {
    "help": "Print out useful help information\nusage: jsapp help [command name]",
    "upload": "Upload a file\nThis command uploads a file from the local file system to the vitural file system on the server\nusage: jsapp upload local-name [remote-name]",
    "puts": "alias to upload",
    "get": "Download a file from the server\nusage: jsapp get remote-name [local-name]"
};

var commands = {
    "help": function (c) {
	if(!c) c = process.argv[2];
	if(c) {
	    if(help[c])
		console.log(help[c]);
	    else
		console.log("Command "+c+" not found");
	    return;
	}
	var print = [
	    "jsapp is the command line interface to http://jsapp.us",
	    "if you are reading this then you must all ready be logged in",
	    "",
	    "for more information on a command do: jsapp help [command]",
	    ""];
	for(var n in help) {
	    print.push(n+"\t"+help[n].split('\n')[0])
	}

	console.log(print.join('\n'));
    },
    "upload": function () {
	if(process.argv.length < 3) return commands.help('upload');
	try{
	    var content = fs.readFileSync(process.argv[2]).toString();
	}catch(e) { return console.log("File not found"); }
	send({"action": "save", "name": process.argv[3] || process.argv[2], "val": content});
    },
    "puts": function () { commands.upload(); },
    "get": function () {
	if(process.argv.length < 3) return commands.help("get");
	send({"action": "open", "name": process.argv[2]}, function (d) {
	    if(d.ok) {
		fs.writeFileSync(process.argv[3] || process.argv[2], d.val);
	    }else{
		console.log("File was not found on the server");
	    }
	});
    },
    "test": function () {
	
    },
    "list": function () {
	send({"action":"list"}, function (d) {
	    var print="Files:\n";
	    for(var a=0;a<d[0].length;a++)
		print+=d[0][a]+"\t";
	    print+="\nDomains:\n";
	    for(var a=0;a<d[1].length;a++)
		print+=d[1][a]+"\t";
	    console.log(print);
	});
    },
    "ls": function () { commands.list(); },
    "deploy": function () {
	
    },
    "share": function () {
	
    },
    "delete": function () {
    },
    "rm": function () { commands['delete'](); },
    "rename": function () {
    },
    "mv": function () { commands.rename(); }
};

process.argv.shift();

if(config.pass) {
    if(commands[process.argv[1]]) {
	commands[process.argv[1]]();
    }else{
	if(process.argv[1]) console.log("Command was not found\n");
	commands['help']();
	process.exit(1);
    }
}

