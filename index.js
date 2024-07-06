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


