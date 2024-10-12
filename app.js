var express = require("express");
var http = require("http");
var path = require("path");
var bodyParser = require("body-parser");
var app = express();
var server = http.createServer(app);
const { MongoClient } = require("mongodb");
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, "./public")));

const uri =
  "mongodb+srv://s4060921:test123test123@dba-cluster.d1rzg.mongodb.net/?retryWrites=true&w=majority&appName=DBA-Cluster";
const client = new MongoClient(uri);
let db;

async function startServer() {
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB");

    db = client.db("MyDB");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

startServer();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Home page
app.get("/", async (req, res) => {
  try {
    // get 20 random properties
    const properties = await db.collection("listingsAndReviews")
      .aggregate([{ $sample: { size: 20 } }])
      .toArray();

      res.render("index", {
        properties: properties,
        location: '',
        propertyType: '',
        bedrooms: ''
      });
  } catch (error) {
    console.error("Error fetching properties listing:", error);
    res.status(500).send("An error occurred while fetching properties properties.");
  }
});

// Search functionality
app.post("/search", async (req, res) => {
  try {
    const { location, propertyType, bedrooms } = req.body;

    let query = {};
    if (location) {
      query['address.market'] = { $regex: new RegExp(location, "i") };
    }

    if (propertyType) {
      query.property_type = propertyType;
    }

    if (bedrooms) {
      query.bedrooms = parseInt(bedrooms);
    }

    const searchResults = await db.collection("listingsAndReviews")
      .find(query)
      .limit(20)
      .toArray();

      const totalResults = await db.collection("listingsAndReviews").countDocuments(query);

      res.render("index", {
        properties: searchResults,
        location,
        propertyType,
        bedrooms,
        totalResults 
      });
  } catch (error) {
    console.error("Error fetching search results:", error);
    res.status(500).send("An error occurred while searching for properties.");
  }
});

// Booking page
app.get("/booking/:listing_id", (req, res) => {
  const listing_id = req.params.listing_id
  res.render("booking", {
    listing_id : listing_id
  });
});

// booking functionality
app.post('/book/:listing_id', async (req, res) => {
  const propertyId = req.params.listing_id;
  console.log('Booking for property ID:', propertyId);
  
  const { checkin, checkout, name, email, mobile, postalAddress, residentialAddress } = req.body;

  const booking_info = {
    arrival_date: new Date(checkin).toISOString(),
    departure_date: new Date(checkout).toISOString(),
    client: {
      name: name,
      email_address: email,
      mobile_number: mobile,
      postal_address: postalAddress,
      home_address: residentialAddress,
    }
  };
  try {
    await db.collection('listingsAndReviews').updateOne(
      { _id: propertyId },
      { $push: { bookings: booking_info } }
    );

    res.redirect(`/booking-confirmation/${propertyId}`);
  } catch (error) {
    console.error('Error saving booking:', error);
    res.status(500).send('An error occurred while saving your booking.');
  }
});

// confirmation page
app.get('/booking-confirmation/:listing_id', (req, res) => {
  const propertyId = req.params.listing_id;
  res.render('booking-confirmation', { propertyId });
});

server.listen(3000, function () {
  console.log("Server listening on port: 3000");
});
