const bcrypt = require('bcryptjs');
const pool = require('./db');

async function createUser() {

    const username = 'admin';
    const password = 'admin123';

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.execute(
        'INSERT INTO users(username,password) VALUES (?,?)',
        [username, hashedPassword]
    );

    console.log('User created');
    process.exit();
}

createUser();