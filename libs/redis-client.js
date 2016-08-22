var redis = require('redis');
var util = require('util');
var bluebird = require("bluebird");
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

module.exports = (function () {
    const NODEJS_SERVER_TAG = "[nodejs-server]";
    const VALUE_NO_CHANGE = -1;
    const VALUE_ADDED = 0;
    const VALUE_DELETED = 1;
    const VALUE_MODIFIED = 2;

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

    var getCurrentTime = function () {
        return "[" + new Date().getHours() + ":" + new Date().getMinutes() + "]";
    };

    var RedisClient = function (socket, host, port, password) {
        this.socket = socket;
        this.host = host;
        this.port = port;
        this.password = password;
        this.client = redis.createClient({
            host: this.host, port: this.port, retry_strategy: function (options) {
                if (options.error.code === 'ECONNREFUSED') {
                    // End reconnecting on a specific error and flush all commands with a individual error
                    return new Error('The server refused the connection');
                }
                if (options.total_retry_time > 1000 * 60 * 60) {
                    // End reconnecting after a specific timeout and flush all commands with a individual error
                    return new Error('Retry time exhausted');
                }
                if (options.times_connected > 10) {
                    // End reconnecting with built in error
                    return undefined;
                }
                // reconnect after
                return Math.max(options.attempt * 100, 3000);
            }
        });
        this.client.auth(this.password);
    };

    RedisClient.prototype.log = function (logMessage) {
        var message = NODEJS_SERVER_TAG + getCurrentTime() + logMessage;
        console.log(message);
        this.socket.emit('redis_server_log_message', message);
    };

    RedisClient.prototype.getKeys = function (pattern, req, res) {
        var that = this;
        var socketKey = req.get('x-socket-io-key');
        this.log("[Command] KEYS " + pattern);
        this.client.keys(pattern, function (err, result) {
            if (!err) {
                console.log(result.length + " keys fetched.");
                res.status(200).send(result);
            } else {
                that.log("[Reply] " + result + ", \n\t[ERR] " + err);
                res.sendStatus(400);
            }
        });
    };

    RedisClient.prototype.getDbInfo = function () {
        return [this.client.server_info.db0.keys, this.client.server_info.connected_clients, this.client.server_info.used_memory_human];
    };

    RedisClient.prototype.addKey = function (key, value, dataType, req, res) {
        var that = this;
        var socketKey = req.get('x-socket-io-key');
        this.log("[Command] EXISTS " + key);
        this.client.exists(key, function (err, result) {
            if (result === 0) {
                switch (dataType) {
                    case "String":
                        that.log("[Command] SET " + key + " " + value);
                        that.client.set(key, value, function (err, result) {
                            if (!err) {
                                console.log(" A new key [" + key + "] has been added.");
                                res.send("OK");
                            } else {
                                that.log("[Reply] " + result + ", \n\t[ERR] " + err);
                                res.sendStatus(400);
                            }
                        });
                        break;
                    case "List":
                        that.log("[Command] LPUSH " + key + " " + value);
                        that.client.lpush(key, value, function (err, result) {
                            if (!err) {
                                console.log(" A new key [" + key + "] has been added.");
                                res.send("OK");
                            } else {
                                that.log("[Reply] " + result + ", \n\t[ERR] " + err);
                                res.sendStatus(400);
                            }
                        });
                        break;
                    case "Set":
                        that.log("[Command] SADD " + key + " " + value);
                        that.client.sadd(key, value, function (err, result) {
                            if (!err) {
                                console.log(" A new key [" + key + "] has been added.");
                                res.send("OK");
                            } else {
                                that.log("[Reply] " + result + ", \n\t[ERR] " + err);
                                res.sendStatus(400);
                            }
                        });
                        break;
                    case "Sorted set":
                        var score = req.body.score;
                        that.log("[Command] ZADD " + key + " " + score + " " + value);
                        that.client.zadd(key, score, value, function (err, result) {
                            if (!err) {
                                console.log(" A new key [" + key + "] has been added.");
                                res.send("OK");
                            } else {
                                that.log("[Reply] " + result + ", \n\t[ERR] " + err);
                                res.sendStatus(400);
                            }
                        });
                        break;
                    case "Hash":
                        var hashField = req.body.hashField;
                        var hashValue = req.body.hashValue;
                        that.log("[Command] HSET " + key + " " + hashField + " " + hashValue);
                        that.client.hset(key, hashField, hashValue, function (err, result) {
                            if (!err) {
                                console.log(" A new key [" + key + "] has been added.");
                                res.send("OK");
                            } else {
                                that.log("[Reply] " + result + ", \n\t[ERR] " + err);
                                res.sendStatus(400);
                            }
                        });
                        break;
                }
                return;
            } else {
                that.log("[Reply] The key [" + key + "] already exists. The command aborted.");
                res.send("Duplication");
                return;
            }
        });
    }

    RedisClient.prototype.getKeyInfo = function (key, req, res) {
        var that = this;
        var socketKey = req.get('x-socket-io-key');
        var keyInfo = {};

        keyInfo.key = key;

        this.log("[Command] TYPE " + key);
        this.client.typeAsync(key).then(function (type) {
            console.log("\t[Type] : " + type);
            keyInfo.dataType = type;
            that.log("[Command] MULTI : Queueing commands into a transaction...");

            var multi = that.client.multi();
            switch (type) {
                case "string":
                    that.log("[Command] Queue GET " + key);
                    multi.get(key);
                    break;
                case "list":
                    that.log("[Command] Queue LRANGE " + key + " 0 -1");
                    multi.lrange(key, 0, -1);
                    break;
                case "set":
                    that.log("[Command] Queue SMEMBERS " + key);
                    multi.smembers(key);
                    break;
                case "zset":
                    that.log("[Command] Queue ZRANGE " + key + " 0 -1 WITHSCORES");
                    multi.zrange(key, 0, -1, "WITHSCORES");
                    break;
                case "hash":
                    that.log("[Command] Queue HGETALL " + key);
                    multi.hgetall(key);
                    break;
                default:
                    // error handling
                    break;
            }
            that.log("[Command] Queue TTL " + key);
            that.log("[Command] EXEC executing all queued commands in a transaction");
            return multi.ttl(key).execAsync();
        }).then(function (replies) {
            // 에러 코드 심어야함
            replies.forEach(function (reply, index) {
                that.log("[Reply]" + "[" + index + "] " + reply);
                if (index === 0) {
                    keyInfo.value = reply;
                } else if (index === 1) {
                    keyInfo.ttl = reply;
                }
            });

            res.status(200).send(JSON.stringify(keyInfo));
        }).catch(function (error) {
            //do something with the error and handle it
            res.status(404).send(error);
        });
    }

    RedisClient.prototype.updateKeyInfo = function (key, value, dataType, req, res) {
        var that = this;
        var multi = this.client.multi();
        var socketKey = req.get('x-socket-io-key');
        var body = req.body;

        if (value) {
            this.log("[Command] MULTI : Queueing commands into a transaction...");
            console.log("Command data :" + value);
            switch (dataType) {
                case "string":
                    // change value for the key
                    multi.set(key, value);
                    break;
                case "list":
                    for (var i = 0; i < value.length; i++) {
                        switch (parseInt(value[i][0])) {
                            case VALUE_ADDED:
                                this.log("[Command] Queue RPUSH " + key + " " + value[i][2]);
                                multi.rpush(key, value[i][2]);
                                break;
                            case VALUE_DELETED:
                                this.log("[Command] Queue LREM " + key + " " + 1 + " " + value[i][2]);
                                multi.lrem(key, 1, value[i][2]);
                                break;
                            case VALUE_MODIFIED:
                                this.log("[Command] Queue LSET " + key + " " + value[i][1] + " " + value[i][2]);
                                multi.lset(key, value[i][1], value[i][2]);
                                break;
                            default:
                                this.log("[ERR] invalid command on list type data. Queued commands will be flushed.");
                                return;
                        }
                    }
                    break;
                case "set":
                    for (var i = 0; i < value.length; i++) {
                        switch (parseInt(value[i][0])) {
                            case VALUE_ADDED:
                                this.log("[Command] Queue SADD " + key + " " + value[i][1]);
                                multi.sadd(key, value[i][1]);
                                break;
                            case VALUE_DELETED:
                                this.log("[Command] Queue SREM " + key + " " + value[i][1]);
                                multi.srem(key, value[i][1]);
                                break;
                            case VALUE_MODIFIED:
                                this.log("[Command] Queue SREM " + key + " " + value[i][1]);
                                multi.srem(key, value[i][1]);
                                this.log("[Command] Queue LSET " + key + " " + value[i][2]);
                                multi.sadd(key, value[i][2]);
                                break;
                            default:
                                this.log("[ERR] invalid command on list type data. Queued commands will be flushed.");
                                return;
                        }
                    }
                    break;
                case "zset":
                    for (var i = 0; i < value.length; i++) {
                        switch (parseInt(value[i][0])) {
                            case VALUE_ADDED:
                                this.log("[Command] Queue ZADD " + key + " " + value[i][1] + " " + value[i][2]);
                                multi.zadd(key, value[i][1], value[i][2]);
                                break;
                            case VALUE_DELETED:
                                this.log("[Command] Queue ZREM " + key + " " + value[i][1]);
                                multi.zrem(key, value[i][1]);
                                break;
                            case VALUE_MODIFIED:
                                this.log("[Command] Queue ZREM " + key + " " + value[i][1]);
                                multi.zrem(key, value[i][1]);
                                this.log("[Command] Queue ZADD " + key + " " + value[i][2] + " " + value[i][3]);
                                multi.zadd(key, value[i][2], value[i][3]);
                                break;
                            default:
                                this.log("[ERR] invalid command on list type data. Queued commands will be flushed.");
                                return;
                        }
                    }
                    break;
                case "hash":
                    for (var i = 0; i < value.length; i++) {
                        switch (parseInt(value[i][0])) {
                            case VALUE_ADDED:
                                this.log("[Command] Queue HSET " + key + " " + value[i][1] + " " + value[i][2]);
                                multi.hset(key, value[i][1], value[i][2]);
                                break;
                            case VALUE_DELETED:
                                this.log("[Command] Queue HDEL " + key + " " + value[i][1]);
                                multi.hdel(key, value[i][1]);
                                break;
                            case VALUE_MODIFIED:
                                this.log("[Command] Queue HDEL " + key + " " + value[i][1]);
                                multi.hdel(key, value[i][1])
                                this.log("[Command] Queue HSET " + key + " " + value[i][2] + " " + value[i][3]);
                                multi.hset(key, value[i][2], value[i][3]);
                                break;
                            default:
                                this.log("[ERR] invalid command on list type data. Queued commands will be flushed.");
                                return;
                        }
                    }
                    break;
            }
        }
        // change ttl(in seconds) value for the key
        if (body.ttl > -1) {
            this.log("[Command] Queue EXPIRE " + key + " " + body.ttl);
            multi.expire(key, body.ttl);
        } else {
            this.log("[Command] Queue PERSIST " + key);
            multi.persist(key);
        }

        this.log("[Command] EXEC executing all queued commands in a transaction");
        multi.exec(function (err, replies) {
            if (!err) {
                replies.forEach(function (reply, index) {
                    that.log("[Reply]" + "[" + index + "] " + reply);
                })
                console.log(" A new key [" + key + "] has been updated");
                res.status(200).send("OK");
            } else {
                that.log("[ERR] " + err);
                res.status(400).send(err);
            }
        });
    }

    RedisClient.prototype.deleteKey = function (key, req, res) {
        var that = this;
        var socketKey = req.get('x-socket-io-key');
        this.log("[Command] DEL " + key);
        this.client.del(key, function (err, result) {
            if (!err) {
                console.log(" A new key [" + key + "] has been deleted.");
                res.sendStatus(200);
            } else {
                that.log("[Reply] " + result + ", \n\t[ERR] " + err);
                res.sendStatus(400);
            }
        });
    }

    RedisClient.prototype.renameKey = function (key, newKey, req, res) {
        var that = this;
        var socketKey = req.get('x-socket-io-key');
        this.log("[Command] EXISTS " + newKey);
        this.client.exists(newKey, function (err, result) {
            if (result === 0) {
                that.log("[Command] RENAME " + key + " " + newKey);
                that.client.rename(req.params.key, newKey, function (err, result) {
                    if (!err) {
                        console.log(" A new key [" + key + "] has been renamed.");
                        res.sendStatus(200);
                    } else {
                        that.log("[Reply] " + result + ", \n\t[ERR] " + err);
                        res.sendStatus(400);
                    }
                });
            } else {
                that.log("[Reply] The key name [" + newKey + "] is already in use. The command aborted.");
                res.send("Duplication");
                return;
            }
        });
    }

    return RedisClient;
})();