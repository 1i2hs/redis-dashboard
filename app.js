process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; //Disables HTTPS / SSL / TLS checking across entire node.js environment.

/**
 * import modules
 */
var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var session = require('express-session');

/**
 * set global variables
 */
global._path =
	{
		home: __dirname,
		controller: __dirname + '/controller',
		views: __dirname + '/views',
		libs: __dirname + '/libs'
	};

/**
 * set process options
 */
// global._options =
// 	{
// 		port: 3000
// 	};

// process.argv.forEach(function (val, index, array) {
// 	val = val.substring(1); //parse character '-'

// 	var split = val.split('=');
// 	if (_options.hasOwnProperty(split[0]))
// 		_options[split[0]] = split[1];
// });


/**
 * create express and imp
 */
var clock = new Date();
var app = global._app = express();
var http = require('http').Server(app);

var server = http.listen(process.env.PORT || 3000, function () {
	console.log('[nodejs-server] Listening on port %d', server.address().port);
	console.log('[nodejs-server] Time stamp : ' + clock.getHours() + ":" + clock.getMinutes());
});

var imp = require('nodejs-imp');
imp.setPattern(_path.home + '/views/html/{{name}}.html');

var Renderer = require(_path.libs + '/Renderer');
imp.addRenderModule(Renderer.replacePath);

/**
 * set static dirs
 */
app.use('/views', express.static(_path.views));

/**
 * set middleware
 */
app.use(session({
	secret: 'cf-redis',
	resave: false,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(imp.render);

/**
 * error handling
 */
app.use(function (err, req, res, next) {
	console.error('=================================================');
	console.error('time : ' + new Date().toString());
	console.error('name : Exception');
	console.error('-------------------------------------------------');
	console.error(err.stack);
	console.error('=================================================');

	res.statusCode = 500;
	res.send(err.stack);
});

process.on('uncaughtException', function (err) {
	console.error('\n\n');
	console.error('=================================================');
	console.error('time : ' + new Date().toString());
	console.error('name : UncaughtException');
	console.error('-------------------------------------------------');
	console.error(err.stack);
	console.error('=================================================\n\n');
});

/**
 * set socket io
 */
String.prototype.hexEncode = function () {
	var hex, i;

	var result = "";
	for (i = 0; i < this.length; i++) {
		hex = this.charCodeAt(i).toString(16);
		result += hex.slice(-4);
	}

	return result;
}

String.prototype.hexDecode = function () {
	var j;
	var hexes = this.match(/.{1,4}/g) || [];
	var back = "";
	for (j = 0; j < hexes.length; j++) {
		back += String.fromCharCode(parseInt(hexes[j], 16));
	}

	return back;
}

const NODEJS_SERVER_SOCKET_IO_TAG = "[nodejs-server][socket-io]";

var io = require('socket.io')(http);

var MainRouter = require(_path.controller + '/routers/MainRouter');
MainRouter(app, io);



