const Pool = require('pg').Pool
const waitPort = require('wait-port');


const params = {
  host: 'postgres',
  port: 5432,
};

const pool = new Pool({
    user: 'user',
    host: 'postgres',
    database: 'example_db',
    password: 'password',
    port: 5432,
  })
  

const setup_postgres = (callback) => {
    waitPort(params)
    .then((open) => {
      if (open){
        console.log('The port is now open!');
        create_itineraries_db( ()=>{
            create_itineraries_tag_db( ()=>{
                create_itineraries_loc_db( ()=>{
                  create_itineraries_likes_db(callback)
                })
            });
        });
      } 
      else console.log('The port did not open before the timeout...');
    })
    .catch((err) => {
      console.log(`An unknown error occured while waiting for the port: ${err}`);
    });
};

const create_itineraries_db = (callback) => {
    pool.query(`CREATE TABLE itineraries (
      id VARCHAR(255) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      likes INTEGER NOT NULL,
      author VARCHAR(255) NOT NULL,
      days VARCHAR(255) NOT NULL,
      data VARCHAR NOT NULL
      );`, (error, results) => {
        if (error) {
          if(error.message == 'relation "itineraries" already exists'){
              console.log(error.message);
              callback();
          }
          else{
            throw error;
          }
        }
        else{
          console.log(results);
          callback();
        }
    });
  };
  
const create_itineraries_tag_db = (callback) => {
  pool.query(`CREATE TABLE itineraries_tag (
    id VARCHAR(255) NOT NULL,
    tag VARCHAR(255) NOT NULL,
    FOREIGN KEY(id)
      REFERENCES itineraries(id)
    );`, (error, results) => {
      if (error) {
        if(error.message == 'relation "itineraries_tag" already exists'){
            console.log(error.message);
            callback();
        }
        else{
          throw error;
        }
      }
      else{
        console.log(results);
        callback();
      }
  });
};

const create_itineraries_loc_db = (callback) => {
  pool.query(`CREATE TABLE itineraries_loc (
    id VARCHAR(255)  NOT NULL,
    area VARCHAR(255),
    region VARCHAR(255),
    country VARCHAR(255) NOT NULL,
    FOREIGN KEY(id)
      REFERENCES itineraries(id)
    );`, (error, results) => {
      if (error) {
        if(error.message == 'relation "itineraries_loc" already exists'){
            console.log(error.message);
            callback();
        }
        else{
          throw error;
        }
      }
      else{
        console.log(results);
        callback();
      }
  });
};

const create_itineraries_likes_db = (callback) =>{
  pool.query(`CREATE TABLE itineraries_likes (
      id VARCHAR(255)  NOT NULL,
      name VARCHAR(255) NOT NULL,
      FOREIGN KEY(id)
        REFERENCES itineraries(id)
      );`, (error, results) => {
        if (error) {
          if(error.message == 'relation "itineraries_likes" already exists'){
              console.log(error.message);
              callback();
          }
          else{
            throw error;
          }
        }
        else{
          console.log(results);
          callback();
        }
    });
}

module.exports = setup_postgres;