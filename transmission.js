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
		intents.emit(
			"downloads:provider",
			"transmission",
			new TransmissionClient(
				logger,
				config.host,
				config.port,
				config.username,
				config.password,
				config.url
			)
		);
	});
}


transmissionPlugin.manifest = {
	name: "downloads-transmission",
	description: "Transmission bittorrent downloads",
	dependencies: ["nestor-downloads"]
};


module.exports = transmissionPlugin;
