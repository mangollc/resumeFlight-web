/**
 * @file auth.routes.ts
 * Authentication routes including login, logout, and session management
 */

import { Router } from 'express';
import { storage } from '../storage';
import passport from 'passport';
import { setupAuth } from '../auth';
import { z } from 'zod';

const router = Router();

// Authentication validation schemas
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
});

const registerSchema = loginSchema.extend({
    name: z.string().min(1)
});

// Routes
router.post('/register', async (req, res) => {
    try {
        const data = registerSchema.parse(req.body);
        const existingUser = await storage.getUserByEmail(data.email);
        
        if (existingUser) {
            return res.status(400).json({ error: "Email already registered" });
        }

        const user = await storage.createUser(data);
        req.login(user, (err) => {
            if (err) {
                console.error('Login error after registration:', err);
                return res.status(500).json({ error: "Failed to login after registration" });
            }
            return res.status(201).json(user);
        });
    } catch (error: any) {
        console.error('Registration error:', error);
        return res.status(400).json({ error: error.message });
    }
});

router.post('/login', passport.authenticate('local'), (req, res) => {
    res.json(req.user);
});

router.post('/logout', (req, res) => {
    req.logout(() => {
        res.json({ message: "Logged out successfully" });
    });
});

router.get('/me', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
});

export const authRoutes = router;
