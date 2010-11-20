var crypto = require('crypto');
var querystring = require('querystring');
var http = require('http');

var router = require('./lib/node-router');
var server = router.getServer();
var db = require('./db');
var config = require('./config');
var async = require('./lib/async').async;

var sandbox = require('./sandbox');

var userLogin = {};
function checkUser(d) {
    // might change this to store in a db
    if(!userLogin[d.user]) return false;
    return userLogin[d.user] == d.token;
}

var ajaxActions = {
    login: function (data, user, back) {
	db.get("login_"+data.user, function (p) {
	    if(p == crypto.createHash('sha1').update(data.pass).digest('hex')) {
		back({ok: true, user: data.user, token: (userLogin[data.user] = Math.random().toString().substring(2))});
	    }else
		back({ok: false});
	});
    },
    logout: function (data, user, back) {
	if(user)
	    userLogin[user]=null;
	back();
    },
    list: function (data, user, back) {
	async([
	    [
		function () { db.get("lsFs_"+user, this); },
		function () { db.get("lsOwn_"+user, this); }
	    ],
	    function () { back([(this[0] || "").split("*"), (this[1] || "").split("*")]); }
	]);
    },
    save: function (data, user, back) {
	if(!user) return back();
	if(data.name.indexOf("*")!=-1) return back();
	db.set("fs_"+user+"_"+data.name, data.val, function () { back(); });
	db.get("lsFs_"+user, function (d) {
	    d = d || "";
	    if(d.indexOf(data.name)==-1)
		db.set("lsFs_"+user, d+(d?"*":"")+data.name);
	});
    },
    open: function (data, user, back) {
	if(!user) return back();
	db.get("fs_"+user+"_"+data.name, function(val) {
	    if(val)
		back({val: val, ok: true});
	    else
		back({ok: false});
	});
    },
    test: function (data, user, back) {
	try {
	    var con = http.createClient(config.testPort, 'localhost');
	    var r = con.request('POST', '/?key='+config.testSKey+'&user='+user, {
		"host": config.testHost
	    }, {'Content-Length': data.code.length});
	    r.on('response', function (response) {
		response.on('data', function (d) {
		    back(d.toString('ascii', 0).replace(/error\n/, ""));
		});
	    });
	    r.write(data.code);
	    r.end();
	}catch(e) {
	    back(config.errorPage);
	}
	//back(config.testBase);
    },
    newHost: function (data, user, back) {
	if(!user) return back(false);
	if((/[^a-zA-Z0-9\-]/.exec(data.name))) return back(false);
	db.get("owner_"+data.name, function (d) {
	    if(d==user) {
		return back(true);
	    }else if(d==null) {
		db.set("owner_"+data.name, user, function () { back(true); });
		db.setCat("lsOwn_"+user, data.name+"*");
	    }else
		return back(false);
	    
	});
    },
    deploy: function (data, user, back) {
	if(!user) return back(false);
	db.get("owner_"+data.name, function (owner) {
	    if(owner != user) {
		back("you do not own that sub domain");
		return;
	    }
	    db.get("fs_"+user+"_"+data.file, function (codeS) {
		var con = http.createClient(config.testPort, 'localhost');
		var r = con.request('POST', '/?key='+config.testSKey+'&user='+user, {
		    "host": config.testHost
		}, {'Content-Length': codeS.length});
		r.on('response', function (response) {
		    var tres="";
		    response.on('data', function (d) {
			tres+=d.toString('ascii',0);
		    });
		    response.on('end', function () {
			if((/error/.exec(tres))) {
			    back("Deploy failed due to error");
			    return;
			}
			sandbox.build(codeS, user, function (build) {
			    db.set("app_"+data.name, JSON.stringify({user: user, name: data.name, code: build, id: Date.now()}), function () {
				back("Deploy successful\nGive a few minutes for the application to update");
			    });
			});
		    });
		});
		r.write(codeS);
		r.end();
	    });
	});
    }
};

server.post('/ajax', function (req, res, match) {
    try {
	var data="";
	var EndCount=0;
	res.writeHead(200, {"Content-Type": "text/plain"});
	req.on('data', function (d) {
	    data+=d.toString('ascii', 0);
	});
	req.on('end', function () {
	    try {
		var d = JSON.parse(data);
		var ret=[];
		var userName=null;
		if(d.user && d.token)
		    if(checkUser(d))
			userName=d.user;
	    }catch (e) { return res.end(); }
	    EndCount++;
	    for(var i=0;i<d.actions.length;i++) {
		if(ajaxActions[d.actions[i].action]) {
		    ret.push({});
		    (function (act, dat, user, loc) {
			EndCount++;
			act(dat, user, function (d) {
			    ret[loc]=d;
			    EndCount--;
			    if(!EndCount) {
				res.write(JSON.stringify({"user": userName, "data": ret}));
				res.end();
			    }
			});
		    })(ajaxActions[d.actions[i].action], d.actions[i], userName, ret.length-1);
		    
		    //ret.push(ajaxActions[d.actions[i].action](d.actions[i], userName) || {});
		    
		}else
		    ret.push({"error":"not found", "name":d.actions[i].action})
	    }
	    EndCount--;
	    if(!EndCount) {
		res.write(JSON.stringify({"user": userName, "data": ret}));
		res.end();
	    }
	});
    }catch(e) {
	console.log(e);
	res.end();
    }
});

server.post('/newUser', function (req, res) {
    try {
    var raw="";
    req.on('data', function (d) {
	raw+=d.toString('ascii', 0);
    });
    req.on('end', function () {
    (function (data) {
	if(!data.userName || data.userName=="null")
	    res.notFound("User name not valid");
	db.has("login_"+data.userName, function (has) {
	    if(has)
		return router.staticHandler('./static/newUserName.html')(req,res);
	    var pass = crypto.createHash('sha1').update(data.password).digest('hex');
	    db.set("login_"+data.userName, pass);
	    db.set("email_"+data.userName, data.userEmail);
	    console.log("new user "+data.userName);
	    res.redirect( "/#" + (userLogin[data.userName] = Math.random().toString().substring(2)) + "," + data.userName );
	});
    })(querystring.parse(raw));
    });
    } catch (e) {
	console.error(e);
	res.notFound("there was an error");
    }
});

server.get(/\/error/, function (req, res) {
    res.writeHead(503, {"Content-Type": "text/html"});
    res.end("There was an error");
});

server.get(/\/Bespin(.*)$/, router.staticDirHandler('./Bespin/build', '/'));
server.get(/\/resources\/(.*)$/, router.staticDirHandler('./Bespin/build', '/'));

server.get('/', router.staticHandler('./static/index.html'));
server.get(/\/(.*)$/, router.staticDirHandler('./static', '/'));

server.listen(config.basePort);