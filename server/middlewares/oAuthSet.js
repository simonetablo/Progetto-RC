module.exports = function (req, res,  next){

    
    const { google } = require('googleapis')
    const { OAuth2 } = google.auth
    const fs = require('fs');
    const { json } = require('express/lib/response');
    let rawdata = fs.readFileSync( /*directory del client secret*/ ); 
    let sec = JSON.parse(rawdata);

    console.log(sec);
    redirectUri = sec.web.redirect_uris[0];
    // oAuth client data set
    const oAuth2Client = new OAuth2(
    sec.web.client_id ,sec.web.client_secret, redirectUri
  )

    req.params.oAuth2Client = oAuth2Client
    next()

}