module.exports = function (req, res,next){
    
    const request = require('request')
     
    request({
        url: 'http://'+ couchDb_username +':'+couchDb_password+'@'+ip+':'+port+'/'+ nome_db +'/'+ nome_file, //URL to hit
        method: 'GET',
        headers: {
           'Content-Type': 'application/json',
        }
    }, function(error, response, body){
        if(error) {
            console.log("errore risposta db" + error);
        } else {
            //res.send(response.statusCode+" "+body)
            console.log(response.statusCode + body);
            req.params.event = JSON.parse(body);
            req.params.event = { 
                summary : req.params.event.summary ,
                location : req.params.event.location,
                description : req.params.event.description ,
                colorId : req.params.event.colorId,
                start : { dateTime :  new Date(req.params.event.start.dateTime) , 
                        timeZone : req.params.event.start.timeZone},
                end : {dateTime : new Date (req.params.event.end.dateTime) ,
                        timeZone : req.params.event.end.timeZone },

            }

            next();
            
        }
        
        
    });
    
}
