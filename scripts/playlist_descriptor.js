(function(){
	
	this.PlaylistDescriptor = function() { this.initialize(); };

	PlaylistDescriptor.prototype = {

		function initialize():void
		{
			this.clear();
		},

		function clear():void
		{
			this.permalink = null;
			this.playlistId = null;
			this.trackId = null;
			this.userId = null;
			this.groupId = null;
		}

	};

})();