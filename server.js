const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const pool = require('./db');
const path = require('path');
var request = require('request');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs'); // Import fs module
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(bodyParser.json());




// Setup multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public', 'images');
    
    // Check if directory exists, if not, create it
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}_${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// GET all services
app.get('/api/services', async (req, res) => {
  try {
    const query = 'SELECT * FROM services';
    const result = await pool.query(query);
    

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services from the database' });
  }
});

// POST endpoint to add a new service
app.post('/api/services', upload.single('image'), async (req, res) => {
  const { name, description, price, elevation, duration } = req.body;
  const image = req.file ? `/images/${req.file.filename}` : null;

  if (!name || !price || !image || !elevation || !duration) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const newService = {
      name,
      description,
      price,
      image: {
        url: image,
      },
      elevation,
      duration,
    };

    // Insert the new service into the database
    const result = await pool.query(
      'INSERT INTO services (name, description, price, image_url, elevation, duration) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, price, image, elevation, duration]
    );

    const insertedService = result.rows[0];
    res.status(201).json(insertedService);
  } catch (error) {
    console.error('Error inserting service into database:', error);
    res.status(500).json({ error: 'Failed to add service to the database' });
  }
});

app.post('/api/payment',  (req,res) => {
  const { amount, purchaseOrderId, purchaseOrderName, customerInfo } = req.body;

  var options = {
    'method': 'POST',
    'url': 'https://a.khalti.com/api/v2/epayment/initiate/',
    'headers': {
      'Authorization': ' Key a479669f7ed341e6b949703468226895',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "return_url": "http://localhost:5000/api/payment/callback",
    "website_url": "https://example.com/",
    "amount": amount,
    "purchase_order_id": purchaseOrderId,
    "purchase_order_name": purchaseOrderName,
    "customer_info": customerInfo
    })
  }
  request(options, function(error,response) {
    if (error) 
    {
      console.error('Error:', error);
      return response.status(500).send('Internal Server Error');
    }
    console.log(response.body)
    res.send(response.body); // Send the response body back to the client
    
  })
})

app.delete('/api/services/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if the service exists
    const findQuery = 'SELECT * FROM services WHERE id = $1';
    const findResult = await pool.query(findQuery, [id]);
    const serviceToDelete = findResult.rows[0];

    if (!serviceToDelete) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Delete the service from the database
    const deleteQuery = 'DELETE FROM services WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

app.get('/api/payment/callback', async(req, res) => {
  const {
    pidx,
    tnxId,
    amount,
    total_amount,
    status, 
    mobile,
    tidx,
    purchase_order_id,
    purchase_order_name,
    transaction_id
  } = req.query

  console.log('Callback received:' , req.query)
try {
  // save the payment data to your database
  const client = await pool.connect();
  const query = 'INSERT INTO payments (pidx, tnxId, amount, total_amount, status, mobile, tidx, purchase_order_id, purchase_order_name, transaction_id) VALUES ($1, $2, $3, $4, $5,$6, $7, $8, $9, $10) RETURNING *'
  const result = await client.query(query, [pidx, tnxId, amount, total_amount, status, mobile, tidx, purchase_order_id, purchase_order_name, transaction_id]);
 client.release();
 res.send({ message: 'Payment successful', data: result.rows[0]})
  if (status === 'Completed') {
    res.send('Payment complted successfullu')
  }else if (status === 'User canceled') {
    // Handle canceled payment
    res.send('Payment was canceled by the user');
  } else {
    // Handle other statuses
    res.send(`Payment status: ${status}`);
  }
} catch(error) {
  res.send(error.message);
}
})

app.get('/api/services', (req, res) => {
  res.json(services);
});

app.get('/api/services/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
    const product = result.rows[0];

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/services/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { name, description, price, elevation, duration } = req.body;
  const image = req.file ? `/images/${req.file.filename}` : null;

  if (!name || !price || !elevation || !duration) {
    return res.status(400).json({ error: 'All fields except image are required' });
  }

  try {
    // Check if the service exists
    const findQuery = 'SELECT * FROM services WHERE id = $1';
    const findResult = await pool.query(findQuery, [id]);
    const serviceToUpdate = findResult.rows[0];

    if (!serviceToUpdate) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Update the service in the database
    const updateQuery = `
      UPDATE services 
      SET name = $1, description = $2, price = $3, image_url = $4, elevation = $5, duration = $6 
      WHERE id = $7 
      RETURNING *
    `;
    const updateValues = [name, description, price, image, elevation, duration, id];
    const result = await pool.query(updateQuery, updateValues);
    const updatedService = result.rows[0];

    res.json(updatedService);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});


app.post('/api/signup', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  try {
    const client = await pool.connect();
    const query = 'INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING *';
    const result = await client.query(query, [username, email, password]);
    client.release();
    res.status(201).json({ message: 'User signed up successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: 'An error occurred while signing up' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await pool.query('SELECT * FROM users WHERE username=$1 AND password=$2', [username, password]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const userInfo = user.rows[0];
    const userData = {
      id: userInfo.id,
      username: userInfo.username,
      email: userInfo.email,
      isAdmin: userInfo.isadmin,
    };
    res.status(200).json({ message: 'Login successful', user: userData });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      postalCode,
      country,
      state,
      requirements,
      payment,
      adults,
      username,
      service_name
    } = req.body;

    // Insert the data into your PostgreSQL database
    await pool.query({
      text: `
        INSERT INTO bookings (username, service_name, first_name, last_name, email, phone, address, city, postal_code, country, state, requirements, payment, adults)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `,
      values: [username, service_name, firstName, lastName, email, phone, address, city, postalCode, country, state, requirements, payment, adults],
    });

    res.status(201).json({ message: 'Booking created successfully' });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/admin/bookings', async (req, res) => {
  try {
    // Fetch bookings data from the database
    const bookings = await pool.query('SELECT id, username, service_name, email, phone, country, adults, payment, address FROM bookings');
    res.json(bookings.rows); // Return the bookings data as JSON response
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/admin/payments', async (req, res) => {
  try {
    // Fetch bookings data from the database
    const payments = await pool.query('SELECT id, transaction_id, total_amount, status, mobile, purchase_order_name, purchase_order_id FROM payments');
    res.json(payments.rows); // Return the bookings data as JSON response
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
