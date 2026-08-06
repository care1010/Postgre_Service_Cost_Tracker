const transporter = require("../config/mailer");

const sendAccessRequestMail = async (request) => {
    const mailOptions = {
        from: '"Service Cost Tracker" <care.ni_india@nokia.com>',

        // Admin mailbox
        to: ["akash.1.singh.ext@nokia.com", "neha.sain.ext@nokia.com"],

        // Optional: Reply goes directly to requester
        replyTo: request.email,

        subject: `New Access Request - ${request.customer}`,

        html: `
        <div style="font-family: Calibri, Arial, sans-serif; max-width:700px; margin:auto; border:1px solid #dcdcdc; border-radius:8px; overflow:hidden;">

            <div style="background:#124191; color:#ffffff; padding:16px 24px;">
                <h2 style="margin:0;">Service Cost Tracker</h2>
                <p style="margin:6px 0 0;">New Tool Access Request</p>
            </div>

            <div style="padding:24px; color:#333333;">

                <p>Hello Team,</p>

                <p>
                    A new access request has been submitted for the
                    <strong>Service Cost Tracker</strong>.
                </p>

                <table style="width:100%; border-collapse:collapse; margin-top:20px;">
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background:#f5f5f5; width:35%;"><strong>Customer Account</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${request.customer}</td>
                    </tr>

                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background:#f5f5f5;"><strong>Business Unit</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${request.bu}</td>
                    </tr>

                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background:#f5f5f5;"><strong>Project / LOA</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${request.loa}</td>
                    </tr>

                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background:#f5f5f5;"><strong>Requested By</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${request.email}</td>
                    </tr>

                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background:#f5f5f5;"><strong>Request Time</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">
                            ${new Date().toLocaleString("en-IN", {
                                timeZone: "Asia/Kolkata"
                            })}
                        </td>
                    </tr>
                </table>

                <p style="margin-top:25px;">
                    Kindly review and process this access request.
                </p>

                <p>
                    Regards,<br>
                    <strong>Service Cost Tracker</strong>
                </p>

            </div>

            <div style="background:#f8f8f8; padding:12px 24px; font-size:12px; color:#666; text-align:center;">
                This is an automatically generated email. Please do not reply directly to this message.
            </div>

        </div>
        `
    };
    return transporter.sendMail(mailOptions);
};

// 🔥 NAYA: Approval Confirmation Mail
const sendApprovalMail = async (request) => {
    const mailOptions = {
        from: '"Service Cost Tracker" <care.ni_india@nokia.com>',
        to: request.email,
        subject: `Access Approved - Service Cost Tracker`,
        html: `
        <div style="font-family: Calibri, Arial, sans-serif; max-width:700px; margin:auto; border:1px solid #dcdcdc; border-radius:8px; overflow:hidden;">
            <div style="background:#124191; color:#ffffff; padding:16px 24px;">
                <h2 style="margin:0;">Access Granted!</h2>
            </div>
            <div style="padding:24px; color:#333333;">
                <p>Hello,</p>
                <p>Your access request for the <strong>Service Cost Tracker</strong> has been <strong>Approved</strong>.</p>
                <p>You can now log in to the portal using your credentials.</p>
                <table style="width:100%; border-collapse:collapse; margin-top:20px;">
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background:#f5f5f5; width:35%;"><strong>Approved Entity</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${request.requested_customers}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background:#f5f5f5;"><strong>Business Unit</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${request.bu}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background:#f5f5f5;"><strong>Project / LOA</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${request.project_name}</td>
                    </tr>
                </table>
                <p style="margin-top:25px;">Regards,<br><strong>Service Cost Tracker Team</strong></p>
            </div>
        </div>`
    };
    return transporter.sendMail(mailOptions);
};

// 🔥 NAYA: Decline Notification Mail
const sendDeclineMail = async (request) => {
    const mailOptions = {
        from: '"Service Cost Tracker" <care.ni_india@nokia.com>',
        to: request.email,
        subject: `Access Request Update - Service Cost Tracker`,
        html: `
        <div style="font-family: Calibri, Arial, sans-serif; max-width:700px; margin:auto; border:1px solid #dcdcdc; border-radius:8px; overflow:hidden;">
            <div style="background:#666666; color:#ffffff; padding:16px 24px;">
                <h2 style="margin:0;">Request Declined</h2>
            </div>
            <div style="padding:24px; color:#333333;">
                <p>Hello,</p>
                <p>We regret to inform you that your access request for the following entity has been <strong>Declined</strong>.</p>
                <table style="width:100%; border-collapse:collapse; margin-top:20px;">
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background:#f5f5f5; width:35%;"><strong>Customer Account</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${request.requested_customers}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd; background:#f5f5f5;"><strong>Business Unit</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${request.bu}</td>
                    </tr>
                </table>
                <p style="margin-top:25px;">If you believe this is an error, please contact the administrators.</p>
                <p>Regards,<br><strong>Service Cost Tracker Team</strong></p>
            </div>
        </div>`
    };
    return transporter.sendMail(mailOptions);
};

module.exports = {
    sendAccessRequestMail,
    sendApprovalMail,   // 🔥 Export kiya
    sendDeclineMail     // 🔥 Export kiya
};