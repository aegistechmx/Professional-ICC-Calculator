const prisma = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { asyncHandler } = require('../middleware/errorHandler');
const { z } = require('zod');

// Email validation schema
const emailSchema = z.string().email('Invalid email format');
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

exports.register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate email and password
  try {
    emailSchema.parse(email);
    passwordSchema.parse(password);
  } catch (error) {
    return res.status(400).json({ error: error.errors[0].message });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hash }
  });

  res.json(user);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate email
  try {
    emailSchema.parse(email);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate password is provided
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.json({ token });
});
