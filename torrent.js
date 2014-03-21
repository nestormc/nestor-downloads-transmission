/*jshint node:true*/
"use strict";


/*!
 * Torrent object
 */


function Torrent(client, data) {
	this.data = data;
	this.client = client;
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
	},

	get id()           { return this.data.id; },
	get name()         { return this.data.name; },
	get state()        { return states[this.data.status]; },
	get size()         { return this.data.sizeWhenDone; },
	get error()        { return this.data.errorString; },
	get downloaded()   { return this.data.haveValid; },
	get downloadRate() { return this.data.rateDownload; },
	get seeders()      { return this.data.peersSendingToUs; },
	get uploaded()     { return this.data.uploadedEver; },
	get uploadRate()   { return this.data.rateUpload; },
	get leechers()     { return this.data.peersGettingFromUs; },

	get files() {
		return this.data.files.reduce(function(files, file) {
			files[file.name] = file.length;
			return files;
		}, {});
	},

	cancel: function() {
		this.client.request("torrent-remove", {
			"ids": [ this.data.id ],
			"delete-local-data": !this.data.isFinished
		});
	},

	pause: function() {
		this.client.request("torrent-stop", {
			"ids": [ this.data.id ]
		});
	},

	resume: function() {
		this.client.request("torrent-start", {
			"ids": [ this.data.id ]
		});
	},

	retry: function() {
		// No-op
	}
};


module.exports = Torrent;
