const nodemailer = require('nodemailer');

// Console logger - no real emails sent
async function sendPasswordResetEmail(email, resetLink) {
    console.log('\n📧 ========== PASSWORD RESET ==========');
    console.log(`📨 To: ${email}`);
    console.log(`🔗 Reset Link: ${resetLink}`);
    console.log('=======================================\n');
    
    // Simulate success
    return { messageId: 'test-' + Date.now() };
}

async function sendWelcomeEmail(email, username) {
    console.log('\n📧 ========== WELCOME EMAIL ==========');
    console.log(`📨 To: ${email}`);
    console.log(`👋 Welcome ${username} to Wave! 🌊`);
    console.log('=======================================\n');
    
    // Simulate success
    return { messageId: 'test-' + Date.now() };
}

module.exports = { sendPasswordResetEmail, sendWelcomeEmail };