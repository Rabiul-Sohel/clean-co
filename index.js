require('dotenv').config();
const express = require('express');
const axios = require('axios')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
// Application settings
const app = express();
const port = 5000;

//parsers
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ndy3clf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    client.connect();

    const serviceCollection = client.db('carDoctor').collection('services');
    const orderCollections = client.db('carDoctor').collection('orders');
    const bookingCollection = client.db('carDoctor').collection('bookings');
    const productCollection = client.db('emaJohnDB').collection('products')

    const verifyToken = (req, res, next) => {
      const token = req?.cookies?.token;
      // console.log({ token });
      if (!token) {
        return res.status(401).send({ message: 'unauthorized access' });
      }

      jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
        // console.log(err, decoded);
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' });
        }

        req.user = decoded;  
        next();
      });
    };

    // CREATE SERVICE
    app.post('/api/v1/services', async (req, res) => {
      const service = req.body;
      const result = await serviceCollection.insertOne(service);
      res.send(result);
    });

    // GET ALL SERVICES
    app.get('/api/v1/services', async (req, res) => {
      // console.log(req.cookies);
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //GET SINGLE SERVICE
    app.get('/api/v1/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.findOne(query);
      res.send(result);  
    });  
  
    // UPDATE SERVICE
    app.patch('/api/v1/services/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedService = req.body;

      const updateDoc = {
        $set: {
          ...updatedService,
        },
      };
      const result = await serviceCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // DELETE SERVICE
    app.delete('api/v1/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollection.deleteOne(query);

      res.send(result);
    });

    // CREATE BOOKING
    app.post('/api/v1/bookings', async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // GET SINGLE BOOKINGS
    app.get('/api/v1/bookings', verifyToken, async (req, res) => {
      const userEmail = req.query?.email; 
      // console.log(userEmail);
      // console.log(req.user.email);

      if (userEmail !== req.user.email) {
        return res
          .status(403)
          .send({ message: 'You are not allowed to access !' });
      }
      let query = {}; //get all bookings  
      if (req.query?.email) {
        query.email = userEmail;
      }

      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // UPDATE BOOKING
    app.patch('/api/v1/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const updatedBooking = req.body;
      console.log(updatedBooking);

      const updateDoc = {
        $set: {
          ...updatedBooking,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // DELETE BOOKING
    app.delete('/api/v1/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    
    // GET PRODUCTS 
    app.get('/api/v1/products', async(req, res)=>{
      const page = parseInt(req.query.page);
      const limit = parseInt(req.query.limit);
      const skip = (page - 1) * limit;
      const totalProducts = await productCollection.countDocuments()
     
      const totalPages = Math.ceil(totalProducts / limit)
      
      const result = await productCollection.find()
      .skip(skip)
      .limit(limit)
      .toArray()
      res.send({
        totalProducts,
        totalPages,
        data: result,

      })   
    })
    

    app.post('/api/v1/auth/access-token',  (req, res) => {
      
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {expiresIn: '2h'});
      res.cookie('token', token, {
          httpOnly: true,
          sameSite: 'none',
          expires: new Date(Date.now() + 86400000 * 30),
          secure:true,
          maxAge: 1000000000000
        })
        .send({ success: true });
    });

    app.post('/api/v1/auth/logout', async (req, res) => {
      const user = req.body;

      res.clearCookie('token').send({ success: true });
    });

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
