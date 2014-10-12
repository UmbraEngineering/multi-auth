
var utils = require('../utils');

// 
// Redis key-store class
// 
var MongoStore = module.exports = function(opts) {
	this.client = opts.client;
	this.collection = opts.collection || 'authkey';
	this.collection = this.client.collection(this.collection);
};

// 
// Add a new key to the store and associate it with a user ID
// 
// @param {key} the key to associate to the user
// @param {userId} the user ID
// @param {type} the type of request the key is for
// @return promise
// 
MongoStore.prototype.registerKey = function(key, userId, type) {
	var deferred = utils.defer();

	this.collection.insert({ key: key, userId: userId, type: type }, function(err, docs) {
		if (err) {
			return deferred.reject(err);
		}

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
MongoStore.prototype.find = function(key) {
	var deferred = utils.defer();

	this.collection.findOne({ key: key }, function(err, doc) {
		if (err) {
			return deferred.reject(err);
		}

		if (! doc) {
			return deferred.resolve(null);
		}

		deferred.resolve({
			userId: doc.userId,
			type: doc.type
		});
	});

	return deferred.promise;
};

// 
// Removes a key from the keystore
// 
// @param {key} the key to remove
// @return promise
// 
MongoStore.prototype.removeKey = function(key) {
	var deferred = utils.defer();

	this.client.remove({ key: key }, function(err) {
		if (err) {
			return deferred.reject(err);
		}

		deferred.resolve();
	});

	return deferred.promise;
};

// 
// Generates a new key
// 
// @param {opts} options object
// @return string
// 
MongoStore.prototype.generateKey = function(opts) {
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
