var db = require('../db');
var jsmin = require('../lib/jsmin').jsmin;
var modules = require('./modules');

function builder (user, code, back) {
    this.back = back;
    this.user = user;
    this.need = {};
    this.pub = {};
    this.code = {};
    this.counter=1;
    this.require(code);
    this.code._ = jsmin("",code,1);
    this.count();
}

builder.prototype.require = function (code) {
    code.replace(/require\s*?\((.*?)\)/g, function (r, v) {
	try {
	    console.log(v);
	    var name = v.replace(/\"(.*)\"|\'(.*)\'/, function (r) { return r.substring(1,r.length-1); });
	    if(typeof this.need[name] != "undefined") {
		this.need[name] = false;
		this.searcher(name);
	    }
	}catch(e) {
	    throw "Require needs to be static";
	}
	return r;
    });
};

builder.prototype.searcher = function (name) {
    if(name.indexOf("./") == 0) {
	this.counter++;
	(function (name,self) {
	    db.get("fs_"+user+"_"+name.substring(2), function (code) {
		self.code[name] = code ? jsmin("",code,1) : "throw '"+name+" not found';";
		self.count();
	    });
	})(name, this);
    }else if(typeof modules[name] != "undefined") {}
    else if(name.indexOf('/') != -1) {
	var user = a.substring(0,a.indexOf('/'));
	var file = a.substring(a.indexOf('/')+1);
	if(typeof this.pub[user] != "undefined") {
	    if(this.pub[user].indexOf(file) != -1) {
		
	    }else{
		this.error
	    }
	}else{
	    (function (user, self) {
		db.get("lsPublic_"+user, function (data) {
		    self.pub[user] = data;
		});
	    })(user, this);
	}
    }else
	this.code[name] = 'throw "Module '+name+' not found";';
};

builder.prototype.count = function () {
    if(!--this.counter)
	this.back(this.code);
};

exports.build = function (code, user, back) {
    var ret={};
    var need={};
    ret._=jsmin("", code, 1);
    code.replace(/require\s*?\((.*?)\)/g, function (r, v) {
	try {
	    console.log(v);
	    need[v.replace(/\"(.*)\"|\'(.*)\'/, function (r) { return r.substring(1,r.length-1); })]=true;
	}catch(e) {
	    throw "Require needs to be static";
	}
	return r;
    });
    var count=1;
    for(var name in need) {
	console.log(name);
	if(name.indexOf("./") == 0) {
	    count++;
	    (function (name) {
		db.get("fs_"+user+"_"+name.substring(2), function (code) {
		    ret[name] = code ? jsmin("",code,1) : "throw 'not found';";
		    if(!--count) back(ret);
		});
	    })(name);
	}else if(typeof modules[name] != "undefined") {}
	else if(name.indexOf('/')) {
	    // will be used latter
	}else
	    throw "Module "+name+" Not found";
    }
    if(!--count) back(ret);
};