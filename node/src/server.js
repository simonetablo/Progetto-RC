const express = require("express");
const session = require("express-session");
const Expression = require('couchdb-expression')(session);
const request = require("request");
const cors = require("cors");
const path = require('path')

const auth_routes = require('./routes/auth');
const api_routes = require('./routes/api');

const couchdb_setup = require('./couchdb_setup');
const postgres_setup = require('./postgres_setup');
const nodemailer = require('./nodemailer');

const postgres = require('./postgres');



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
        res.redirect("/");
        return;
      }
      username = req.session.username;
      email = req.session.email;
      api_key = req.session.api_key;
      query_json = req.query;
      id = query_json.id;
      if(typeof id == "undefined"){
        res.render("planner", {id : false});
        return
      }
      postgres.get_itinerary_data(id, function(error, response){
          if(error) {
              console.log(error);
          } else {
              //console.log(response)
              //itinerary_json = JSON.parse(response.body);
              //response.rows.data;
              itinerary_data = JSON.parse(response.rows[0].data);
              if(typeof itinerary_data == "undefined"){
                res.end();                          /// itinerary doesn't exist
                return;
              }
              ids = [];
              for(const day of itinerary_data){
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
                    console.log(api_key)
                      render_obj = {
                          id : true,
                          itinerary_data : itinerary_data,
                          data : data,
                          tags : tags,
                          username : username,
                          email : email,
                          api_key : api_key
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
            'email' : req.session.email,
            'api_key' : req.session.api_key
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
            'email' : req.session.email,
            'api_key' : req.session.api_key
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

    //postgres.add_tuple_in_table("('randomid5', '43'),\n('randomid6', '43');", "itineraries", ()=>{});
    //postgres.display_table("itineraries");
    

    app.use(auth_routes);
    app.use(api_routes);

    app.use("/apidoc", express.static(__dirname + "/apidoc"));

    app.listen(PORT, () => {console.log("listening for request")});
}


couchdb_setup(() => {
  postgres_setup(()=>{
    nodemailer.nodemailer_setup(server_start);
  });
});