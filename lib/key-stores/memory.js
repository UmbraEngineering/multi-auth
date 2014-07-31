
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
	// @return void
	// 
	this.registerKey = function(key, userId) {
		if (this.find(key)) {
			return Promise.reject(new Error('Cannot register a key that already exists'));
		}

		keys[key] = userId;

		return Promise.resolve();
	};

	// 
	// Lookup a key in the key-store. If found, return the user ID, otherwise, return null
	// 
	// @param {key} the key to lookup
	// @return string
	// 
	this.find = function(key) {
		if (keys.hasOwnProperty(key)) {
			return Promise.resolve(keys[key]);
		}

		return Promise.resolve(null);
	};

	// 
	// Removes a key from the keystore
	// 
	// @param {key} the key to remove
	// @return void
	// 
	this.removeKey = function(key) {
		delete keys[key];

		return Promise.resolve();
	};
};
