var db = require('../db');
var jsmin = require('../lib/jsmin').jsmin;

exports.build = function (code, user, back) {
    var ret={};
    var need={};
    console.log(typeof code);
    ret._=jsmin("", code, 1);
    code.replace(/require\s*?\((.*)\)/g, function (r, v) {
	try {
	    need[JSON.stringify(v)]=true;
	}catch(e) {
	    throw "Require needs to be static";
	}
	return r;
    });
    for(var name in need) {
	
    }
    back(ret);
};