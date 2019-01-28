// Scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Requiring our Comment and Article models
var Comment = require("../models/Comment.js");
var Article = require("../models/Article.js");
var axios = require("axios");

module.exports = function (app) {

  app
    .get('/', function (req, res) {
      res.redirect('/articles');
    });

    app.get("/scrape", function(req, res) {
      // First, we grab the body of the html with axios
      axios.get("https://www.nytimes.com/").then(function(response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);
    
        // Now, we grab every h2 within an article tag, and do the following:
        $("article h2").each(function(i, element) {
          // Save an empty result object
          var result = {};
    
          // Add the text and href of every link, and save them as properties of the result object
          result.title = $(this)
            .children("a")
            .text();
          result.link = $(this)
            .children("a")
            .attr("href");
    
          // Create a new Article using the `result` object built from scraping
          Article.create(result)
            .then(function(Article) {
              // View the added result in the console
              console.log(Article);
            })
            .catch(function(err) {
              // If an error occurred, log it
              console.log(err);
            });
        });
    
        // Send a message to the client
        res.send("Scrape Complete");
      });
    });

  // This will get the articles we scraped from the mongoDB
  app.get("/articles", function (req, res) {
    // Grab every doc in the Articles array
    Article
      .find({}, function (error, doc) {
        // Log any errors
        if (error) {
          console.log(error// Or send the doc to the browser as a json object
          );
        } else {
          res.render("index", {result: doc});
        }
        //Will sort the articles by most recent (-1 = descending order)
      })
      .sort({'_id': -1});
  });

  // Grab an article by it's ObjectId
  app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the
    // matching one in our db...
    Article.findOne({"_id": req.params.id})
    // ..and populate all of the comments associated with it
      .populate("comment")
    // now, execute our query
      .exec(function (error, doc) {
        // Log any errors
        if (error) {
          console.log(error// Otherwise, send the doc to the browser as a json object
          );
        } else {
          res.render("comments", {result: doc});
          // res.json (doc);
        }
      });
  });

  // Create a new comment
  app.post("/articles/:id", function (req, res) {
    // Create a new Comment and pass the req.body to the entry
    Comment
      .create(req.body, function (error, doc) {
        // Log any errors
        if (error) {
          console.log(error// Otherwise
          );
        } else {
          // Use the article id to find and update it's comment
          Article.findOneAndUpdate({
            "_id": req.params.id
          }, {
            $push: {
              "comment": doc._id
            }
          }, {
            safe: true,
            upsert: true,
            new: true
          })
          // Execute the above query
            .exec(function (err, doc) {
              // Log any errors
              if (err) {
                console.log(err);
              } else {
                // Or send the document to the browser
                res.redirect('back');
              }
            });
        }
      });
  });

  app.delete("/articles/:id/:commentid", function (req, res) {
    Comment
      .findByIdAndRemove(req.params.commentid, function (error, doc) {
        // Log any errors
        if (error) {
          console.log(error// Otherwise
          );
        } else {
          console.log(doc);
          Article.findOneAndUpdate({
            "_id": req.params.id
          }, {
            $pull: {
              "comment": doc._id
            }
          })
          // Execute the above query
            .exec(function (err, doc) {
              // Log any errors
              if (err) {
                console.log(err);
              }
            });
        }
      });
  });

};