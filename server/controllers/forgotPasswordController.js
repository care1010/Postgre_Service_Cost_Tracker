const db = require('../config/db');
const bcrypt = require('bcrypt');
const mailService = require("../services/mailService");

// 1. Request OTP
exports.requestOTP = async (req, res) => {
    const { email } = req.body;
    try {
        const [userRows] = await db.query('SELECT id, otp_request_count, last_otp_request_at FROM "users" WHERE LOWER(email) = LOWER(?)', [email]);
        if (userRows.length === 0) return res.status(404).json({ error: "Email not found." });

        const user = userRows[0];
        const now = new Date();
        const lastRequest = user.last_otp_request_at ? new Date(user.last_otp_request_at) : null;

        // Cool-down Check (1 Minute)
        if (lastRequest && (now - lastRequest) < 60000) {
            return res.status(429).json({ error: "Please wait 60 seconds before resending." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // 🔥 FIXED QUERY: Using PostgreSQL INTERVAL to ensure 10 minutes from NOW
        await db.query(
            `UPDATE "users" 
             SET "reset_otp" = ?, 
                 "reset_otp_expiry" = CURRENT_TIMESTAMP + interval '10 minutes', 
                 "otp_request_count" = "otp_request_count" + 1, 
                 "last_otp_request_at" = CURRENT_TIMESTAMP 
             WHERE id = ?`, 
            [otp, user.id]
        );

        await mailService.sendOTPMail(email, otp);
        res.status(200).json({ message: "OTP sent successfully." });

    } catch (err) { 
        console.error("OTP Request Error:", err);
        res.status(500).json({ error: err.message }); 
    }
};

// 2. Reset Password
// 2. Reset Password with Strict History Validation
exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        // 1. Pehle user aur OTP validity check karein
        const [userRows] = await db.query(
            `SELECT id, password FROM "users" 
             WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) 
             AND "reset_otp" = ? 
             AND "reset_otp_expiry" > CURRENT_TIMESTAMP`, 
            [email, otp]
        );

        if (userRows.length === 0) {
            return res.status(400).json({ error: "Invalid or expired OTP. Please request a new one." });
        }
        
        const user = userRows[0];

        // 🔥 STEP A: Check against CURRENT password
        const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
        if (isSameAsCurrent) {
            return res.status(400).json({ error: "This is your current password. Please choose a different one." });
        }

        // 🔥 STEP B: Check against last 3 passwords in history table
        const [historyRows] = await db.query(
            'SELECT password_hash FROM "password_history" WHERE user_id = ? ORDER BY created_at DESC LIMIT 3', 
            [user.id]
        );

        for (let row of historyRows) {
            const isMatch = await bcrypt.compare(newPassword, row.password_hash);
            if (isMatch) {
                console.log(`🚫 Security Alert: User ${email} tried to reuse a recent password.`);
                return res.status(400).json({ error: "You have used this password recently. Please choose a new one for better security." });
            }
        }

        // 🔥 STEP C: All checks passed - Hash the new password
        const hashedPw = await bcrypt.hash(newPassword, 10);
        
        // 2. Update the Main Users table
        await db.query(
            `UPDATE "users" 
             SET password = ?, reset_otp = NULL, reset_otp_expiry = NULL, otp_request_count = 0 
             WHERE id = ?`, 
            [hashedPw, user.id]
        );

        // 3. 🔥 CRITICAL: Save the new password to history table
        await db.query(
            'INSERT INTO "password_history" (user_id, password_hash) VALUES (?, ?)', 
            [user.id, hashedPw]
        );

        console.log(`✅ Success: Password updated and history entry created for ${email}`);
        res.status(200).json({ message: "Password updated successfully!" });

    } catch (err) { 
        console.error("Reset Password Error:", err);
        res.status(500).json({ error: err.message }); 
    }
};