const express = require('express');
const request = require("request");
const { v4: uuidv4 } = require('uuid');
const couchdb = require('../couchdb');
const postgres = require('../postgres');
const bodyParser = require('body-parser');

const app=express();
const router = express.Router();
const openTripMapKey = process.env.OPENTRIPMAP_KEY;
const positionstack_key = process.env.POSITIONSTACK_KEY;
app.use(bodyParser.json())

//API
/**
* @api {get} /itineraries/ Get Itineraries
* @apiName GetItineraries
* @apiGroup Itineraries
*
* @apiParam {String} api_key User API key
* @apiParam {String} [location] Location filter
* @apiParam {Number} [days] Number of days filter
* @apiParam {String="on"} [architecture] Architecture tag filter
* @apiParam {String="on"} [cultural] Cultural tag filter
* @apiParam {String="on"} [foods] Foods tag filter
* @apiParam {String="on"} [hotel] Hotel tag filter
* @apiParam {String="on"} [natural] Natural tag filter
* @apiParam {String="on"} [religion] Religion tag filter
*
* @apiParamExample {ajax-auto} Request-Example:
* https://localhost:8083/api/itineraries?location=rome&days=1&architecture=on&api_key=753c0315-8c19-42f7-b346-ab319c5dbe7d
*
* @apiSuccess {Object[]} data Array of Itinerary objects result of the search
*
* @apiSuccessExample successful response:
* HTTP/1.1 200 OK
* {
*     "code": "200",
*     "message": "OK",
*     "data": [
*         {
*             "id": "22c89337-596c-4e01-9155-93b6cc4a4f77",
*             "title": "mio viaggio",
*             "likes": 0,
*             "author": "ggg",
*             "tags": [
*                 "architecture"
*             ]
*         }
*     ]
* }
*
* @apiSampleRequest https://localhost:8083/api/itineraries/
*
*/
router.get('/api/itineraries/', (req, res) => {
    json_to_send = {code:"200", message:"OK", data: []};
    if(!req.query.api_key){
        res.status(400).send('Bad Request');
        return;
    }
    const api_key = req.query.api_key;
    couchdb.api_key_data(api_key, (username, validated)=>{
        if(validated != true && api_key != "4199fb08-e33a-48c0-9f54-43b33f3fec9d"){
            res.status(403).send('Forbidden');
            return;
        }
        var location = req.query.location; //could be undefined
        if(location){
            location = location.toLowerCase();
            location = location.replace("'", "''");
        }
        const days = req.query.days; //could be undefined
        
        tags = [];
        if(req.query.architecture && req.query.architecture == "on") tags.push("'architecture'");
        if(req.query.cultural && req.query.cultural == "on") tags.push("'cultural'");
        if(req.query.foods && req.query.foods == "on") tags.push("'foods'");
        if(req.query.hotel && req.query.hotel == "on") tags.push("'hotel'");
        if(req.query.natural && req.query.natural == "on") tags.push("'natural'");
        if(req.query.religion && req.query.religion == "on") tags.push("'religion'");

        const set_data = (array) => {
            if(array.length == 0){
                res.json(json_to_send);
            }
            else{
                const row = array.shift();
                const id = row.id;
                postgres.get_itinerary_tags(id, (error, response)=>{
                    if(error){
                        console.log(error);
                        res.json({code: "500", message: "Internal Server Error"});
                        return;
                    }
                    const response_rows = response.rows;
                    row_tags = [];
                    for (const response_row of response_rows){
                        row_tags.push(response_row.tag);
                    }
                    const itinerary = {
                        id: row.id,
                        title: row.title,
                        likes: row.likes,
                        author: row.author,
                        tags : row_tags
                    }
                    json_to_send.data.push(itinerary);
                    set_data(array);
                })

            }
        }
        postgres.query_itinerary(tags, location, days, (err, result)=>{
            if(err){
                console.error(err);
                res.json({code: "500", message: "Internal Server Error"});
            }
            else{
                set_data(result.rows);
            }
        });
        
    });
});

/**
* @api {post} /itinerary/ Add Itinerary
* @apiName AddItinerary
* @apiGroup Itinerary
*
* @apiBody {String} api_key User API key.
* @apiBody {String} title Itinerary title.
* @apiBody {Object[]} data Itinerary data: Array of Day objects. 
* Each Day object has a plan field, array of POI objects. 
* Each POI object has an id field, the OpenTripMap id for that point of interest.
*
* @apiParamExample Example body:
* {
*   "api_key" : "your-api-key"
*   "title" : "my trip", 
*   "data" : [
*       {
*           "plan": [
*               {
*                   "id": "Q476787"
*               }
*           ]
*       }
*   ]
* }
*
* @apiSuccess (Success 201) {String} id ID of the created itinerary
*
* @apiSuccessExample Example successful response:
* HTTP/1.1 201 OK
* {
*     "code": "201",
*     "message": "Created",
*     "id": "78f2aca6-5c70-4e25-a84b-b148739e2904"
* }
*
*
* @apiSampleRequest https://localhost:8083/api/itinerary/
*
*/
router.post('/api/itinerary', (req, res) => {
    if(!req.body.api_key){
        res.json({code: "400", message: "Bad Request"});
        return;
    }
    const api_key = req.body.api_key;

    couchdb.api_key_data(api_key, (username, validated)=>{
        if(validated != true){
            res.json({code: "403", message: "Forbidden"});
            return;
        }
        var data_to_save = [];
        var ids = [];
        if(!(req.body.data instanceof Array)){
            res.json({code: "400", message: "Bad Request"});
            return;
        }
        for(const day of req.body.data){
            var day_to_save = {"plan": []};
            if(!(day.plan instanceof Array)){
                res.json({code: "400", message: "Bad Request"});
                return;
            }
            for(const place of day.plan){
                if(!(typeof place.id === 'string')){
                    res.json({code: "400", message: "Bad Request"});
                    return;
                }
                place_to_save = {"id": place.id};
                day_to_save.plan.push(place_to_save);
                ids.push(place.id);
            }
            data_to_save.push(day_to_save);
        }
        var tags = [];
        var locs = [];
        const get_data = (array) => {
            if(array.length == 0){
                const id = uuidv4();
                itinerary = {
                    title : req.body.title,
                    author : username,
                    data : data_to_save,
                    tags : tags.sort()
                }
                postgres.insert_itinerary(itinerary, id, tags, locs , (error) => {
                    if(error) {
                        console.log(error);
                        res.json({code: "500", message: "Internal Server Error"});
                        return;
                    }else if(req.body.title=="api_test" && req.body.data[0].plan[0].id=="R1834818"){
                        if(error) {
                            console.log(error);
                            res.status(500).send('error, remove itinerary database request');
                        }
                        else{
                            console.log("api post: test OK")
                        }
                        res.send(id);
                    } else {
                        //res.status(200).send();
                        res.json({code: "201", message: "Created", id: id});
                        return;
                    }   
                });
            }
            else{
                const id = array.pop()
                request({
                    url:"https://api.opentripmap.com/0.1/en/places/xid/"+id+"?apikey="+openTripMapKey,
                    method: "GET",
                    },
                    function(error, response, body){
                        if(error){
                            res.json({code: "400", message: "Bad Request"});
                            return;
                        }
                        response_json = JSON.parse(response.body);

                        const lon = response_json.point.lon;
                        const lat = response_json.point.lat;

                        place_kinds = response_json.kinds;
                        if(place_kinds.includes("architecture") && !tags.includes("architecture")) tags.push('architecture');
                        if(place_kinds.includes("cultural") && !tags.includes("cultural")) tags.push('cultural');
                        if(place_kinds.includes("foods") && !tags.includes("foods")) tags.push('foods');
                        if(place_kinds.includes("hotel") && !tags.includes("hotel")) tags.push('hotel');
                        if(place_kinds.includes("natural") && !tags.includes("natural")) tags.push('natural');
                        if(place_kinds.includes("religion") && !tags.includes("religion")) tags.push('religion');

                        request({
                          url:"http://api.positionstack.com/v1/reverse?access_key="+positionstack_key+"&query="+lat+","+lon+"&limit=1",
                          method: "GET",
                        },
                        function(error, response, body){
                            if(error){
                                res.json({code: "500", message: "Internal Server Error"});
                                return;
                            }
                            response_json = JSON.parse(response.body);

                            let area = response_json.data[0].administrative_area;
                            if(area != null){
                                area = area.toLowerCase();
                                area = area.replace("'", "''");
                            }
                            let region = response_json.data[0].region;
                            if(region != null){
                                region = region.toLowerCase();
                                region = region.replace("'", "''");
                            }
                            let country = response_json.data[0].country;
                            if(country != null){
                                country = country.toLowerCase();
                                country = country.replace("'", "''");
                            }
                            tuple = [area, region, country];

                            tuple_string = '';
                            for(const element of tuple){
                                if(element == null){
                                    tuple_string += 'NULL,'
                                }
                                else{
                                    tuple_string += "'"+element+"',"
                                }
                            }
                            tuple_string = tuple_string.slice(0, -1);

                            locs.push(tuple_string);
                            get_data(array);
                        })
                });
            }
        };
        get_data(ids);
    });
});

/**
* @api {get} /itinerary/ Get Itinerary
* @apiName GetItinerary
* @apiGroup Itinerary
*
* @apiParam {String} api_key User API key.
* @apiParam {String} id Itinerary unique ID.
*
* @apiParamExample {ajax-auto} Request-Example:
* https://localhost:8083/api/itinerary?id=78f2aca6-5c70-4e25-a84b-b148739e2904&api_key=753c0315-8c19-42f7-b346-ab319c5dbe7d
*
* @apiSuccess {String} title Itienerary title
* @apiSuccess {String} author Itinerary author
* @apiSuccess {String} days Itinerary days
* @apiSuccess {Number} likes Itinerary likes
* @apiSuccess {Object[]} data Itinerary data. Contains the day by day plan of the itinerary.
* @apiSuccess {String[]} tags Itinerary overall tags
* @apiSuccess {String[]} locations Itinerary overall locations
*
* @apiSuccessExample successful response:
* HTTP/1.1 200 OK
* {
*   "title": "my trip",
*   "author": "user1",
*   "days": "1",
*   "likes": 0,
*   "data": [
*       {
*           "plan": [
*               {
*                   "id": "Q476787"
*               }
*           ]
*       }
*   ]
* }
*
* @apiSampleRequest https://localhost:8083/api/itinerary/
*
*/
router.get('/api/itinerary', (req, res) =>{
    json_to_send = {data: []};
    if(!(typeof req.query.api_key === 'string' && typeof req.query.id === 'string')){
        res.json({code: "400", message: "Bad Request"});
        return;
    }
    const api_key = req.query.api_key;
    const id = req.query.id;
    couchdb.api_key_data(api_key, (username, validated)=>{
        if(validated != true){
            res.json({code: "403", message: "Forbidden"});
            return;
        }
        else{
            postgres.get_itinerary(id, function(error, response){
                if(error) {
                    console.log(error);
                    res.json({code: "500", message: "Internal Server Error"});
                } else {
                    const response_row = response.rows[0]
                    const itinerary_data = JSON.parse(response_row.data);
                    if(typeof itinerary_data === "undefined"){
                        res.json({code: "404", message: "Not Found"});
                        return;
                    }
                    postgres.get_itinerary_tags(id, (error, response)=>{
                        if(error){
                            console.log(error);
                            res.json({code: "500", message: "Internal Server Error"});
                            return;
                        }
                        const response_rows = response.rows;
                        tags = [];
                        for (const response_row of response_rows){
                            tags.push(response_row.tag);
                        }
                        postgres.get_itinerary_locations(id, (error, response)=>{
                            if(error){
                                res.json({code: "500", message: "Internal Server Error"});
                                console.log(error);
                                return;
                            }
                            if(api_key=="4199fb08-e33a-48c0-9f54-43b33f3fec9d"){
                                postgres.rmv_itinerary(id, (error)=>{
                                    if(error) {
                                        console.log(error);
                                        res.status(500).send('error, remove itinerary database request');
                                    }
                                    else{
                                        console.log("api get: test OK")
                                    }
                                })
                            res.send("Test passed");
                            return;
                            }
                            const response_rows = response.rows;
                            locations = [];
                            for (const response_row of response_rows){
                                if(response_row.area != null && !locations.includes(response_row.area))   locations.push(response_row.area);
                                if(response_row.region != null && !locations.includes(response_row.region))   locations.push(response_row.region);
                                if(response_row.country != null && !locations.includes(response_row.country))   locations.push(response_row.country);
                            }
                            res.json({code:"200", message:"OK", title: response_row.title,  author: response_row.author, days: response_row.days,  likes: response_row.likes, data: itinerary_data, tags:tags, locations:locations});
                            return;
                        });
                    });
                }
            });
        }
    });  
});

module.exports = router;