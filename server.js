// BASE SETUP
// =============================================================================

var express = require('express');        
var app = express();                 
var bodyParser = require('body-parser');
var fs      = require('fs');
var mongoose = require('mongoose');
var databaseURL = 'mongodb://test1:test1@ds011873.mlab.com:11873/rumble';
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;        
var ipaddress = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// connect to our database
mongoose.connect(databaseURL, function (error) {
    // Do things once connected
    if (error) {
        console.log('Database error or database connection error ' + error);
    }
    console.log('Database state is ' + mongoose.connection.readyState);
});

//Models to use when accessing database
var Bear = require('./app/models/bear');
var User = require('./app/models/user');
var Post = require('./app/models/post');
var Pokemon = require('./app/models/pokemon');


// ROUTES FOR OUR API
// =============================================================================
var apiRouter = express.Router();              
var webRouter = express.Router();

//Routes to use for web requests
webRouter.get('/', function (req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.send(fs.readFileSync('./public/index.html'));
});

// middleware to use for all api requests		
apiRouter.use(function (req, res, next) {
    // do logging
    console.log('Request received from ' + req.ip + ' for ' + req.originalUrl);
    next(); // make sure we go to the next routes and don't stop here
});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
apiRouter.get('/', function (req, res) {
    res.json({message: 'Welcome to our API'});
});

// more routes for our API will happen here


//Start Login or Register
//=====================================================
apiRouter.route('/login')

    //Create a user or login (accessed at POST http://localhost:8080/api/login)
    .post(function (req, res) {
		res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		
        var user = new User();      // create a new instance of the User model
        user.userID = req.body.userID;  // set the userID (comes from the request)
        user.pass = req.body.pass;  // set the userID (comes from the request)
        user.token = Date.now().toString() + user.userID;
		
        console.log('Login post request body: ' + req.body);
        console.log('Login post userID, password, and generated token: ' + user.userID + " " + user.pass + " " + user.token);
        
        User.findOne({'userID': user.userID}, 'userID pass', function (err, person) {
			
			//Error Check
            if (err) {
				res.json({message: 'Error encountered: ' + err, loggedInStatus: 0});
                console.log('Error at login api: ' + err);
                return
            }
			//No user with this username found, create a new user
            else if (person == null) {
                
                user.name = "FirstName";
                user.save(function (err, person) {
                    if (err) {
                        res.json({message: 'Error encountered: ' + err, loggedInStatus: 0});
                        console.log('Error encountered while creating user: ' + err);
                    }
					else{
						res.json({message: 'User created!', loggedInStatus: 1, token: user.token, userIndex: person._id});
						console.log("User created!");
					}
                });
            }
			//Username found and password matches, log in user
            else if (user.userID == person.userID && user.pass == person.pass) {
                person.token = user.token;
                person.save(function (err) {
                    if (err) {
                        res.json({message: 'Error encountered: ' + err, loggedInStatus: 0});
                        console.log('Error encountered while saving user: ' + err);
                    }
					else {
						res.json({message: 'Logged in!', loggedInStatus: 2, token: user.token, userIndex: person._id});
					}
                });
            }
			//Username found, pasword does not match, reject log in
            else if (user.userID == person.userID) {
                console.log("Incorrect Password");
                res.json({message: 'Incorrect password', loggedInStatus: -1});
            }
        });

    })
//End Login or Register
//=====================================================

//Start Post
//=====================================================
apiRouter.route('/post')

    // edit user profile (accessed at POST http://localhost:8080/api/post)
    .post(function (req, res) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        User.findById(req.body.userIndex, function (err, person) {

            if (err){
                res.json({message: 'Error encountered: ' + err, status: 0});
                console.log('Error at post api: ' + err);
				return
			}
            else if (req.body.token == person.token) {
                var post = new Post();
                post.userIdx = req.body.userIndex;
                post.url = req.body.url;
                post.dateSubmitted = Date.now();
				Post.findOne({'url': post.url}, 'userIdx url', function (err, dbPost) {
					if(dbPost == null) {
						post.save(function (err, posted) {
							if (err) {
								res.json({message: 'Error encountered: ' + err, status: 0});
								console.log('Error at post saving: ' + err);
							}
							else {
								res.json({message: 'Post created!', status: 1, post: post._id});
								console.log("Post created!");
								var myarr = person.posts;
								myarr.push(posted._id);
								person.posts = myarr;
								person.save(function (err, posted) {
									if (err) {
										res.json({message: 'Error encountered: ' + err, status: 0});
										console.log('Error encountered while saving user: ' + err);
									}
									else {
										res.json({message: 'User updated', status: 1});
									}
								});
							}
						});
					}
					else
					{
						res.json({message:'Post exists', status: -1, post: dbPost._id});
						console.log('Post already exists: ' + dbPost._id + ' ' + dbPost.url);
					}
				});
                


            }
            else {
                res.json({message: 'Invalid username and token combination', status: 0});
                console.log('Invalid username and token combination at post api');
            }
        });
    });
	
//End Post
//=======================================================

//Start Like Post
//=====================================================
apiRouter.route('/likePost')

    // edit user profile (accessed at POST http://localhost:8080/api/likePost)
    .post(function (req, res) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        User.findById(req.body.userIndex, function (err, person) {

            if (err){
                res.json({message: 'Error encountered: ' + err, status: 0});
                console.log('Error at post api: ' + err);
				return
			}
            else if (req.body.token == person.token) {
                var post = new Post();
                post._id = req.body.postIndex;
                liked = req.body.liked;
				Post.findById(req.body.postIndex, function (err, dbPost) {
					if (err){
						res.json({message: 'Error, post not found: ' + err, status: 0});
						console.log('Error at likePost api, post not found: ' + err);
						return
					}
					else if(dbPost._id.toString() == post._id) {
						if(liked == 1)
						{
							if(dbPost.liked.indexOf(person._id) > -1)
							{
								
							}
							else
							{
								var myarr = dbPost.liked;
								myarr.push(person._id);
								dbPost.liked = myarr;
							}
							
							if(person.liked.indexOf(dbPost._id) > -1)
							{
								
							}
							else
							{
								var myarr = person.liked;
								myarr.push(dbPost._id);
								person.liked = myarr;
							}
						}
						else if(liked == 0)
						{
							var array = dbPost.liked;
							var likedIndex = array.indexOf(person._id);
							if(likedIndex > -1){
								array.splice(likedIndex, 1);
								dbPost.liked = array;
							}
							
							var array = person.liked;
							var likedIndex = array.indexOf(dbPost._id);
							if(likedIndex > -1){
								array.splice(likedIndex, 1);
								person.liked = array;
							}
						}
						else
						{
							res.json({message: 'Invalid argument'});
							console.log('Invalid argument at likePost');
						}
						
						dbPost.save(function (err, posted) {
							if (err) {
								res.json({message: 'Error encountered: ' + err, status: 0});
								console.log('Error at post saving: ' + err);
							}
							else {
								res.json({message: 'Post saved!', status: '1'});
								console.log("Post saved!");
								
								person.save(function (err, posted) {
									if (err) {
										res.json({message: 'Error encountered: ' + err, status: 0});
										console.log('Error encountered while saving user: ' + err);
									}
									else {
										res.json({message: 'User updated', status: 1});
									}
								});
							}
						});
					}
					else
					{
						res.json({message:'Post not found', status: 0});
						console.log('Post not found');
					}
				});
            }
            else {
                res.json({message: 'Invalid username and token combination', status: 0});
                console.log('Invalid username and token combination at post api');
            }
        });
    });
	
//End Like Post
//=======================================================

//Start Add/Remove Friend
//=====================================================
apiRouter.route('/addRemoveFriend')

    // edit user profile (accessed at POST http://localhost:8080/api/addRemoveFriend)
    .post(function (req, res) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        User.findById(req.body.userIndex, function (err, person) {

            if (err){
                res.json({message: 'Error encountered: ' + err, status: 0});
                console.log('Error at post api: ' + err);
				return
			}
            else if (req.body.token == person.token) {
				User.findOne({'userID': req.body.friendName}, 'userID pass', function (err, friend) {	
				
					if (err){
						res.json({message: 'Error encountered: ' + err, status: 0});
						console.log('Error at friend api: ' + err);
						return
					}
					else if(friend == null)
					{
						res.json({message: 'Invalid friend name', status: 0});
						console.log('Invalid friend name');
					}
					else
					{
						if(req.body.addRemove == 1)
						{
							if(person.friends.indexOf(friend._id) > -1)
							{
								
							}
							else
							{
								var myarr = person.friends;
								myarr.push(friend._id);
								person.friends = myarr;
							}
						}
						else if(req.body.addRemove == -1)
						{
							var array = person.friends;
							var friendIndex = array.indexOf(friend._id);
							if(friendIndex > -1){
								array.splice(friendIndex, 1);
								person.friends = array;
							}
						}
						else
						{
							res.json({message: 'Invalid argument'});
							console.log('Invalid argument at likePost');
						}
						
						person.save(function (err, posted) {
							if (err) {
								res.json({message: 'Error encountered: ' + err, status: 0});
								console.log('Error encountered while saving user: ' + err);
							}
							else {
								res.json({message: 'User updated', status: 1});
							}
						});
					}
				});
            }
            else {
                res.json({message: 'Invalid username and token combination', status: 0});
                console.log('Invalid username and token combination at post api');
            }
        });
    });
	
//End Add/Remove Friend
//=======================================================

//Start Friends that liked post
//=====================================================
apiRouter.route('/friendsThatLikedPost')

    // edit user profile (accessed at POST http://localhost:8080/api/friendsThatLikedPost)
    .post(function (req, res) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        User.findById(req.body.userIndex, function (err, person) {

            if (err){
                res.json({message: 'Error encountered: ' + err, status: 0});
                console.log('Error at friends that liked post api: ' + err);
				return
			}
            else if (req.body.token == person.token) {
				Post.findById(req.body.postIndex, function (err, dbPost) {	
				
					if (err){
						res.json({message: 'Error encountered: ' + err, status: 0});
						console.log('Error at friends that liked post api: ' + err);
						return
					}
					else if(dbPost == null)
					{
						res.json({message: 'Invalid post id', status: 0});
						console.log('Invalid post id');
					}
					else
					{
						var likedList = [];
						var arrayLength = person.friends.length;
						for(var i = 0; i < arrayLength; i++) {
							if(dbPost.liked.indexOf(person.friends[i]) > -1)
							{
								likedList.push(person.friends[i]);
							}
						}
						res.json({data: likedList, status: 1});
						console.log('Number of friends that liked post: ' + likedList.length);
					}
				});
            }
            else {
                res.json({message: 'Invalid username and token combination', status: 0});
                console.log('Invalid username and token combination at post api');
            }
        });
    });
	
//End Friends that liked post
//=======================================================

//Start Posts user liked
//=====================================================
apiRouter.route('/postsLikedBy/:userID')

    // get the posts liked by that id (accessed at GET http://localhost:8080/api/postsLikedBy/userID)
    .get(function (req, res) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        
		User.findById(req.params.userID, function (err, person) {

            if (err) {
                res.json({message: 'Error encountered: ' + err, status: 0});
                console.log('Error at posts liked by id api: ' + err);
				return
			}
			else if(person == null)
			{
				res.json({message: 'User does not exist', status: 0});
                console.log('User does not exist');
			}
			else
			{
				res.json({data: person.liked, status: 1});
                console.log('User found');
			}
        });
    });
	
//End Posts user liked
//=======================================================

//Start Posts user posted
//=====================================================
apiRouter.route('/postedBy/:userID')

    // get the posts liked by that id (accessed at GET http://localhost:8080/api/postedBy/userID)
    .get(function (req, res) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        
		User.findById(req.params.userID, function (err, person) {

            if (err) {
                res.json({message: 'Error encountered: ' + err, status: 0});
                console.log('Error at posted by id api: ' + err);
				return
			}
			else if(person == null)
			{
				res.json({message: 'User does not exist', status: 0});
                console.log('User does not exist');
			}
			else
			{
				res.json({data: person.posts, status: 1});
                console.log('User found');
			}
        });
    });
	
//End Posts user posted
//=======================================================

//Start Posts for user
//=====================================================
apiRouter.route('/browsePosts/:userID/token/:token')

    // get the posts liked by that id (accessed at GET http://localhost:8080/api/browsePosts/userID/token/token)
    .get(function (req, res) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        
		User.findById(req.params.userID, function (err, person) {

            if (err) {
                res.json({message: 'Error encountered: ' + err, status: 0});
                console.log('Error at posted by id api: ' + err);
				return
			}
			else if(person == null)
			{
				res.json({message: 'User does not exist', status: 0});
                console.log('User does not exist');
			}
			else if(person.token == req.params.token)
			{
				var d = new Date();
				d.setDate(d.getDate()-30);
				Post.find({dateSubmitted: {$gte: d}}, function(err, dates) {
					if (err) {
					res.json({message: 'Error encountered in browsing posts: ' + err, status: 0});
					console.log('Error at browsing posts: ' + err);
					return
					}
					else
					{
						var postIds = [];
						for(var i = 0; i < dates.length; i++)
						{
							postIds.push(dates[i]._id);
						}
						res.json({data: postIds, status: 1});
						
					}
				});
				
			}
			else
			{
				res.json({message: 'Invalid username and token combination', status: 0});
                console.log('Invalid username and token combination at post api');
			}
        });
    });
	
//End Posts for user
//=======================================================

//Start pokemapSubmit
//=====================================================
apiRouter.route('/pokemapSubmit/:pokemon/:lat/:longi')

    // get the posts liked by that id (accessed at GET http://localhost:8080/api/pokemapSubmit/pokemon/lat/longi)
    .get(function (req, res) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        var myPokemon = new Pokemon();
		Pokemon.findOne({'name': req.params.pokemon}, function (err, pokemon) {
			var pokemonName = req.params.pokemon;
			var pokemonLat = req.params.lat;
			var pokemonLongi = req.params.longi;
			var pokemonTime = Date.now();

            if (err) {
                res.json({message: 'Error encountered: ' + err, status: 0});
                console.log('Error at posted by id api: ' + err);
				return
			}
			else if(pokemon == null)
			{
				console.log(pokemonName);
				myPokemon.name = pokemonName;
				myPokemon.lat = [pokemonLat];
				myPokemon.longi = [pokemonLongi];
				myPokemon.time = [pokemonTime];
                myPokemon.save(function (err, savedPokemon) {
                    if (err) {
                        res.json({message: 'Error encountered: ' + err, loggedInStatus: 0});
                        console.log('Error encountered while creating user: ' + err);
                    }
					else{
						res.json({message: 'Pokemon created!', status: 1, pokemonid: savedPokemon._id});
						console.log("Pokemon created!");
					}
                });
			}
			else
			{
				var latarr = pokemon.lat;
				console.log(pokemonLat);
				console.log(pokemon.lat[0])
				latarr.push(pokemonLat);
				pokemon.lat = latarr;
				
				var longiarr = pokemon.longi;
				longiarr.push(pokemonLongi);
				pokemon.longi = longiarr;
				
				var timearr = pokemon.time;
				timearr.push(pokemonTime);
				pokemon.time = timearr;
				
				pokemon.save(function (err, posted) {
						if (err) {
							res.send(err);
							console.log(err);
						}
				});
				
				res.json({status: 1});
                console.log('Pokemon sighting added');
			}
        });
    });
	
//End pokemapSubmit
//=======================================================

//Start pokemapFind
//=====================================================
apiRouter.route('/pokemapFind/:pokemon')

    // get the posts liked by that id (accessed at GET http://localhost:8080/api/pokemapFind/pokemon)
    .get(function (req, res) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        var myPokemon = new Pokemon();
		Pokemon.findOne({'name': req.params.pokemon}, function (err, pokemon) {

            if (err) {
                res.json({message: 'Error encountered: ' + err, status: 0});
                console.log('Error at posted by id api: ' + err);
				return
			}
			else if(pokemon == null)
			{
				
				res.json({message: 'Pokemon not found!', status: 0});
				console.log("Pokemon not found!");
			
			}
			else
			{
				
				res.json({message: 'Pokemon found!', status: 1, lat: pokemon.lat, longi: pokemon.longi, time: pokemon.time});
                console.log('Pokemon found');
			}
        });
    });
	
//End pokemapFind
//=======================================================

//Start pokemapNearMe
//=====================================================
apiRouter.route('/pokemapNearMe/:lat/:longi')

    // get the posts liked by that id (accessed at GET http://localhost:8080/api/pokemapNearMe/lat/longi)
    .get(function (req, res) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        // var myPokemon = new Pokemon();
		// Pokemon.findOne({'name': req.params.pokemon}, function (err, pokemon) {

            // if (err) {
                // res.json({message: 'Error encountered: ' + err, status: 0});
                // console.log('Error at posted by id api: ' + err);
				// return
			// }
			// else if(pokemon == null)
			// {
				
				// res.json({message: 'Pokemon not found!', status: 0});
				// console.log("Pokemon not found!");
			
			// }
			// else
			// {
				// var latarr = pokemon.lat;
				// console.log(pokemonLat);
				// console.log(pokemon.lat[0])
				// latarr.push(pokemonLat);
				// pokemon.lat = latarr;
				
				// var longiarr = pokemon.longi;
				// longiarr.push(pokemonLongi);
				// pokemon.longi = longiarr;
				
				// var timearr = pokemon.time;
				// timearr.push(pokemonTime);
				// pokemon.time = timearr;
				
				// pokemon.save(function (err, posted) {
						// if (err) {
							// res.send(err);
							// console.log(err);
						// }
				// });
				
				// res.json({message: 'Pokemon found!', status: 1, lat: pokemon.lat, longi: pokemon.longi, time: pokemon.time});
                // console.log('Pokemon found');
			// }
        // });
		res.json({message:'Not yet implemented'})
    });
	
//End pokemapNearMe
//=======================================================


apiRouter.route('/profile/:userID')

    // get the profile with that id (accessed at GET http://localhost:8080/api/profile/userID)
    .get(function (req, res) {
        User.findById(req.params.userID, function (err, person) {

            if (err)
                res.send(err);

            var user = new User();
            user.name = person.name;
            user.age = person.age;
            user.occupation = person.occupation;
            user.company = person.company;
            user._id = person._id;
            user.profilePic = person.profilePic;
            user.profileBackground = person.profileBackground;
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            res.json(user);
        });
    });

apiRouter.route('/myProfile/:userIndex/token/:token')

    // get the profile with that id (accessed at GET http://localhost:8080/api/myProfile/userID/token/token)
    .get(function (req, res) {
        User.findById(req.params.userIndex, function (err, person) {

            if (err)
                res.send(err);
            if (req.params.token == person.token) {
                var user = new User();
                user.name = person.name;
                user.age = person.age;
                user.occupation = person.occupation;
                user.company = person.company;
                user.posts = person.posts;
                user.profilePic = person.profilePic;
                user.profileBackground = person.profileBackground;
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                res.json(user);
            }
            else {
                res.json({message: "Invalid Token"});
            }
        });
    });

apiRouter.route('/myFriends/:userIndex/token/:token')

    // get the profile with that id (accessed at GET http://localhost:8080/api/myProfile/userID/token/token)
    .get(function (req, res) {
        User.findById(req.params.userIndex, function (err, person) {

            if (err)
                res.send(err);
            if (req.params.token == person.token) {
                var user = new User();
                user.friends = person.friends;
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                res.json(user);
            }
            else {
                res.json({message: "Invalid Token"});
            }
        });
    });

apiRouter.route('/removeMatch/:userIndex/token/:token/postId/:postId/match/:match')

    // get the profile with that id (accessed at GET http://localhost:8080/api/myProfile/userID/token/token)
    .get(function (req, res) {
        User.findById(req.params.userIndex, function (err, person) {


            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            if (err)
                res.send(err);

            if (req.params.token == person.token) {
                Post.findById(req.params.postId, function (err, post) {
                    if (post.userIdx == req.params.userIndex) {
                        var interest = post.interest;
                        var index = interest.indexOf(req.params.match);
                        if (index == -1) {
                            res.json({message: "Value not found"});
                        }
                        else {
                            interest.splice(index, 1);
                            post.interest = interest;
                            post.save(function (err, post) {
                                if (err) {
                                    res.send(err);
                                    console.log(err);
                                }
                                res.json({message: "Successfully removed user"});
                            });
                        }
                    }
                })

            }
            else {
                res.json({message: "Invalid Token"});
            }
        });
    });

apiRouter.route('/post')

    // edit user profile (accessed at POST http://localhost:8080/api/post)
    .post(function (req, res) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        User.findById(req.body.userIndex, function (err, person) {

            if (err)
                res.send(err);
            if (req.body.token == person.token) {
                var post = new Post();
                post.userIdx = req.body.userIndex;
                post.activity = req.body.activity;
                post.place = req.body.place;
                post.meet = req.body.meet;
                post.finish = req.body.finish;
                post.msg = req.body.msg;
                post.postBackground = req.body.postBackground;
                post.save(function (err, posted) {
                    if (err) {
                        res.send(err);
                        console.log(err);
                    }

                    res.json({message: 'Post created!', success: '1'});
                    console.log("Post created!");
                    var myarr = person.posts;
                    myarr.push(posted._id);
                    person.posts = myarr;
                    var myarr2 = person.seen;
                    myarr2.push(posted._id);
                    person.seen = myarr2;

                    person.save(function (err, posted) {
                        if (err) {
                            res.send(err);
                            console.log(err);
                        }
                    });
                });


            }
            else {
                res.json({message: "Invalid Token"});
            }
        });


    });


apiRouter.route('/postInterest')

    // edit post interest list (accessed at POST http://localhost:8080/api/postInterest)
    .post(function (req, res) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        User.findById(req.body.userIndex, function (err, person) {

            if (err)
                res.send(err);
            if (req.body.token == person.token) {
                Post.findById(req.body.postId, function (err, post) {
                    if (err)
                        res.send(err);
                    var interestArray = post.interest;
                    interestArray.push(req.body.userIndex);
                    post.interest = interestArray;
                    post.save(function (err, posted) {
                        if (err) {
                            res.send(err);
                            console.log(err);
                        }

                        res.json({message: 'Interest added!', success: '1'});
                        console.log("Interest added!");
                    });

                });

            }
            else {
                res.json({message: "Invalid Token"});
            }
        });


    });

apiRouter.route('/post/:userID/token/:token')
    .get(function (req, res) {
        User.findById(req.params.userID, function (err, person) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

            if (err)
                res.send(err);
            if (req.params.token == person.token) {
                Post.find({}, function (err, docs) {
                    if (err) {
                        console.log(err);
                    }
                    var filtered = docs.filter(function (doc) {
                        return (person.seen.indexOf(doc._id) === -1);
                    });
                    if (filtered.length != 0) {
                        User.findById(filtered[0].userIdx, function (err, poster) {
                            if (err)
                                res.send(err);

                            //filtered[0].userIdx = "";
                            console.log(filtered);
                            console.log(filtered[0]);
                            console.log(filtered[0]._id);
                            var seenArr = person.seen;
                            seenArr.push(filtered[0]._id);
                            var output = filtered[0].toObject();
                            output.name = poster.name;
                            output.age = poster.age;
                            output.occupation = poster.occupation;
                            output.company = poster.company;
                            output.code = 1;
                            person.seen = seenArr;
                            res.json(output);
                            person.save(function (err, posted) {
                                if (err) {
                                    res.send(err);
                                    console.log(err);
                                }
                            });
                        });
                    }
                    else {
                        res.json({message: "You have seen all posts", code: 0});
                    }
                });

            }
            else {
                res.json({message: "Invalid Token"});
            }
        });
    });

apiRouter.route('/addFriend/:userID/token/:token/friendId/:friendId')
    .get(function (req, res) {
        User.findById(req.params.userID, function (err, person) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

            if (err)
                res.send(err);
            if (req.params.token == person.token) {
                if (person.friends.indexOf(req.params.friendId) == -1) {
                    var myArr = person.friends;
                    myArr.push(req.params.friendId);
                    person.friends = myArr;
                    person.save(function (err, posted) {
                        if (err) {
                            res.send(err);
                            console.log(err);
                        }
                    });

                    User.findById(req.params.friendId, function (err, friend) {
                        var friendArr = friend.friends;
                        friendArr.push(req.params.userID);
                        friend.friends = friendArr;
                        friend.save(function (err, posted) {
                            if (err) {
                                res.send(err);
                                console.log(err);
                            }
                        });
                    });

                    res.send({message: "Friend Added"});
                }
                else {
                    res.send({message: "Friend already added"});
                }
            }
            else {
                console.log("Invalid Token");
                res.json({message: "Invalid Token"});

            }
        });
    });

apiRouter.route('/removeFriend/:userID/token/:token/friendID/:friendId')
    .get(function (req, res) {
        User.findById(req.params.userID, function (err, person) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

            if (err)
                res.send(err);

            if (req.params.token == person.token)
            {
                var myArr = person.friends;
                var index = myArr.indexOf(req.params.friendId);
                if (index != -1)
                {
                    myArr.splice(index, 1);
                    person.friends = myArr;
                    person.save(function (err, posted) {
                        if (err) {
                            res.send(err);
                            console.log(err);
                        }

                    });
                    User.findById(req.params.friendId, function (err, friend) {
                        var myArr = friend.friends;
                        var index = myArr.indexOf(req.params.userID);
                        if (index != -1) {
                            myArr.splice(index, 1);
                            friend.friends = myArr;
                            friend.save(function (err, posted) {
                                if (err) {
                                    res.send(err);
                                    console.log(err);
                                }
                            });
                        }
                    });
                    res.send({message: "Friend Removed"});
                }
                else
                {
                        res.send({message: "No such friend exists"});
                }
            }
            else
            {
                res.json({message: "Invalid Token"});
            }
        }
    );
    });

apiRouter.route('/allMyPosts/:userIndex/token/:token')
    .get(function (req, res) {
        User.findById(req.params.userIndex, function (err, person) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

            if (err)
                res.send(err);
            if (req.params.token == person.token) {
                Post.find({}, function (err, docs) {
                    if (err) {
                        console.log(err);
                    }
                    var filtered = docs.filter(function (doc) {
                        return (person.posts.indexOf(doc._id) != -1);
                    });
                    if (filtered.length != 0) {
                        res.send(filtered);

                    }
                    else {
                        res.json({message: "You have no posts"});
                    }
                });

            }
            else {
                res.json({message: "Invalid Token"});
            }
        });
    });

apiRouter.route('/matches/:userIndex/token/:token/post/:post')
    .get(function (req, res) {
        User.findById(req.params.userIndex, function (err, person) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

            if (err)
                res.send(err);
            if (req.params.token == person.token) {
                Post.findById(req.params.post, function (err, docs) {
                    if (err) {
                        console.log(err);
                    }

                    if (docs.userIdx == req.params.userIndex) {
                        res.send(docs.interest);
                    }
                    else {
                        res.json({message: "You have no matches yet"});
                    }
                });

            }
            else {
                res.json({message: "Invalid Token"});
            }
        });
    });

apiRouter.route('/deleteMyPost/:userIndex/token/:token/post/:post')
    .get(function (req, res) {
        User.findById(req.params.userIndex, function (err, person) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

            if (err)
                res.send(err);
            if (req.params.token == person.token) {
                var posts = person.posts;
                var index = posts.indexOf(req.params.post);
                if (index == -1) {
                    res.json({message: "Value not found"});
                }
                else {
                    posts.splice(index, 1);
                    person.posts = posts;
                    person.save(function (err) {
                        if (err) {
                            res.send(err);
                            console.log(err);
                        }
                    });
                    Post.remove({
                        _id: req.params.post
                    }, function (err, post) {
                        if (err)
                            res.send(err);
                        console.log("Deleted" + post._id);
                        res.json({message: 'Successfully deleted'});
                    });
                }

            }
            else {
                res.json({message: "Invalid Token"});
            }
        });
    });


apiRouter.route('/myProfile')

    // edit user profile (accessed at POST http://localhost:8080/api/myProfile)
    .post(function (req, res) {
        var user = new User();      // create a new instance of the User model
        var userIndex = req.body.userIndex;  // set the userID (comes from the request)
        user.token = req.body.token;  // set the token (comes from the request)
        var name = req.body.name;
        var age = req.body.age;
        var occupation = req.body.occupation;
        var company = req.body.company;
        var profilePic = req.body.profilePic;
        var profileBackground = req.body.profileBackground;
        console.log(req.body);
        console.log(userIndex + " " + user.token);
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        User.findById(userIndex, function (err, person) {

            if (err) {

                console.log(err);
                return
            }
            if (person == null) {

                res.json({message: 'User not found', code: 0});
                console.log("User not found");
            }
            else if (user.token == person.token) {
                res.json({message: 'Authenticated', code: 1});
                person.name = name;
                person.age = age;
                person.occupation = occupation;
                person.company = company;
                person.profilePic = profilePic;
                person.profileBackground = profileBackground;
                person.save(function (err) {
                    if (err) {
                        res.send(err);
                        console.log(err);
                    }
                });
            }
            else {
                console.log("Incorrect token");
                res.json({message: 'Incorrect Token', code: -1});
            }

            //console.log('%s %s is a %s.', person.name.first, person.name.last, person.occupation) // Space Ghost is a talk show host.
        });

    })

    // get all the bears (accessed at GET http://localhost:8080/api/bears)
    // .get(function (req, res) {
        // Bear.find(function (err, bears) {
            // if (err)
                // res.send(err);

            // res.json(bears);
        // });
    // });


// on routes that end in /bears
// ----------------------------------------------------
apiRouter.route('/bears')

    // create a bear (accessed at POST http://localhost:8080/api/bears)
    .post(function (req, res) {

        var bear = new Bear();      // create a new instance of the Bear model
        bear.name = req.body.name;  // set the bears name (comes from the request)

        // save the bear and check for errors
        bear.save(function (err) {
            if (err)
                res.send(err);

            res.json({message: 'Bear created!'});
        });

    })

    // get all the bears (accessed at GET http://localhost:8080/api/bears)
    .get(function (req, res) {
        Bear.find(function (err, bears) {
            if (err)
                res.send(err);

            res.json(bears);
        });
    });

// on routes that end in /bears/:bear_id
// ----------------------------------------------------
apiRouter.route('/bears/:bear_id')

    // get the bear with that id (accessed at GET http://localhost:8080/api/bears/:bear_id)
    .get(function (req, res) {
        Bear.findById(req.params.bear_id, function (err, bear) {
            if (err)
                res.send(err);
            res.json(bear);
        });
    })

    // update the bear with this id (accessed at PUT http://localhost:8080/api/bears/:bear_id)
    .put(function (req, res) {

        // use our bear model to find the bear we want
        Bear.findById(req.params.bear_id, function (err, bear) {

            if (err)
                res.send(err);

            bear.name = req.body.name;  // update the bears info

            // save the bear
            bear.save(function (err) {
                if (err)
                    res.send(err);

                res.json({message: 'Bear updated!'});
            });

        });
    })
    // delete the bear with this id (accessed at DELETE http://localhost:8080/api/bears/:bear_id)
    .delete(function (req, res) {
        Bear.remove({
            _id: req.params.bear_id
        }, function (err, bear) {
            if (err)
                res.send(err);

            res.json({message: 'Successfully deleted'});
        });
    });


// REGISTER OUR ROUTES -------------------------------
// all of our api routes will be prefixed with /api
app.use('/api', apiRouter);
app.use('/', webRouter);
app.use('/',express.static('public'));

// START THE SERVER
// =============================================================================
var http = require('http');
var httpServer = http.createServer(app);

//Socket IO
//========================================================
var io = require('socket.io').listen(httpServer);

sockets = [];
people  = {};

function findUserByName(name) {
    console.log(name);
    for(socketID in people) {
        console.log(people[socketID]);
        if(people[socketID] === name) {
            return test = socketID;
        }
    }
    // return false;
    console.log('not there');
}

io.set('match origin protocol', true);

function findSocketById(id) {
    console.log(id);
    for(i=0; i<sockets.length; i++)
    {
        if(sockets[i].id === id) {
            return test = sockets[i];
        }
    }
    // return false;
    console.log('not there');
}

io.on('connection', function (socket) {
    console.log('a user connected');

    sockets.push(socket);
    socket.on('join', function(name) {
        people[socket.id] = name;
        console.log(people);
    });

    socket.on('disconnect', function () {
        console.log('a user disconnected');
        delete people[socket.id];
        sockets.splice(sockets.indexOf(socket), 1);
    });

    socket.on('startPM',function(message) {
        var reqSocketId = socket.id;
        var toSocketId = findUserByName(message.friend);
        var reqUserId = people[reqSocketId];
        var toUserId = people[toSocketId];
        if(toSocketId) {
            var room = message.room;
            console.log(toUserId);
            //join the anonymous user
            console.log(room);
            socket.join(room);
            //join the registered user
            findSocketById(toSocketId).join(room);
            //notify the client of this
            console.log("PM Started");
            socket.in(room).emit('private room created', room);
        }
    });

    socket.on('privateMessage', function(message)
    {
        socket.in(message.room).emit('messageAdded', {text: people[socket.id] + ': ' + message.text});
    });

    socket.on('messageAdded', function (message) {
        //io.emit('messageAdded', {text: message.text}); // broadcast to all clients
        socket.broadcast.emit('messageAdded', {text: message.text}); // broadcast to all but the sender
    });
})

//Socket IO End
//=========================================================


httpServer.listen(port, ipaddress);

//app.listen(port);
console.log('Magic happens on port ' + port);