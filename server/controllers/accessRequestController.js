const db = require('../config/db'); // Sahi path jo aapne bataya
const mailService = require("../services/mailService");

const getDropdownData = async (req, res) => {
    try {
        // Query results ko destructure kar rahe hain [rows]
        const [customerRows] = await db.query(
            "SELECT DISTINCT customer_name FROM customer WHERE customer_name IS NOT NULL ORDER BY customer_name"
        );

        const [buRows] = await db.query(
            "SELECT DISTINCT bu_name FROM bu WHERE bu_name IS NOT NULL ORDER BY bu_name"
        );

        const [loaRows] = await db.query(
            "SELECT DISTINCT loa_name FROM loa_name WHERE loa_name IS NOT NULL ORDER BY loa_name"
        );

        res.status(200).json({
            customers: customerRows.map(r => r.customer_name),
            bus: buRows.map(r => r.bu_name),
            loas: loaRows.map(r => r.loa_name)
        });
    } catch (err) {
        console.error("Error fetching dropdown data:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// New function
const submitAccessRequest = async (req, res) => {

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

module.exports = { getDropdownData, submitAccessRequest };