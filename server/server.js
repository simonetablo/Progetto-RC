var express = require('express');
var bodyParser = require("body-parser");
var request = require('request');
const getEventFromDb = require('./middlewares/getEventFromDb');
const addEvent = require('./middlewares/addEvent')
const codeRequest = require('./middlewares/codeRequest')
const tokenRequest = require('./middlewares/tokenRequest')
const oAuthSet = require ('./middlewares/oAuthSet')


var app = express();
//app.use(express.static('app'));
app.use(bodyParser.urlencoded({ extended: false }));

var OpenTripMapKey = "5ae2e3f221c38a28845f05b6e8cfaa33e6a2f1fbe1d1350f053db399";

app.get('/', function(req, res){
  app.use(express.static('./app'));
  res.sendFile('./app/form.html', {root: __dirname});
});

app.post('/', function(req, res){
//  dati in req.body 
  console.log(req.body);
  
  res.sendFile('./app/index.html', {root: __dirname} )
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

app.post('/addpois', function(req, res){
  var data=JSON.parse(req.body.info);
  data.forEach(element => {
    console.log(element.id);
  });
});


var oAuth

app.get('/OAuth',oAuthSet, codeRequest,
    function (req,res){
        const oAuth2Client = req.params.oAuth2Client 
        app.get('/',
            function(req,res,next){
                req.params.oAuth2Client = oAuth2Client
                next()
            },
            tokenRequest,
            function(req,res){oAuth = req.params.oAuth2Client}
        )
    }
)

app.get('/add_event',getEventFromDb,function(req,res,next){
    req.params.oAuth2Client = oAuth
    next()
    },
    addEvent)



app.listen(3000);