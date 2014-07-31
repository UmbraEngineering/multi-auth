
var app       = require('express')();
var Auth      = require('../lib');
var mongoose  = require('mongoose');

var auth = new Auth({
	sendEmail: function() {
		// 
	},
	fetchUserId: function() {
		// 
	},
	checkPassword: function() {
		// 
	}
});
