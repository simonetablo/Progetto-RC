const request = require("request");
const waitPort = require('wait-port');

const params = {
    host: 'database',
    port: 5984,
  };


const setup_couchdb = (callback) => {
    create_db("user_db", () => {
        create_db("sessions_db", callback);
    });
};

const create_db = (db_name, callback) => {
    request(
        {
            url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/' + db_name, 
            method: 'PUT'
        }, 
        (error, response, body) => {
            if(error) {
                console.log(error); //error creating db
            } else {
                //console.log(response.body);  //db created successfully or already existing
                callback();
            }
        });
};

module.exports = setup_couchdb;