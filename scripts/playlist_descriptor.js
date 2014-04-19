(function(){
	
	this.PlaylistDescriptor = function() { this.initialize(); };

	PlaylistDescriptor.prototype = {

		function initialize() {
			this.clear();
		},

		function clear() {
			this.permalink = null;
			this.playlistId = null;
			this.trackId = null;
			this.userId = null;
			this.groupId = null;
		},

		function getPermalink(callback) {
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

		function getTracklist(callback) {
			var getTracklistFunc = function(permalink, callback) {
				soundcloud_resolve(permalink, $.proxy(function(response) {
					console.log("-- getting tracklist", permalink, response);
					this.__getTracklistForKind(response.kind, response, callback);
				}, this));
			};

			if (this.permalink)
			{
				getTracklistFunc(this.permalink, callback);
			}
			else
			{
				this.getPermalink($.proxy(function() {
					getTracklistFunc(this.permalink);
				}, this));
			}
		},

		function __getTracklistForKind(kind, response, callback) {
			switch (response.kind)
			{
				case "user":
					var suffix = response.track_count > 0 ? "/tracks" : "/favorites";
					soundcloud_resolve(stripTrailingSlash(this.permalink)+suffix, function(r) { callback(r) });
				break;

				case "playlist":
					callback(response.tracks);
				break;

				case "group":
					soundcloud_resolve(stripTrailingSlash(this.permalink)+"/tracks", function(r) { callback(r) });
				break;

				case "track":
					callback([response]);
				break;
			}
		}
	};
})();