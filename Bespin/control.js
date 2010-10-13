"define metadata";
({
    "objects": ["commandLine", "editor"],
    "description": "the interface for working with Node-host",
    "provides": [
	{
	    "ep": "command",
	    "name": "open",
	    "key": "ctrl_o",
	    "pointer": "#openCommand",
	    "description": "Open a file by name",
	    "params": [
		{
		    "name": "file",
		    "type": "text",
		    "description": "file to load"
		}
	    ]
	},
	{
	    "ep": "command",
	    "name": "save",
	    "key": "ctrl_s",
	    "pointer": "#saveCommand",
	    "description": "save the file to the server",
	    "params": [
		{
		    "name": "file",
		    "type": "text",
		    "description": "name to save under"
		}
	    ]
	},
	{
	    "ep": "command",
	    "name": "test",
	    "key": "ctrl_b",
	    "pointer": "#testCommand",
	    "description": "open the current code in a test window",
	    "params": []
	},
	{
	    "ep": "command",
	    "name": "new",
	    "key": "ctrl_n",
	    "pointer": "#newCommand",
	    "description": "Make a new file",
	    "params": []
	},
	{
	    "ep": "command",
	    "name": "deploy",
	    "pointer": "#deployCommand",
	    "description": "update the running program",
	    "params": []
	},
	{
	    "ep": "command",
	    "name": "list",
	    "pointer": "#listCommand",
	    "description": "List of files on the server",
	    "params": []
	},
	{
	    "ep": "command",
	    "name": "ls",
	    "pointer": "#listCommand",
	    "description": "List of files on the server",
	    "params": []
	},
	{
	    "ep": "command",
	    "name": "logout",
	    "pointer": "#logoutCommand",
	    "description": "Logout",
	    "params": []
	},
	{
	    "ep": "command",
	    "name": "login",
	    "key": "ctrl_l",
	    "pointer": "#loginCommand",
	    "description": "Login",
	    "params": []
	},
	{
	    "ep": "command",
	    "name": "newuser",
	    "description": "Create a new user",
	    "pointer": "#loginCommand",
	    "params": []
	},
	{
	    "ep": "command",
	    "name": "docs",
	    "description": "Docs for JsApp",
	    "key": "ctrl_h",
	    "pointer": "#docsCommand",
	    "params":[]
	}
    ]
});
"end";

    var discardChanges = "Are you sure that you want to discard all changes";

require('facebox'); // just to load it into jquery

var env = require('environment').env;
var $ = require('jquery').$;

var loadFile="";
var loadValue = env.editor.value;
var fileList=[];
var hostList=[];

var userName=null;
var userPass=null;
var userToken=null;

if(location.hash) {
    var hash = location.hash.substring(1).split(",");
    userToken=hash[0];
    userName=hash[1];
    location.hash="";
}

exports.openCommand = function (args, request) {
    if(!userToken) return request.done("Not logedin");
    if(!('file' in args)) {
	env.commandLine.setInput('open ');
	return;
    }
    console.trace();
    if(loadValue != env.editor.value)
	if(!confirm(discardChanges)) return;
    loadFile = args['file'];
    Ajax.Call({
	"action": "open",
	"name": loadFile
    }, function (data) {
	if(!data.ok) { alert("File not found"); env.editor.value=""; loadFile="";}
	else env.editor.value=loadValue=data.val;
	if(request.args)
	    request.done(data.ok ? "File opened" : "File not found");
    });
    Ajax.send();
};

exports.saveCommand = function (args, request) {
    if(!userToken) return requst.done("Not logedin");
    if(loadFile === null && (!('file' in args) || args['file']=="")) {
	env.commandLine.setInput('save ');
	return;
    }
    var file = args['file'] || loadFile;
    if(!file) return alert("No file name given");
    loadValue=env.editor.value;
    loadFile=file;
    if(loadFile.indexOf("*")!=-1) {loadFile=null;return alert("File name can not containt *");}
    Ajax.Call({
	"action": "save",
	"name": loadFile,
	"val": loadValue
    }, function () {
	if(request.args)
	    request.done("file saved");
    });
    Ajax.send();
    if(fileList.indexOf(loadFile)==-1)
	fileList.push(loadFile);
};

exports.testCommand = function (args, request) {
    // this seems to work with better with popup blockers
    var win = window.open("");
    Ajax.Call({
	"action": "test",
	"code": env.editor.value
    }, function (p) {
	win.location.href=p;
    });
    Ajax.send();
};

exports.newCommand = function (args, request) {
    if(loadValue != env.editor.value)
	if(!confirm(discardChanges)) return;
    loadValue="";
    env.editor.value = "";
    loadFile = null;
};

exports.deployCommand = function (args, request) {
    //var saveFile=false;
    if(!loadFile)
	return alert("The file has no name, you must use the save command first to give it a name");
    if(loadValue != env.editor.value) {
	if(confirm("Would you like to save the file before updating")) {
	    loadValue=env.editor.value;
	    Ajax.Call({
		"action": "save",
		"name": loadFile,
		"val": loadValue
	    });
	}
    }
    // stuff here
    $.facebox('<div id="deploy"><select id="deploy-host" style="width:60%"></select><input id="deploy-button" type="button" style="width:40%; display: inline;" value="Deploy" /><input id="deploy-newHost" type="button" style="width:40%; display: inline;" value="New Domain" /></div>');
    var list = $("#deploy-host");
    list.empty();
    for(var a=0; a<hostList.length;a++) {
	list.append('<option value="'+hostList[a]+'" >'+hostList[a]+'</option>');
    }
    $("#deploy-newHost").click(function () {
	var name = prompt("Enter a subhost name\n[name].jsapp.us", ".jsapp.us");
	name = name.replace(/.jsapp.us$/i, "");
	if(/[^a-zA-Z0-9\-]/.exec(name))
	    return alert("Name contains invalid characters");
	if(hostList.indexOf(name)!=-1) {
	    $("#deploy-host").val(name);
	    return;
	}
	Ajax.Call({
	    "action": "newHost",
	    "name": name
	}, function (data) {
	    if(data) {
		list.append('<option value="'+name+'" >'+name+'</option>');
		hostList.push(name);
	    }else
		alert("That name is all ready taken");
	});
	Ajax.send();
    });
    $("#deploy-button").click(function () {
	var name = $("#deploy-host").val();
	Ajax.Call({
	    "action": "deploy",
	    "name": name,
	    "file": loadFile
	}, function (data) {
	    alert(data);
	});
	Ajax.send();
    });
    
};

exports.listCommand = function (args, request) {
    if(fileList.length)
	request.done(fileList.join("<br>"));
    else
	request.done("Added files using the save command");
};

exports.logoutCommand = function (args, request) {
    if(loadValue != env.editor.value)
	if(!confirm(discardChanges)) return;
    if(!confirm("Are you sure that you want to logout")) return;
    // this is not needed, but might change and not reload page
    loadFile=userName=userToken=null;
    env.editor.value=loadValue="Loged out";
    fileList=[];
    
    $.facebox("have a good day");
    Ajax.Call('logout', function () {
	location.reload(false);
    });
    Ajax.send();
};

exports.loginCommand = function (args,request) {
    if(userName !== null) return exports.logoutCommand();
    request.done();
    $.facebox('<div id="login"><form action="/newUser" method="post" type="input">User:<input id="userName" name="userName" type="input" style="color:#000; width:90%;"/><br>Password:<input id="password" name="password" type="password" style="color:#000; width: 90%; "/><div id="moreUser" style="display:none;">Password Again:<input id="password2" name="password2" type="password" style="color: #000; width:90%" /><br>Email:<input id="userEmail" name="userEmail" type="input" style="color: #000; width:90%" /></div><br><input value="login" type="button" id="loginButton" style="width:40%; display: inline;" /><input value="new user" type="submit" id="newUserButton" style="width:40%; display:inline;"/></form></div>');
    $("#userName").focus();
    $("#userName,#password").keypress(function (e) {
	if(e.keyCode == '13') {
	    e.preventDefault();
	    $("#loginButton").click();
	}
    });
    $("#newUserButton").click(function () {
	if($("#moreUser:hidden").show().size()) { 
	    return false;
	}
	if(!$("#password").val()) {
	    alert("There is no password entered");
	    return false;
	}
	if($("#password").val() != $("#password2").val()) {
	    $("#password2").val('').focus();
	    alert("Passwords do not match");
	    return false;
	}
	if(!$("#userEmail").val()) {
	    return confirm("Email is only used for password reset\nleave it blank?");
	}
	return true;
    });
    $("#loginButton").click(function () {
	$("#login").fadeTo("slow", .33);
	var user = $("#userName").val();
	var pass = $("#password").val();
	$.ajax({
	    "url": "/ajax",
	    "type": "POST",
	    "cache": false,
	    "dataType": "json",
	    "data": JSON.stringify({
		"actions": [
		    {
			"action": "login",
			"user": user,
			"pass": pass
		    }
		]
	    }),
	    success: function (data) {
		if(data[0].ok != true) {
		    $("#login").fadeTo("slow", 1);
		    alert("login failed");
		    return;
		}
		userName=data[0].user;
		userToken=data[0].token;
		Ajax.Call('list', function(data) {
		    fileList = data[0];
		    hostList = data[1];
		    hostList.pop();
		});
		Ajax.send();
		function r () {
		    $("#login").remove();
		    $(document).unbind('afterClose.facebox', r);
		}
		$(document).bind('afterClose.facebox', r);
		$(document).trigger('close.facebox');
	    },
	    complete: function (a,b) {
		if(b == "error") {
		    alert('try again latter');
		}
	    }
	});
    });
};

exports.docsCommand = function () {
    window.open("http://wiki.matthewfl.com/jsapp:start");
};

var Ajax = {
    buffer: [],
    callbacks: [],
    Call: function (data, callback) {
	if(typeof data == "string")
	    data = {"action": data};
	Ajax.buffer.push(data);
	Ajax.callbacks.push(callback || function () {});
    },
    send: function () {
	if(!Ajax.buffer.length) return;
	var send = {"actions":Ajax.buffer, user: userName, token: userToken};
	var callback=Ajax.callbacks;
	Ajax.buffer=[];
	Ajax.callbacks=[];
	(function (callback) {
	    $.ajax({
		"url": "/ajax",
		"type": "POST",
		"cache": false,
		"dataType": "json",
		"data": JSON.stringify(send),
		success: function (data) {
		    for(var i=0;i<callback.length;i++)
			callback[i](data[i]);
		}
	    });
	})(callback);
    }
};