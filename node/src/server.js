const express = require("express");
const session = require("express-session");
const Expression = require('couchdb-expression')(session);
const request = require("request");
const cors = require("cors");
const path = require('path')
const amqp = require('amqplib/callback_api')

const auth_routes = require('./routes/auth');
const api_routes = require('./routes/api');

const PORT = 4000

const openTripMapKey = "5ae2e3f221c38a28845f05b6e8cfaa33e6a2f1fbe1d1350f053db399";
var openWeatherApiKey = 'd3099b58cf87b418252edf98f8b3a3fb'
var mapBoxAT="pk.eyJ1Ijoic2ltb25ldGFibG8iLCJhIjoiY2wzMXFvYW0xMDI0ZjNjb2ZmOGx5eWMzMSJ9.D_d2l01EuXlPcVxIdhaRww";

function server_start(){

    const app = express();
    app.use(cors({
        origin: "*"
    }));

    app.set("views", path.join(__dirname, "views"));
    app.set('view engine', 'ejs');

    app.use(express.json())
    app.use(express.urlencoded({ extended: true }));

    const store = new Expression({
        username: process.env.COUCHDB_USER,
        password: process.env.COUCHDB_PASSWORD,
        hostname: 'database',
        port: '5984',  
        database: 'sessions_db'
      });

    app.use(session({
        store: store,
        secret: process.env.SESSION_SECRET_KEY,
        resave: false,
        saveUninitialized: false
    }))


    app.get('/planner', (req, res) =>{
      if(!req.session.isAuth){
        res.redirect("/");
        return;
      }
      username = req.session.username,
      email = req.session.email
      query_json = req.query;
      id = query_json.id;
      if(typeof id == "undefined"){

        res.render("planner", {id : false});
        return
      }
      request({
          url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/itineraries_db/' + id,  
          method: 'GET',
      }, function(error, response, body){
          if(error) {
              console.log(error);
          } else {
              itinerary_json = JSON.parse(response.body);
              data = itinerary_json.data;
              if(typeof data == "undefined"){
                res.end();                          /// itinerary doesn't exist
                return;
              }
              ids = [];
              for(const day of data){
                  for(const place of day.plan){
                      ids.push(place.id)
                  }
              }
              data = [];
              tags=[];
              get_info = (array) => {
                  if(array.length == 0){
                    console.log(data)
                    console.log(tags)
                      render_obj = {
                          id : true,
                          itinerary : itinerary_json,
                          data : data,
                          tags : tags,
                          username : username,
                          email : email
                      }
                      res.render('planner', render_obj);
                  }
                  else{
                      id = array.pop()
                      request({
                          url:"https://api.opentripmap.com/0.1/en/places/xid/"+id+"?apikey="+openTripMapKey,
                          method: "GET",
                        },
                          function(error, response, body){
                              place_json = JSON.parse(response.body)
                              place_kinds = place_json.kinds;
                              if(place_kinds.includes("museums")) tags.push("#d63384");
                              else if(place_kinds.includes("foods")) tags.push("#33d6c9");
                              else if(place_kinds.includes("religion")) tags.push("#6610f2");
                              else if(place_kinds.includes("natural")) tags.push("#20c953");
                              else if(place_kinds.includes("architecture")) tags.push("#0d6efd");
                              else if(place_kinds.includes("accomodations")) tags.push("#fd7e14");
                              data.push(place_json)
                              get_info(array);
                        });
                    }
                };
            get_info(ids);
            }
        });
    })
    app.get('/search', function(req, res){
        var data=req.query.name;
        console.log(data);
        request({
            url:"https://api.mapbox.com/geocoding/v5/mapbox.places/"+data+".json?access_token="+mapBoxAT,
            method: "GET",
          },
          function(error,response,body){
            if(error){
              console.log(error)
            }
            else if(!error && response.statusCode==200){
              res.send(JSON.parse(body))
              console.log("send")
            }
        })
    });



    app.post('/addpois', function(req, res){
        var data=JSON.parse(req.body.info);
        res.end();
      });

    app.post("/weather", function(req,res,next){
      var data = JSON.parse(req.body.info);
        let lat = data.lat;
        let lon = data.lon;
        let url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=hourly,minutely&units=metric&appid=${openWeatherApiKey}`
        request({
          url:url,
          method:"GET"
        },
        function(error,response,body){
          if(error){
            console.log(error)
          }
          else if(!error && response.statusCode==200){
            res.send(JSON.parse(body))
          }
        })
      })

    app.get('/form', (req, res) => {
        render_object = {
            'authenticated' : req.session.isAuth,
            'username' : req.session.username,
            'email' : req.session.email
        }
        if(req.session.isAuth){
            res.render('form', render_object);
        }else{
            res.redirect("/");
        }
    });

    app.get('/', (req, res) => {
        render_object = {
            'authenticated' : req.session.isAuth,
            'username' : req.session.username,
            'email' : req.session.email
        }
        res.render('home', render_object);
    });

    app.post('/', (req, res) => {
        loc = req.body.localita
        inizio_viaggio=Date.parse(req.body.inizio_viaggio);
        fine_viaggio=Date.parse(req.body.fine_viaggio);
        request({
          url:"https://api.opentripmap.com/0.1/en/places/geoname?name="+loc+"&apikey="+openTripMapKey,
          method: "GET",
        },
        function(error, response, body){
          if(error) {
            console.log(error);
          } else if (!error && response.statusCode==200){
            info = JSON.parse(body);
            ejs_json = { lat: info.lat, lon: info.lon, inizio_viaggio, fine_viaggio, username: "test_username"}
            res.render('planner', ejs_json);
          }
        })
    });

    app.post('/poinfo', function(req, res){
        var data = JSON.parse(req.body.info);
        request({
          url:"https://api.opentripmap.com/0.1/en/places/xid/"+data.id+"?apikey="+openTripMapKey,
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

    app.post('/like', function(req, res){
        var queue1=req.body.queue;
        var trip=req.body.trip;
        var url="amqp://172.21.0.2:5672";
        amqp.connect(url, function(err, conn) {
          if (err) {
              throw err;
          }
          conn.createChannel(function(err1, channel) {
              if (err1) {
                  throw err1;
              }
            
              channel.assertQueue(queue1, {
                  durable: false
              });
              channel.sendToQueue(queue1, Buffer.from(trip));
            
              console.log(" [x] Sent "+trip+" to queue "+queue1);
          });
        });
        res.send("like ok")    
    });

    app.post('/checkmsg', function(req, res){
      var queue=req.body.queue
      amqp.connect('amqp://172.21.0.2:5672', function(error0, connection) {
            if (error0) {
                throw error0;
            }
            connection.createChannel(function(error1, channel) {
                if (error1) {
                    throw error1;
                }
            
                channel.assertQueue(queue, {
                    durable: false
                });
            
                console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queue);
            
                channel.consume(queue, function(msg) {
                    console.log(" [x] Received "+msg.content.toString()+" from queue "+queue);
                }, {
                    noAck: true
                });
            });
        });
        res.send("check ok");
    })

    app.use(auth_routes);
    app.use(api_routes);

    app.listen(PORT, () => {console.log("listening for request")});
}


request(
    {
        url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/user_db', 
        method: 'PUT'
    }, 
    (error, response, body) => {
        if(error) {
            console.log(error); //error creating user_db
        } else {
            //user_db created successfully or already existing
            request(
                {
                    url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/sessions_db', 
                    method: 'PUT',
                }, 
                (error, response, body) => {
                    if(error) {
                        console.log(error); //error creating sessions_db
                    } else {
                        //sessions_db created successfully or already existing
                        request(
                            {
                                url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/itineraries_db', 
                                method: 'PUT'
                            }, 
                            (error, response, body) => {
                                if(error) {
                                    console.log(error); //error creating sessions_db
                                } else {
                                    //sessions_db created successfully or already existing
                                    //create view
                                    request(
                                        {
                                            url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/itineraries_db/_design/it_ddoc', 
                                            method: 'PUT',
                                            body: JSON.stringify({
                                                "views": {
                                                    "tag_view": {
                                                        "map": "function(doc) { \n\
                                                            if (doc.tags == []) return; \n\
                                                            var emit_sequence = function(base, disp) { \n\
                                                              if (disp.length > 1) {\n\
                                                                emit(base.concat(disp[0]), {'title' : doc.title, 'author' :doc.author, 'tags': doc.tags});\n\
                                                                emit_sequence(base.concat(disp[0]), disp.slice(1, disp.length));\n\
                                                                emit_sequence(base, disp.slice(1, disp.length));\n\
                                                              } else if (disp.length == 1) {\n\
                                                                emit(base.concat(disp[0]), {'title' : doc.title, 'author' :doc.author, 'tags': doc.tags});\n\
                                                              }\n\
                                                            }\n\
                                                            emit_sequence([], doc.tags);\n\
                                                        }"
                                                    },
                                                    "tag_view2": {
                                                        "map": "function(doc) { \n\
                                                            emit(doc._id, {'title' : doc.title, 'author' :doc.author, 'tags': doc.tags});\n\
                                                        }"
                                                    }
                                                }
                                            })
                                        }, 
                                        (error, response, body) => {
                                            if(error) {
                                                console.log(error); //error creating tag_view
                                            } else {
                                                //tag_view created
                                                
                                                server_start();
                                                
                                            }
                                        }
                                    );
                                }
                            }
                        );
                    }
                }
            );
        }
    }
);