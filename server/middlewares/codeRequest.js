module.exports = function(req, res, next){
    oAuth2Client = req.params.oAuth2Client
    res.redirect("https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/calendar&response_type=code&include_granted_scopes=true&state=state_parameter_passthrough_value&redirect_uri="+oAuth2Client.redirectUri+"&client_id="+oAuth2Client._clientId);
    next()
}