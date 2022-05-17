var express = require('express');
var bodyParser = require("body-parser");

var app = express();
app.use(express.static('app'));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res){
  res.sendFile('/app/index.html', {root: __dirname});
});

app.post('/data', function(req, res){
  var data = JSON.parse(req.body.info);
  console.log(data.name);
});

app.listen(3000);