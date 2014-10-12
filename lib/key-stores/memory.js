
var uuid     = require('uuid-v4');
var auth     = require('../index');
var Promise  = require('promise-es6').Promise;

// 
// In-memory key store class
// 
var MemoryStore = module.exports = function() {
	var keys = { };

	// 
	// Add a new key to the store and associate it with a user ID
	// 
	// @param {key} the key to associate to the user
	// @param {userId} the user ID
	// @param {type} the type of request the key is for
	// @return promise
	// 
	this.registerKey = function(key, userId, type) {
		if (this.find(key)) {
			return Promise.reject(new Error('Cannot register a key that already exists'));
		}

		keys[key] = {
			userId: userId,
			type: type
		};

		return Promise.resolve();
	};

	// 
	// Lookup a key in the key-store. If found, return the user ID, otherwise, return null
	// 
	// @param {key} the key to lookup
	// @return promise
	// 
	this.find = function(key) {
		if (keys.hasOwnProperty(key)) {
			return Promise.resolve({
				userId: keys[key].userId,
				type: keys[key].type
			});
		}

		return Promise.resolve(null);
	};

	// 
	// Removes a key from the keystore
	// 
	// @param {key} the key to remove
	// @return promise
	// 
	this.removeKey = function(key) {
		delete keys[key];

		return Promise.resolve();
	};

	// 
	// Generates a new key
	// 
	// @param {opts} options object
	// @return string
	// 
	this.generateKey = function(opts) {
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
};
