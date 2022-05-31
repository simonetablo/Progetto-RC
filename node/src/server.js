const express = require("express");
const session = require("express-session");
const Expression = require('couchdb-expression')(session);
const request = require("request");
const cors = require("cors");
const path = require('path')

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
    //app.use(express.static(file da serivre))
    
    //app.set('views', 'myviews');
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
        res.end();
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
          //url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/itineraries_db/_all_docs',
          url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/itineraries_db/' + id,  
          method: 'GET',
          //headers: {'content-type': 'application/json'},
          //body: JSON.stringify({"keys": ["culture", "religion"]})
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
              names = [];
              tags = [];
              get_info = (array) => {
                  if(array.length == 0){
                      //console.log(names);
                      //console.log(tags);
                      render_obj = {
                          id : true,
                          itinerary : itinerary_json,
                          names : names,
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
                              //console.log("ao?")
                              //console.log(response.body);
                              place_json = JSON.parse(response.body)
                              place_kinds = place_json.kinds;
                              place_name = place_json.name;
                              if(place_kinds.includes("museums")) tags.push("#d63384");
                              else if(place_kinds.includes("foods")) tags.push("#33d6c9");
                              else if(place_kinds.includes("religion")) tags.push("#6610f2");
                              else if(place_kinds.includes("natural")) tags.push("#20c953");
                              else if(place_kinds.includes("architecture")) tags.push("#0d6efd");
                              else if(place_kinds.includes("accomodations")) tags.push("#fd7e14");
                              names.push(place_name)
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
        //console.log(data);
        res.end();
      });

    app.get("/weather", function(req,res,next){
        lat = 0;
        lon = 0;
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
            res.render('home', render_object)
        }
    });

    app.get('/', (req, res) => {
        render_object = {
            'authenticated' : req.session.isAuth,
            'username' : req.session.username,
            'email' : req.session.email
        }
        //if(req.session.isAuth){
        //    //res.send('content: you are logged in as '+ req.session.username);   //user is authenticated, show protected content
        //    res.render('index', {username : req.session.username});
        //}else{
        //    res.send('you are not authenticated, protected content');  //user is not authenticated, cant show protected content
        //}
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
            //console.log(ejs_json)
            res.render('planner', ejs_json);
          }
        })
    });

    app.post('/poinfo', function(req, res){
        var data = JSON.parse(req.body.info);
        //console.log(data.id);
        request({
          url:"https://api.opentripmap.com/0.1/en/places/xid/"+data.id+"?apikey="+openTripMapKey,
          method: "GET",
        },
        function(error, response, body){
          if(error) {
            console.log(error);
          } else if (!error && response.statusCode==200){
              //console.log(body)
            res.send(body);
          }
        })
      });

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
            //console.log(response.body);  //user_db created successfully or already existing
            request(
                {
                    url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/sessions_db', 
                    method: 'PUT',
                }, 
                (error, response, body) => {
                    if(error) {
                        console.log(error); //error creating sessions_db
                    } else {
                        console.log(response.body); //sessions_db created successfully or already existing
                        request(
                            {
                                url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/itineraries_db', 
                                method: 'PUT'
                            }, 
                            (error, response, body) => {
                                if(error) {
                                    console.log(error); //error creating sessions_db
                                } else {
                                    console.log(response.body); //sessions_db created successfully or already existing
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
                                                console.log(response.body); //tag_view created
                                                
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