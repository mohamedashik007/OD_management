import bcrypt from "bcryptjs";
import pool from '../config/db.js';
import generateTokenAndSetCookie from "../utils/generateToken.js";

export const login = async ( req, res) =>{
  try{
    const { email, password } = req.body;

    // Check if user exists
    const [user] = await pool.query(
      'SELECT * FROM user_credentials WHERE email = ?',
      [email]
    );

    if (!user[0]) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Check if password reset is required
    if (user[0].password_reset_required) {
      return res.status(403).json({ error: 'Reset your password' });
    }

    // Check if password is correct
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user[0].password_hash
    );

    if (!isPasswordCorrect) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Get role for staff users
    let role = 'student';
    if (user[0].user_type === 'staff') {
      const [staff] = await pool.query(
        'SELECT role FROM staff WHERE staff_id = ?',
        [user[0].user_id]
      );
      role = staff[0].role;
    }
    // Generate JWT token and set cookie
    generateTokenAndSetCookie(user[0].id, role, res);

    res.status(200).json({
      id: user[0].id,
      user_id: user[0].user_id,
      user_type: user[0].user_type,
      role,
    });
  }catch(error){
    console.log("Error in login controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export const logout = (req, res) => {
  try {
    // Clear the JWT cookie
    res.clearCookie('jwt', {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV !== 'development',
    });

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.log('Error in logout controller:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Check if user exists
    const [user] = await pool.query(
      'SELECT * FROM user_credentials WHERE email = ?',
      [email]
    );

    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if password reset is required
    if (!user[0].password_reset_required) {
      return res.status(403).json({ error: 'Password reset not required' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and reset password_reset_required
    await pool.query(
      'UPDATE user_credentials SET password_hash = ?, password_reset_required = FALSE WHERE email = ?',
      [hashedPassword, email]
    );

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.log('Error in resetPassword controller:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};