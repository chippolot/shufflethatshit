var offline_mode = document.location.hostname == "localhost";

var lastPlaylistCookieId = "shuffle_that_shit_playlist_descriptor";
var player = null;
var currentPlaylistDescriptor = null;

$(document).ready(function()
{
	// Show the page loader
	showLoader(true);
	$('.sts-control-pause').hide();

	// Initialize the soundcloud api
	soundcloud_initialize("aa4e45fd3130de0246b5ba7c0c72a67e");

	// Initialize the player
	initializePlayer();

	// Look for a playlist url either in the page url hash or as a saved cookie
	if (!fillPlaylistInputFromUrl())
	{
		fillPlaylistInputFromCookie();
	}

	// Start playing if we deserialized a descriptor and we're not on a mobile device
	if (currentPlaylistDescriptor)
	{
		loadPlaylistAndShuffle(currentPlaylistDescriptor);
	}

	// Add touch swipe handlers
	$(".content").touchwipe({
	     wipeLeft: function() { next(); },
	     wipeRight: function() { previous(); },
	     min_move_x: 40,
	     min_move_y: 40,
	     preventDefaultEvents: true
	});

	console.log("-- initialization complete");
})

// Page Control ///////////////////////////////////////////////////////////////

function getDefaultPageTitle()
{
	return "shuffle that shit!";
}

function hideLoader()
{
	$('.sts-loader').fadeOut(750);
}

function showLoader(firstCall)
{
	document.title = getDefaultPageTitle();

	$('.sts-loader').fadeIn(750);
	$('.sts-player').fadeOut(firstCall ? 0 : 750);
	$('.sts-controls').hide()
}

function showPlayer()
{
	$('.sts-player').fadeIn(750);
	$('.sts-controls').show()
}

// Player Controls
///////////////////////////////////////////////////////////////////////////////
function previous()
{
	player.previous();
}

function play()
{
	player.play();
	$('.sts-control-hide-during-play').hide();
	$('.sts-control-hide-during-pause').show();
}

function pause()
{
	player.pause();
	$('.sts-control-hide-during-play').show();
	$('.sts-control-hide-during-pause').hide();
}

function togglePlay()
{
	if (player.playing)
	{
		pause();
	}
	else
	{
		play();
	}
}

function next()
{
	player.next();
}

// Soundcloub /////////////////////////////////////////////////////////////////
function fillPlaylistInputFromUrl()
{
	console.log("-- checking url for saved playlist descriptor");

	var permalinkParam = getUrlParameter("playlist") || getUrlParameter("permalink");
	var hash = getUrlHash();

	// First check for playlist param
	if (permalinkParam)
	{
		console.log("-- found permalink query parameter", permalinkParam);

		var playlistPermalink = atob(permalinkParam);

		currentPlaylistDescriptor = new PlaylistDescriptor();
		currentPlaylistDescriptor.deserializePermalink(playlistPermalink);
	}
	// Then check for playlist hash
	else if (hash)
	{
		console.log("-- found url hash", hash);

		currentPlaylistDescriptor = new PlaylistDescriptor();
		currentPlaylistDescriptor.deserializeHash(hash);
	}
	return currentPlaylistDescriptor != null;
}

function fillPlaylistInputFromCookie()
{
	console.log("-- checking cookie for saved playlist descriptor");

	var lastPlaylistDescriptorJSON = getCookie(lastPlaylistCookieId)
	if (lastPlaylistDescriptorJSON != "")
	{
		console.log("-- found cookie", lastPlaylistDescriptorJSON);

		currentPlaylistDescriptor = new PlaylistDescriptor();
		currentPlaylistDescriptor.deserializeJSON(lastPlaylistDescriptorJSON);
		return true;
	}
	return false;
}

function initializePlayer()
{
	console.log("-- initializing player");

	player = new Player();

	player.onTrackLoaded = $.proxy(function() {
		var songInfoDiv = $('.sts-song-info');
		var songBackgroundDiv = $('.sts-song-image');
		var currentTrack = player.currentTrack;

		var songTitleLink = '<a target="_blank" href="'+currentTrack.permalink_url+'">'+currentTrack.title+'</a>';
		songInfoDiv.html(songTitleLink);

		var backgroundImageValue = "none";
		if (currentTrack.artwork_url)
		{
			var artwork_url = currentTrack.artwork_url.replace('large.jpg', 't500x500.jpg');
			backgroundImageValue = "url("+artwork_url+")";
		}
		songBackgroundDiv.css("background-image", backgroundImageValue);

		currentPlaylistDescriptor.trackId = currentTrack.id;

		window.location.hash = currentPlaylistDescriptor.serializeHash();

		var newUrl = 'http://'+window.location.host;
		newUrl += window.location.pathname.indexOf('/testing') == 0 ? '/testing/' : '/';
		newUrl += window.location.hash;
		history.pushState({}, null, newUrl);
		document.title = currentTrack.title + " : " + getDefaultPageTitle();

		showPlayer();
	}, this);

	player.onPlaylistLoaded = $.proxy(function() {
		$('#url').val(currentPlaylistDescriptor.permalink);
	}, this);

	player.onPlayPositionChanged = $.proxy(function() {
		// TODO: Slider functionality
	}, this);
}

function loadPlaylistAndShuffle(descriptor)
{
	console.log("-- clicked shuffle playlist button", descriptor);

	// If no playlist url was passed in, read it from the input box
	if (!descriptor)
	{
		// Need valid URL
		if ($('#url').val() == "")
		{
			return;
		}

		// Get the playlist id from the permalink
		descriptor = new PlaylistDescriptor();
	    descriptor.deserializePermalink($('#url').val());

		currentPlaylistPermalink = descriptor.permalink;
	}

	currentPlaylistDescriptor = descriptor;

	// Show a cool loading screen
	showLoader();

	// Solve this in a more elegant way!
	var wasPlaying = player.playing;

	// Get a shuffled tracklist
	player.loadPlaylist(currentPlaylistDescriptor, function() {
		createCookie(lastPlaylistCookieId, currentPlaylistDescriptor.serializeJSON(), 365);

		player.shuffle();

		if (descriptor.trackId)
		{
			player.jumpToTrack(descriptor.trackId);
		}

		hideLoader();

		if (!isMobileDevice)
		{
			if (!wasPlaying)
			{
				play();
			}
		}
		else
		{
			showPlayer();
		}
	});
}