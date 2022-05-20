module.exports = function(req,res,next){
    const request = require('request')

    var a_t = '';
    oAuth2Client = req.params.oAuth2Client
    //console.log(req.params.oAuth2Client)
    console.log("code taken");
    // res.send('the access token is: ' + req.query.code);
  
    var formData = {
      code: req.query.code,
      client_id: oAuth2Client._clientId,
      client_secret: oAuth2Client._clientSecret,
      redirect_uri: oAuth2Client.redirectUri,
      grant_type: 'authorization_code'
    }
  
  
    request.post({url:'https://www.googleapis.com/oauth2/v4/token', form: formData}, function optionalCallback(err, httpResponse, body) {
    if (err) {
      return console.error('upload failed:', err);
    }
    console.log('Upload successful!  Server responded with:', body);
    var info = JSON.parse(body);

    


    a_t = info.access_token;
    oAuth2Client.setCredentials({refresh_token: a_t,})
    res.redirect(/* add_event root */)
    
    
    
  });
  req.params.oAuth2Client = oAuth2Client
  
  next(); 
  };
  

