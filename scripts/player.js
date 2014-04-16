(function(){
	
	this.Player = function() {};

	Player.prototype = {
		// Private 
		///////////////////////////////////////////////////////////////////////////

		__getSoundCloudId:function(permalink, callback) {
			console.log("-- getting soundcloud id for: ", permalink);
			var resolve = "http://api.soundcloud.com/resolve.json?client_id="+this.clientId+"&url=";
			var request = new XMLHttpRequest();
			request.onreadystatechange = function(){
				if (this.readyState === 4 && this.responseText) {
					var response = JSON.parse(this.responseText);
					if (response.id) 
					{
						console.log("-- found soundcloud id:", response.id);
						callback(response.id);
					}
				}
			};
			request.open('get', resolve+permalink, true);
			request.send();
		},

		__loadPlaylistInternal:function(options, callback) {
			if (options.playlistPermalink)
			{
				this.__getSoundCloudId(options.playlistPermalink, $.proxy(function(playlistId) {
					options.playlistId = playlistId;
					options.playlistPermalink = null;
					this.loadPlaylist(options, callback);
				}, this));
				return;
			}

			// Build playlist string
			var playlistString = "/playlists/"+options.playlistId;

			console.log("-- requesting tracks from playlist", options.playlistId);

			// Get a list of tracks in the playlist
			SC.get(playlistString, $.proxy(function(playlist) {
				console.log("-- got playlist data", playlist);

				// Create new playlist
				this.playlist = {};
				this.playlist.permalink_url = playlist.permalink_url;
				this.playlist.id = options.playlistId;

				// Save track data
				this.playlist.trackData = {};
				jQuery.each(playlist.tracks, $.proxy(function(index, track) {
					this.playlist.trackData[track.id] = jQuery.extend(true, {}, track);
				},this));

				// Grab track ids
				var tracklist = jQuery.map(playlist.tracks, function(track) {
					return track.id;
				});

				// Save off tracklist
				this.playlist.tracklist = tracklist;

				// Finished!
				console.log("-- loaded playlist:", this.playlist);

				if (this.onPlaylistLoaded)
				{
					this.onPlaylistLoaded();
				}

				callback();
			}, this));
		},

		__loadCurrentTrack:function(callback)
		{
			var trackId = this.playlist.tracklist[this.currentTrackIndex];
			console.log("-- Loading track at index", trackId, this.currentTrackIndex);

			SC.stream("/tracks/" + trackId, {
				useHTML5Audio: true,
				preferFlash: false,
				ontimedcomments: $.proxy(function(comments){
					console.log("-- timed comment", comments[0]);
					if (this.onTimedComment)
					{
						this.onTimedComment(comments[0]);
					}
				}, this),
				onfinish: $.proxy(function() {
					this.trackLoaded = false;
					this.next();
				}, this),
			}, $.proxy(function(sound){
				this.trackLoaded = true;
				this.currentTrackManagerId = sound.sID;

				this.currentTrack = this.playlist.trackData[trackId];

				if (this.onTrackLoaded)
				{
					this.onTrackLoaded();
				}

				if (callback)
				{
					callback(sound);
				}
			}, this));
		},

		// Public 
		///////////////////////////////////////////////////////////////////////////
		initialize:function(clientId) {
			// Player internal variables
			this.clientId = clientId;
			this.playlist = null;
			this.currentTrackManagerId;
			this.currentTrackIndex = 0;

			// Player state
			this.currentTrack = null;
			this.trackLoaded = false;
			this.playing = false;

			// Player notification delegates
			this.onPlayTrack = null;
			this.onTrackLoaded = null;
			this.onPlaylistLoaded = null;
			this.onTimedComment = null;

			// Initialize Sound Cloud
			SC.initialize({
				client_id: this.clientId
			});

			console.log("-- player initialization complete");
		},

		loadPlaylist:function(options, callback) {
			options = jQuery.extend(true, {}, options);
			this.__loadPlaylistInternal(options, callback);
		},

		loadTrack:function(){
			__loadCurrentTrack();
		},

		shuffle:function() {
			assert(this.playlist, "Must load playlist before using player controls");

			if (this.playlist.tracklist.length == 0) return;

			// Pause the player
			var wasPlaying = this.playing;
			this.pause();

			// Perform the shuffle
			console.log("-- shuffling playlist");
			var tracklist = this.playlist.tracklist;
			for(var j, x, i = tracklist.length; i; j = parseInt(Math.random() * i), x = tracklist[--i], tracklist[i] = tracklist[j], tracklist[j] = x);


			// Set the track loaded flag to false so we're forced to start playing the newly shuffled songs
			this.trackLoaded = false;
			this.currentTrackIndex = 0;

			// If we were playing before the shuffle, then start playing a new song
			if (wasPlaying)
			{
				this.play();
			}
		},

		jumpToTrack:function(trackId) {
			assert(this.playlist, "Must load playlist before using player controls");

			if (this.playlist.tracklist.length == 0) return;

			console.log("-- skipping to track", trackId);

			if (typeof(trackId) == "string")
			{
				trackId = parseInt(trackId);
			}

			var trackIndex = this.playlist.tracklist.indexOf(trackId);
			if (trackIndex == -1)
			{
				console.log("-- could not find track id", trackId);
				return;
			}

			this.currentTrackIndex = trackIndex;
			this.trackLoaded = false;

			if (this.playing)
			{
				this.play();
			}
		},

		play:function() {
			assert(this.playlist, "Must load playlist before using player controls");

			if (this.playlist.tracklist.length == 0) return;

			console.log("-- call to play", this.playing, this.trackLoaded);

			// Just resume if we're paused.
			if (!this.playing && this.trackLoaded)
			{
				this.resume();
				return;
			}

			// If a track is loaded and the player is not paused, early out
			if (this.trackLoaded)
			{
				return;
			}

			// Pause the playing song while we load
			this.pause();

			// Load the new track and play it
			this.__loadCurrentTrack($.proxy(function(sound) {

				this.playing = true;
				sound.play();

				// Invoke notifier
				if (this.onPlayTrack)
				{
					this.onPlayTrack();
				}
			}, this));
		},

		pause:function() {
			assert(this.playlist, "Must load playlist before using player controls");

			if (this.playlist.tracklist.length == 0) return;
			if (!this.playing) return;

			console.log("-- pausing playlist");
			if (typeof soundManager != "undefined")
			{
				this.playing = false;
				soundManager.pause(this.currentTrackManagerId);
			}
		},

		resume:function() {
			assert(this.playlist, "Must load playlist before using player controls");

			if (this.playlist.tracklist.length == 0) return;
			if (this.playing) return;

			console.log("-- resuming playlist");
			if (typeof soundManager != "undefined")
			{
				this.playing = true;
				soundManager.play(this.currentTrackManagerId);
			}
		},

		next:function() {
			assert(this.playlist, "Must load playlist before using player controls");

			console.log("-- moving to next track first", this.playlist.tracklist.length);

			if (this.playlist.tracklist.length == 0) return;

			console.log("-- moving to next track", this.currentTrackIndex, this.playlist.tracklist.length);

			this.currentTrackIndex = wrap(this.currentTrackIndex + 1, this.playlist.tracklist.length);

			console.log("-- new track index", this.currentTrackIndex);

			this.trackLoaded = false;

			if (this.playing)
			{
				this.play();
			}
			else
			{
				this.__loadCurrentTrack();
			}
		},

		previous:function() {
			assert(this.playlist, "Must load playlist before using player controls");

			if (this.playlist.tracklist.length == 0) return;

			console.log("-- moving to previous track", this.currentTrackIndex, this.playlist.tracklist.length);

			this.currentTrackIndex = wrap(this.currentTrackIndex - 1, this.playlist.tracklist.length);

			console.log("-- new track index", this.currentTrackIndex);

			this.trackLoaded = false;

			if (this.playing)
			{
				this.play();
			}
			else
			{
				this.__loadCurrentTrack();
			}
		}
	};
})();