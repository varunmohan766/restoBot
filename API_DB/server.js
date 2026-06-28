require('dotenv').config();

const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authenticateToken = require('./auth');
const cors = require('cors');

const app = express();

// Allow requests only from your frontend origin
// app.use(cors({ origin: '*' }));
const allowedOrigins = [
  'https://port8080-workspaces-ws-9eisk.us10.trial.applicationstudio.cloud.sap',
  'https://varunmohan766.github.io',
  'https://myapp.netlify.app'
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
	//console.log('reach here');
      callback(null, true); // allow
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// Example route
app.get('/', (req, res) => {
  res.send('Hello from backend!');
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

app.use(express.json());

app.post('/login', async (req, res) => {

    try {

        const { username, password } = req.body;

        const [users] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }

        const user = users[0];

        const isValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isValid) {
            return res.status(401).json({
                message: 'Invalid username or password'
            });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1h'
            }
        );

        res.json({
            token
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });
    }
});


app.get('/', (req, res) => {
    res.json({
        status: 'API Running'
    });
});

app.post('/orders',authenticateToken, async (req, res) => {
    try {

        const {
            CustomerName,
            FoodItem,
            QuantityOrdered,
            OrderDate,
            Status
        } = req.body;

        const sql = `
            INSERT INTO orders
            (
                CustomerName,
                FoodItem,
                QuantityOrdered,
                OrderDate,
                Status
            )
            VALUES (?, ?, ?, ?, ?)
        `;

        const [result] = await pool.execute(
            sql,
            [
                CustomerName,
                FoodItem,
                QuantityOrdered,
                OrderDate,
                Status
            ]
        );

        res.status(201).json({
            success: true,
            orderId: result.insertId
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.get('/orders',authenticateToken, async (req, res) => {
    try {

        const [rows] = await pool.execute(
            'SELECT * FROM orders'
        );

        res.status(200).json(rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.get('/orders/:id',authenticateToken, async (req, res) => {
    try {

        const orderId = req.params.id;

        const [rows] = await pool.execute(
            'SELECT * FROM orders WHERE id = ?',
            [orderId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json(rows[0]);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

app.get('/orders/:customerName',authenticateToken, async (req, res) => {

    try {

        const customerName = req.params.customerName;

        const [rows] = await pool.execute(
            'SELECT * FROM orders WHERE CustomerName = ?',
            [customerName]
        );

        res.json(rows);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });
    }
});

app.put('/orders/:id',authenticateToken, async (req, res) => {
    try {

        const { Status } = req.body;
        const id = req.params.id;

        const [result] = await pool.execute(
            'UPDATE orders SET Status = ? WHERE id = ?',
            [Status, id]
        );

        res.json({
            success: true,
            rowsAffected: result.affectedRows
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/orders/:id',authenticateToken, async (req, res) => {
    try {

        const id = req.params.id;

        const [result] = await pool.execute(
            'DELETE FROM orders WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            rowsAffected: result.affectedRows
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put(
"/orders/:id/confirm",
authenticateToken,
async(req,res)=>{

const id =
req.params.id;

await connection.query(
"UPDATE orders SET status='Confirmed' WHERE id=?",
[id]
);

res.json({
message:"Updated"
});

});

app.put(
"/orders/:id/reject",
authenticateToken,
async(req,res)=>{

const id =
req.params.id;

await connection.query(
"UPDATE orders SET status='Rejected' WHERE id=?",
[id]
);

res.json({
message:"Updated"
});

});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});