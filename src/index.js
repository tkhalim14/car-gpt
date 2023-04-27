const api_name = require('./constants/const.js');
const express = require('express');
const app = express();
const fetch = require("node-fetch");
const fs = require("fs");
// const config = require("dotenv").config();
// const { Configuration, OpenAIApi } = require("openai");

// const configuration = new Configuration({
//   apiKey: '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',
// });

// const openai = new OpenAIApi(configuration);

const ejs = require('ejs');

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));


app.get('/', async (req, res) =>{
  var data = await fetch('https://api.allusedcars.in/api/public/discovery/cars', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Postman-Token': 'Bearer <insert key here>',
      'cache-control': 'no-cache'
    },
    body: JSON.stringify({
      sortOrder:"POPULAR",
      sortPattern: -1,
      count: 100,
      filters: [{
        filterType: "PRICE",
        lowerValue: 4000,
        higherValue: 9000000
      }],
      page: 0
    }),
  }).then(response => response.json());

  //data = JSON.parse(data);
  data = data.map(({ model, make ,bodyType, color, fuelType, price, transmission }) => ({ model: model ,brand: make, bodyType: bodyType, color : color, fuel: fuelType, price: price, transmission: transmission }));
  data = JSON.stringify(data);
  //console.log(data);
  fs.writeFile('../api/src/data.json', data, err => {
      if (err) {
          console.log('Error writing file', err)
      } else {
          console.log('Successfully wrote file')
      }
  });
  sleep(1000);
  fs.readFile("../api/src/history.json", "utf8", async (err, jsonString) => {
    if (err) {
      console.log("File read failed:", err);
      var dataFromJson = data;
      sleep(2000);
      console.log(dataFromJson);
      //console.log("Sure, here is the json file of top 10 popular cars along with their specifications: \\"+dataFromJson+"\\\n'\n\n");
      var init = [{"role":"system","content":"You are the best assistant."},{"role":"user","content":"give me a database of popular cars\nget me specs on price, owner transmission, fuel, brand, model city for each of them"},{"role":"assistant","content":dataFromJson}]
      history = init;
      init = JSON.stringify(init);
      fs.writeFile('../api/src/history.json', init, err => {
        if (err) {
            console.log('Error writing file', err)
        } else {
            console.log('Successfully wrote file')
        }
      }); 
      return;
    }
    //console.log("File data:", jsonString);
    history = JSON.parse(jsonString);
  });
  res.render('../src/index.ejs');
  //res.send(HTMLstring);
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

app.post("/result", async (req, res) => {
  const userInput = req.body.userInput;
  //console.log(userInput);
  try {
    if (userInput == null) {
      throw new Error("Uh oh, UserInput was not provided");
    }
    await fs.readFile("../api/src/history.json", "utf8", async (err, jsonString) => {
      if (err) {
        console.log("File read failed:", err);
        return;
      }
      //console.log("File data:", jsonString);
      var history = JSON.parse(jsonString) ?? [{}];
      var write = {
        role: "user", 
        content: "Now I want you to filter out this list with the following parameters : " + userInput + ". Start your response with 'Sure, based on your filter' ",
      };
      //console.log(write);
      history.push(write);
      //console.log(history);
      const data = await fetch(api_name, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer <insert key here>',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',//"text-davinci-edit-001",
          messages: history,
        }),
      }).then(response => response.json());
      console.log(JSON.stringify(data));
      var generatedText = data.choices[0].message.content ?? "";
      generatedText = JSON.stringify(generatedText);
      var write1 = {
        role: "assistant", 
        content: generatedText,
      };
      history.push(write1);
      history = JSON.stringify(history);
      console.log(JSON.stringify(data));
      generatedText = generatedText.slice(1,generatedText.length-1);
      generatedText = generatedText.replace(/\\\"/g, "");
      generatedText = generatedText.replace(/\"/g, "");
      generatedText = generatedText.replace(/\n/g, "<br>");
      fs.writeFile('../api/src/history.json', history, err => {
          if (err) {
              console.log('Error writing file', err)
          } else {
              console.log('Successfully wrote file')
          }
      });
      sleep(1000);
      //console.log(generatedText);
      return res.render('../src/index.ejs',{generatedText : generatedText})
      // return res.status(200).json({
      //     success: true,
      //     message: generatedText,
      //   });
    });
  
  } catch (error) {
    console.log(error.message);
  }
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
  //console.log(api_name);
});

