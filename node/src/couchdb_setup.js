const request = require("request");
const waitPort = require('wait-port');

const params = {
    host: 'database',
    port: 5984,
  };


const setup_couchdb = (callback) => {
    waitPort(params)
    .then((open) =>{
        if(open){
            create_db("user_db", () => {
                create_db("sessions_db", () => {
                    create_user_view(callback);
                });
            });
        }
        else console.log('The port did not open before the timeout...');
    })
    .catch((err) => {
        console.log(`An unknown error occured while waiting for the port: ${err}`);
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

const create_user_view = (callback) => {
    request(
        {
            url: 'http://'+process.env.COUCHDB_USER+':'+process.env.COUCHDB_PASSWORD+'@database:5984/user_db/_design/user_ddoc', 
            method: 'PUT',
            body: JSON.stringify({

                "views": {
                    "user_view" : {
                        "map": "function(doc) { \n\
                            emit(doc._id, {email: doc.email, api_key: doc.api_key, verified: doc.verified}); \n\
                        }"
                    },
                }

            })
        }, 
        (error, response, body) => {
            if(error) {
                console.log(error); //error creating email_view
            } else { 
                //email_view created
                callback();     
            }
        }
    );
};

module.exports = setup_couchdb;