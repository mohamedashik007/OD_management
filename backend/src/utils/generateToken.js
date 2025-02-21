import jwt from 'jsonwebtoken';

const generateTokenAndSetCookie = (userId, role, res) => {
  // Generate JWT token
  const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: '15d', // Token expires in 15 days
  });

  // Set cookie with the token
  res.cookie('jwt', token, {
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days in milliseconds
    httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
    sameSite: 'strict', // Prevent CSRF attacks
    secure: process.env.NODE_ENV !== 'development', // Only send over HTTPS in production
  });
};

export default generateTokenAndSetCookie;