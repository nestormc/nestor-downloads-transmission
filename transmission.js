/*jshint node:true*/
"use strict";


var TransmissionClient = require("./client");


/*!
 * Plugin interface
 */


function transmissionPlugin(nestor) {
	var logger = nestor.logger;
	var config = nestor.config;
	var intents = nestor.intents;

	intents.on("nestor:startup", function() {
		var client = new TransmissionClient(
				logger,
				config.host,
				config.port,
				config.username,
				config.password,
				config.url
			);

		intents.emit(
			"downloads:provider",
			"transmission",
			client
		);

		intents.emit(
			"downloads:filehandler",
			"application/x-bittorrent",
			function(file, source, callback) {
				client.addDownload(file);
				if (source) {
					source.cancel();
				}

				callback();
			}
		);
	});
}


transmissionPlugin.manifest = {
	name: "downloads-transmission",
	description: "Transmission bittorrent downloads",
	dependencies: ["nestor-downloads"]
};


module.exports = transmissionPlugin;
