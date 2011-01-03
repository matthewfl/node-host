var remote_end = "http://jsapp.us/ajax";
var config_file = process.env.HOME + "/.jsapp";
var ranTokenExpire = 3*60*60*1000;

var debug = function () {};//console.log;

var http = require('http');
var url = require('url');
var fs = require('fs');

var base64 = require('./base64.js').base64;

var config={};

function save_config() {
    fs.writeFileSync(config_file, base64.encode(JSON.stringify(config)));
}

try {
    config = JSON.parse(base64.decode(fs.readFileSync(config_file, 'ascii').toString()));
    if(!config.user || !config.pass) throw 1;
    if(!config.remote) config.remote = remote_end;
    if(config.remote != remote_end) throw 2;
    debug("Config:", config);
}catch(e) {
    debug(e);
    config.pass=null
    console.log("There was a problem reading your config file, we are going to set it up now\nIf you do not all ready have an account, go to http://jsapp.us and press ctrl+l");
    var prompt = require('./prompt.js');
    prompt("JsApp username: ", config.user, false, function (err, user) {
	prompt("password: ", "", true, function (err, pass) {
	    config = {user: user, pass: pass, remote: remote_end};
	    _get_token(function () {console.log("You are now logged in");});
	});
    });
}
if(!config.randToken || Date.now() - config.randTokenTime > ranTokenExpire) {
    config.randToken = Math.random().toString().substring(2, 6);
    config.randTokenTime = Date.now();
    save_config();
}

var _gotten_token=false;
function _get_token (callback) {
    if(!config.pass || !config.user) {
	console.log("No logins");
	process.exit(2);
    }
    if(_gotten_token) {
	console.log("Fail");
	process.exit(3);
    }
    _gotten_token=true;
    var u = url.parse(config.remote);
    var connect = http.createClient(u.port || 80, u.hostname);
    var send = JSON.stringify({
	"actions": [
	    {
		"action": "login",
		"user": config.user,
		"pass": config.pass
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
		config.token = j.data[0].token;
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
	"token": config.token,
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
    "put": "alias to upload",
    "get": "Download a file from the server\nusage: jsapp get remote-name [local-name]",
    "test": "Run a test\nusage: jsapp test local-file",
    "list": "List files and Domains\nList the current users vitural files on the server and domains that they own",
    "ls": "alias to list",
    "delete": "Delete a file on the server\nusage: jsapp delete remote-name",
    "rm": "alias to delete",
    "rename": "Rename a file on the server\nusage: jsapp rename remote-name new-remote-name",
    "mv": "alias to rename",
    "share": "Share a file on the server\nThe file must first be saved to the server, you can use 'jsapp upload file-name' to upload the file\nusage: jsapp share remote-name",
    "deploy": "Deploy a program\nThe file must first be saved to the server, you can use 'jsapp upload file-name' to upload the file\nYour domain must first be registed using the web interface\nusage: jsapp deploy remote-name domain-name",
    "set-browser": "Set up your web browser\nThis command sets up your web browser, this will auto open your applications when you test them\nusage: jsapp set-browser browser-command\n\nExamples:\nLinux:\tjsapp set-browser google-chrome\n\tjsapp set-browser firefox\nMac:\tjsapp set-browser open\nDisable:jsapp set-browser null"
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
	    var content = fs.readFileSync(process.argv[2], 'ascii').toString();
	}catch(e) { return console.log("File not found"); }
	send({"action": "save", "name": process.argv[3] || process.argv[2], "val": content});
    },
    "put": function () { commands.upload(); },
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
	if(process.argv.length < 3) return commands.help("test");
	try{
	    var content = fs.readFileSync(process.argv[2], 'ascii').toString();
	}catch(e) { return console.log("File not found"); }
	send({
	    "action": "test",
	    "randToken": config.randToken,
	    "code": content,
	    "fileName": process.argv[2]
	}, function (d) {
	    console.log("Live at: ", d);
	    if(config.browser) {
		require('child_process').exec(config.browser + " " + d);
	    }
	});
    },
    "list": function () {
	send({"action":"list"}, function (d) {
	    var print="Files:\n";
	    for(var a=0;a<d[0].length;a++)
		print+=d[0][a]+"  ";
	    print+="\nDomains:\n";
	    for(var a=0;a<d[1].length;a++)
		print+=d[1][a]+"  ";
	    console.log(print);
	});
    },
    "ls": function () { commands.list(); },
    "deploy": function () {
	if(process.argv.length < 4) return commands.help("deploy");
	send({
	    "action": "deploy",
	    "name": process.argv[3],
	    "file": process.argv[2]
	}, function (d) {
	    console.log(d);
	});
    },
    "share": function () {
	if(process.argv.length < 3) return commands.help("share");
	send({
	    "action": "share",
	    "file": process.argv[2]
	}, function (b) {
	    if(b.ok) {
		console.log("Code Shared at: http://jsapp/s/"+b.num)
	    }else{
		console.log("File not found");
	    }
	});
    },
    "delete": function () {
	if(process.argv.length < 3) return commands.help("delete");
	send({
	    "action": "delete",
	    "name": process.argv[2]
	}, function(d) {
	    console.log(d ? "File Deleted" : "File not found");
	});
    },
    "rm": function () { commands['delete'](); },
    "rename": function () {
	if(process.argv.length < 4) return commands.help("rename");
	send({
	    "action": "rename",
	    "from": process.argv[2],
	    "to": process.argv[3]
	}, function (d) {
	    console.log(d ? "File renamed" : "File not found");
	});
    },
    "mv": function () { commands.rename(); },
    "set-browser": function () {
	if(process.argv.length < 3) return commands.help("set-browser");
	config.browser = process.argv[2] == "null" ? "" : process.argv[2];
	save_config();
    }
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

