require('dotenv').config();

const express = require('express');
const pool = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const authenticateToken = require('./auth');
const cors = require('cors');
// const fetch = require("node-fetch");

const app = express();

// Allow requests only from your frontend origin
// app.use(cors({ origin: '*' }));
const allowedOrigins = [
  'https://port8080-workspaces-ws-9eisk.us10.trial.applicationstudio.cloud.sap',
  'https://port8081-workspaces-ws-9eisk.us10.trial.applicationstudio.cloud.sap',
  'https://varunmohan766.github.io',
  'https://myapp.netlify.app',
  'https://vacations-phil-eye-item.trycloudflare.com/'
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

async function getOrderDetails(status) {
    // console.log("status:", status);
    let query = `
        SELECT 
            o.order_id, o.customer_name, o.mobile_number, o.order_status, 
            o.order_source, o.payment_status, o.address,
            i.item_id, i.food_items, i.quantity, i.price, i.isReady, i.inventory_id
        FROM order_master o
        JOIN order_child i ON o.order_id = i.order_id
        `;
    const params = [];
    const conditions = [];

        // if (orderId) {
        // conditions.push('o.order_id = ?');
        // params.push(orderId);
        // }
        // if (name) {
        // conditions.push('o.customer_name LIKE ?');
        // params.push(`%${name}%`);
        // }
        // if (mobile) {
        // conditions.push('o.mobile_number = ?');
        // params.push(mobile);
        // }
        // if (status) {
        // conditions.push('o.order_status = ?');
        // params.push(status);
        // }
    if (status) {
        if (Array.isArray(status)) {
            // Multiple statuses → use IN
            conditions.push(`o.order_status IN (${status.map(() => '?').join(',')})`);
            params.push(...status);
        } else {
            // Single status → use =
            conditions.push('o.order_status = ?');
            params.push(status);
        }
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    const [rows] = await pool.execute(query, params);

    if (rows.length === 0) {
        return rows;
    }

        // Group rows into parent-child JSON
    const ordersMap = {};
    rows.forEach(r => {
        if (!ordersMap[r.order_id]) {
            ordersMap[r.order_id] = {
                id: r.order_id,
                customerName: r.customer_name,
                mobile: r.mobile_number,
                status: r.order_status,
                source: r.order_source,
                paymentStatus: r.payment_status,
                address: r.address,
                items: [],
                totalAmount: 0
            };
        }

        const itemTotal = r.price * r.quantity;
        ordersMap[r.order_id].totalAmount += itemTotal;

        ordersMap[r.order_id].items.push({
            id: r.item_id,
            name: r.food_items,
            qty: r.quantity,
            price: r.price,
            total: itemTotal,
            isReady: !!r.isReady,
            inventory_id: r.inventory_id
        });
    });

    const orders = Object.values(ordersMap);
    return orders;
}

app.get('/orderDetails', authenticateToken, async (req, res) => {
    const { status } = req.query;
    
    try {
    // console.log("res received:", res);
        const orders = await getOrderDetails(status);
        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                error: { code: 'ORDER_NOT_FOUND', message: 'No matching orders found' }
            });
        }

        res.status(200).json({ success: true, orderList: orders });

    } catch (err) {
        // logger.error('Error fetching orders', { error: err.message, stack: err.stack });
        res.status(500).json({
        success: false,
        error: { code: 'DB_QUERY_FAILED', message: 'Unable to fetch orders'+err }
        });
    }
    
});

app.put('/orderDetails/:id',authenticateToken, async (req, res) => {
    try {

        const { status } = req.body;// for update status value
        const {filterOrderStatus} = req.body;//for search filter
        const FormattedStatus = Object.keys(filterOrderStatus).filter(key => filterOrderStatus[key]);
        const id = req.params.id;
        // console.log("Orders req:", req.body);
        // console.log("Orders id:", id);
        // console.log("Orders status:", status);
        // console.log("Orders orderStatus:", orderStatus);

        const [result] = await pool.execute(
            'UPDATE order_master SET order_status = ? WHERE order_id = ?',
            [status, id]
        );
        //  console.log("filterOrderStatus:", FormattedStatus);
        const orders = await getOrderDetails(FormattedStatus);
        // const response = await fetch(`http://localhost:3000/orderDetails`);
        // const updated = await response.json();

        res.json({
            success: true,
            rowsAffected: result.affectedRows,
            orderList: orders
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/orderItemBatch/:id',authenticateToken, async (req, res) => {
    const id = req.params.id;
    const { create = [], update = [], delete : del = [] } = req.body;
    const {filterOrderStatus} = req.body;//for search filter
    const FormattedStatus = Object.keys(filterOrderStatus).filter(key => filterOrderStatus[key]);
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // CREATE
        for (const item of create) {
            const [stock] = await connection.execute(
                "SELECT quantity FROM inventory WHERE id = ?",
                [item.inventory_id]
            );

            if (!stock || stock.quantity < item.qty) {
                throw new Error(`Insufficient stock for ${item.name}, available stock quantity${stock.quantity}`);
            }

            await connection.execute(
                "INSERT INTO order_child (food_items, quantity, price, isReady, order_id, inventory_id) VALUES (?, ?, ?, ?, ?, ?)",
                [item.name, item.qty, item.price, item.isReady, id, item.inventory_id]
            );
            // await connection.query(
            //     "INSERT INTO order_items (food_items, quantity, price, total, isReady) VALUES (?, ?, ?, ?, ?)",
            //     [item.name, item.qty, item.price, item.total, item.isReady]
            // );

            await connection.execute(
                "UPDATE inventory SET quantity = quantity - ? WHERE id = ?",
                [item.qty, item.inventory_id]
            );            
        }

        // UPDATE
        for (const item of update) {
            // Get the old order record
            const [oldRows] = await connection.execute(
                "SELECT quantity FROM order_child WHERE item_id = ?",
                [item.id]
            );

            if (!oldRows || oldRows.length === 0) {
                throw new Error(`Order item ${item.id} or ${item.name} not found`);
            }

            const oldQty = parseInt(oldRows[0].quantity, 10);
            const newQty = parseInt(item.qty, 10);
            const diff = newQty - oldQty;

            if (diff > 0) {
                // Need more stock → check availability
                const [stock] = await connection.execute(
                    "SELECT quantity FROM inventory WHERE id = ?",
                    [item.inventory_id]
                );

                if (!stock || stock.quantity < diff) {
                    throw new Error(`Insufficient stock for ${item.name}, available quantity ${stock.quantity}`);
                }

                // Reduce stock
                await connection.execute(
                    "UPDATE inventory SET quantity = quantity - ? WHERE id = ?",
                    [diff, item.inventory_id]
                );
            } else if (diff < 0) {
                // Quantity reduced → restore stock
                await connection.execute(
                    "UPDATE inventory SET quantity = quantity + ? WHERE id = ?",
                    [Math.abs(diff), item.inventory_id]
                );
            }

            // Finally update the order item
            await connection.execute(
                "UPDATE order_child SET food_items = ?, quantity = ?, price = ?, isReady = ? WHERE item_id = ?",
                [item.name, item.qty, item.price, item.isReady, item.id]
            );
        }

        // DELETE
        for (const item of del) {

            const [deleted] = await connection.execute(
                "SELECT inventory_id, quantity FROM order_child WHERE item_id = ?",
                [item.id]
            );

            if (deleted) {
                await connection.execute("DELETE FROM order_child WHERE item_id = ?", [item.id]);

                // restore stock
                await connection.execute(
                    "UPDATE inventory SET quantity = quantity + ? WHERE id = ?",
                    [deleted.quantity, deleted.inventory_id]
                );
            }
                        
        }
        const orders = await getOrderDetails(FormattedStatus);
        await connection.commit();
        res.status(200).json({
            success: true,
            message: "Batch operation completed successfully",
            orderList: orders
        });





        // const { oPayload } = req.body;
        // const FormattedStatus = Object.keys(filterOrderStatus).filter(key => filterOrderStatus[key]);
        
        // console.log("Orders req:", req.body);
        // console.log("Orders id:", id);
        // console.log("Orders status:", status);
        // console.log("Orders orderStatus:", orderStatus);

        /*const [result] = await pool.execute(
            'UPDATE order_master SET order_status = ? WHERE order_id = ?',
            [status, id]
        );
        //  console.log("filterOrderStatus:", FormattedStatus);
        const orders = await getOrderDetails(FormattedStatus);
        // const response = await fetch(`http://localhost:3000/orderDetails`);
        // const updated = await response.json();

        res.json({
            success: true,
            rowsAffected: result.affectedRows,
            orderList: orders
        });*/

    } catch (err) {
        await connection.rollback();
        console.error("Batch operation failed:", err);
        res.status(500).json({
        success: false,
        error: {
            code: "BATCH_OPERATION_FAILED",
            message: "Unable to process batch: " + err.message
        }
        });
        // res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

async function getStockList() {
    // console.log("status:", status);
    let query = `
        SELECT 
            id, FoodItem, Quantity, Status, category, price, description, veg_nonveg
        FROM inventory
        `;
    const params = [];
    const conditions = [];

        
    /*if (status) {
        if (Array.isArray(status)) {
            // Multiple statuses → use IN
            conditions.push(`o.order_status IN (${status.map(() => '?').join(',')})`);
            params.push(...status);
        } else {
            // Single status → use =
            conditions.push('o.order_status = ?');
            params.push(status);
        }
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }*/

    const [rows] = await pool.execute(query);

    if (rows.length === 0) {
        return rows;
    }

        // Group rows into parent-child JSON
    const stockArray = [];
    rows.forEach(r => {
        // if (!ordersMap[r.order_id]) {
        //     ordersMap[r.order_id] = {
        //         id: r.order_id,
        //         customerName: r.customer_name,
        //         mobile: r.mobile_number,
        //         status: r.order_status,
        //         source: r.order_source,
        //         paymentStatus: r.payment_status,
        //         address: r.address,
        //         items: [],
        //         totalAmount: 0
        //     };
        // }

        // const itemTotal = r.price * r.quantity;
        // ordersMap[r.order_id].totalAmount += itemTotal;
// id, FoodItem, Quantity, Status, category, price, description, veg_nonveg
        stockArray.push({
            id: r.id,
            Name: r.FoodItem,
            Description: r.description,
            Quantity: r.Quantity,
            Price: r.price,
            Status: r.Status,
            category:r.category,
            veg_nonveg: r.veg_nonveg
        });
    });

    // const orders = Object.values(ordersMap);
    return stockArray;
}

app.get('/stockList', authenticateToken, async (req, res) => {
    const { status } = req.query;
    
    try {
    // console.log("res received:", res);
        const stockArray = await getStockList(status);
        if (stockArray.length === 0) {
            return res.status(404).json({
                success: false,
                error: { code: 'STOCK_NOT_FOUND', message: 'No stock found' }
            });
        }

        res.status(200).json({ success: true, stockList: stockArray });

    } catch (err) {
        // logger.error('Error fetching orders', { error: err.message, stack: err.stack });
        res.status(500).json({
        success: false,
        error: { code: 'DB_QUERY_FAILED', message: 'Unable to fetch stock'+err }
        });
    }
    
});

app.put('/stockBatch',authenticateToken, async (req, res) => {
    // const id = req.params.id;
    const { create = [], update = [], delete : del = [] } = req.body;
    // const {filterOrderStatus} = req.body;//for search filter
    // const FormattedStatus = Object.keys(filterOrderStatus).filter(key => filterOrderStatus[key]);
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // CREATE
        for (const item of create) {
            // const [stock] = await connection.execute(
            //     "SELECT quantity FROM inventory WHERE id = ?",
            //     [item.inventory_id]
            // );

            // if (!stock || stock.quantity < item.qty) {
            //     throw new Error(`Insufficient stock for ${item.name}, available stock quantity${stock.quantity}`);
            // }

            await connection.execute(
                "INSERT INTO inventory (FoodItem, Quantity, Status, category, price, description, veg_nonveg) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [item.Name, item.Quantity, item.Status, item.category, item.Price, item.Description, item.veg_nonveg]
            );

            // await connection.execute(
            //     "UPDATE inventory SET quantity = quantity - ? WHERE id = ?",
            //     [item.qty, item.inventory_id]
            // );            
        }

        // UPDATE
        for (const item of update) {
            // Get the old order record
            // const [oldRows] = await connection.execute(
            //     "SELECT quantity FROM order_child WHERE item_id = ?",
            //     [item.id]
            // );

            // if (!oldRows || oldRows.length === 0) {
            //     throw new Error(`Order item ${item.id} or ${item.name} not found`);
            // }

            // const oldQty = parseInt(oldRows[0].quantity, 10);
            // const newQty = parseInt(item.qty, 10);
            // const diff = newQty - oldQty;

            // if (diff > 0) {
            //     // Need more stock → check availability
            //     const [stock] = await connection.execute(
            //         "SELECT quantity FROM inventory WHERE id = ?",
            //         [item.inventory_id]
            //     );

            //     if (!stock || stock.quantity < diff) {
            //         throw new Error(`Insufficient stock for ${item.name}, available quantity ${stock.quantity}`);
            //     }

            //     // Reduce stock
            //     await connection.execute(
            //         "UPDATE inventory SET quantity = quantity - ? WHERE id = ?",
            //         [diff, item.inventory_id]
            //     );
            // } else if (diff < 0) {
            //     // Quantity reduced → restore stock
            //     await connection.execute(
            //         "UPDATE inventory SET quantity = quantity + ? WHERE id = ?",
            //         [Math.abs(diff), item.inventory_id]
            //     );
            // }

            // Finally update the order item
            await connection.execute(
                "UPDATE inventory SET FoodItem = ?, Quantity = ?, Status = ?, category = ?, price = ?, description = ?, veg_nonveg = ? WHERE id = ?",
                [item.Name, item.Quantity, item.Status, item.category, item.Price, item.Description, item.veg_nonveg, item.id]
            );
        }

        // DELETE
        for (const item of del) {
            await connection.execute("DELETE FROM inventory WHERE id = ?", [item.id]);

            // const [deleted] = await connection.execute(
            //     "SELECT inventory_id, quantity FROM order_child WHERE item_id = ?",
            //     [item.id]
            // );

            // if (deleted) {
            //     await connection.execute("DELETE FROM order_child WHERE item_id = ?", [item.id]);

            //     // restore stock
            //     await connection.execute(
            //         "UPDATE inventory SET quantity = quantity + ? WHERE id = ?",
            //         [deleted.quantity, deleted.inventory_id]
            //     );
            // }
                        
        }
        const stock = await getStockList();
        console.error("Stock:", stock);
        await connection.commit();
        res.status(200).json({
            success: true,
            message: "Batch operation completed successfully",
            stockList: stock
        });

    } catch (err) {
        await connection.rollback();
        console.error("Batch operation failed:", err);
        res.status(500).json({
        success: false,
        error: {
            code: "BATCH_OPERATION_FAILED",
            message: "Unable to process batch: " + err.message
        }
        });
        // res.status(500).json({ error: err.message });
    } finally {
        connection.release();
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

app.put("/orders/:id/confirm",authenticateToken, async(req,res)=>{

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

app.put("/orders/:id/reject",authenticateToken, async(req,res)=>{

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