
var uuid   = require('uuid-v4');
var utils  = require('../utils');

// 
// Redis key-store class
// 
var RedisStore = module.exports = function(opts) {
	this.client = opts.client;
	this.keyName = opts.keyName || 'authkey';
};

// 
// Add a new key to the store and associate it with a user ID
// 
// @param {key} the key to associate to the user
// @param {userId} the user ID
// @param {type} the type of request the key is for
// @return promise
// 
RedisStore.prototype.registerKey = function(key, userId, type) {
	var deferred = utils.defer();

	this.client.hmset(this.key(key), {userId: userId, type: type}, function() {
		deferred.resolve();
	});

	return deferred.promise;
};

// 
// Lookup a key in the key-store. If found, return the user ID, otherwise, return null
// 
// @param {key} the key to lookup
// @return promise
// 
RedisStore.prototype.find = function(key) {
	var deferred = utils.defer();

	this.client.hgetall(this.key(key), function(err, data) {
		if (err) {
			return deferred.reject(err);
		}
		
		deferred.resolve(data);
	});

	return deferred.promise;
};

// 
// Removes a key from the keystore
// 
// @param {key} the key to remove
// @return promise
// 
RedisStore.prototype.removeKey = function(key) {
	var deferred = utils.defer();

	this.client.del(this.key(key), function() {
		deferred.resolve();
	});

	return deferred.promise;
};

// 
// Formats a key string
// 
// @param {key} the key
// @return string
// 
RedisStore.prototype.key = function(key) {
	return this.keyName + ':' + key;
};

// 
// Generates a new key
// 
// @param {opts} options object
// @return string
// 
RedisStore.prototype.generateKey = function(opts) {
	var key;
	var self = this;
	var gen = (opts && opts.generator) || uuid;

	return utils.while(function() {
		return self.find(key = gen());
	})
	.then(function(obj) {
		return key;
	});
};
