// node-tyrant.js
//
// A node.js network inerface for Tokyo Tyrant
// Version 0.2
// Requires node 0.1.30 or later
// Rhys Jones, Acknack Ltd 2010
//
// Copyright 2009, Acknack Ltd. All rights reserved.
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

var tcp = require('net');
//process.mixin(GLOBAL, 'tcp');

var sys = require('sys');

var conn;
var callbacks=[];
var response='';
var emitter=new process.EventEmitter();
var TCMD=String.fromCharCode(0xC8);

exports.ITLEXICAL = '0';
exports.ITDECIMAL = '1';
exports.ITOPT = 9998;
exports.ITVOID = 9999;
exports.ITKEEP = 16777216;


exports.addListener = function(event, listener) {
    emitter.addListener(event, listener);
}


exports.connect = function(port, hostname) {
  conn=tcp.createConnection(port || 1978, hostname || '127.0.0.1');
  conn.addListener("connect", onConnect);
  conn.addListener("data", onData);
  conn.addListener("disconnect", onDisconnect);
  return this;
}


// List of Command hex codes for Tyrant
var commandCode = {
    misc: String.fromCharCode(0x90),
    get: String.fromCharCode(0x30),
    out: String.fromCharCode(0x20),
    vsiz: String.fromCharCode(0x38),
    iterinit: String.fromCharCode(0x50),
    iternext: String.fromCharCode(0x51),
    status: String.fromCharCode(0x88),
    addint: String.fromCharCode(0x60),
}

// Commands and their request and response functions
var commands = {
  status:[formatNone, responseSingle],
  get:[formatMisc, responseMisc],
  getlist:[formatMisc, responseMisc],
  out:[formatSingle, responseNone],
  vsiz:[formatSingle, responseInt],
  iterinit:[formatNone, responseNone],
  iternext:[formatNone, responseSingle],
  put:[formatMisc, responseMisc], // Store and overwrite if already present
  putkeep:[formatMisc, responseMisc], // Store but dont overwrite if already present
  putcat:[formatMisc, responseMisc], // Store and concatinate if already present
  setindex:[formatMisc, responseSingle],
  search:[formatMisc, responseMisc],
  addint:[formatInt, responseInt],
  genuid:[formatMisc, responseMisc],
}

// Filter queries for search
var queries = {
  'is' : '0',
  'like' : '1',
  'starts' : '2',
  'ends' : '3',
  'hasall' : '4',
  'has' : '5',
  'isone' : '6',
  'matches' : '7',
  'eq' : '8',
  'gt' : '9',
  'gte' : '10',
  'lt' : '11',
  'lte' : '12',
  'between' : '13',
  'eqone' : '14',
}

// Take a raw binary string and return a utf8 string
function decode_utf8(a) {
  var string = "";
  var i = 0;
  var c = c1 = c2 = 0;

  while ( i < a.length ) {
    c = a.charCodeAt(i);
    if (c < 128) {
      string += String.fromCharCode(c);
      i++;
    }
    else if((c > 191) && (c < 224)) {
	c2 = a.charCodeAt(i+1);
      string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      i += 2;
    }
    else {
	c2 = a.charCodeAt(i+1);
	c3 = a.charCodeAt(i+2);
      string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      i += 3;
    }
  }
  return string;
}


// Take a utf8 string and return a binary string
function encode_utf8(s) {
  var a="";
  for (var n=0; n< s.length; n++) {
    var c=s.charCodeAt(n);
    if (c<128) {
	a += String.fromCharCode(c);
    }
    else if ((c>127)&&(c<2048)) {
	a += String.fromCharCode( (c>>6) | 192) ;
	a += String.fromCharCode( (c&63) | 128);
    }
    else {
      a += String.fromCharCode( (c>>12) | 224);
      a += String.fromCharCode( ((c>>6) & 63) | 128);
      a += String.fromCharCode( (c&63) | 128);
    }
  }
  return a;
}

// Convert a 4 byte binary string into a 32-bit int
function unpackInt(si) {
    return (si.charCodeAt(0)*256*256*256)+(si.charCodeAt(1)*256*256)+(si.charCodeAt(2)*256)+si.charCodeAt(3);
}

// Convert an int into a 4 byte binary sting
function packInt(i) {
    return String.fromCharCode(Math.floor(i/Math.pow(256,3))&0xff) + String.fromCharCode(Math.floor(i/Math.pow(256,2))&0xff) + String.fromCharCode(Math.floor(i/256)&0xff) + String.fromCharCode(i%256);
}


function pprint(s) {
  for (var i=0; i<s.length; i++) {
      if (s.charCodeAt(i)<32) {sys.puts(s.charCodeAt(i)+' : ');}
      else {sys.puts(s.charCodeAt(i)+' : '+ s.charAt(i));}
  }
}

function formatNone(commandName, commandArgs, argCount, opts) {
  return TCMD + commandCode[commandName];
}

function formatSingle(commandName, commandArgs, argCount, opts) {
  var d=encode_utf8(commandArgs[0]);
  return TCMD + commandCode[commandName] + packInt(d.length) + d;
}

function formatInt(commandName, commandArgs, argCount, opts) {
  var k=encode_utf8(commandArgs[0]);
  var i=packInt(commandArgs[1]);
  return TCMD + commandCode[commandName] + packInt(k.length) + i + k;
}

function formatMisc(commandName, commandArgs, argCount, opts) {
  var cmdName=encode_utf8(commandName);
  var cmdArgs='';
  var cmdCount=0;
  for (var i=0; i<argCount; i++) {
    if (typeof commandArgs[i]=='string') {
      var d=encode_utf8(commandArgs[i]);
      cmdArgs += packInt(d.length) + d;
      cmdCount++;
    } else {
      // Deal with an array of strings
      for (var j=0; j<commandArgs[i].length; j++) {
	var d=encode_utf8(commandArgs[i][j]);
	cmdArgs += packInt(d.length) + d;
	cmdCount++;
      }
    }
  }
  return TCMD + commandCode.misc + packInt(cmdName.length) + packInt(opts || 0) + packInt(cmdCount) + cmdName + cmdArgs;
}


function responseNone(data) {
    if (data.charCodeAt(0)!=0) return [null, 1, 'Tyrant Error : '+data.charCodeAt(0)];
  return [0, 1, null];
}

function responseInt(data) {
  if (data.charCodeAt(0)!=0) return [null, 1, 'Tyrant Error : '+data.charCodeAt(0)];
  if (data.length<5) return [null, -1, null];
  var rlen=unpackInt(data.slice(1, 5));
  return [rlen, 5, null];
}

function responseSingle(data) {
  if (data.charCodeAt(0)!=0) return [null, 1, 'Tyrant Error : '+data.charCodeAt(0)];
  if (data.length<5) return [null, -1, null];
  var rlen=unpackInt(data.slice(1, 5));
  if (data.length<(rlen+5)) return [null, -1, null];
  return [decode_utf8(data.slice(5, rlen+5)), rlen+5, null];
}

function responseMisc(data) {
  if (data.charCodeAt(0)!=0) return [null, 5, 'Tyrant Error : '+data.charCodeAt(0)];
  if (data.length<9) return [null, -1, null];
  var r=[];
  var c=1;
  var resultCount=unpackInt(data.slice(c, c+=4));
  for (var i=0; i<resultCount; i++) {
    var rlen=unpackInt(data.slice(c, c+=4));
    if (data.length<(c+rlen)) return ['', -1, null];
    r.push(decode_utf8(data.slice(c, c+=rlen)));
  }
  return [ r, c, null];
}


function createCommandSender(commandName) {
  return function() {
    if (conn.readyState != 'open') {
      throw "connection is not open";
    }

    var callback = null;
    var numArgs = arguments.length;

    if (typeof(arguments[arguments.length-1])=='function') {
      callback = arguments[arguments.length-1];
      numArgs=arguments.length-1;
    }
 
    var cmd;

    if (commands[commandName]) {
      cmd = commands[commandName][0](commandName, arguments, numArgs);
    } else {
      throw 'unknown command '+commandName;
    }

    callbacks.push( { cmd:commandName, cb:callback });
    conn.write(cmd, "binary");
  }
}


function createQuery(query) {
  return function() {
    var name = arguments[0];
    var expr = arguments[1];
    return 'addcond'+String.fromCharCode(0)+name+String.fromCharCode(0)+queries[query]+String.fromCharCode(0)+expr;
  }
}

for (var commandName in commands) {
  exports[commandName] = createCommandSender(commandName);
}

for (var query in queries) {
  exports[query] = createQuery(query);
}

exports.sort = function(name, direction, numerical) {
  var d;
  if (numerical) {
    d = direction=='asc' ? '2' : '3';
  } else {
    d = direction=='asc' ? '0' : '1';
  }
  return 'setorder'+String.fromCharCode(0)+name+String.fromCharCode(0)+d;
}

exports.limit = function(max, skip) {
  if (max==null) max=-1;
  if (skip==null) skip=-1;
  return 'setlimit'+String.fromCharCode(0)+max+String.fromCharCode(0)+skip;
}


// Helper function to take name,value array and return a dictionary
exports.dict = function (r) {
  var d={};
  for (var i=0; i<r.length; i+=2) {
    d[r[i]]=r[i+1];
  }
  return d;
}



function onData(data) {
  //sys.puts('Received: '+data.length+', response : '+response.length);
  //pprint(data);
  response += data;
  var offset=0;
  while (callbacks[0] && (offset>=0) && (response.length>0)) {
    var resultHandler=commands[callbacks[0].cmd][1];
    var resultData = resultHandler(response);
    var result = resultData[0];
    offset = resultData[1];
    var err = resultData[2];
    if (offset>=0) {
      response=response.slice(offset);
    }
    if ( offset>=0 || result || err ) {
      var callback = callbacks.shift();
      if (callback && callback.cb) {
	  callback.cb(err, result);
      }
    }
  }
}


exports.quit = function() {
  if (conn.readyState != "open")
    throw "connection is not open";
  conn.close();
  emitter.emit("close");
}

function onConnect() {
  conn.setEncoding("binary");
  emitter.emit("connect");
}

function onDisconnect(hadError) {
  if (hadError)
    throw "disconnected from Tyrant server in error";
}

