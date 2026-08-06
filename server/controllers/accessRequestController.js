const db = require('../config/db');
const bcrypt = require('bcrypt');
const mailService = require("../services/mailService");

// 1. Get Dropdown Data for the Request Form
// 1. Get Dropdown Data for the Request Form (Fixed Table & Column names)
exports.getDropdownData = async (req, res) => {
    try {
        // Customers from 'customer' table
        const [customerRows] = await db.query("SELECT DISTINCT customer_name FROM customer WHERE is_active = 1 ORDER BY customer_name");
        
        // 🔥 FIX: BU from 'bu' table using 'bu_name' column
        const [buRows] = await db.query("SELECT DISTINCT bu_name FROM bu WHERE bu_name IS NOT NULL ORDER BY bu_name");
        
        // 🔥 FIX: LOA Name from 'loa_name' table using 'loa_name' column
        const [loaRows] = await db.query("SELECT DISTINCT loa_name FROM loa_name WHERE loa_name IS NOT NULL ORDER BY loa_name");

        res.status(200).json({
            customers: customerRows.map(r => r.customer_name),
            bus: buRows.map(r => r.bu_name), // Map from bu_name
            loas: loaRows.map(r => r.loa_name) // Map from loa_name
        });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// 2. Submit Request (Saves to DB and Logs to Terminal)
exports.submitRequest = async (req, res) => {
    const { email, password, customer, bu, loa } = req.body; 
    
    try {
        console.log("📥 Incoming Request for:", email);

        if (!email || !password || !customer) {
            return res.status(400).json({ error: "Required fields missing (Email/Password/Customer)" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const customerList = customer ? customer.split('|||') : [];
        const buString = bu || ''; 
        const loaString = loa || ''; 

        // 1. Database Insertion Loop (USING '?' for db.js compatibility)
        for (const singleCust of customerList) {
            await db.query(
                'INSERT INTO "access_requests" ("email", "password", "requested_customers", "bu", "project_name", "status") VALUES (?, ?, ?, ?, ?, ?)',
                [email, hashedPassword, singleCust, buString, loaString, 'Pending']
            );
        }
        console.log(`✅ Success: Added ${customerList.length} rows to DB`);

        // 2. Send Email Notification
        try {
            await mailService.sendAccessRequestMail({
                email,
                customer: customerList.join(', '), 
                bu: buString,
                loa: loaString
            });
            console.log("📧 Notification Email Sent.");
        } catch (mailErr) {
            console.error("⚠️ Mail failed, but data saved:", mailErr.message);
        }
        
        return res.status(200).json({ 
            success: true, 
            message: `Access request submitted successfully.` 
        });

    } catch (err) { 
        console.error("❌ DB Insert Error:", err.message); 
        return res.status(500).json({ error: "Database error: " + err.message }); 
    }
};

// 3. SMTP Integrated Function (Sends real mail via mailService)
// exports.submitAccessRequest = async (req, res) => {
//     try {
//         await mailService.sendAccessRequestMail(req.body);
//         res.status(200).json({
//             success: true,
//             message: "Mail sent successfully."
//         });
//     } catch (err) {
//         console.error("Mail Error:", err);
//         res.status(500).json({
//             success: false,
//             message: err.message
//         });
//     }
// };

// 4. Get All Pending Requests for Admin Panel
exports.getPendingRequests = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, email, requested_customers, bu, project_name, created_at FROM access_requests WHERE status = 'Pending' ORDER BY created_at DESC");
        res.status(200).json(rows);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};



// 5. 🔥 UPDATED: Approve Request (With Double Protection for access table)
exports.approveRequest = async (req, res) => {
    const { id } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Request details fetch karein
        const [reqRows] = await connection.query('SELECT * FROM "access_requests" WHERE "id" = ?', [id]);
        if (reqRows.length === 0) throw new Error("Request not found");
        
        const requestDetails = reqRows[0];
        const singleCustomer = requestDetails.requested_customers;

        // 2. User logic (Safe check)
        const [userExists] = await connection.query('SELECT "email" FROM "users" WHERE TRIM(LOWER("email")) = TRIM(LOWER(?))', [requestDetails.email]);
        if (userExists.length === 0) {
            await connection.query(
                'INSERT INTO "users" ("email", "password", "type") VALUES (?, ?, ?)', 
                [requestDetails.email, requestDetails.password, 'user']
            );
        }

        // 3. 🔥 ACCESS TABLE PROTECTION: Check if entry already exists
        const [accessExists] = await connection.query(
            'SELECT * FROM "access" WHERE TRIM(LOWER("email")) = TRIM(LOWER(?)) AND TRIM(LOWER("customer")) = TRIM(LOWER(?))',
            [requestDetails.email, singleCustomer]
        );

        if (accessExists.length === 0) {
            // entries nahi hai toh hi insert karein
            await connection.query('INSERT INTO "access" ("customer", "email") VALUES (?, ?)', [singleCustomer, requestDetails.email]);
        }

        // 4. Update request status
        await connection.query('UPDATE "access_requests" SET "status" = \'Approved\' WHERE "id" = ?', [id]);

        await connection.commit();

        // 5. Send Mail
        try {
            await mailService.sendApprovalMail(requestDetails);
        } catch (mailErr) {
            console.error("Mail trigger failed:", mailErr.message);
        }

        res.status(200).json({ message: `Access approved for ${singleCustomer}` });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error("❌ Approval Error Details:", err.message);
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