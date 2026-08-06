const db = require('../config/db');
const bcrypt = require('bcrypt');
const mailService = require("../services/mailService");

// 1. Get Dropdown Data for the Request Form
exports.getDropdownData = async (req, res) => {
    try {
        const [customerRows] = await db.query("SELECT DISTINCT customer_name FROM customer WHERE is_active = 1 ORDER BY customer_name");
        const [buRows] = await db.query("SELECT DISTINCT bu FROM wbs_loa_id_mapping1 WHERE bu IS NOT NULL ORDER BY bu");
        const [loaRows] = await db.query("SELECT DISTINCT loa_name FROM wbs_loa_id_mapping1 WHERE loa_name IS NOT NULL ORDER BY loa_name");

        res.status(200).json({
            customers: customerRows.map(r => r.customer_name),
            bus: buRows.map(r => r.bu),
            loas: loaRows.map(r => r.loa_name)
        });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// 2. Submit Request (Saves to DB and Logs to Terminal)
exports.submitRequest = async (req, res) => {
    const { email, password, customer, bu, loa } = req.body; // customer/bu/loa are strings joined by |||
    try {
        const [existingUser] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
        // Note: Hum user existence check submit pe nahi karenge, kyunki admin decide karega.
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Strings ko wapas array mein convert karo
        const customerList = customer ? customer.split('|||') : [];
        const buString = bu || '';
        const loaString = loa || '';

        if (customerList.length === 0) return res.status(400).json({ error: "No customers selected." });

        // 🔥 Loop through each customer and create a separate row
        for (const singleCust of customerList) {
            await db.query(
                "INSERT INTO access_requests (email, password, requested_customers, bu, project_name, status) VALUES (?, ?, ?, ?, ?, 'Pending')",
                [email, hashedPassword, singleCust, buString, loaString]
            );
        }

        console.log(`📧 [MOCK EMAIL] - ${customerList.length} New access rows created for ${email}`);

        res.status(200).json({ message: "Access requests submitted successfully!" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// 3. SMTP Integrated Function (Sends real mail via mailService)
exports.submitAccessRequest = async (req, res) => {
    try {
        await mailService.sendAccessRequestMail(req.body);
        res.status(200).json({
            success: true,
            message: "Mail sent successfully."
        });
    } catch (err) {
        console.error("Mail Error:", err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// 4. Get All Pending Requests for Admin Panel
exports.getPendingRequests = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, email, requested_customers, bu, project_name, created_at FROM access_requests WHERE status = 'Pending' ORDER BY created_at DESC");
        res.status(200).json(rows);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// 5. 🔥 UPDATED: Approve Request with Confirmation Mail
exports.approveRequest = async (req, res) => {
    const { id } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [reqRows] = await connection.query("SELECT * FROM access_requests WHERE id = ?", [id]);
        if (reqRows.length === 0) throw new Error("Request not found");
        
        const requestDetails = reqRows[0];
        const singleCustomer = requestDetails.requested_customers;

        const [userExists] = await connection.query("SELECT email FROM users WHERE email = ?", [requestDetails.email]);

        if (userExists.length === 0) {
            await connection.query("INSERT INTO users (email, password, type) VALUES (?, ?, 'user')", [requestDetails.email, requestDetails.password]);
        }

        await connection.query("INSERT INTO access (customer, email) VALUES (?, ?)", [singleCustomer, requestDetails.email]);
        await connection.query("UPDATE access_requests SET status = 'Approved' WHERE id = ?", [id]);

        await connection.commit();

        // 🔥 Trigger Success Mail
        try {
            await mailService.sendApprovalMail(requestDetails);
        } catch (mailErr) {
            console.error("Mail trigger failed, but DB updated:", mailErr);
        }

        res.status(200).json({ message: `Access granted and mail sent for ${singleCustomer}` });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};

// 6. 🔥 UPDATED: Decline Request with Notification Mail
exports.declineRequest = async (req, res) => {
    const { id } = req.body;
    try {
        // Fetch details first to know the email and entity
        const [reqRows] = await db.query("SELECT * FROM access_requests WHERE id = ?", [id]);
        if (reqRows.length === 0) return res.status(404).json({ error: "Request not found" });

        const requestDetails = reqRows[0];

        // Update status in DB
        await db.query("UPDATE access_requests SET status = 'Declined' WHERE id = ?", [id]);

        // 🔥 Trigger Decline Mail
        try {
            await mailService.sendDeclineMail(requestDetails);
        } catch (mailErr) {
            console.error("Decline Mail failed, but DB updated:", mailErr);
        }

        res.status(200).json({ message: "Request Declined and user notified." });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};