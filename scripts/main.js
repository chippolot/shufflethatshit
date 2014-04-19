var offline_mode = document.location.hostname == "localhost";

var lastPlaylistCookieId = "shuffle_that_shit_last_playlist";
var defaultPlaylistInputText = false;
var currentPlaylistPermalink = null;
var player = null;
var firstPlay = true;
var userIsSlidingPositionBar = false;

var commentShowing = false;
var commentTimeout;

$(document).ready(function()
{
	// Prepare page elements
	showLoader(true);
	$('.control_pause').hide();
	$('.share_container').fadeOut(0);

	// Initialize the soundcloud api
	soundcloud_initialize("aa4e45fd3130de0246b5ba7c0c72a67e");

	// Initialize the player
	initializePlayer();

	// Look for a playlist url either in the page url or as a saved cookie
	var foundPlaylist = fillPlaylistInputFromUrl();
	if (!foundPlaylist)
	{
		foundPlaylist = fillPlaylistInputFromCookie();
	}

	// Make the default playlist input text transparent if nothing was found
	if (!foundPlaylist)
	{
		var urlInputDiv = $(".url_input_box");
		urlInputDiv.css("color", "rgba(255, 173, 215, 0.5)");
		defaultPlaylistInputText = true;
	}

	// Listen for the enter key in the playlist submission input box
	$(".url_input_box").keypress(function(event) {
		if (event.which == 13) {
			event.preventDefault();
			loadPlaylistAndShuffle();
		}
	});

	// Add touch swipe handlers
	$(".player").touchwipe({
	     wipeLeft: function() { next(); },
	     wipeRight: function() { previous(); },
	     min_move_x: 40,
	     min_move_y: 40,
	     preventDefaultEvents: true
	});

	// Initialize song position slider
	$(".slider").slider({
		animate: false,
		range: "min",
		value: 0,
		min: 0,
		max: 1000,
		step: 1,

		//user starts sliding the bar
		start: function( event, ui ) {
			userIsSlidingPositionBar = true;
		},	

		// user stops sliding the bar
		stop: function( event, ui ) {
			userIsSlidingPositionBar = false;
			player.setPositionPercent(ui.value/1000.0);
		}
	});


	console.log("-- initialization complete");
})

// Page Control
///////////////////////////////////////////////////////////////////////////////

function getDefaultPageTitle()
{
	return "shuffle that shit!";
}

function hideLoader()
{
	$('.loader').fadeOut(750);
}

function showLoader(firstCall)
{
	document.title = getDefaultPageTitle();

	$('.loader').fadeIn(750);
	$('.player').fadeOut(firstCall ? 0 : 750);
	$('.user_comments').hide();
	$('.control_share').hide();
}

function showPlayer()
{
	$('.player').fadeIn(750);
	$('.user_comments').show();
	$('.user_comments').fadeOut(0);
	$('.control_share').show();
}

function showSharePanel()
{
	$('.share_container').fadeIn(500, function() {
		$('html').click(function() {
		    hideSharePanel();
		});
		$('.share_panel').click(function(event){
		    event.stopPropagation();
		});
	});

	$('#share_link').focus();
	$('#share_link').select();
}

function hideSharePanel()
{
	$('.share_container').fadeOut(500);
	$('.share_panel').unbind('click');
	$('html').unbind('click');
}

function transitionToPlayerMode() 
{
	console.log("-- transitioning to player mode");

	var transitionDuration = isMobileDevice ? 0 : 1000;

	var shuffleControlsDiv = $('.shuffle_controls');
	var bottomBarDiv = $('.bottom_bar');
	shuffleControlsDiv.animate({
		top: $(window).height() - shuffleControlsDiv.outerHeight() - bottomBarDiv.outerHeight()
	}, {
		duration:transitionDuration,
		complete:function() {
			var calcString = "calc(100% - "+ (shuffleControlsDiv.outerHeight() + bottomBarDiv.outerHeight()) +"px)";
			shuffleControlsDiv.css("top", calcString);
		}
	});

	var titleDiv = $('.page_title');
	titleDiv.animate({
		top: -titleDiv.outerHeight()
	}, {
		duration:transitionDuration,
		complete:function() {
			titleDiv.hide();
		}
	});
}

function fillPlaylistInputFromUrl()
{
	console.log("-- checking url for playlist");

	// First check for playlist param
	var playlistParam = getUrlParameter("playlist");
	if (playlistParam && playlistParam != "" && playlistParam != "null")
	{
		console.log("-- found playlist param", playlistParam);

		if (getUrlParameter("encoding") != "base64")
		{
			return false;
		}
		var playlistPermalink = atob(playlistParam);
		$('#url').val(playlistPermalink);
		if (!isMobileDevice)
		{
			loadPlaylistAndShuffle({
				playlistPermalink:playlistPermalink
			});
		}
		return true;
	}

	// Then check for playlist hash
	var hash = getUrlHash();
	if (hash && hash != "" && hash != "null")
	{
		var tokens = hash.split('/');
		console.log("-- Reading url hash", hash, tokens);
		if (!isMobileDevice)
		{
			loadPlaylistAndShuffle({
				playlistId:tokens[0],
				trackId:tokens[1]
			});
		}
		return true;
	}

	return false;
}

function fillPlaylistInputFromCookie()
{
	console.log("-- remembering last shuffled playlist");

	var lastPlaylist = getCookie(lastPlaylistCookieId)
	if (lastPlaylist != "")
	{
		$('#url').val(lastPlaylist);
		return true;
	}
	return false;
}

function onClickPlaylistInput()
{
	if (!defaultPlaylistInputText)
	{
		return;
	}

	defaultPlaylistInputText = false;
	var urlInputDiv = $(".url_input_box");
	urlInputDiv.css("color", "rgb(255, 173, 215)");
	urlInputDiv.val("");
}

function share()
{
	console.log("-- showing share panel");

	var shareUrl = window.location.href;
	$('#share_link').val(shareUrl);

	showSharePanel();
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
	$('.control_play').hide();
	$('.control_pause').show();
}

function pause()
{
	player.pause();
	$('.control_play').show();
	$('.control_pause').hide();
}

function next()
{
	player.next();
}

// Sound Cloud
///////////////////////////////////////////////////////////////////////////////


function initializePlayer()
{
	console.log("-- initializing player");

	player = new Player();

	player.onTrackLoaded = $.proxy(function() {
		var songInfoDiv = $('.song_info');
		var playerDiv = $('.player');
		var currentTrack = player.currentTrack;

		var songTitleLink = '<a target="_blank" href="'+currentTrack.permalink_url+'">'+currentTrack.title+'</a>';
		songInfoDiv.html(songTitleLink);

		var backgroundImageValue = "none";
		if (currentTrack.artwork_url)
		{
			var artwork_url = currentTrack.artwork_url.replace('large.jpg', 't500x500.jpg');
			backgroundImageValue = "url("+artwork_url+")";
		}
		playerDiv.css("background-image", backgroundImageValue);

		window.location.hash = player.playlist.id + "/" + currentTrack.id;

		var newUrl = 'http://'+window.location.host;
		newUrl += window.location.pathname.indexOf('/testing') == 0 ? '/testing/' : '/';
		newUrl += '#'+player.playlist.id + '/' + currentTrack.id;
		history.pushState({}, null, newUrl);
		document.title = currentTrack.title + " : " + getDefaultPageTitle();

		showPlayer();
	}, this);

	player.onPlaylistLoaded = $.proxy(function() {
		$('#url').val(player.playlist.permalink_url);
	}, this);

	player.onPlayPositionChanged = $.proxy(function() {
		if (userIsSlidingPositionBar) return;
		var slider = $('.slider');
		slider.slider( "value", player.getPositionPercent() * slider.slider("option", "max"));
	}, this);
}

function loadPlaylistAndShuffle(options)
{
	console.log("-- clicked shuffle playlist button", options);

	options = options || {};

	// If no playlist url was passed in, read it from the input box
	if (!options.playlistId && !options.playlistPermalink)
	{
		// Need valid URL
		if ($('#url').val() == "")
		{
			return;
		}

		// Get the playlist id from the permalink
	    options.playlistPermalink = $('#url').val();
		createCookie(lastPlaylistCookieId, options.playlistPermalink, 365);

		currentPlaylistPermalink = options.playlistPermalink;
	}

	// Show a cool loading screen
	showLoader();

	// Perform some animation on the first play
	if (firstPlay)
	{
		firstPlay = false;

		// Animate the shuffle controls down
		transitionToPlayerMode();
	}

	// Solve this in a more elegant way!
	var wasPlaying = player.playing;

	// Get a shuffled tracklist
	player.loadPlaylist(options, function() {
		player.shuffle();

		if (options.trackId)
		{
			player.jumpToTrack(options.trackId);
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