const db = require('../config/db');
const bcrypt = require('bcrypt');


// 1. Get All Users - MODIFIED FOR ADMIN VISIBILITY RESTRICTIONS
exports.getAllUsers = async (req, res) => {
    try {
        const { currentUserType, allowedCustomers } = req.query;
        
        // 🔥 Separator fix: UI '|||' bhej raha hai, toh split bhi usi se karenge
        const customersList = allowedCustomers ? allowedCustomers.split('|||').map(c => c.trim().toLowerCase()) : [];

        let usersQuery = "SELECT id, email, type FROM users ORDER BY id ASC";
        let usersParams = [];

        if (currentUserType === 'admin') {
            // 🔥 Requirement: 
            // 1. super_admin nahi dikhna chahiye (u.type != 'super_admin')
            // 2. Sirf wahi users dikhein jo admin ke customers se matched hain (INNER JOIN with access)
            usersQuery = `
                SELECT DISTINCT u.id, u.email, u.type 
                FROM users u
                INNER JOIN access a ON u.email = a.email
                WHERE u.type != 'super_admin' 
                AND TRIM(LOWER(a.customer)) IN (?)
                ORDER BY u.id ASC
            `;
            usersParams = [customersList];
        }

        const [users] = await db.query(usersQuery, usersParams);
        
        // Har user ke saare assigned customers fetch karna (for the table display)
        const [access] = await db.query("SELECT email, customer FROM access");

        const userData = users.map(u => ({
            ...u,
            customers: access.filter(a => a.email === u.email).map(a => a.customer)
        }));

        res.status(200).json(userData);
    } catch (error) { 
        console.error("getAllUsers Error:", error);
        res.status(500).json({ error: error.message }); 
    }
};

// 2. Create User
exports.createUser = async (req, res) => {
    const { email, password, type, customers, currentUserType, allowedCustomers } = req.body;
    try {
        // 🔥 UPDATE: split(',') ko split('|||') se replace kiya consistency ke liye
        const adminCustomers = allowedCustomers ? allowedCustomers.split('|||').map(c => c.trim()) : [];
        
        if (currentUserType === 'admin') {
            if (type === 'super_admin') return res.status(403).json({ error: "Unauthorized to create Super Admin." });
            if (!customers.every(c => adminCustomers.includes(c))) return res.status(403).json({ error: "Access outside domain restricted." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert User
        await db.query("INSERT INTO users (email, password, type) VALUES (?, ?, ?)", [email, hashedPassword, type]);

        // Insert Access Mapping using PostgreSQL Bulk Format
        if (customers && customers.length > 0) {
            const mappingRows = customers.map(c => [c, email]);
            await db.query("INSERT INTO access (customer, email) VALUES ?", [mappingRows]);
        }
        res.status(200).json({ message: "User created successfully!" });
    } catch (error) { 
        console.error("createUser Error:", error);
        res.status(500).json({ error: error.message }); 
    }
};

// 3. Update User
exports.updateUser = async (req, res) => {
    const { id, email, password, type, customers, currentUserType } = req.body;
    try {
        if (currentUserType === 'admin') {
            const [existing] = await db.query("SELECT type FROM users WHERE id = ?", [id]);
            if (existing[0]?.type === 'super_admin') return res.status(403).json({ error: "Cannot modify Super Admin." });
        }

        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query("UPDATE users SET type = ?, password = ? WHERE id = ?", [type, hashedPassword, id]);
        } else {
            await db.query("UPDATE users SET type = ? WHERE id = ?", [type, id]);
        }

        // Delete Old Access & Re-insert New Access
        await db.query("DELETE FROM access WHERE email = ?", [email]);
        
        if (customers && customers.length > 0) {
            const mappingRows = customers.map(c => [c, email]);
            await db.query("INSERT INTO access (customer, email) VALUES ?", [mappingRows]);
        }

        res.status(200).json({ message: "Update successful!" });
    } catch (error) { 
        console.error("updateUser Error:", error);
        res.status(500).json({ error: error.message }); 
    }
};

// 4. Delete User
exports.deleteUser = async (req, res) => {
    const { id, email, currentUserType } = req.query;
    try {
        const [existing] = await db.query("SELECT type FROM users WHERE id = ?", [id]);
        if (currentUserType === 'admin' && existing[0]?.type === 'super_admin') {
            return res.status(403).json({ error: "Unauthorized." });
        }

        await db.query("DELETE FROM users WHERE id = ?", [id]);
        await db.query("DELETE FROM access WHERE email = ?", [email]);
        res.status(200).json({ message: "User deleted successfully." });
    } catch (error) { 
        console.error("deleteUser Error:", error);
        res.status(500).json({ error: error.message }); 
    }
};

// 5. Get Master Customers (From 'customer' table)
exports.getAllMasterCustomers = async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT customer_name 
             FROM customer 
             WHERE is_active = 1 OR is_active IS NULL 
             ORDER BY customer_name ASC`
        );
        const customersList = rows.map(r => r.customer_name).filter(Boolean);
        res.status(200).json(customersList);
    } catch (error) {
        console.error("getAllMasterCustomers Error:", error);
        res.status(500).json({ error: error.message });
    }
};