var crypto = require('crypto');
var querystring = require('querystring');

var router = require('./lib/node-router');
var server = router.getServer();
var db = require('./db');

db._isMaster();

var userLogin = {};
function checkUser(d) {
    // might change this to store in a db
    if(!userLogin[d.user]) return false;
    return userLogin[d.user] == d.token;
}

var ajaxActions = {
    login: function (data) {
	return {user: data.user, token: (userLogin[data.user] = Math.random().toString().substring(2))};
    },
    logout: function (data, user) {
	if(user)
	    userLogin[user]=null;
    },
    list: function (data, user) {
	return [user + " file1", "file 2"];
    }
};

server.post('/ajax', function (req, res, match) {
    try {
    var data="";
    res.writeHead(200, {"Content-Type": "text/plain"});
    req.on('data', function (d) {
	data+=d.toString('ascii', 0);
    });
    req.on('end', function () {
	var d = JSON.parse(data);
	var ret=[];
	var userName=null;
	if(d.user && d.token)
	    if(checkUser(d))
		userName=d.user;
	for(var i=0;i<d.actions.length;i++) {
	    if(ajaxActions[d.actions[i].action])
		ret.push(ajaxActions[d.actions[i].action](d.actions[i], userName) || {});
	    else
		ret.push({"error":"not found", "name":d.actions[i].action})
	}
	res.write(JSON.stringify(ret));
	res.end();
    });
    }catch(e) {
	console.log(e);
	res.end();
    }
});

server.get('/restart', function (req, res) {
    //res.redirect("/#asdsf");
    res.writeHead(200, {"Content-Type": "text/html"});
    res.end('<meta http-equiv="refresh" content="1;url=/">');
    process.exit(0);
});

server.post('/newUser', function (req, res) {
    try {
    var raw="";
    req.on('data', function (d) {
	raw+=d.toString('ascii', 0);
    });
    req.on('end', function () {
    (function (data) {
	if(!data.userName)
	    res.notFound("User name not valid");
	db.has("login_"+data.userName, function (has) {
	    if(has)
		return router.staticHandler('./static/newUserName.html')(req,res);
	    var pass = crypto.createHash('sha1').update(data.password).digest('hex');
	    db.set("login_"+data.userName, pass);
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

server.get(/\/Bespin(.*)$/, router.staticDirHandler('./Bespin/build', '/'));
server.get(/\/resources\/(.*)$/, router.staticDirHandler('./Bespin/build', '/'));

server.get('/', router.staticHandler('./static/index.html'));
server.get(/\/(.*)$/, router.staticDirHandler('./static', '/'));

server.listen(8080);