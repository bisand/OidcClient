var OidcClient = function(settings) {
    var self = this;
    self.settings = settings;
    self.jwtDecode = parseJwt;

    self.createSigninRequest = function(resolve, reject) {
        try {
            var authorizationUrl =
                settings.identity_server_uri + "connect/authorize";

            var params = {
                client_id: settings.client_id,
                redirect_uri: settings.redirect_uri,
                post_logout_redirect_uri: settings.post_logout_redirect_uri,
                response_type: settings.response_type,
                scope: settings.scope,
                state: Date.now() + "" + Math.random(),
                nonce: Date.now() + "" + Math.random()
            };

            var serializedParams = serializeParams(params);
            var url = authorizationUrl + "?" + serializedParams;
            resolve(url);
        } catch (error) {
            reject(error);
        }
    };

    self.ajaxGet = function(url, resolve, reject) {
        try {
            var xhr = window.XMLHttpRequest
                ? new XMLHttpRequest()
                : new ActiveXObject("Microsoft.XMLHTTP");
            xhr.open("GET", url);
            xhr.onreadystatechange = function() {
                if (xhr.readyState > 3 && xhr.status == 200) {
                    resolve(xhr.responseText);
                } else {
                    reject(xhr.responseText);
                }
            };
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            xhr.send();
            return xhr;
        } catch (error) {
            reject(error);
        }
    };

    self.processSigninResponse = function(resolve, reject) {
        try {
            var response = processResponse();
            if (!response) {
                reject("Tokens not found.");
                return;
            }
            resolve(response);
        } catch (error) {
            reject(error);
        }
    };

    self.createSignoutRequest = function(settings, resolve, reject){
        if(!settings && !settings.id_token_hint){
            reject('Required property id_token_hint is missing.');
            return;
        }
        endSessionUrl = self.settings.identity_server_uri + 'connect/endsession';
        var post_logout_redirect_uri = settings.post_logout_redirect_uri ? settings.post_logout_redirect_uri : self.settings.post_logout_redirect_uri;
        var url = endSessionUrl + '?id_token_hint=' + settings.id_token_hint + '&post_logout_redirect_uri=' + post_logout_redirect_uri;
        resolve(url);
    };

    return self;

    /////////////////////////////////////////////
    // Private functions
    /////////////////////////////////////////////
    function serializeParams(params) {
        if (!params) {
            return "";
        }

        var result = "";
        var first = true;

        var propertyNames = Object.getOwnPropertyNames(params);

        for (var i = 0; i < propertyNames.length; i++) {
            var propertyName = propertyNames[i];
            var element = params[propertyName];
            if (!first) {
                result = result + "&";
            }
            result = result + propertyName + "=" + encodeURIComponent(element);
            first = false;
        }
        return result;
    }

    function processResponse() {
        var hashPos = window.location.hash.indexOf("#") + 1;
        if(hashPos < 0){
            return null;
        }
        var hash = window.location.hash.substr(hashPos);
        var result = hash.split("&").reduce(function(result, item) {
            var parts = item.split("=");
            result[parts[0]] = parts[1];
            return result;
        }, {});

        if (!result.error) {
            return result;
        }
        return null;
    }

    function processToken(tokenType) {
        var hashPos = window.location.hash.indexOf(tokenType);
        if(hashPos < 0){
            return null;
        }
        var hash = window.location.hash.substr(hashPos);
        var result = hash.split("&").reduce(function(result, item) {
            var parts = item.split("=");
            result[parts[0]] = parts[1];
            return result;
        }, {});

        if (!result.error) {
            return result[tokenType];
        }
        return null;
    }

    //this is used to parse base64
    function parseJwt (token) {
        if(!token){
            return null;
        }
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace('-', '+').replace('_', '/');
        return JSON.parse(window.atob(base64));
    }
};
