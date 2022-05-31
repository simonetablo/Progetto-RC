const express = require('express');
const request = require("request");
const { v4: uuidv4 } = require('uuid');


const router = express.Router();
const openTripMapKey = "5ae2e3f221c38a28845f05b6e8cfaa33e6a2f1fbe1d1350f053db399";

//API
router.get('/api/itineraries/', (req, res) => {
    query_string = req.query;
    tags = [];
    if(req.query.architecture) tags.push('"architecture"');
    if(req.query.cultural) tags.push('"cultural"');
    if(req.query.foods) tags.push('"foods"');
    if(req.query.hotel) tags.push('"hotel"');
    if(req.query.natural) tags.push('"natural"');
    if(req.query.religion) tags.push('"religion"');

    if(tags.length == 0){
        request({
            //url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/itineraries_db/_all_docs',
            url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/itineraries_db/_design/it_ddoc/_view/tag_view2',  
            method: 'GET',
            //headers: {'content-type': 'application/json'},
            //body: JSON.stringify({"keys": ["culture", "religion"]})
        }, function(error, response, body){
            if(error) {
                console.log(error);
            } else {
                json_data = JSON.parse(response.body)
                json_response = {data: json_data.rows};
                res.json(json_response);
                return
                
            }
        });
    }
    else{
    request({
        //url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/itineraries_db/_all_docs',
        url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/itineraries_db/_design/it_ddoc/_view/tag_view?key=['+tags+']',  
        method: 'GET',
        //headers: {'content-type': 'application/json'},
        //body: JSON.stringify({"keys": ["culture", "religion"]})
    }, function(error, response, body){
        if(error) {
            console.log(error);
        } else {
            json_data = JSON.parse(response.body)
            json_response = {data: json_data.rows};
            res.json(json_response);
            
        }
    });
}
});

//9e05514ac532e17115f7bf067a001a16




router.post('/api/itineraries', (req, res) => {
    tags = [];
    ids = [];
    for(const day of req.body.itinerary){
        for(const place of day.plan){
            ids.push(place.id)
        }
    }
    get_tags = (array) => {
        if(array.length == 0){
            //
            tags = tags.sort();
            data = req.body.itinerary;
            title = req.body.title;
            author = req.session.username;
            //
            id = uuidv4();
            itinerary = {
                title : title,
                author : author,
                data : data,
                tags : tags
            }
            //console.log(itinerary);
            request({
                url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/itineraries_db/' + id, 
                method: 'PUT',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify(itinerary)
            }, function(error, response, body){
                if(error) {
                    console.log(error);
                    res.status(500).send('error, itinerary database request');  //internal request error
                } else {
                    if(response.statusCode === 201){
                        //res.send('itinerary registered');  //username is valid, the user was successfully registered
                        res.status(200).send();
                    }
                    else{
                        //res.send('itinerary with this id already exists');  //user with same username already exists
                        res.status(500).send()
                    }
                }
            });
        }
        else{
            id = array.pop()
            request({
                url:"https://api.opentripmap.com/0.1/en/places/xid/"+id+"?apikey="+openTripMapKey,
                method: "GET",
              },
              function(error, response, body){
                  //console.log("ao?")
                  place_kinds = JSON.parse(response.body).kinds;
                  if(place_kinds.includes("architecture") && !tags.includes("architecture")) tags.push("architecture");
                  if(place_kinds.includes("cultural") && !tags.includes("cultural")) tags.push("cultural");
                  if(place_kinds.includes("foods") && !tags.includes("foods")) tags.push("foods");
                  if(place_kinds.includes("hotel") && !tags.includes("hotel")) tags.push("hotel");
                  if(place_kinds.includes("natural") && !tags.includes("natural")) tags.push("natural");
                  if(place_kinds.includes("religion") && !tags.includes("religion")) tags.push("religion");
                get_tags(array);
            });
        }
    };
    get_tags(ids);
});





router.get('/planner/id', (req, res) =>{
    query_json = req.query;
    id = query_json.id;
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
                        itinerary : itinerary_json,
                        names : names,
                        tags : tags
                    }
                    res.render('planner_nuovo', render_obj);
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
                            if(place_kinds.includes("museums")) tags.push("rgb(0, 168, 197)");
                            else if(place_kinds.includes("foods")) tags.push("rgb(158, 0, 34)");
                            else if(place_kinds.includes("religion")) tags.push("rgb(214, 180, 29)");
                            else if(place_kinds.includes("natural")) tags.push("rgb(11, 116, 28)");
                            else if(place_kinds.includes("architecture")) tags.push("rgb(123, 14, 138)");
                            else if(place_kinds.includes("accomodations")) tags.push("rgb(20, 18, 100)");
                            names.push(place_name)
                            get_info(array);
                        });
                    }
            };
            get_info(ids);
        }
    });

})

module.exports = router;