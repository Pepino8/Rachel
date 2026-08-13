import express from 'express';
import { login, register, getMe, updateProfile, updateGameflip, getUsers, deleteUser, getProfile } from '../controllers/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, loginSchema, registerSchema, updateProfileSchema, linkGameflipSchema } from '../middleware/validation.js';

const router = express.Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/register', validateBody(registerSchema), register);
router.get('/me', requireAuth, getMe);
router.post('/update-profile', requireAuth, validateBody(updateProfileSchema), updateProfile);
router.post('/update-gameflip', requireAuth, validateBody(linkGameflipSchema), updateGameflip);
router.get('/users', requireAuth, getUsers);
router.delete('/users/:id', requireAuth, deleteUser);
router.get('/profile', requireAuth, getProfile);

export default router;
