import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const protectRoute = async (req, res, next) => {
  try {
    // Get token from cookies
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Fetch user from database
    const [user] = await pool.query(
      'SELECT * FROM user_credentials WHERE id = ?',
      [decoded.userId]
    );

    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Attach user to request object
    req.user = {
      id: user[0].id,
      user_id: user[0].user_id,
      user_type: user[0].user_type,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.log('Error in protectRoute middleware:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// export const authorizeRoles = (...allowedRoles) => async (req, res, next) => {


//   try {
//     if (!allowedRoles.includes(req.user.role)) {
//       return res.status(403).json({ error: "Forbidden - Insufficient permissions" });
//     }
//     next();
//   } catch (error) {
//     console.log("Error in authorizeRoles middleware:", error.message);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// Add to existing authorizeRoles middleware

export const authorizeRoles = (...allowedRoles) => async (req, res, next) => {
  try {
    if (req.user.user_type === 'staff') {
      const [staff] = await pool.query(
        'SELECT role FROM staff WHERE staff_id = ?',
        [req.user.user_id]
      );
      if (!allowedRoles.includes(staff[0].role)) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }
    else if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  } catch (error) {
    console.log("Error in authorizeRoles middleware:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};