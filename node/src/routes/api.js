const express = require('express');
const request = require("request");
const { v4: uuidv4 } = require('uuid');
const postgres = require('../postgres');
const bodyParser = require('body-parser');

const app=express();
const router = express.Router();
const openTripMapKey = "5ae2e3f221c38a28845f05b6e8cfaa33e6a2f1fbe1d1350f053db399";
const positionstack_key= "6358130f0b66fd2e8cd62f36b84913e1"
app.use(bodyParser.json())

//API
router.get('/api/itineraries/', (req, res) => {
    json_to_send = {data: []};
    //query_string = req.query;
    //console.log(query_string);
    tags = [];
    if(req.query.architecture) tags.push("'architecture'");
    if(req.query.cultural) tags.push("'cultural'");
    if(req.query.foods) tags.push("'foods'");
    if(req.query.hotel) tags.push("'hotel'");
    if(req.query.natural) tags.push("'natural'");
    if(req.query.religion) tags.push("'religion'");
    location = req.query.location;
    days = req.query.days;
    set_data = (array) => {
        if(array.length == 0){
            //console.log(json_to_send);
            //console.log()
            res.json(json_to_send);
        }
        else{
            row = array.shift();
            //console.log(row)
            id = row.id
            postgres.get_itinerary_tags(id, (err, response)=>{
                //console.log(response);
                response_tags = response.rows;
                //console.log(response_tags)
                tags = [];
                for (const element of response_tags){
                    tags.push(element.tag);
                }
                //console.log(tags);
                itinerary = {
                    id: row.id,
                    title: row.title,
                    likes: row.likes,
                    author: row.author,
                    tags : tags
                }
                json_to_send.data.push(itinerary);
                set_data(array);
            })
            
        }
    }
    postgres.query_itinerary(tags, location, days, (err, result)=>{
        if(err){
            console.error(err);
            res.status(500).send('error');
        }
        else{
            rows = result.rows;
            set_data(rows);
            //result.rows
            //res.status(200).send("ayo");

        }
    })
});

router.post('/api/itineraries', (req, res) => {
    ids = [];
    for(const day of req.body.itinerary){
        for(const place of day.plan){
            ids.push(place.id)
        }
    }
    tags = [];
    locs = [];
    get_data = (array) => {
        if(array.length == 0){
            id = uuidv4();
            itinerary = {
                title : req.body.title,
                author : req.session.username,
                data : req.body.itinerary,
                tags : tags.sort()
            }
            postgres.insert_itinerary(itinerary, id, tags, locs , (error) => {
                if(error) {
                    console.log(error);
                    res.status(500).send('error, itinerary database request');  //internal request error
                } else {
                    if(req.body.title=="api_test" && req.body.itinerary[0].plan[0].id=="R1834818"){
                        postgres.rmv_itinerary(id, (error)=>{
                            if(error) {
                                console.log(error);
                                res.status(500).send('error, remove itinerary database request');
                            }
                            else{
                                console.log("api post: test OK")
                            }
                        })
                    }
                    res.status(200).send();
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
                    response_json = JSON.parse(response.body);

                    place_kinds = response_json.kinds;
                    if(place_kinds.includes("architecture") && !tags.includes("architecture")) tags.push('architecture');
                    if(place_kinds.includes("cultural") && !tags.includes("cultural")) tags.push('cultural');
                    if(place_kinds.includes("foods") && !tags.includes("foods")) tags.push('foods');
                    if(place_kinds.includes("hotel") && !tags.includes("hotel")) tags.push('hotel');
                    if(place_kinds.includes("natural") && !tags.includes("natural")) tags.push('natural');
                    if(place_kinds.includes("religion") && !tags.includes("religion")) tags.push('religion');

                    const lon = response_json.point.lon;
                    const lat = response_json.point.lat;
                    request({
                      url:"http://api.positionstack.com/v1/reverse?access_key="+positionstack_key+"&query="+lat+","+lon+"&limit=1",
                      method: "GET",
                    },
                    function(error, response, body){
                        response_json = JSON.parse(response.body);

                        let area = response_json.data[0].administrative_area;
                        if(area != null) area = area.toLowerCase();
                        let region = response_json.data[0].region.toLowerCase();
                        if(region != null) region = region.toLowerCase();
                        let country = response_json.data[0].country.toLowerCase();
                        if(country != null) country = country.toLowerCase();
                        tuple = [area, region, country];

                        tuple_string = '';
                        for(const element of tuple){
                            //console.log(typeof element)
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

module.exports = router;

app.use(router);

module.exports = app