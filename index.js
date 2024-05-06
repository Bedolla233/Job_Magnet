/* TODO: Mark or Delete when complete
* Includes user interaction with at least three form elements
* Project uses Web storage or Sessions | Cam-> Should be done with login??
* Users are able to update existing records. Must update at least three fields.
* Users can add records to the database
* Project must have at least 50 lines of client-side JavaScript code
* Project includes at least two local or external Web APIs
    https://github.com/public-apis/public-apis?tab=readme-ov-file 
* Project has a nice, professional and consistent design, free of typos.
*/

const express = require("express");
const mysql = require("mysql");
const app = express();
const pool = dbConnection();
const bcrypt = require("bcrypt");
const session = require("express-session");

app.set("trust proxy", 1); // trust first proxy
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
  }),
);

app.set("view engine", "ejs");
app.use(express.static("public"));
//to parse Form data sent using POST method
app.use(express.urlencoded({ extended: true }));
app.use(express.json({limit:'1mb'}))
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Basic Renders~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//routes
app.get("/", (req, res) => {
  res.render("login");
});

app.get("/home", isUserAuthenticated, async (req, res) => {
  res.render("home.ejs");
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Login/out & Sign Up~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signUp", (req, res) => {
  res.render("signUp");
});

app.post("/login", async (req, res) => {
  let username = req.body.email;
  let password = req.body.password;
  console.log(password);

  let hashedPassword = "";

  let sql = `SELECT *
              FROM users
              WHERE user_email = ?`;
  let rows = await executeSQL(sql, [username]);

  if (rows.length > 0) {
    console.log(rows)
    //username was found
    hashedPassword = await bcrypt.hash(rows[0].user_password.toString(), 5);
  }else{
    console.log('none')
  }

  const match = await bcrypt.compare(password, hashedPassword);

  console.log("match: " + match);
  console.log("hasspass: "+hashedPassword);
  if (match) {
    // console.log("here");
    req.session.authenticated = true;
    req.session.fullName =
      rows[0].user_first_name + " " + rows[0].user_last_Name;
    req.session.userId = rows[0].user_id;
    res.redirect("/home");
  } else {
    // console.log("doneee");
    res.render("login", { error: "Wrong credentials!" });
  }
});


app.post("/signUp", async (req, res) => {
  let email = req.body.email;
  let firstName = req.body.firstname;
  let lastName = req.body.lastname;
  let password = req.body.password;
  let passwordCheck = req.body.passwordCheck;
  if(password != passwordCheck){
    console.log(password)
    res.render("signUp", {error: "Passwords do not match!"})
  } else {
  
    let sql = `INSERT INTO users
                (user_first_name,user_last_Name,user_email,user_password)
                VALUES (?,?,?,?)`;
    let params = [firstName, lastName, email, password];
    let rows = await executeSQL(sql, params);
    
    res.redirect('/');
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.post('/check-email', async (req, res) => {
  const { email } = req.body;

  let sql = `SELECT * FROM users WHERE user_email = ?`;
  let rows = await executeSQL(sql, [email]);

  if (rows.length > 0) {
    res.status(400).json({ message: 'Email already exists' });
  } else {
    res.status(200).json({ message: 'Email is available' });
  }
}); // Created with assistance

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Search~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

app.get("/search", isUserAuthenticated, async (req,res) => {

  const YOUR_EMAIL = process.env['EMAIL'];
  const AUTH_KEY =  process.env['AUTH_KEY']; 

  // console.log('here')
  if(req.session.authenticated){
    console.log(req.session.userId)
  }

  let searchString = "";
  let keywords = null;
  let keyCopy = ' ';
  let jobType = 0;
  let zip = 0;
  let distance = 0;
  
  try{
    let sql = `SELECT *
                FROM pref_table
                WHERE user_id = ?`
    let rows = await executeSQL(sql, [req.session.userId])

    keywords = rows[0].job_title;
    keyCopy = rows[0].job_title;
    jobType = rows[0].job_type;
    zip = rows[0].zip;
    distance = rows[0].distance;
  }catch{
    console.log('No user prefs, using defaults')
  }
  
  if(keywords != null){
    keywords = keywords.split(" ");
    searchString += "PositionTitle=" + keywords[0];
    keywords.splice(0,1)
    for( let word in keywords){
      searchString += "%20"+word
    }
  }

  if(jobType != 0){
    if(searchString[-1] != "?"){
      searchString += '&'
    }
    searchString += `PositionSchedule=${jobType}`
  }

  if(zip != 0 & (typeof zip == typeof 2)){
    let zipAPIUrl =`https://csumb.space/api/cityInfoAPI.php?zip=${zip}`;
    let zipresponse = await fetch(zipAPIUrl);
    let zipData = await zipresponse.json();
    // console.log(zipData)
    if(searchString[-1] != "?"){
      searchString += '&'
    }
    searchString += `LocationName=${zipData.city},%20${zipData.state}`
  }

  if(distance != null){
    if(searchString[-1] != "?"){
      searchString += '&'
    }
    searchString += `Radius=${distance}`
  }

  const url = `https://data.usajobs.gov/api/Search?${searchString}`;

  let response = await fetch(url, {
    headers: {
      'Host': 'data.usajobs.gov',
      'User-Agent': YOUR_EMAIL,
      'Authorization-Key': AUTH_KEY
    } })

  let data = await response.json()

  // console.log(data['SearchResult']['SearchResultItems'][0]['MatchedObjectDescriptor'])

  let jobs = data['SearchResult']['SearchResultItems']

  res.render("search", {jobs: jobs,zip: zip, distance: distance, jobType: jobType, keywords: keyCopy})
  
});

app.post( "/search",async (req, res) =>{
  //split keyword string by space
  let searchString = ""
  let keywords = req.body.keywords;
  let keyCopy = req.body.keywords;
  if(keywords != null){
    keywords = keywords.split(" ");
    searchString += "PositionTitle=" + keywords[0];
    keywords.splice(0,1)
    for( let word in keywords){
      searchString += "%20"+word
    }
  }
  
  let jobType = req.body.jobType;
  if(jobType != 0){
    if(searchString[-1] != "?"){
      searchString += '&'
    }
    searchString += `PositionSchedule=${jobType}`
  }

  let zip = req.body.location;
  // console.log(zip)
  if(zip != 0 & (typeof zip == typeof 2)){
    let zipAPIUrl =`https://csumb.space/api/cityInfoAPI.php?zip=${zip}`;
    let zipresponse = await fetch(zipAPIUrl);
    let zipData = await zipresponse.json();
    // console.log(zipData)
    if(searchString[-1] != "?"){
      searchString += '&'
    }
    searchString += `LocationName=${zipData.city},%20${zipData.state}`
  }

  let distance = req.body.distance;

  if(distance != null){
    if(searchString[-1] != "?"){
      searchString += '&'
    }
    searchString += `Radius=${distance}`
  }
  

  // console.log(searchString)
  const YOUR_EMAIL = process.env['EMAIL'];
  const AUTH_KEY =  process.env['AUTH_KEY']; 

  const url = `https://data.usajobs.gov/api/Search?${searchString}`;

  let response = await fetch(url, {
    headers: {
      'Host': 'data.usajobs.gov',
      'User-Agent': YOUR_EMAIL,
      'Authorization-Key': AUTH_KEY
    } })

  let data = await response.json()

  // console.log(data['SearchResult']['SearchResultItems'][0]['MatchedObjectDescriptor'])

  let jobs = data['SearchResult']['SearchResultItems']

  res.render("search", {jobs: jobs, zip: zip, distance: distance, jobType: jobType, keywords: keyCopy})
  
});

app.post("/addToFav", async (req, res) =>{
  // console.log('YIPPIE')
  
  // console.log(req.body.jobLink)
  // console.log(req.body.jobName)
  let jobLink = req.body.jobLink;
  let jobName = req.body.jobName;
  let userId = req.session.userId;

  let sql = `INSERT INTO user_saved_jobs
              (user_id,jobTitle,jobLink)
              VALUES
              (?, ?,?)`;
  let params = [userId,jobName,jobLink];
  let rows = await executeSQL(sql, params);
  res.sendStatus(200);
});

app.post('/deleteFav',async (req,res)=>{
  let userID= req.session.userId;
  let jobLink = req.body.jobLink;

  let sql = `DELETE FROM user_saved_jobs
              WHERE user_id = ? AND jobLink = ?`
  let params = [userID,jobLink];
  let rows = await executeSQL(sql,params);

  res.redirect('/savedJobs')
});


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Saved Jobs ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

app.get("/savedJobs", async (req, res) => {
  let userId = req.session.userId;
  let sql = `SELECT * from user_saved_jobs
              WHERE user_id = ?`;
  let rows = await executeSQL(sql, [userId]);
  res.render("savedJobs", { jobs: rows});
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Profile~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
app.get("/profile", isUserAuthenticated, async (req, res) => {
  let userId = req.session.userId;
  let sql = "SELECT * FROM users WHERE user_id=?";
  let rows = await executeSQL(sql, [userId]);

  console.log(rows);

  let rows2 = null
  let jobTypeString =  "No Pref";
  try{
    sql = "SELECT * FROM pref_table WHERE user_id = ?"
    rows2 = await executeSQL(sql, [userId]);
    // console.log(rows2);
    if(rows2.length == 0){
      sql = `Insert into pref_table (user_id,	zip,	job_title,	job_type,	distance) VALUES (?,?,?,?,?)`
      rows2 = await executeSQL(sql, [userId, 0, "", 0, 0]);
      sql = "SELECT * FROM pref_table WHERE user_id = ?"
      rows2 = await executeSQL(sql, [userId]);
    }

    // let jobTypeString = [{ jobTypeString : ""}]
    

    if(rows2[0].job_type == 0){
      jobTypeString = "No Pref";
    } else if (rows2[0].job_type == 1) {
      jobTypeString = "Full-Time";
    } else if (rows2[0].job_type == 2) {
      jobTypeString = "Part-Time";
    } else if (rows2[0].job_type == 3) {
    jobTypeString = "Shift Work";
    } else if (rows2[0].job_type == 4) {
    jobTypeString = "Intermittent";
    } else if (rows2[0].job_type == 5) {
    jobTypeString = "Job Sharing";
    } else if (rows2[0].job_type == 6) {
    jobTypeString = "Multiple Schedules";
    }
    
  }catch{
    console.log('error retrieving prefs...')
  }
  
  res.render("profile", {users : rows[0], pref : rows2[0], jobType : jobTypeString});
  // res.render("profile");
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Update Profile~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

app.get("/updateProfile", isUserAuthenticated, async (req, res) => {
  let userId = req.session.userId;
  let sql = "SELECT * FROM users WHERE user_id=?";
  let rows = await executeSQL(sql, [userId]);

  sql = "SELECT * FROM pref_table WHERE user_id = ?"
  let rows2 = await executeSQL(sql, [userId]);
  res.render("updateProfile", {users : rows[0], pref : rows2[0]});
});

app.post("/updateProfile", async (req, res) => {
  let userID = req.body.user_id
  let firstName = req.body.firstname;
  let lastName = req.body.lastname;
  let email = req.body.email;
  let password = req.body.password;
  let passwordCheck = req.body.passwordCheck;

  if(password != passwordCheck){
    console.log(password)
    res.render("updateProile", {error: "Passwords do not match!"})
  } else {

    let sql = `Update users Set user_first_name = ?,user_last_Name = ?,user_email = ?, user_password = ? WHERE user_id = ?`;
    let params = [firstName, lastName, email, password, userID];
    let rows = await executeSQL(sql, params);

    console.log("THis one updated")
    console.log(rows);
  
  res.redirect("profile");
  }
});

//Update Prefs
app.post("/updatePrefs", async (req, res) => {
  let userID = req.body.user_id
  let prefzip = req.body.zip;
  let prefjobTitle = req.body.jobTitle;
  if(prefjobTitle == ""){
    prefjobTitle = null
  }
  let prefjobType = req.body.jobType;
  let prefDistance = req.body.distance;

  try{
    let sql = `Update pref_table Set zip = ?,job_title = ?,job_type = ?, distance = ? WHERE user_id = ?`;
    let params = [prefzip, prefjobTitle, prefjobType,prefDistance, userID];
    let rows = await executeSQL(sql, params);
  }catch{
    console.log("No prefs,creating prefs for user...")
    let sql = `Insert into pref_table (user_id,	zip,	job_title,	job_type,	distance) VALUES (?,?,?,?,?)`
    let params = [userID, prefzip, prefjobTitle, prefjobType, prefDistance];
    let rows = await executeSQL(sql, params);
  }

  // let sql = "Update user SET user_name = ?, email = ?, user_password = ? WHERE user_Id = ?"

  res.redirect("profile");
  
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Other Functions~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
app.get("/dbTest", async function (req, res) {
  let sql = "SELECT CURDATE()";
  let rows = await executeSQL(sql);
  res.send(rows);
}); //dbTest

//functions
async function executeSQL(sql, params) {
  return new Promise(function (resolve, reject) {
    pool.query(sql, params, function (err, rows, fields) {
      if (err) throw err;
      resolve(rows);
    });
  });
} //executeSQL
//values in red must be updated
function dbConnection() {
  const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env["HOST"],
    user: process.env["USER"],
    password: process.env["PASS"],
    database: process.env["DATA"],
  });

  return pool;
} //dbConnection

function isUserAuthenticated(req, res, next) {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect("/");
  }
}

//start server
app.listen(3000, () => {
  console.log("Expresss server running...");
});
