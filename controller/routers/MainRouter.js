var fs = require('fs');
var RedisClient = require(_path.libs + '/redis-client');
var uuid = require('node-uuid');

const NODEJS_SERVER_TAG = "[nodejs-server]";
const REDIS_SERVER_TAG = "[redis-server]";
const VALUE_NO_CHANGE = -1;
const VALUE_ADDED = 0;
const VALUE_DELETED = 1;
const VALUE_MODIFIED = 2;

const VALUE = 0;
const TTL = 1;

module.exports = function (app, io) {

	var redisClient = {};
	var tokens = {};
	var credentialStore = {};
	//var credentials = {};

	app.post('/token', function (req, res, next) {
		var secret = req.body.secret;
		var credentials = req.body.credentials;
		var token = uuid.v4();

		console.log("[Info] token created : ", token);
		//포탈서버에서 client 서버로 접속했을때 생기는 세션이다.
		if (!req.session.tokens) {
			req.session.tokens = {};
		}

		if (req.session.tokens[secret]) {
			res.end(req.session.tokens[secret]);
		}
		else {
			req.session.tokens[secret] = token;
			credentialStore[token] = credentials; //메모리에 토큰을 키로 크레덴셜 저장해 놓는다.

			res.end(token);
		}
	});

	app.get('/', function (req, res, next) {
		var token = req.query.token;
		console.log("[Info] token received from client : ", token);

		if (!req.session.credentials)
			req.session.credentials = {};

		if (credentialStore[token])
			req.session.credentials[token] = credentialStore[token];
		else
			credentialStore[token] = req.session.credentials[token];

		res.render('index');
	});

	app.get('/serverinfo', function (req, res, next) {
		var client = redisClient[req.get('x-socket-io-key')];
		client.getServerInfo(req, res);
	});

	app.get('/dblist', function (req, res, next) {
		var client = redisClient[req.get('x-socket-io-key')];
		client.getDBList(req, res);
	});

	app.get('/dblist/:num', function (req, res, next) {
		var client = redisClient[req.get('x-socket-io-key')];
		var dbNum = req.params.num;
		client.selectDB(dbNum, req, res);
	});

	app.get('/keys', function (req, res, next) {
		var socketKey = req.get('x-socket-io-key');
		var pattern = req.query.pattern;

		var client = redisClient[req.get('x-socket-io-key')];
		client.getKeys(pattern, req, res);
	});

	app.post('/keys', function (req, res, next) {
		var key = req.body.key;
		var dataType = req.body.dataType;
		var value = req.body.value;

		var client = redisClient[req.get('x-socket-io-key')];
		client.addKey(req, res);
	});

	app.get('/keys/:key', function (req, res, next) {
		var client = redisClient[req.get('x-socket-io-key')];
		client.getKeyInfo(req, res);
	});

	app.put('/keys/:key', function (req, res, next) {
		var client = redisClient[req.get('x-socket-io-key')];
		client.updateKeyInfo(req, res);
	});

	app.delete('/keys/:key', function (req, res, next) {
		var client = redisClient[req.get('x-socket-io-key')];
		client.deleteKey(req, res);
	});

	app.put('/keys/:key/name', function (req, res, next) {
		var key = req.body.key;
		var newKey = req.body.newKey;
		var client = redisClient[req.get('x-socket-io-key')];
		client.renameKey(key, newKey, req, res);
	});

	io.on('connection', function (socket) {
		console.log("{" + socket.id + "} client connected");

		var socketKey = socket.id.hexEncode();
		socket.emit('socketKey', { key: socketKey });

		var uToken;

		socket.on('create_redis_client', function (token) {
			uToken = token;
			var credentials = credentialStore[token];// 다시 접속하면 저장되어있는걸 쓴다.

			delete credentialStore[uToken];

			console.log("[Info] Credentials : ", credentials);

			credentials = {
				host: "pub-redis-13865.us-east-1-4.6.ec2.redislabs.com",
				password: "MOIF1VuVGaoCn3hV",
				port: "13865"
			};

			// credentials = {
			// 	host: "redis.ghama.io",
			// 	password: "15269975-67a0-4bc7-8cca-619c38f1352e",
			// 	port: "36220"
			// };

			// if (!credentials) {
			// 	//잘못된 토큰으로 접속한경우.
			// 	socket.emit('redis_client_created', { statusCode: 401 });
			// }
			// else {
				//credentials 활용.
				redisClient[socketKey] = new RedisClient(socket, credentials.host, credentials.port, credentials.password);

				redisClient[socketKey].client.on('ready', function () {
					socket.emit('redis_client_created', { statusCode: 200 });
					redisClient[socketKey].log("===================================="
						+ "     WELCOME TO REDIS DASHBOARD     " + "====================================");
					redisClient[socketKey].log(" connected to Redis server...");
				});
			// }
		});

		socket.on('disconnect', function () {
			redisClient[socketKey].client.quit();
			delete redisClient[socketKey];
			console.log("client disconnected");
		});
	});
}