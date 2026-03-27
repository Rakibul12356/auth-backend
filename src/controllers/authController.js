const prisma = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');

// ইমেইল ট্রান্সপোর্টার সেটআপ
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ১. রেজিস্ট্রেশন এবং ওটিপি পাঠানো
exports.register = async (req, res) => {
    try {
        const { email, password, name, phone } = req.body;

        if (!email || !password || !name || !phone) {
            return res.status(400).json({ error: "সবগুলো তথ্য প্রদান করুন" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
        const hashedPassword = await bcrypt.hash(password, 10);

        // ইউজার তৈরি
        const user = await prisma.user.create({
            data: { 
                email, 
                password: hashedPassword, 
                name, 
                phone, 
                role: "user", 
                verificationCode: otp 
            },
        });

        // ইমেইল পাঠানোর কনফিগারেশন
        const mailOptions = {
            from: `"My Auth App" <${process.env.EMAIL_USER}>`, // আপনার .env থেকে ইমেইল নেবে
            to: email,
            subject: "আপনার ভেরিফিকেশন কোড (OTP)",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
                    <h2 style="color: #4CAF50;">ইমেইল ভেরিফিকেশন</h2>
                    <p>হ্যালো <strong>${name}</strong>,</p>
                    <p>আমাদের অ্যাপে রেজিস্ট্রেশন করার জন্য ধন্যবাদ। আপনার ভেরিফিকেশন কোডটি নিচে দেওয়া হলো:</p>
                    <h1 style="background: #f4f4f4; padding: 10px; text-align: center; letter-spacing: 5px;">${otp}</h1>
                    <p>এই কোডটি কারো সাথে শেয়ার করবেন না।</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ message: "User registered! Please check your email for OTP." });

    } catch (err) {
        console.error("Registration Error:", err);
        if (err.code === "P2002") {
            return res.status(400).json({ error: "এই ইমেইল বা ফোন নম্বরটি আগে থেকেই আছে!" });
        }
        res.status(500).json({ error: "সার্ভারে সমস্যা হয়েছে: " + err.message });
    }
};

// ২. ইমেইল ভেরিফাই করা
exports.verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || user.verificationCode !== otp) {
            return res.status(400).json({ error: "ভুল ওটিপি বা ইমেইল!" });
        }

        await prisma.user.update({
            where: { email },
            data: { isVerified: true, verificationCode: null } 
        });

        res.json({ message: "Email verified successfully! You can now login." });
    } catch (error) {
        res.status(500).json({ error: "Verification failed!" });
    }
};

// ৩. লগইন (ভেরিফিকেশন চেকসহ)
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ error: "ইউজার পাওয়া যায়নি!" });
        }

        if (!user.isVerified) {
            return res.status(403).json({ error: "দয়া করে আগে আপনার ইমেইল ভেরিফাই করুন!" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "ভুল পাসওয়ার্ড!" });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: "লগইন করার সময় সমস্যা হয়েছে!" });
    }
};

// ৪. প্রোফাইল দেখা
exports.getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { id: true, email: true, createdAt: true, name: true, phone: true, role: true },
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Could not fetch profile" });
    }
};

// ৫. সব ইউজার দেখা (অ্যাডমিন)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
        });
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: "User list paoya jayni!" });
    }
};

// ৬. রোল আপডেট করা (অ্যাডমিন)
exports.updateUserRole = async (req, res) => {
    try {
        const { userId, newRole } = req.body;
        const allowedRoles = ["user", "admin", "manager", "sub-admin"];
        
        if (!allowedRoles.includes(newRole)) {
            return res.status(400).json({ error: "Invalid role!" });
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { role: newRole },
        });

        res.json({ message: `User role updated to ${newRole}`, user: updatedUser });
    } catch (error) {
        res.status(500).json({ error: "Role update failed!" });
    }
};

// ৭. লগআউট
exports.logout = (req, res) => {
    res.json({ message: "Logout successful" });
};