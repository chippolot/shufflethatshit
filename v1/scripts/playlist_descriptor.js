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

		deserializePermalink:function(permalink) {
			this.clear();
			this.permalink = permalink;
		},

		deserializeHash:function(hash) {
			this.clear();

			var tokens = hash.split("/");
			var defaultHashTokenTypes = ["playlistId", "trackId"];

			for (var i = 0; i < tokens.length; ++i)
			{
				var token = tokens[i];
				var subtokens = token.split(":");

				var tokenType;
				var tokenValue;
				if (subtokens.length == 1)
				{
					tokenType = defaultHashTokenTypes[i];
					tokenValue = token;
				}
				else
				{
					tokenType = subtokens[0];
					tokenValue = subtokens[1];
				}

				this[tokenType] = tokenValue;
			}
		},

		deserializeJSON:function(json) {
			this.clear();

			var params = JSON.parse(json);
			this.permalink = params.permalink;
			this.playlistId = params.playlistId;
			this.trackId = params.trackId;
			this.userId = params.userId;
			this.groupId = params.groupId;
		},

		serializeHash:function() {
			var tokenOrder = ["groupId", "userId", "playlistId", "trackId"];

			console.log("-- serializing hash", this);

			var hashTokens = [];
			for (var i = 0; i < tokenOrder.length; ++i)
			{
				var tokenType = tokenOrder[i];
				var tokenValue = this[tokenType];
				if (tokenValue)
				{
					console.log("-- serializing hash token", tokenType, tokenValue);
					hashTokens.push(tokenType+":"+tokenValue);
				}
			}
			console.log("-- serializing hash finished", hashTokens.join("/"));
			return hashTokens.join("/");
		},

		serializeJSON:function() {
			return JSON.stringify({
				permalink:this.permalink,
				playlistId:this.playlistId,
				trackId:this.trackId,
				userId:this.userId,
				groupId:this.groupId
			});
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