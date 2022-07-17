const express = require("express");
const session = require("express-session");
const Expression = require('couchdb-expression')(session);
const request = require("request");
const cors = require("cors");
const path = require('path');
const amqp = require('amqplib/callback_api');
const http=require('http');
const socketio=require('socket.io');

const { v4: uuidv4 } = require('uuid');

const auth_routes = require('./routes/auth');
const api_routes = require('./routes/api');

const couchdb_setup = require('./couchdb_setup');
const postgres_setup = require('./postgres_setup');
const nodemailer = require('./nodemailer');

const postgres = require('./postgres');

const { google } = require('googleapis');
const couchdb = require("./couchdb");
const { OAuth2 } = google.auth
 

const PORT = 4000

const openTripMapKey = "5ae2e3f221c38a28845f05b6e8cfaa33e6a2f1fbe1d1350f053db399";
var openWeatherApiKey = 'd3099b58cf87b418252edf98f8b3a3fb'
var mapBoxAT="pk.eyJ1Ijoic2ltb25ldGFibG8iLCJhIjoiY2wzMXFvYW0xMDI0ZjNjb2ZmOGx5eWMzMSJ9.D_d2l01EuXlPcVxIdhaRww";

const clientSecret = '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'
const red_uri ='https://localhost:8083/red_uri'
const client_id = '610781105752-mf7lj82lmrcrbl8o5eostfrqvuoe4hl1.apps.googleusercontent.com'
//let googleLogin = false
//let token_used = false


var urlAmqp="amqp://rabbitmq:5672";

function server_start(){

    const app = express();
    app.use(cors({
      origin: "*"
  }));
    const server=http.createServer(app);
    const io=socketio(server);
    io.listen(server);

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

    io.on('connection', (socket)=>{

      amqp.connect(urlAmqp, function(error0, connection) {
          if (error0) {
            throw error0;
          }
          console.log("new WS connection...");

          socket.emit('message', 'webSocket connection estabilished')

          socket.on('consumer', message=>{
              console.log(message+" is ready to receive");
              rcvQueue=message;
              connection.createChannel(function(error1, rcvCh) {
                  if (error1) {
                      throw error1;
                  }
                      rcvCh.assertQueue(rcvQueue, {
                          durable: false
                      });
                  
                      console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", rcvQueue);
                  
                      rcvCh.consume(rcvQueue, function(msg) {
                          let string=msg.content.toString()
                          console.log(" [x] Received "+string+" from queue "+rcvQueue);
                          socket.emit('notification', string);
                      }, {
                          noAck: true
                      });
                  });
                socket.on('tripID', tripID=>{
                  console.log(message+" loaded "+tripID);
                  postgres.get_likes(tripID, message, (err, res)=>{
                    if(res.rowCount!=0){
                      socket.emit('liked', res.rowCount);
                    }
                  })
                  socket.emit('tripID received!');
                })
          })

          socket.on('like', msg=>{
              var sendQueue=msg.queue;              
              let msgToSend={tripID : msg.tripID, tripName : msg.tripName, fromUser : msg.from}
              var msgString=JSON.stringify(msgToSend);
              connection.createChannel(function(err1, likeCh) {
                  if (err1) {
                      throw err1;
                  }
                  likeCh.assertQueue(sendQueue, {
                      durable: false
                  });
                  likeCh.sendToQueue(sendQueue, Buffer.from(msgString), {persistent: true});
          
                  postgres.add_like(msg.tripID, msg.from, (err, res)=>{
                    if(err){
                      console.log(err);
                    }
                    else{
                      postgres.get_likes(msg.tripID, msg.from, (err1, res1)=>{
                        if(err){
                          console.log(err1);
                        }
                        else{
                          console.log(msg.from+" liked trip "+msg.tripName);
                        }
                      })
                    }
                  })
                  setTimeout(function() {
                      likeCh.close();
                  }, 1000);

              });
          })
          socket.on('unLike', msg=>{
              postgres.rmv_like(msg.tripID, msg.from, (err, res)=>{
                if(err){
                  console.log(err);
                }
                else{
                  postgres.get_likes(msg.tripID, msg.from, (err1, res1)=>{
                    if(err){
                      console.log(err1);
                    }
                    else{
                      console.log(msg.from+" unliked trip "+msg.tripName);
                    }
                  })
                }
              })
          })
          socket.on('disconnect', function(){
              console.log('user disconnected');
              connection.close();
          })
      });
  })

    app.get('/planner', (req, res) =>{
      
      console.log("connected!");

      if(!req.session.isAuth){
        res.redirect("/");
        return;
      }
      username = req.session.username;
      email = req.session.email;
      api_key = req.session.api_key;
      token = req.session.token;
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
    



    
    
    app.get('/OAuth',
    function(req,res){
      res.redirect("https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile&response_type=code&include_granted_scopes=true&state=state_parameter_passthrough_value&redirect_uri="+red_uri+"&client_id="+client_id);
    })
    
    app.get('/red_uri',
      function(req,res){
        var formData = {
          code: req.query.code,
          client_id: client_id,
          client_secret: clientSecret,
          redirect_uri: red_uri,
          grant_type: 'authorization_code'
        }
        request.post({url:'https://www.googleapis.com/oauth2/v4/token', form: formData}, function(error,response,body) {
          if (error) {
            console.error('upload failed:', err);
            res.redirect('/');
            return;
          }
          console.log('Upload successful!  Server responded with:');
          var info = JSON.parse(body);
          console.log(info)
          access_token = info.access_token;
          refresh_token = info.refresh_token;
          console.log("refresh token:");
          console.log(refresh_token);
          var options = {
            url : 'https://www.googleapis.com/oauth2/v2/userinfo?access_token='+access_token,
            headers :{
              'Authorization': 'Bearer '+ access_token
            }
          }
          request(options, function(error , response, body ){
            if(error == null && response.statusCode == 200){
              var info = JSON.parse(body)
              console.log("user info : \n")
              console.log(info)
              //res.body = info
              var api_key = uuidv4()
              db_input = {  
                username: info.email,
                email: info.email,
                api_key: api_key,
                verified: true
              }
              couchdb.put_document_in_database(info.email, "user_db", db_input, (error, response)=>{
                if(error){
                  console.log(error);
                  res.status(500).send('Internal Server Error');
                  return;
                }
                json_response = JSON.parse(response.body);
                req.session.username = info.name
                req.session.email = info.email
                req.session.isAuth = true
                req.session.token = access_token
                if(json_response.error){
                  couchdb.get_document_from_database(info.email, "user_db", (error, response)=>{
                    if(error){
                      console.log(error);
                      res.status(500).send('Internal Server Error');
                      return;
                    }
                    json_response = JSON.parse(response.body);
                    req.session.api_key = json_response.api_key
                    res.redirect('/');
                  })
                }
                else{
                  req.session.api_key = api_key;
                  res.redirect('/');
                }
              });
              
            }
            else if(response.statusCode==401){
              console.log("oauth statusCode==401");
              res.redirect('/');
            }
            else{
              console.log("error");
              res.redirect('/');
            }
          });
        })
      });
    
    app.post('/postOnCalendar',function(req,res){

      const oAuth2Client = new OAuth2(client_id, clientSecret, red_uri);
      oAuth2Client.setCredentials({access_token : req.session.token, refresh_token: null})
      const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })
      
        if (req.t_exp == true ){
          oAuth2Client.refreshAccessToken()
          console.log(oAuth2Client)
        }

        let success = false
        date = req.body.date
        let dateArr = date.split('-',3)
        console.log(dateArr)
        startHour = req.body.startH.split(':',2)
        endHour = req.body.endH.split(':',2)

        
        
        // Create a new event start date instance for temp uses in our calendar.
        const eventStartTime = new Date()
        eventStartTime.setFullYear(dateArr[0], dateArr[1] -1, dateArr[2])
        eventStartTime.setHours(startHour[0] - 2)
        eventStartTime.setMinutes(startHour[1])

        // Create a new event end date instance for temp uses in our calendar.
        const eventEndTime = new Date()
        eventEndTime.setFullYear(dateArr[0], dateArr[1] - 1, dateArr[2])
        eventEndTime.setHours(endHour[0] -2)
        eventEndTime.setMinutes(endHour[1])
        
        //eventEndTime.setMinutes(60)
        let event = { 
                      summary : 'Trip Planner reminder',
                      location : req.body.location,
                      start: {dateTime: eventStartTime },
                      end:{dateTime : eventEndTime}
        }
        calendar.freebusy.query(
          {
            resource: {
              timeMin: eventStartTime,
              timeMax: eventEndTime,
              items: [{ id: 'primary' }],
            },
          },
          (err, response) => { 
            // Check for errors in our query and log them if they exist.
            if (err) {  console.log("server.js: 493 - "+err)
                        if(err == 'Error: Invalid Credentials'){
                          res.send({invalidCredentials : true,event_posted:false})
                        }
                        return 
                      }
        
            // Create an array of all events on our calendar during that time.
            const eventArr = response.data.calendars.primary.busy
        
            // Check if event array is empty which means we are not busy
            if (eventArr.length === 0)
              // If we are not busy create a new calendar event.
              return calendar.events.insert(
                { calendarId: 'primary', resource: event },
                err => {
                  // Check for errors and log them if they exist.
                  if (err){ 
                    res.send({event_posted:false})
                    return console.error('Error Creating Calender Event:', err)
                  
                  }
                  // Else log that the event was created.
                  success = true
                  res.send({event_posted :true})
                  console.log('Calendar event successfully created.')
                  
                  return 
                  
                }
              )
        
            // If event array is not empty log that we are busy.
            res.send({busy:true,event_posted:false})
            return console.log(`Sorry I'm busy...`)
        
          }
      
        )

    })





    app.get('/isGoogleAuth',function(req,res){
      
      if (req.session.token != null  ){
        res.send({gAuth:true})
      }
      else {
        res.send({gAuth:false})
      }
    })


    //postgres.add_tuple_in_table("('randomid5', '43'),\n('randomid6', '43');", "itineraries", ()=>{});
    //postgres.display_table("itineraries");
    

    app.use(auth_routes);
    app.use(api_routes);

    app.use("/apidoc", express.static(__dirname + "/apidoc"));

    //app.listen(PORT, () => {console.log("listening for request")});
    server.listen(PORT, () => {console.log("listening for request")});
}


couchdb_setup(() => {
  postgres_setup(()=>{
    nodemailer.nodemailer_setup(server_start);
  });
});
