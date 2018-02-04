var OidcClient = function(settings, initComplete) {
    var self = new Object();
    if (!settings) {
        throw new Error("Required parameter settings is not defined.");
        return self;
    }

    var self = this;
    self.settings = settings;
    self.jwtDecode = _parseJwt;
    self.openIdConfig = {};

    self.init = function(resolve, reject) {
        if (!self.settings.authority) {
            throw new Error("Required settings property authority is not defined.");
        }
        _getOidConfig(
            function(response) {
                self.openIdConfig = JSON.parse(response);
                if (resolve) {
                    resolve(self.openIdConfig);
                }
            },
            function(error) {
                if (reject) {
                    reject(error);
                } else {
                    throw new Error("An error occurred while contacting identityServer: " + error);
                }
            }
        );
    };

    self.createSigninRequest = function(resolve, reject) {
        try {
            if (!self.openIdConfig.authorization_endpoint) {
                self.init(
                    null,
                    function() {
                        return _createSigninRequest(resolve, reject);
                    },
                    function(error) {
                        if (reject) {
                            reject(error);
                        }
                    }
                );
                return null;
            }
            return _createSigninRequest(resolve, reject);
        } catch (error) {
            if (reject) {
                reject(error);
            }
        }
        return null;
    };

    self.processSigninResponse = function(resolve, reject) {
        try {
            var response = _processResponse();
            if (!response) {
                if (reject) {
                    reject("Tokens not found.");
                }
                return;
            }
            if (resolve) {
                resolve(response);
            }
        } catch (error) {
            if (reject) {
                reject(error);
            }
        }
    };

    self.createSignoutRequest = function(settings, resolve, reject) {
        try {
            if (!self.openIdConfig.end_session_endpoint) {
                self.init(
                    null,
                    function() {
                        return _createSignoutRequest(settings, resolve, reject);
                    },
                    function(error) {
                        if (reject) {
                            reject(error);
                        }
                    }
                );
                return null;
            }
            return _createSignoutRequest(settings, resolve, reject);
        } catch (error) {
            if (reject) {
                reject(error);
            }
        }
        return null;
    };

    self.ajaxGet = function(url, resolve, reject, asyncCall) {
        if (asyncCall === undefined) {
            asyncCall = true;
        }
        try {
            var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
            xhr.open("GET", url, asyncCall);
            xhr.onreadystatechange = function() {
                if (xhr.readyState > 3 && xhr.status == 200) {
                    if (resolve) {
                        resolve(xhr.responseText);
                    }
                } else if (xhr.status != 200) {
                    if (reject) {
                        reject(xhr.responseText);
                    }
                }
            };
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            if (asyncCall) {
                xhr.timeout = 30000; // Set timeout to 30 seconds (30000 milliseconds)
                xhr.ontimeout = function() {
                    if (reject) {
                        reject("Request timed out.");
                    }
                };
            }
            xhr.send();
            return xhr;
        } catch (error) {
            if (reject) {
                reject(error);
            }
        }
    };

    /////////////////////////////////////////////
    // Private functions
    /////////////////////////////////////////////
    function _getOidConfig(resolve, reject) {
        self.ajaxGet(
            self.settings.authority + ".well-known/openid-configuration",
            function(response) {
                if (resolve) {
                    resolve(response);
                }
            },
            function(error) {
                if (reject) {
                    reject(error);
                }
            },
            true
        );
    }
    self.init(initComplete);

    function _createSigninRequest(resolve, reject) {
        try {
            if (!self.openIdConfig.authorization_endpoint) {
                var errorMessage =
                    "The property authorization_endpoint is undefined. Please make sure the initialization process has been executed before calling this method.";
                if (reject) {
                    reject(errorMessage);
                } else {
                    throw new Error(errorMessage);
                }
                return;
            }
            var authorizationUrl = self.openIdConfig.authorization_endpoint;

            var params = self.settings;
            (params.state = Date.now() + "" + Math.random()), (params.nonce = Date.now() + "" + Math.random());

            var serializedParams = _serializeParams(params);
            var url = authorizationUrl + "?" + serializedParams;
            if (resolve) {
                resolve(url);
            }
            return url;
        } catch (error) {
            if (reject) {
                reject(error);
            }
        }
        return null;
    }

    function _createSignoutRequest(settings, resolve, reject) {
        try {
            if (!settings && !settings.id_token_hint) {
                if (reject) {
                    reject("Required property id_token_hint is missing.");
                } else {
                    throw new Error(errorMessage);
                }
                return;
            }
            if (!self.openIdConfig.end_session_endpoint) {
                var errorMessage =
                    "The property end_session_endpoint is undefined. Please make sure the initialization process has been executed before calling this method.";
                if (reject) {
                    reject(errorMessage);
                } else {
                    throw new Error(errorMessage);
                }
                return;
            }
            var endSessionUrl = self.openIdConfig.end_session_endpoint;
            var post_logout_redirect_uri = settings.post_logout_redirect_uri
                ? settings.post_logout_redirect_uri
                : self.settings.post_logout_redirect_uri;
            var url =
                endSessionUrl +
                "?id_token_hint=" +
                settings.id_token_hint +
                "&post_logout_redirect_uri=" +
                post_logout_redirect_uri;
            if (resolve) {
                resolve(url);
            }
        } catch (error) {
            if (reject) {
                reject(error);
            }
        }
    }

    function _serializeParams(params) {
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

    function _processResponse() {
        var queryPos = window.location.href.indexOf("?") + 1;
        if (queryPos < 0) {
            queryPos = window.location.href.indexOf("#") + 1;
            if (queryPos < 0) {
                return null;
            }
        }
        var res = window.location.href.substr(queryPos);
        var result = res.split("&").reduce(function(result, item) {
            var parts = item.split("=");
            result[parts[0]] = parts[1];
            return result;
        }, {});

        if (!result.error) {
            if (result.id_token) {
                result.id_token_object = _parseJwt(result.id_token);
            }
            if (result.access_token) {
                result.access_token_object = _parseJwt(result.access_token);
            }
            return result;
        }
        return null;
    }

    function _processToken(tokenType) {
        var queryPos = window.location.href.indexOf("?") + 1;
        if (queryPos < 0) {
            queryPos = window.location.href.indexOf("#") + 1;
            if (queryPos < 0) {
                return null;
            }
        }
        var res = window.location.href.substr(queryPos);
        var result = res.split("&").reduce(function(result, item) {
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
    function _parseJwt(token) {
        if (!token) {
            return null;
        }
        var base64Url = token.split(".")[1];
        var base64 = base64Url.replace("-", "+").replace("_", "/");
        return JSON.parse(window.atob(base64));
    }

    return self;
};
