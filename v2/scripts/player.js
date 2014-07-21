(function(){
	
	this.Player = function() { this.initialize(); };

	Player.prototype = {
		// Private 
		///////////////////////////////////////////////////////////////////////////
		__loadCurrentTrack:function(callback)
		{
			var trackId = this.playlist.tracklist[this.currentTrackIndex];
			console.log("-- Loading track at index", trackId, this.currentTrackIndex);

			if (!this.playlist.trackData[trackId].streamable)
			{
				console.log("-- Track is not streamable... skipping", trackId);
				this.next();
				return;
			}

			soundcloud_stream(trackId, {
				onfinish: $.proxy(function() {
					this.trackLoaded = false;
					this.next();
				}, this),
				onload: $.proxy(function(){
					if (this.sound.readyState == 2)
					{
						console.log("-- Track could not load... skipping", trackId);
						this.next();
					}
				}, this),
				whileplaying: $.proxy(function(){
					if (this.onPlayPositionChanged)
					{
						this.onPlayPositionChanged();
					}
				}, this)
			}, $.proxy(function(sound){
				this.trackLoaded = true;
				this.currentTrackManagerId = sound.sID;
				this.sound = sound;

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
		initialize:function() {
			// Player internal variables
			this.playlist = null;
			this.currentTrackManagerId;
			this.currentTrackIndex = 0;
			this.sound = null;

			// Player state
			this.currentTrack = null;
			this.trackLoaded = false;
			this.playing = false;

			// Player notification delegates
			this.onPlayTrack = null;
			this.onTrackLoaded = null;
			this.onPlaylistLoaded = null;
			this.onTimedComment = null;
			this.onPlayPositionChanged = null;

			console.log("-- player initialization complete");
		},

		loadPlaylist:function(descriptor, callback) {
			descriptor.getTracklist($.proxy(function(tracks) {
				console.log("-- got playlist data", tracks);

				// Create new playlist
				this.playlist = {};
				this.playlist.permalink_url = descriptor.permalink;
				this.playlist.id = descriptor.playlistId;

				// Save track data
				this.playlist.trackData = {};
				jQuery.each(tracks, $.proxy(function(index, track) {
					this.playlist.trackData[track.id] = jQuery.extend(true, {}, track);
				},this));

				// Grab track ids
				var tracklist = jQuery.map(tracks, function(track) {
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

		getPositionPercent:function() {
			if (!this.sound || !this.currentTrack) return 0;

			return this.sound.position / this.currentTrack.duration;
		},

		setPositionPercent:function(percent) {
			if (!this.sound || !this.currentTrack) return;

			this.sound.setPosition(percent*this.currentTrack.duration);
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