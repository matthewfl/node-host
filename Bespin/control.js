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
	    "name": "update",
	    "pointer": "#updateCommand",
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
	}
    ]
});
"end";

    var discardChanges = "Are you sure that you want to discard all changes";

require('facebox'); // just to load it into jquery

var env = require('environment').env;
var $ = require('jquery').$;

var loadFile=null;
var loadValue = env.editor.value;
var fileList=["program1", "program2"];

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
    if(!('file' in args)) {
	env.commandLine.setInput('open ');
	return;
    }
    console.trace();
    if(loadValue != env.editor.value)
	if(!confirm(discardChanges)) return;
    loadFile = args['file'];
    env.editor.value=loadValue=args['file'] + " content";
    request.done("file loaded");
};

exports.saveCommand = function (args, request) {
    if(loadFile === null && (!('file' in args) || args['file']=="")) {
	env.commandLine.setInput('save ');
	return;
    }
    var file = ('file' in args) ? args['file'] : loadFile;
    loadValue=env.editor.value;
    loadFile=file;
    Ajax.send
    if(request.args)
	request.done("file saved");
};

exports.testCommand = function (args, request) {
    window.open("http://google.com");
};

exports.newCommand = function (args, request) {
    if(loadValue != env.editor.value)
	if(!confirm(discardChanges)) return;
    loadValue="";
    env.editor.value = "";
    loadFile = null;
};

exports.updateCommand = function (args, request) {
    var saveFile=false;
    if(loadValue != env.editor.value)
	saveFile=confirm("Would you like to save the file before updating");
    // stuff here
    $.facebox('hello world');
};

exports.listCommand = function (args, request) {
    request.done(fileList.join("<br>"));
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
    $.facebox('<div id="login"><form action="/newUser" method="post" type="input">User:<input id="userName" name="userName" type="input" style="color:#000; width:90%;"/><br>Password:<input id="password" name="password" type="password" style="color:#000; width: 90%; "/><br><input value="login" type="button" id="loginButton" style="width:40%; display: inline;" /><input value="new user" type="submit" id="newUserButton" style="width:40%; display:inline;"/></div>');
    $("#userName").focus();
    $("#userName,#password").keypress(function (e) {
	if(e.keyCode == '13') {
	    e.preventDefault();
	    $("#loginButton").click();
	}
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
		userName=data[0].user;
		userToken=data[0].token;
		Ajax.Call('list', function(data) {
		    fileList = data;
		});
		Ajax.send();
	    },
	    complete: function (a,b) {
		if(b == "error")
		    alert('try again later');
	    }
	});
	setTimeout(function () {
	    function r () {
		$("#login").remove();
		$(document).unbind('afterClose.facebox', r);
	    }
	    $(document).bind('afterClose.facebox', r);
	    $(document).trigger('close.facebox');
	}, 500);
    });
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