const Pool = require('pg').Pool

const pool = new Pool({
    user: 'user',
    host: 'postgres',
    database: 'example_db',
    password: 'password',
    port: 5432,
  })

const insert_itinerary = (itinerary, id, tags, locs, callback) => {
  const days = itinerary.data.length;
  const itineraries_tuple = `('${id}','${itinerary.title}',0,'${itinerary.author}','${days}','${JSON.stringify(itinerary.data)}')`
  itineraries_tags_tuples = "";
  for(const element of tags){
    itineraries_tags_tuples += `('${id}','${element}'),`
  }
  itineraries_tags_tuples =  itineraries_tags_tuples.slice(0, -1)

  itineraries_locs_tuples = "";
  for(const element of locs){
    itineraries_locs_tuples += `('${id}',${element}),`
  }
  itineraries_locs_tuples =  itineraries_locs_tuples.slice(0, -1)

  pool.query(
            `BEGIN;
            INSERT INTO itineraries
            VALUES ${itineraries_tuple};
            INSERT INTO itineraries_tag
            VALUES ${itineraries_tags_tuples};
            INSERT INTO itineraries_loc
            VALUES ${itineraries_locs_tuples};
            COMMIT;`,
  (error, results) => {
    if (error) {
      callback(error);
    }
    else{
      callback(null);
    }
  })
}

const query_itinerary = (tags, location, days, callback) => {
  loc_condition_string = "";
  if(location != ""){
    location = location.toLowerCase()
    loc_condition_string = `and (area = '${location}' or region = '${location}' or country = '${location}')`
  }
  tag_condition_string = "";
  for(const element of tags){
    tag_condition_string += `and ${element} in (select tag from itineraries_tag it where i.id = it.id) `
  }
  days_condition_string = "";
  if(days != ""){
    days_condition_string = `and i.days = '${days}'`
  }
  //console.log(`SELECT distinct i.id, title, likes, author 
  //FROM itineraries i join itineraries_loc il on i.id = il.id
  //WHERE true ${loc_condition_string} ${tag_condition_string}`)
  pool.query(
    `SELECT distinct i.id, title, likes, author 
    FROM itineraries i join itineraries_loc il on i.id = il.id
    WHERE true ${loc_condition_string} ${tag_condition_string} ${days_condition_string}`,
  (error, results) => {
    if (error) {
      callback(error, null);
    }
    else{
      callback(null, results);
    }
  })
}

const get_itinerary_tags = (id, callback) => {
  pool.query(
    `SELECT tag FROM itineraries_tag
    WHERE id = '${id}'`,
  (error, results) => {
    if (error) {
      callback(error, null);
    }
    else{
      callback(null, results);
    }
  })
}

const get_itinerary_data = (id, callback) => {
  pool.query(
    `SELECT data FROM itineraries
    WHERE id = '${id}'`,
  (error, results) => {
    if (error) {
      callback(error, null);
    }
    else{
      console.log(JSON.stringify(results));
      callback(null, results);
    }
  })
}

module.exports = {
                "insert_itinerary" : insert_itinerary,
                "query_itinerary" : query_itinerary,
                "get_itinerary_tags" : get_itinerary_tags,
                "get_itinerary_data" : get_itinerary_data
                };