(function(){
	
	this.PlaylistDescriptor = function() { this.initialize(); };

	PlaylistDescriptor.prototype = {

		initialize:function() {
			this.clear();
		},

		clear:function() {
			this.permalink = null;
			this.playlistId = null;
			this.trackId = null;
			this.userId = null;
			this.groupId = null;
		},

		getPermalink:function(callback) {
			var setPermalinkFunc = $.proxy(function(response) {
				this.permalink = response.permalink_url;
				callback();
			}, this);

			if (this.playlistId)
			{
				soundcloud_get_playlist(this.playlistId, setPermalinkFunc);
			}
			else if (this.groupId)
			{
				soundcloud_get_group(this.groupId, setPermalinkFunc);
			}
			else if (this.userId)
			{
				soundcloud_get_user(this.userId, setPermalinkFunc);
			}
			else if (this.trackId)
			{
				soundcloud_get_track(this.trackId, setPermalinkFunc);
			}
		},

		getTracklist:function(callback) {
			var getTracklistFunc = $.proxy(function(permalink, callback) {
				soundcloud_resolve(permalink, $.proxy(function(response) {
					console.log("-- getting tracklist", permalink, response);
					this.__getTracklistForKind(response.kind, response, callback);
				}, this));
			}, this);

			if (this.permalink)
			{
				getTracklistFunc(this.permalink, callback);
			}
			else
			{
				this.getPermalink($.proxy(function() {
					getTracklistFunc(this.permalink, callback);
				}, this));
			}
		},

		__getTracklistForKind:function(kind, response, callback) {
			switch (response.kind)
			{
				case "user":
					this.userId = response.id;

					var suffix = response.track_count > 0 ? "/tracks" : "/favorites";
					soundcloud_resolve(stripTrailingSlash(this.permalink)+suffix, function(r) { callback(r) });
				break;

				case "playlist":
					this.playlistId = response.id;

					callback(response.tracks);
				break;

				case "group":
					this.groupId = response.id;

					soundcloud_resolve(stripTrailingSlash(this.permalink)+"/tracks", function(r) { callback(r) });
				break;

				case "track":
					this.trackId = response.id;

					callback([response]);
				break;
			}
		}
	};
})();