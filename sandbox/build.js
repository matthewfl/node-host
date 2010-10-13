var db = require('../db');
var jsmin = require('../lib/jsmin').jsmin;
var modules = require('./modules');

exports.build = function (code, user, back) {
    var ret={};
    var need={};
    ret._=jsmin("", code, 1);
    code.replace(/require\s*?\((.*)\)/g, function (r, v) {
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
		    ret[name] = code || "throw 'not found';";
		    if(!--count) back(ret);
		});
	    })(name);
	}else if(modules[name]) {}
	else if(name.indexOf('/')) {
	    // will be used latter
	}else
	    throw "Module "+name+" Not found";
    }
    if(!--count) back(ret);
};