module.exports = function(req,res){
    oAuth2Client = req.params.oAuth2Client
    const event = req.params.event
    console.log(event)
    //console.log(oAuth2Client)
    function add_event(calendar_,event_){
      
            
        calendar_.freebusy.query(
          {
            resource: {
              timeMin: event_.start.dateTime,
              timeMax: event_.end.dateTime,
              timeZone: event_.start.timeZone,
              items: [{ id: 'primary' }],
            },
          },
          (err, res) => { 
            // Check for errors in our query and log them if they exist.
            if (err) return console.error('Free Busy Query Error: ', err)
        
            // Create an array of all events on our calendar during that time.
            const eventArr = res.data.calendars.primary.busy
            console.log(eventArr);
        
            // Check if event array is empty which means we are not busy
            if (eventArr.length === 0)
              // If we are not busy create a new calendar event.
              return calendar_.events.insert(
                { calendarId: 'primary', resource: event_ },
                err => {
                  // Check for errors and log them if they exist.
                  if (err) return console.error('Error Creating Calender Event:', err)
                  // Else log that the event was created.
                  return console.log('Calendar event successfully created.')
                }
              )
        
            // If event array is not empty log that we are busy.
            return console.log(`Sorry I'm busy...`)
        }
        )
      }
    const { google } = require('googleapis')
    // Create a new calender instance.
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })
    
    
    add_event(calendar,event);
    res.send('Evento creato!')
 
  }