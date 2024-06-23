const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const pool = require('./db');
const path = require('path');
var request = require('request');

const crypto = require('crypto');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios'); // Import axios
const e = require('express');

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(bodyParser.json());

const SECRET_KEY = '8gBm/:&EnhH.1/q';
const randomNum = Math.random();

const services = [
  {
    id: 1,
    name: 'Product 1',
    description: 'Description for Product 1',
    price: '28',
    image: {
      url: '/manag.jpg',
      width: 350,
      height: 350
    },
    elevation: '2000-5000m',
    duration: '8 days tour',
    thumbnail_text: 'Ride to manang'
  },
  {
    id: 2,
    name: 'Product 2',
    description: 'Description for Product 2',
    price: '30',
    image: {
      url: '/dreambike.jpg',
      width: 350,
      height: 350
    },
    elevation: '1000-2000m',
    duration: '5 days tour',
    thumbnail_text: 'Dream bike tour'
  },
  // other services...
];

// // esewa Payment endpoint
// app.post('/api/payment', async (req, res) => {
//   try {
//     const { amount, productCode, transactionUuid, ...otherData } = req.body;

//     // Prepare request data for eSewa
//     const data = {
//       amount,
//       tax_amount: 0, // Assuming no tax
//       product_code: productCode || '1234',
//       product_service_charge: 0,
//       product_delivery_charge: 0,
//       total_amount: amount,
//       transaction_uuid: transactionUuid || randomNum,
//       success_url: 'https://esewa.com.np', // Replace with your success URL
//       failure_url: 'https://instagram.com', // Replace with your failure URL
//       signed_field_names: 'total_amount,transaction_uuid,product_code',
//     };

//     // Generate HMAC signature
//     const signature = generateSignature(data, SECRET_KEY);
//     data.signature = signature;

//      // Forward the request to eSewa API
//      const esewaResponse = await axios.post('https://rc-epay.esewa.com.np/api/epay/main/v2/form', data, {
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });

//     res.json(esewaResponse.data); // Send the data to the client
//     console.log(esewaResponse.data)

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// // Function to generate HMAC signature
// function generateSignature(data, secretKey) {
//   const signedFieldNames = data.signed_field_names.split(',');
//   let signatureData = '';
//   signedFieldNames.forEach(field => {
//     signatureData += `${field}=${data[field]},`;
//   });
//   signatureData = signatureData.slice(0, -1); // Remove the trailing comma

//   return crypto.createHmac('sha256', secretKey).update(signatureData).digest('base64');
// }

// initiating a payment request

app.post('/api/payment',  (req,res) => {
  var options = {
    'method': 'POST',
    'url': 'https://a.khalti.com/api/v2/epayment/initiate/',
    'headers': {
      'Authorization': ' Key 4d1b705d7843491081effd1114d4c5ce',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "return_url": "http://localhost:5000/api/payment/callback",
    "website_url": "https://example.com/",
    "amount": "1000",
    "purchase_order_id": "Order01",
    "purchase_order_name": "test",
    "customer_info": {
        "name": "Ram Bahadur",
        "email": "test@khalti.com",
        "phone": "9800000001"
    }
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

app.get('/api/services/:id', (req, res) => {
  const { id } = req.params;
  const product = services.find(product => product.id === parseInt(id));
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Product not found' });
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
