/*jshint node:true*/
"use strict";


var provider = require("./provider");


/*!
 * Plugin interface
 */


function transmissionPlugin(nestor) {
	var logger = nestor.logger;
	var config = nestor.config;
	var intents = nestor.intents;

	intents.on("nestor:startup", function() {
		intents.emit("downloads:provider", "transmission", provider(config));
	});
}


transmissionPlugin.manifest = {
	name: "downloads-transmission",
	description: "Transmission bittorrent downloads",
	dependencies: ["nestor-downloads"]
};


module.exports = transmissionPlugin;
