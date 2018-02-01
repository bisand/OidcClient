try
{
    document.getElementById('signin').addEventListener("click", signin, false);
    // document.getElementById('processSignin').addEventListener("click", processSigninResponse, false);
    // document.getElementById('signinDifferentCallback').addEventListener("click", signinDifferentCallback, false);
    document.getElementById('signout').addEventListener("click", signout, false);
    // document.getElementById('processSignout').addEventListener("click", processSignoutResponse, false);
    // document.getElementById('links').addEventListener('change', toggleLinks, false);
}
catch(e){
    alert(e);
}

log("Registered click events");

var settings = {
    identity_server_uri: 'http://vrswandbisst01/Retailsuite/IdentityServer/',
    client_id: 'rsscale',
    redirect_uri: 'http://vrswandbisst01/test/',
    post_logout_redirect_uri: 'http://vrswandbisst01/test/',
    response_type: 'id_token token',
    scope: 'openid'
};

var client = new OidcClient(settings);
var currentUser = null;
var currentResponse = null;

function signin() {
    client.createSigninRequest(function(url){
        user = {}
        window.location.href = url;
    }, function(error){
        alert(error);
    });
}

function signout(){
    var settings = {
        id_token_hint: currentResponse.id_token
    };
    client.createSignoutRequest(settings, function(url){
        log(url);
        window.location.href = url;
    }, function(error){
        log(error);
    })
}

client.processSigninResponse(function(response){
    currentResponse = response;
    var decoded = client.jwtDecode(response.id_token);
    log('Response: ' + JSON.stringify(response, null, 2) + '<br/>JWT: ' + JSON.stringify(decoded, null, 2));

}, function(error){
    log('ERROR: ' + error);
});
