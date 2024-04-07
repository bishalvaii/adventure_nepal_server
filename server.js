const express = require('express')
const app = express()
const port = process.env.PORT || 5000;
const pool = require('./db')
const path = require('path')
const bodyParser = require('body-parser')
const cors = require('cors')
app.use(express.static(path.join(__dirname, 'public')));


app.use(cors());

app.use(bodyParser.json())

const services= [
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
      name: 'Product 1',
      description: 'Description for Product 1',
      price: '28',
      image: {
        url: '/dreambike.jpg',
        width: 350,
        height: 350
      },
      elevation: '2000-5000m',
      duration: '8 days tour',
      thumbnail_text: 'Ride to manang'
    },
    {
        id: 3,
      name: 'Product 1',
      description: 'Description for Product 1',
      price: '28',
      image: {
        url: '/village.jpg',
        width: 350,
        height: 350
      },
      elevation: '2000-5000m',
      duration: '8 days tour',
      thumbnail_text: 'Ride to manang'
    },
    {
        id: 4,
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
      id: 5,
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
    id: 6,
  name: 'Product 1',
  description: 'Description for Product 1',
  price: '28',
  image: {
    url: '/lomangthang.jpg',
    width: 350,
    height: 350
  },
  elevation: '2000-5000m',
  duration: '8 days tour',
  thumbnail_text: 'Ride to manang'
}
]
//signup endpoint 

app.get('/api/services', (req, res) => {
    res.json(services)
    

})

app.get('/api/services/:id', (req, res) => {
  const { id } = req.params; // Get the id parameter from the URL
  console.log(id)
  const product = services.find(product => product.id === parseInt(id)); // Find product by id

  if (product) {
    res.json(product); // Return product data as JSON response
  } else {
    res.status(404).json({ error: 'Product not found' }); // If product with given id is not found
  }
});


app.post('/api/signup', async(req, res) => {
   
        const { username,email, password , confirmPassword} = req.body
        
        if(password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match'})

        }
        try {
            const client = await pool.connect();
            const query = 'INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING * ';
            const result = await client.query(query, [username, email,password]);
            client.release()
            res.status(201).json({ message: 'User signed up succesfully', user: result.rows[0]});

        } catch(error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'An error occurred while signing up' });
        }
    
})

app.post('/api/login', async(req, res) => {
    try {
        const {username,password} = req.body;
        const user = await pool.query('SELECT * FROM users WHERE username=$1 AND PASSWORD = $2', [username, password]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password'})

        }
        const userInfo = user.rows[0];
        const userData = {
          id: userInfo.id,
          username: userInfo.username,
          email: userInfo.email,
          isAdmin: userInfo.isadmin,
        }
        res.status(200).json({ message: 'Login successful', user: userData })

    }  catch(error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
})

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
        INSERT INTO bookings (username, service_name,first_name, last_name, email, phone, address, city, postal_code, country, state, requirements, payment, adults)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `,
      values: [username,service_name,firstName, lastName, email, phone, address, city, postalCode, country, state, requirements, payment, adults],
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