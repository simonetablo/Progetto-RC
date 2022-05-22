const express = require("express");
const session = require("express-session");
const Expression = require('couchdb-expression')(session);
const request = require("request");
const path = require('path')

const auth_routes = require('./routes/auth');
const api_routes = require('./routes/api');

const PORT = 4000

const openTripMapKey = "5ae2e3f221c38a28845f05b6e8cfaa33e6a2f1fbe1d1350f053db399";

function server_start(){

    const app = express();
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

    app.get('/', (req, res) => {
        //if(req.session.isAuth){
        //    //res.send('content: you are logged in as '+ req.session.username);   //user is authenticated, show protected content
        //    res.render('index', {username : req.session.username});
        //}else{
        //    res.send('you are not authenticated, protected content');  //user is not authenticated, cant show protected content
        //}
        res.render('form', {username : "test_username"});
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
            console.log(ejs_json)
            res.render('planner', ejs_json);
          }
        })
    });

    app.post('/poinfo', function(req, res){
        var data = JSON.parse(req.body.info);
        console.log(data.name);
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
            console.log(response.body);  //user_db created successfully or already existing
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
                                                                emit(base.concat(disp[0]), 1);\n\
                                                                emit_sequence(base.concat(disp[0]), disp.slice(1, disp.length));\n\
                                                                emit_sequence(base, disp.slice(1, disp.length));\n\
                                                              } else if (disp.length == 1) {\n\
                                                                emit(base.concat(disp[0]), 1);\n\
                                                              }\n\
                                                            }\n\
                                                            emit_sequence([], doc.tags);\n\
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