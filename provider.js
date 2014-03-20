/*jshint node:true*/
"use strict";

var request = require("request");
var util = require("util");
var when = require("when");


function Client(host, port, user, pass, url) {
	this.user = user;
	this.pass = pass;
	this.url = util.format("http://%s:%s%s",
		host || "localhost",
		port || 9091,
		url || "/transmission/rpc");

	this.sid = null;
}


Client.prototype.request = function(method, args) {
	var options = {
		url: this.url,
		method: "POST",
		json: {
			method: method,
			arguments: args
		}
	};

	if (this.user) {
		options.auth = {
			user: this.user,
			pass: this.pass
		};
	}

	if (this.sid) {
		options.headers = {
			"X-Transmission-Session-Id": this.sid
		};
	}

	var self = this;
	var d = when.defer();

	request(options, function(err, response, data) {
		if (err) {
			return d.reject(err);
		}

		if (response.statusCode === 409 && !this.sid) {
			// Save session ID and retry
			self.sid = response.headers["x-transmission-session-id"];
			return d.resolve(self.request(method, args));
		}

		if (response.statusCode !== 200) {
			return d.reject(new Error("HTTP " + response.statusCode));
		}

		if (data.result !== "success") {
			return d.reject(new Error(data.result));
		}

		d.resolve(data.arguments);
	});

	return d.promise;
};


function Torrent(client, data) {
	this.data = data;
	this.client = client;

	console.dir(data);
}

Torrent.prototype = {
	get name()         { return this.data.name; },
	get state()        { return states[this.data.status]; },
	get size()         { return this.data.sizeWhenDone; },
	get error()        { return this.data.errorString; },
	get downloaded()   { return this.data.downloadedEver; },
	get downloadRate() { return this.data.rateDownload; },
	get seeders()      { return this.data.peersSendingToUs; },
	get uploaded()     { return this.data.uploadedEver; },
	get uploadRate()   { return this.data.rateUpload; },
	get leechers()     { return this.data.peersGettingFromUs; },
	get files()        { return this.data.files; }
};


module.exports = function(pluginConfig) {
	var client;
	var incoming;

	return {
		init: function(mongoose, logger, config) {
			client = new Client(
				pluginConfig.host,
				pluginConfig.port,
				pluginConfig.username,
				pluginConfig.password,
				pluginConfig.url
			);

			incoming = config.incoming || ".";
		},

		get downloads() {
			return client.request("torrent-get", {
				"fields": [ "id", "name", "status", "sizeWhenDone", "errorString",
							"downloadedEver", "rateDownload", "peersSendingToUs",
							"uploadedEver", "rateUpload", "peersGettingFromUs",
							"files" ]
			}).then(function(args) {
				return args.torrents.map(function(torrent) {
					return new Torrent(client, torrent);
				});
			});
		},

		get stats() {
			return client.request("torrent-get", {
				"fields": [ "status", "rateDownload", "rateUpload" ]
			}).then(function(args) {
				return args.torrents.reduce(function(stats, torrent) {
					if (torrent.status !== 0) {
						stats.active++;
						stats.uploadRate += torrent.rateUpload;
						stats.downloadRate += torrent.rateDownload;
					}

					return stats;
				}, { active: 0, uploadRate: 0, downloadRate: 0 });
			});
		},

		getDownload: function(id) {
			return;
		},

		addDownload: function(uri) {
			return client.request("add-torrent", {
				"filename": uri,
				"download-dir": incoming
			});
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
