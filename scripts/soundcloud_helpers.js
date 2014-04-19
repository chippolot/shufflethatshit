var soundcloud_client_id = null;

function soundcloud_initialize(clientId)
{
	console.log("-- initializing soundcloud api");

	soundcloud_client_id = clientId;

	// Initialize Sound Cloud
	SC.initialize({
		client_id: soundcloud_client_id
	});
}

function soundcloud_get_playlist(id, callback)
{
	console.log("-- getting playlist data: ", id);

	SC.get("/playlists/" + id, callback);
}

function soundcloud_get_user(id, callback)
{
	console.log("-- getting user data: ", id);

	SC.get("/users/" + id, callback);
}

function soundcloud_get_track(id, callback)
{
	console.log("-- getting track data: ", id);

	SC.get("/tracks/" + id, callback);
}

function soundcloud_get_group(id, callback)
{
	console.log("-- getting group data: ", id);

	SC.get("/groups/" + id, callback);
}

function soundcloud_resolve(permalink, callback)
{
	console.log("-- resolving permalink: ", permalink);

	SC.get("/resolve", { url:permalink }, function(response) {
		callback(response);
	});
}

function soundcloud_resolve_playlist_id(permalink, callback)
{
	soundcloud_resolve(permalink, function(response) {
		if (response.id) 
		{
			console.log("-- resolved soundcloud id:", permalink, response.id);
			callback(response.id);
		}
	});
}

function soundcloud_stream(trackId, params, callback)
{
	console.log("-- streaming track: ", trackId);

	jQuery.extend(params, { 
		useHTML5Audio: true,
		preferFlash: false});
	SC.stream("/tracks/" + trackId, params, callback);
}