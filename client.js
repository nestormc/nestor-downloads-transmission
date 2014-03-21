/*jshint node:true*/
"use strict";

var request = require("request");
var util = require("util");
var url = require("url");
var when = require("when");
var EventEmitter = require("events").EventEmitter;
var Torrent = require("./torrent");



/*!
 * Transmission RPC Client and nestor-downloads provider
 */


var UPDATE_INTERVAL = 1000;
var TORRENT_FIELDS = [
	"id", "name", "status", "sizeWhenDone", "errorString",
	"haveValid", "rateDownload", "peersSendingToUs",
	"uploadedEver", "rateUpload", "peersGettingFromUs",
	"files", "isFinished",
];


function Client(logger, host, port, user, pass, url) {
	EventEmitter.call(this);

	this.user = user;
	this.pass = pass;
	this.url = util.format("http://%s:%s%s",
		host || "localhost",
		port || 9091,
		url || "/transmission/rpc");
	this.sid = null;

	this.initialGetDone = false;
	this.updateTimeout = null;
	this.torrents = {};
	this.logger = logger;
	this.incoming = ".";
}
util.inherits(Client, EventEmitter);


Client.prototype.init = function(mongoose, logger, config) {
	this.incoming = config.incoming || ".";
	this.updateTorrents();
};


Client.prototype.updateTorrents = function(id) {
	if (this.updateTimeout) {
		clearTimeout(this.updateTimeout);
		this.updateTimeout = null;
	}

	var query = { fields: TORRENT_FIELDS };

	if (id) {
		query.ids = [id];
	} else if (this.initialGetDone) {
		query.ids = "recently-active";
	}

	var self = this;

	return this.request("torrent-get", query)
	.then(function(args) {
		self.updateTimeout = setTimeout(self.updateTorrents.bind(self), UPDATE_INTERVAL);

		if (!id && !self.initialGetDone) {
			self.initialGetDone = true;
		}

		if ("removed" in args) {
			args.removed.forEach(function(removed) {
				if (removed.id in self.torrents) {
					self.emit("remove", self.torrents[removed.id]);
					delete self.torrents[removed.id];
				}
			});
		}

		if ("torrents" in args) {
			args.torrents.forEach(function(torrent) {
				if (torrent.id in self.torrents) {
					self.torrents[torrent.id].update(torrent);
				} else {
					self.torrents[torrent.id] = new Torrent(self, torrent);
				}

				self.emit("update", self.torrents[torrent.id]);
			});
		}
	})
	.otherwise(function(err) {
		self.logger.warn("Transmission update error: %s", err.message || err);
		self.updateTimeout = setTimeout(self.updateTorrents.bind(self), UPDATE_INTERVAL);
	});
};


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


Client.prototype.getDownload = function(id) {
	var numericId = Number(id);
	var self = this;

	return this.updateTorrents(numericId)
	.then(function() {
		return self.torrents[numericId];
	});
};


Client.prototype.addDownload = function(uri) {
	return this.request("add-torrent", {
		"filename": uri,
		"download-dir": this.incoming
	});
};


Client.prototype.canDownload = function(uri) {
	var parsed = url.parse(uri, true);

	if (parsed.protocol === "magnet:") {
		var urns = parsed.query.xt;

		if (!Array.isArray(urns)) {
			urns = [urns];
		}

		return urns.some(function(urn) {
			if (urn.match(/^urn:btih:/)) {
				return true;
			}
		});
	}

	return false;
};


Client.prototype.pause = function() {
	this.request("torrent-stop", {});
};


Client.prototype.resume = function() {
	this.request("torrent-start", {});
};


Object.defineProperties(Client.prototype, {
	downloads: {
		get: function() {
			var self = this;

			return Object.keys(this.torrents).map(function(id) {
				return self.torrents[id];
			});
		}
	},

	stats: {
		get: function() {
			var self = this;

			return Object.keys(this.torrents).reduce(function(stats, id) {
				var torrent = self.torrents[id];

				if (torrent.state !== "paused") {
					stats.active++;
					stats.uploadRate += torrent.uploadRate;
					stats.downloadRate += torrent.downloadRate;
				}

				return stats;
			}, { active: 0, uploadRate: 0, downloadRate: 0 });
		}
	}
});



module.exports = Client;
