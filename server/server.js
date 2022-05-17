var express = require('express');
var bodyParser = require("body-parser");
var request = require('request');

var app = express();
app.use(express.static('app'));
app.use(bodyParser.urlencoded({ extended: false }));

var OpenTripMapKey = "5ae2e3f221c38a28845f05b6e8cfaa33e6a2f1fbe1d1350f053db399";

app.get('/', function(req, res){
  res.sendFile('/app/index.html', {root: __dirname});
});

app.post('/poinfo', function(req, res){
  var data = JSON.parse(req.body.info);
  console.log(data.name);
  request({
    url:"https://api.opentripmap.com/0.1/en/places/xid/"+data.id+"?apikey="+OpenTripMapKey,
    method: "GET",
  },
  function(error, response, body){
    if(error) {
      console.log(error);
    } else if (!error && response.statusCode==200){
      res.send(body);
    }
  })
});

app.listen(3000);