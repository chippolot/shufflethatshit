
function assert(condition, message) 
{
    if (!condition) 
    {
        throw message || "Assertion failed";
    }
}

function getUrlParameter(name) 
{
    var param = decodeURI(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    );
    return stringNotEmpty(param) ? param : null;
}

function getUrlHash() 
{
    var hash = $(location).attr('hash').substring(1);
    return stringNotEmpty(hash) ? hash : null;
}

function stripTrailingSlash(str) 
{
    if(str.substr(-1) == '/') {
        return str.substr(0, str.length - 1);
    }
    return str;
}

function stringNotEmpty(str)
{
    return str && str != "" && str != "null";
}

function wrap(x, m) 
{
    return (x%m + m)%m;
}

function createCookie(cookieId, value, days) 
{
    var expires;
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    }
    else {
        expires = "";
    }
    console.log("Saving cookie: ", cookieId, value);
    document.cookie = cookieId + "=" + value + expires + "; path=/";
}

function getCookie(cookieId) 
{
    console.log("-- reading cookie: ", cookieId);
    if (document.cookie.length > 0) {
        c_start = document.cookie.indexOf(cookieId + "=");
        if (c_start != -1) {
            c_start = c_start + cookieId.length + 1;
            c_end = document.cookie.indexOf(";", c_start);
            if (c_end == -1) {
                c_end = document.cookie.length;
            }
			console.log("Found cookie: ", cookieId, unescape(document.cookie.substring(c_start, c_end)));
            return unescape(document.cookie.substring(c_start, c_end));
        }
    }
    return "";
}