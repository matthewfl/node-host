var crypto = require('crypto');
var querystring = require('querystring');
var http = require('http');
var fs = require('fs');

var router = require('./lib/node-router');
var server = router.getServer();
var db = require('./db');
var config = require('./config');
var async = require('./lib/async').async;
var Markdown = (new (require('./lib/showdown').Showdown.converter)).makeHtml;

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
		function () { db.get("lsOwn_"+user, this); },
		function () { db.get("lsPublic_"+user, this); }
	    ],
	    function () { back([(this[0] || "").split("*"), (this[1] || "").split("*"), (this[2] || "").split("*")]); }
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
    },
    share: function (data, user, back) {
	if(!user) return back(false);
	db.get("fs_"+user+"_"+data.file, function (shareCode) {
	    if(!shareCode) return back({ok: false});
	    db.addInt('share_index', 1, function (val) {
		db.set('share_'+val, shareCode);
		back({ok: true, num: val});
	    });
	});
    },
    "profile-data": function (data, user, back) {
	if(!user) return back(false);
	async([
	    [
		function () { db.get("setting_name_"+user, this); },
		function () { db.get("email_"+user, this); },
		function () { db.get("profile_"+user, this); }
	    ],
	    function () {
		back({name: this[0], email: this[1], markdown: this[2] || "This is the content for your profile in markdown"});
	    }
	]);
    },
    "profile-save": function (data, user, back) {
	if(!user) return back(false);
	db.set("setting_name_"+user, data.name);
	db.set("email_"+user, data.email);
	db.set("profile_"+user, data.markdown);
	back(true);
    },
    "public-save": function (data, user, back) {
	if(!user) return back(false);
	db.set("lsPublic_"+user, data.pub.join("*"));
	back(true);
    },
    "delete": function (data, user, back) {
	if(!user) return back(false)
	db.get("lsFs_"+user, function (ls) {
	    ls = ls.split("*");
	    if(ls.indexOf(data.name)==-1) return back(false);
	    ls.splice(ls.indexOf(data.name), 1);
	    db.set("lsFs_"+user, ls.join("*"));
	    db.remove("fs_"+user+"_"+data.name, function () {
		back(true);
	    });
	    db.get("lsPublic_"+user, function(d) {
		if(d.split("*").indexOf(data.name)!=-1) {
		    var a = d.split("*");
		    a.splice(a.indexOf(data.name),1);
		    db.set("lsPublic_"+user, a.join("*"));
		}
	    });
	});
    },
    rename: function (data, user, back) {
	if(!user) return back(false);
	db.get("lsFs_"+user, function (ls) {
	    ls = ls.split("*");
	    console.log(ls);
	    console.log(ls.indexOf(data.from));
	    if(ls.indexOf(data.from)==-1) return back(false);
	    ls[ls.indexOf(data.from)]=data.to;
	    db.set("lsFs_"+user, ls.join("*"));
	    db.get("fs_"+user+"_"+data.from, function (f) {
		db.set("fs_"+user+"_"+data.to, f);
		db.remove("fs_"+user+"_"+data.from);
		back(true);
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
		if(!data.userName || data.userName=="null" || data.userName.length < 2 || /\\|\//.exec(data.userName))
		    res.notFound("User name not valid");
		db.has("login_"+data.userName, function (has) {
		    if(has)
			return router.staticHandler('./static/newUserName.html')(req,res);
		    var pass = crypto.createHash('sha1').update(data.password).digest('hex');
		    db.set("login_"+data.userName, pass);
		    db.set("email_"+data.userName, data.userEmail);
		    console.log("new user "+data.userName);
		    res.redirect( "/#u" + (userLogin[data.userName] = Math.random().toString().substring(2)) + "," + data.userName );
		});
	    })(querystring.parse(raw));
	});
    } catch (e) {
	console.error(e);
	res.notFound("there was an error");
    }
});

var indexFiles = {
    raw: fs.readFileSync('./static/index.html').toString(),
    head: fs.readFileSync('./static/header.txt').toString(),
    indexExample: fs.readFileSync('./static/index_example.js').toString(),
    shareBasePre: "",
    shareBasePost: "",
    shareNotFound: "/////////////////////////////////\n// The file could not be found //\n/////////////////////////////////",
    index: "",
    profile: fs.readFileSync('./static/profile.html').toString()
};
indexFiles.index = indexFiles.raw.replace("{CODE}", indexFiles.head + indexFiles.indexExample);
var shareBaseSplit = indexFiles.raw.replace("{CODE}", "\/*\n * This code was shared using JSApp.US\n *\/\n\n{CODE}").split("{CODE}");
indexFiles.shareBasePre = shareBaseSplit[0];
indexFiles.shareBasePost = shareBaseSplit[1];
indexFiles.shareNotFound += "\n\n\n" + indexFiles.indexExample;

server.get('/', function (req, res) {
    return indexFiles.index;
});

server.get(/\/s\/(.*)$/, function (req, res, match) {
    db.get("share_"+match.replace(/[^0-9]/g, ""), function(code) {
	res.writeHead(code ? 200:404, {"Content-type":"text/html"});
	res.write(indexFiles.shareBasePre);
	if(code)
	    res.write(code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
	else
	    res.write(indexFiles.shareNotFound);
	res.write(indexFiles.shareBasePost);
	res.end();
    });
});

server.get(/\/p\/(.*)$/, function (req, res, match) {
    if(match.length < 2) return "User was not found";
    var user = match;
    db.get("email_"+user, function (userEmail) {
	// This is to check that there is a user before a lot of database hits
	if(userEmail !== null) {
	    async([
		[
		    function () { db.get("lsOwn_"+user, this); },
		    function () { db.get("setting_name_"+user, this); },
		    function () { db.get("profile_"+user, this); },
		    function () { db.get("lsPublic_"+user, this); }
		],
		[
		    function () {
			if(!this[0]) return this("");
			var i,ret="",l = this[0].split("*");
			for(i=0;i<l.length-1;++i) {
			    ret += '<div class="site"><a href="http://'+l[i]+'.jsapp.us" target="_blank">'+l[i]+'</a></div>';
			}
			this(ret);
		    },
		    function () {
			this(crypto.createHash('md5').update((userEmail || "").toLowerCase()).digest('hex'));
		    },
		    function () {
			if(this[1])
			    this(this[1].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
			else
			    this(user.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
		    },
		    function () {
			if(this[2])
			    this(Markdown(this[2].replace(/</g, "&lt;").replace(/>/g, "&gt;")));
			else
			    this("You can create your profile using the profile command from the editor");
		    },
		    function () {
			if(!this[3]) return this("");
			var i,ret="",l=this[3].split("*");
			for(i=0;i<l.length;i++)
			    ret+= '<div class="publicF"><a class="publicL" href="/code/'+user+'/'+l[i]+'" target="_blank">'+l[i]+'</a></div>';
			this(ret);
		    }
		],
		function () {
		    res.writeHead(200, {"Content-type": "text/html"});
		    res.write(indexFiles.profile.replace(/\{SUBDOMAIN\}/g, this[0]).replace(/\{EHASH\}/g, this[1]).replace(/\{USER\}/g, user.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")).replace(/\{NAME\}/g, this[2]).replace(/\{MARKDOWN\}/g, this[3]).replace(/\{PUBLIC\}/g, this[4]));
		    res.end();
		}
	    ]);
	}else{
	    res.writeHead(404, {"Content-type": "text/html"});
	    res.write("The user was not found");
	    res.end();
	}
    });
});

server.get(/\/code\/(.*)$/, function (req, res, match) {
    //res.writeHead(200, {"Content-Type": "text/html"});
    var user = match.substring(0,match.indexOf('/'));
    var file = match.substring(match.indexOf('/')+1);
    db.get("lsPublic_"+user, function (data) {
	if(!data || data.split("*").indexOf(file) == -1) {
	    res.writeHead(401, {"Content-Type": "text/html"});
	    res.end("<p>The file was not found, or not public</p>");
	}
	res.writeHead(200, {"Content-type": "text/html"});
	db.get("fs_"+user+"_"+file, function (code) {
	    res.write("<p>This code can be loaded in to anyone's project using: <code>require(\""+user+"/"+file+"\");</code></p><p><code>");
	    res.write(code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>").replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;").replace(/\s/g, "&nbsp;"));
	    res.write("</code></p>");
	    res.end();
	});
    });
});


server.get(/\/error/, function (req, res) {
    res.writeHead(503, {"Content-Type": "text/html"});
    res.end("There was an error");
});

server.get(/\/Bespin(.*)$/, router.staticDirHandler('./Bespin/build', '/'));
server.get(/\/resources\/(.*)$/, router.staticDirHandler('./Bespin/build', '/'));


server.get(/\/(.*)$/, router.staticDirHandler('./static', '/'));

server.listen(config.basePort);