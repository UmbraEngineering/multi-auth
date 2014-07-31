
var utils = require('../utils');

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
// @return void
// 
RedisStore.prototype.registerKey = function(key, userId) {
	var deferred = utils.defer();

	this.client.set(this.key(key), userId, function() {
		deferred.resolve();
	});

	return deferred.promise;
};

// 
// Lookup a key in the key-store. If found, return the user ID, otherwise, return null
// 
// @param {key} the key to lookup
// @return string
// 
RedisStore.prototype.find = function(key) {
	var deferred = utils.defer();

	this.client.get(this.key(key), function(userId) {
		deferred.resolve(userId);
	});

	return deferred.promise;
};

// 
// Removes a key from the keystore
// 
// @param {key} the key to remove
// @return void
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
