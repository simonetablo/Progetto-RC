const request = require("request");

const get_document_from_database = (id, database, callback) => {
    request({
        url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/'+ database+ '/' + id, 
        method: 'GET'
    }, function(error, response, body){
        callback(error, response);
    });
}

const put_document_in_database = (id, database, input, callback) => {
    request({
        url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/'+ database+ '/' + id, 
        method: 'PUT',
        body: JSON.stringify(input) 
    }, function(error, response, body){
        callback(error, response);
    });
}

const api_key_data = (api_key, callback) => {
    request({
        url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/user_db/_design/user_ddoc/_view/user_view',  
        method: 'GET',
    }, function(error, response, body){
        if(error) {
            callback(error);
        }
        else{
            view_data = JSON.parse(response.body);
            for(const view_data_row of view_data.rows){
                console.log(view_data_row.value.api_key);
                console.log(api_key);
                if(view_data_row.value.api_key == api_key){
                    callback(view_data_row.key, view_data_row.value.verified);
                    return;
                }
            }
            callback(null, null);
            return;
        }
    });
}

module.exports = {
    "get_document_from_database" : get_document_from_database,
    "put_document_in_database" : put_document_in_database,
    "api_key_data" : api_key_data
    };