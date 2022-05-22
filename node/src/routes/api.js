const express = require('express');
const request = require("request");
const { v4: uuidv4 } = require('uuid');


const router = express.Router();


//API
router.get('/api/itineraries', (req, res) => {
    request({
        //url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/itineraries_db/_all_docs',
        url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/itineraries_db/_design/it_ddoc/_view/tag_view?key=["culture","religion"]',  
        method: 'GET',
        //headers: {'content-type': 'application/json'},
        //body: JSON.stringify({"keys": ["culture", "religion"]})
    }, function(error, response, body){
        if(error) {
            console.log(error);
        } else {
            res.send(response.body);
        }
    });
});
//9e05514ac532e17115f7bf067a001a16
router.post('/api/itineraries', (req, res) => {
    //
    test_title = "test title";
    test_tags = ["culture", "nature"];
    //
    id = uuidv4();
    itinerary = {
        title : test_title,
        data : req.body.info,
        tags : test_tags
    }
    console.log(itinerary);
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
});

module.exports = router;