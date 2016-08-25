var redis = require('redis');
var util = require('util');
var bluebird = require("bluebird");
var assert = require('assert');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

module.exports = (function () {
    const NODEJS_SERVER_TAG = "[nodejs-server]";
    const VALUE_NO_CHANGE = -1;
    const VALUE_ADDED = 0;
    const VALUE_DELETED = 1;
    const VALUE_MODIFIED = 2;

    var currentDBNum = 0;

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

    var commandAdd = function (dataType) {
        var commands = {
            'String': function (thisArg, req, res, callback) {
                var key = req.body.key;
                var value = req.body.value;
                thisArg.log("[Command] SET " + key + " " + value);
                thisArg.client.set(key, value, callback);
            },
            'List': function (thisArg, req, res, callback) {
                var key = req.body.key;
                var value = req.body.value;
                thisArg.log("[Command] LPUSH " + key + " " + value);
                thisArg.client.lpush(key, value, callback);
            },
            'Set': function (thisArg, req, res, callback) {
                var key = req.body.key;
                var value = req.body.value;
                thisArg.log("[Command] SADD " + key + " " + value);
                thisArg.client.sadd(key, value, callback);
            },
            'Sorted set': function (thisArg, req, res, callback) {
                var key = req.body.key;
                var score = req.body.score;
                var value = req.body.value;
                thisArg.log("[Command] ZADD " + key + " " + score + " " + value);
                thisArg.client.zadd(key, score, value, callback);
            },
            'Hash': function (thisArg, req, res, callback) {
                var key = req.body.key;
                var hashField = req.body.hashField;
                var hashValue = req.body.hashValue;
                thisArg.log("[Command] HSET " + key + " " + hashField + " " + hashValue);
                thisArg.client.hset(key, hashField, hashValue, callback);
            }
        };

        return commands[dataType];
    }

    var commandMultiGet = function (dataType) {
        var commands = {
            'string': function (thisArg, key, multi) {
                thisArg.log("[Command] Queue GET " + key);
                multi.get(key);
            },
            'list': function (thisArg, key, multi) {
                thisArg.log("[Command] Queue LRANGE " + key + " 0 -1");
                multi.lrange(key, 0, -1);
            },
            'set': function (thisArg, key, multi) {
                thisArg.log("[Command] Queue SMEMBERS " + key);
                multi.smembers(key);
            },
            'zset': function (thisArg, key, multi) {
                thisArg.log("[Command] Queue ZRANGE " + key + " 0 -1 WITHSCORES");
                multi.zrange(key, 0, -1, "WITHSCORES");
            },
            'hash': function (thisArg, key, multi) {
                thisArg.log("[Command] Queue HGETALL " + key);
                multi.hgetall(key);
            }
        }
        return commands[dataType];
    }

    var commandMultiUpdate = function (dataType, state) {
        var commands = {
            'list': {
                0: function (thisArg, key, value, multi) {
                    thisArg.log("[Command] Queue RPUSH " + key + " " + value[1]);
                    multi.rpush(key, value[1]);
                },
                1: function (thisArg, key, value, multi) {
                    thisArg.log("[Command] Queue LREM " + key + " " + 1 + " " + value[1]);
                    multi.lrem(key, 1, value[1]);
                },
                2: function (thisArg, key, value, multi) {
                    thisArg.log("[Command] Queue LSET " + key + " " + value[1] + " " + value[2]);
                    multi.lset(key, value[1], value[2]);
                }
            },
            'set': {
                0: function (thisArg, key, value, multi) {
                    thisArg.log("[Command] Queue SADD " + key + " " + value[1]);
                    multi.sadd(key, value[1]);
                },
                1: function (thisArg, key, value, multi) {
                    thisArg.log("[Command] Queue SREM " + key + " " + value[1]);
                    multi.srem(key, value[1]);
                },
                2: function (thisArg, key, value, multi) {
                    thisArg.log("[Command] Queue SREM " + key + " " + value[1]);
                    multi.srem(key, value[1]);
                    thisArg.log("[Command] Queue LSET " + key + " " + value[2]);
                    multi.sadd(key, value[2]);
                }
            },
            'zset': {
                0: function (thisArg, key, value, multi) {
                    thisArg.log("[Command] Queue ZADD " + key + " " + value[1] + " " + value[2]);
                    multi.zadd(key, value[1], value[2]);
                },
                1: function (thisArg, key, value, multi) {
                    thisArg.log("[Command] Queue ZREM " + key + " " + value[1]);
                    multi.zrem(key, value[1]);
                },
                2: function (thisArg, key, value, multi) {
                    thisArg.log("[Command] Queue ZREM " + key + " " + value[1]);
                    multi.zrem(key, value[1]);
                    thisArg.log("[Command] Queue ZADD " + key + " " + value[2] + " " + value[3]);
                    multi.zadd(key, value[2], value[3]);
                }
            },
            'hash': {
                0: function (thisArg, key, value, multi) {
                    thisArg.log("[Command] Queue HSET " + key + " " + value[1] + " " + value[2]);
                    multi.hset(key, value[1], value[2]);
                },
                1: function (thisArg, key, value, multi) {
                    thisArg.log("[Command] Queue HDEL " + key + " " + value[1]);
                    multi.hdel(key, value[1]);
                },
                2: function (thisArg, key, value, multi) {
                    thisArg.log("[Command] Queue HDEL " + key + " " + value[1]);
                    multi.hdel(key, value[1])
                    thisArg.log("[Command] Queue HSET " + key + " " + value[2] + " " + value[3]);
                    multi.hset(key, value[2], value[3]);
                }
            }
        }

        if (state !== null) {
            return commands[dataType][state];
        } else {
            return commands[dataType];
        }
    }

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

        /* monitoring redis code */
        // this.client.monitor(function (err, res) {
        //     console.log("Entering monitoring mode.");
        // });

        // this.client.on("monitor", function (time, args, raw_reply) {
        //     console.log(time + ": " + args); // 1458910076.446514:['set', 'foo', 'bar']
        // });

        this.client.on('error', function (err) {
            assert(err instanceof Error);
            assert(err instanceof redis.AbortError);
            assert(err instanceof redis.AggregateError);
            assert.strictEqual(err.errors.length, 2); // The set and get got aggregated in here
            assert.strictEqual(err.code, 'NR_CLOSED');
        });
    };

    RedisClient.prototype.log = function (logMessage) {
        var message = NODEJS_SERVER_TAG + getCurrentTime() + logMessage;
        console.log(message);
        this.socket.emit('redis_server_log_message', message);
    };

    RedisClient.prototype.getKeys = function (pattern, req, res) {
        var that = this;
        this.log("[Command] KEYS " + pattern);
        this.client.keys(pattern, function (err, result) {
            if (!err) {
                console.log(result.length + " keys fetched.");
                res.status(200).send(result);
            } else {
                that.log("[Reply] " + result + ", \n\t[ERR] " + err);
                res.sendStatus(503);
            }
            return;
        });
    };

    RedisClient.prototype.getServerInfo = function (req, res) {
        var that = this;
        this.client.info(function (err, result) {
            that.log("[Info] Current db : db", currentDBNum);
            res.send({
                connections: that.client.server_info.connected_clients,
                usedMemory: that.client.server_info.used_memory_human,
                dbNum: currentDBNum,
                totalKeys: (typeof that.client.server_info["db" + currentDBNum] === 'undefined') ? 0 : that.client.server_info["db" + currentDBNum].keys,
                expires: (typeof that.client.server_info["db" + currentDBNum] === 'undefined') ? 0 : that.client.server_info["db" + currentDBNum].expires
            });
            return;
        });
    };

    RedisClient.prototype.getDBList = function (req, res) {
        var dbList = [];
        var that = this;
        this.log("[Command] info keyspace ");
        this.client.info("keyspace", function (err, result) {
            if (!err) {
                var dbs = result.split("\n");
                var db;
                for (db = 1; db < dbs.length - 1; db++) {
                    var dbNum = parseInt(dbs[db].split(":")[0].substring(2));
                    dbList.push({
                        dbNum: dbNum
                    });
                }
                res.send(dbList);
            } else {
                that.log("[ERR] " + err);
                res.status(503).send(err);
            }
            return;
        });
    }

    RedisClient.prototype.selectDB = function (dbNum, req, res) {
        var that = this;
        this.log("[Command] select " + dbNum);
        this.client.select(dbNum, function (err, result) {
            if (!err) {
                currentDBNum = dbNum;
                that.log("[Reply] " + result);
                res.status(200).send("OK");
            } else {
                that.log("[ERR] " + err);
                res.status(503).send(err);
            }
        });
    }

    RedisClient.prototype.addKey = function (req, res) {
        var that = this;
        var key = req.body.key;
        this.log("[Command] EXISTS " + key);
        this.client.exists(key, function (err, result) {
            if (result === 0) {
                commandAdd(req.body.dataType)(that, req, res, function (err, result) {
                    if (!err) {
                        that.log("[Reply] " + result);
                        console.log(" A new key [" + key + "] has been added.");
                        res.send("OK");
                    } else {
                        that.log("[Reply] " + result + ", \n\t[ERR] " + err);
                        res.sendStatus(503);
                    }
                });
                return;
            } else {
                that.log("[Reply] The key [" + key + "] already exists. The command aborted.");
                res.send("Duplication");
            }
            return;
        });
    }

    RedisClient.prototype.getKeyInfo = function (req, res) {
        var that = this;
        var key = req.params.key;
        var keyInfo = {};

        keyInfo.key = key;

        this.log("[Command] TYPE " + key);
        this.client.typeAsync(key).then(function (type) {
            keyInfo.dataType = type;
            that.log("[Command] MULTI : Queueing commands into a transaction...");

            var multi = that.client.multi();
            commandMultiGet(type)(that, key, multi);

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
            return;
        }).catch(function (err) {
            //do something with the error and handle it
            that.log("[ERR] " + err);
            res.status(503).send(err);
            return;
        });
    }

    RedisClient.prototype.updateKeyInfo = function (req, res) {
        var that = this;
        var multi = this.client.multi();
        var body = req.body;
        var key = body.key;
        var dataType = body.dataType;
        var value = body.value;
        var ttl = body.ttl;

        if (value) {
            this.log("[Command] MULTI : Queueing commands into a transaction...");
            if (dataType === "string") {
                this.log("[Command] Queue SET " + key + " " + value);
                multi.set(key, value);
            } else {
                for (var i = 0; i < value.length; i++) {
                    commandMultiUpdate(dataType, parseInt(value[i][0]))(this, key, value[i], multi);
                }
            }
        }

        if (ttl) {
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
                    res.status(503).send(err);
                }
                return;
            });
        } else {
            res.end();
        }
    }

    RedisClient.prototype.deleteKey = function (req, res) {
        var that = this;
        var key = req.params.key;
        this.log("[Command] DEL " + key);
        this.client.del(key, function (err, result) {
            if (!err) {
                that.log("[Reply] " + result);
                console.log(" A new key [" + key + "] has been deleted.");
                res.sendStatus(200);
            } else {
                that.log("[Reply] " + result + ", \n\t[ERR] " + err);
                res.sendStatus(503);
            }
            return;
        });
    }

    RedisClient.prototype.renameKey = function (key, newKey, req, res) {
        var that = this;
        this.log("[Command] EXISTS " + newKey);
        this.client.exists(newKey, function (err, result) {
            if (!err) {
                if (result === 0) {
                    that.log("[Command] RENAME " + key + " " + newKey);
                    that.client.rename(req.params.key, newKey, function (err, result) {
                        if (!err) {
                            that.log("[Reply] " + result);
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
                }
            } else {
                that.log("[Reply] " + result + ", \n\t[ERR] " + err);
                res.sendStatus(503);
            }
            return;
        });
    }

    return RedisClient;
})();