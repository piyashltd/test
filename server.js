const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { RouterOSClient } = require('node-routeros');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Allow frontend to connect
app.use(bodyParser.json());

// MikroTik Configuration
const ROUTER_CONFIG = {
    host: '192.168.88.1', // Your Router IP
    port: 8728,           // API Port
    keepalive: true
};

// 1. Login Endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // We verify credentials by attempting to log in to the API
    // Note: In a Hotspot scenario, you might just query the Active Users list instead.
    // This example assumes we are logging in as a System User or validating Hotspot credentials via a script.
    
    // For specific Hotspot User validation, it is often better to use a dedicated API user
    // to connect, and then Query the '/ip/hotspot/user' print command.
    
    // Simplification for this example: 
    // We connect as admin to check if the specific user exists in the active list.
    
    const client = new RouterOSClient({
        host: ROUTER_CONFIG.host,
        user: 'admin',      // API User (Full permissions)
        password: 'admin_password',
        keepalive: false
    });

    try {
        await client.connect();
        
        // Check if user exists in Hotspot Users
        const users = await client.menu('/ip/hotspot/user').get({ name: username });
        
        // In a real scenario, you would also verify the password here.
        // Since MikroTik API doesn't easily expose "Verify Password" for hotspot users 
        // without CHAP, we assume if the entry exists and the password matches our record, it's valid.
        
        if (users.length > 0 && users[0].password === password) {
            res.json({ success: true, user: username });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        
        client.close();

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Router connection failed' });
    }
});

// 2. Stats Endpoint
app.get('/stats', async (req, res) => {
    const { user } = req.query;

    const client = new RouterOSClient({
        host: ROUTER_CONFIG.host,
        user: 'admin',
        password: 'admin_password'
    });

    try {
        await client.connect();

        // Get Active Hotspot user stats
        // This menu contains 'bytes-in' and 'bytes-out' for active sessions
        const activeUsers = await client.menu('/ip/hotspot/active').get({ user: user });

        if (activeUsers.length > 0) {
            const userData = activeUsers[0];
            res.json({
                bytesIn: userData['bytes-in'],   // Download
                bytesOut: userData['bytes-out']  // Upload
            });
        } else {
            res.json({ bytesIn: 0, bytesOut: 0 });
        }

        client.close();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
