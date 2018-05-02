# Led-Alarm-Web-Service
This is the web service to support sending messages through MQTT about google 
  calendar messages

Known bugs: 
    all events must have a description to be seen. If they dont have a title it  

To run:

      First things first you must have npm installed.


      follow this link and ONLY COMPLETE step one
      https://developers.google.com/calendar/quickstart/nodejs
      the rest of the steps are not relivent to this project.
      
      npm init

    enter through the options until you are at the end

      npm install mqtt --save
      npm install googleapis@27 --save

    next create an MQTT broker to transact messages between client and server. 
    Put the information in a file named "mqtt_credentials.json"
        the file should contain the json object below, fill in your details:
                {
                   "broker_url" : "mqtt://cloudmqtt.com:portnum", 
                   "client_username": "username",
                   "client_password": "password"
                }
    save the file in the same directory as "index.js"

All of the rest of the code is included in the index.js

On the first time starting the server you will be prompted to follow a link 
which will take you to your google account in order to verify that your app
has read/write access to your calendar

finally run:
    node quickstart.js