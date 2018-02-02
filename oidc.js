var OidcClient = function(settings) {
    var self = new Object();
    if (!settings) {
        throw new Error("Required parameter settings is not defined.");
        return self;
    }

    var self = this;
    self.settings = settings;
    self.jwtDecode = _parseJwt;
    self.openIdConfig = {};

    self.init = function(initSettings, resolve, reject) {
        if (initSettings) {
            self.settings = initSettings;
        }
        if (!self.settings.identity_server_uri) {
            throw new Error("Required settings property identity_server_uri is not defined.");
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
    function _getOidConfig(resolve, reject) {
        self.ajaxGet(
            self.settings.identity_server_uri + ".well-known/openid-configuration",
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
        var hashPos = window.location.hash.indexOf("#") + 1;
        if (hashPos < 0) {
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

    function _processToken(tokenType) {
        var hashPos = window.location.hash.indexOf(tokenType);
        if (hashPos < 0) {
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
    function _parseJwt(token) {
        if (!token) {
            return null;
        }
        var base64Url = token.split(".")[1];
        var base64 = base64Url.replace("-", "+").replace("_", "/");
        return JSON.parse(window.atob(base64));
    }

    self.init();
    return self;
};
