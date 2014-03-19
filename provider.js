/*jshint node:true*/
"use strict";

var Transmission = require("transmission");

module.exports = function(pluginConfig) {
	var client;

	return {
		init: function(mongoose, logger, config) {
			client = new Transmission({
				host: pluginConfig.host || "localhost",
				port: pluginConfig.port || 9091,
				username: pluginConfig.username,
				password: pluginConfig.password,
				url: pluginConfig.url || "/transmission/rpc"
			});
		},

		get downloadCount() {
			return 0;
		},

		get downloads() {
			return [];
		},

		get stats() {
			return { active: 0, uploadRate: 0, downloadRate: 0 };
		},

		getDownload: function(id) {
			return;
		},

		addDownload: function(id) {
			return;
		},

		canDownload: function(uri) {
			return false;
		},

		pause: function() {

		},

		resume: function() {

		}
	};
};
