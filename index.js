require('dotenv').config()
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const app = express()
const port = process.env.PORT || 3000


app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// validate token
const verify =(req, res, next)=>{
  const token = req.cookies?.token
  if(!token) return res.status(401).send({message: 'You are not authenticated'})
  jwt.verify(token, process.env.DB_JWT_SECURE, function(err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Invalid token' })
    }
    req.body = decoded
    next()
  });
}

// mongodb connect
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zswhz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    const blogsCollection = client.db('Blogs-collection').collection('Blogs')
    const wishlistCollection = client.db('Blogs-collection').collection('wishlist')
    const commentCollection = client.db('Blogs-collection').collection('comment')
    // Jwt Token
    // create jwt token
    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.DB_JWT_SECURE ,{expiresIn:'1hr'})
      res
      .cookie('token', token,{
        httpOnly: true,
        secure:false
      })
      .send({success:true})
    })
    // sign out and token delete
    app.post('/signOut', (req, res) => {
      res
      .clearCookie('token', { httpOnly: true, secure: false })
      .send({success:true});
    })

    // blogsCollection 
    // blogs server get request
    app.get('/blogs', async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search || '';
      let query = {
        title:{
          $regex: search,
          $options: 'i'
        }
      }
      if (filter) query.category=filter
      const result = await blogsCollection.find(query).toArray();
      res.send(result)
    })
    // blogs save post request
    app.post('/add-blogs', async (req, res) => {
      const blog = req.body;
      const result = await blogsCollection.insertOne(blog)
      res.send(result)
    })
    // blogs details post request
    app.get('/unique-blog/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id:new ObjectId(id) }
      const result = await blogsCollection.findOne(query)
      res.send(result)
    })
    // update blogs
    app.put('/unique-blog/:id', async (req, res) => {
      const id = req.params.id;
      const updateBlog = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: updateBlog,
      }
      const result = await blogsCollection.updateOne(filter, updateDoc, options);
      res.send(result)
    })

    // wishlistCollection
    // wishlist server get request
    app.get('/wishlist', async (req, res) => {
      const result = await wishlistCollection.find().toArray();
      res.send(result)
    })
    // wishlist save post request
    app.post('/add-wishlist', async (req, res) => {
      const wishlist = req.body;
      const result = await wishlistCollection.insertOne(wishlist)
      res.send(result)
    })

    // user wishlist data
    app.get('/wishlist/:email', async (req, res) => {
      const email = req.params.email
      const query ={email: email}
      const result = await wishlistCollection.find(query).toArray();
      res.send(result)
    })

    app.delete('/delete/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id:new ObjectId(id) }
      const result = await wishlistCollection.deleteOne(query);
      res.send(result)
    })


    // commentCollection  
    // comment server get request
    app.get('/comment', async (req, res) => {
      const result = await commentCollection.find().toArray();
      res.send(result)
    })
    // comment save post request
    app.post('/add-comment', async (req, res) => {
      const comment = req.body;
      const result = await commentCollection.insertOne(comment)
      res.send(result)
    })
    // comment get request
    app.get('/comments/:id', async (req, res) => {
      const blogId  = req.params.id
      const query = {blog_id: blogId }
      const result = await commentCollection.find(query).toArray();
      res.send(result)
    })
    
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Travel blog server!')
})

app.listen(port, () => {
  console.log(`Travel blog server Running on port ${port}`)
})