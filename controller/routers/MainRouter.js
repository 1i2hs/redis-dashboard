var fs = require('fs');
var RedisClient = require(_path.libs + '/redis-client');

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

	app.get('/', function (req, res, next) {
		console.log("========================================================")
		res.render('index');
	});

	app.get('/dbinfo', function (req, res, next) {
		var client = redisClient[req.get('x-socket-io-key')];
		res.send(client.getDbInfo());
	})

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

		var socketKey = req.get('x-socket-io-key');

		var client = redisClient[req.get('x-socket-io-key')];
		client.addKey(key, value, dataType, req, res);
	});

	app.get('/keys/:key', function (req, res, next) {
		var key = req.params.key;
		console.log("\t[Key]  : " + key);

		var client = redisClient[req.get('x-socket-io-key')];
		client.getKeyInfo(key, req, res);
	});

	app.put('/keys/:key', function (req, res, next) {
		var body = req.body;
		var key = body.key;
		var dataType = body.dataType;
		var value = body.value;

		var client = redisClient[req.get('x-socket-io-key')];
		client.updateKeyInfo(key, value, dataType, req, res);
	});

	app.delete('/keys/:key', function (req, res, next) {
		var key = req.params.key;
		var client = redisClient[req.get('x-socket-io-key')];
		client.deleteKey(key, req, res);
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

		socket.on('create_redis_client', function (params) {
			redisClient[socketKey] = new RedisClient(socket, params.host, params.port, params.password);

			redisClient[socketKey].client.on('ready', function () {
				socket.emit('redis_client_created');
				redisClient[socketKey].log("===================================="
					+ "     WELCOME TO REDIS DASHBOARD     " + "====================================");
				redisClient[socketKey].log(" connected to Redis server...");
			});
		});

		socket.on('disconnect', function () {
			redisClient[socketKey].client.quit();
			delete redisClient[socketKey];
			console.log("client disconnected");
		});
	});
}