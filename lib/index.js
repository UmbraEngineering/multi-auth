
var utils = require('./utils');

var MemoryStore  = require('key-stores/memory');
var RedisStore   = require('key-stores/redis');
var MongoStore   = require('key-stores/mongo');

// 
// Auth system class
// 
var AuthSystem = exports = module.exports = function(opts) {
	this.keyStore = opts.keyStore || new MemoryStore();
	this.authMethods = opts.authMethods || [ 'password', 'email', 'two step' ];
	this.actions = [ 'sendEmail', 'fetchUserId', 'checkPassword' ]
		.reduce(function(mem, key) {
			mem[key] = opts[key] || function() { };
			return mem;
		}, { });
	};
};

// 
// Defines an action
// 
// @param {action} the name of the action
// @param {func} the function to define
// @return this
// 
AuthSystem.prototype.define = function(action, func) {
	this.actions[action] = func;
	return this;
};

// 
// Take a user defined action
// 
// @param {action} the name of the function to call
// @param {...} arguments to pass to the function
// @return mixed
// 
AuthSystem.prototype.action = function(action) {
	var args = Array.prototype.slice.call(arguments, 1);
	return this.actions[action].apply(this, args);
};





// 
// Generates a new key
// 
// @return string
// 
exports.generateKey = function() {
	var key;

	do {
		key = uuid();
	} while (this.find(key));

	return key;
};
