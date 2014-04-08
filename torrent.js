/*jshint node:true*/
"use strict";

var path = require("path");


/*!
 * Torrent object
 */


function Torrent(client, data) {
	this.data = data;
	this.client = client;

	this._alreadyFinished = this._finished;
}

var states = [
	/* 0 */ "paused",
	/* 1 */ "initializing",
	/* 2 */ "initializing",
	/* 3 */ "initializing",
	/* 4 */ "downloading",
	/* 5 */ "seeding",
	/* 6 */ "seeding",
	/* 7 */ "initializing"
];

Torrent.prototype = {
	update: function(data) {
		this.data = data;

		if (this._finished && !this._alreadyFinished) {
			this._alreadyFinished = true;
			this.client.emit("complete", this);
		}

		if (this._finished && this.data.state !== 0) {
			this.pause();
		}
	},

	get id()           { return this.data.id; },
	get name()         { return this.data.name; },
	get size()         { return this.data.sizeWhenDone; },
	get error()        { return this.data.errorString; },
	get downloaded()   { return this.data.haveValid; },
	get downloadRate() { return this.data.rateDownload; },
	get seeders()      { return this.data.peersSendingToUs; },
	get uploaded()     { return this.data.uploadedEver; },
	get uploadRate()   { return this.data.rateUpload; },
	get leechers()     { return this.data.peersGettingFromUs; },

	get _finished() {
		return this.data.haveValid > 0 && this.data.haveValid === this.data.sizeWhenDone;
	},

	get state() {
		if (this._finished) {
			return "complete";
		}

		if (this.data.error) {
			return "error";
		}

		return states[this.data.status];
	},

	get files() {
		var self = this;

		return this.data.files.reduce(function(files, file) {
			files[path.join(self.client.incoming, file.name)] = file.length;
			return files;
		}, {});
	},

	cancel: function() {
		var client = this.client;

		client.request("torrent-remove", {
			"ids": [ this.data.id ],
			"delete-local-data": !this._finished
		}).then(function() {
			client.updateTorrents();
		});
	},

	pause: function() {
		var client = this.client;

		client.request("torrent-stop", {
			"ids": [ this.data.id ]
		}).then(function() {
			client.updateTorrents();
		});
	},

	resume: function() {
		var client = this.client;

		client.request("torrent-start", {
			"ids": [ this.data.id ]
		}).then(function() {
			client.updateTorrents();
		});
	},

	retry: function() {
		var client = this.client;

		client.request("torrent-start", {
			"ids": [ this.data.id ]
		}).then(function() {
			client.updateTorrents();
		});
	}
};


module.exports = Torrent;
