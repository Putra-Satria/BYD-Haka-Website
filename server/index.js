process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3001;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://sjujcjvmjaqqstpdldsj.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;
if (SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

const WAZUH_URL = process.env.WAZUH_API_URL || 'https://localhost:55000';
const INDEXER_URL = 'https://localhost:9200'; // commonly 9200 for indexer
const WAZUH_USER = process.env.WAZUH_API_USER || 'admin';
const WAZUH_PASS = process.env.WAZUH_API_PASSWORD;

const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(o => o.trim());
app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, true); // Allow all for dev, tighten for production
        }
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Token Cache
let wazuhToken = null;
let tokenExpiresAt = 0;

// Alerts Cache
let alertsCache = null;
let alertsCacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds

const https = require('https');

function httpsReq(url, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            const urlObj = new URL(url);
            const reqOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                rejectUnauthorized: false,
            };

            const req = https.request(reqOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json: async () => parsed, text: async () => data });
                    } catch (e) {
                        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json: async () => ({}), text: async () => data });
                    }
                });
            });

            req.on('error', (err) => reject(err));

            if (options.body) {
                req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
            }
            req.end();
        } catch (e) {
            reject(e);
        }
    });
}

async function getWazuhToken() {
    if (wazuhToken && Date.now() < tokenExpiresAt) {
        return wazuhToken;
    }

    try {
        const credentials = Buffer.from(`${WAZUH_USER}:${WAZUH_PASS}`).toString('base64');
        const response = await httpsReq(`${WAZUH_URL}/security/user/authenticate`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });

        if (!response.ok) {
            throw new Error(`Auth failed with status ${response.status}`);
        }

        const data = await response.json();
        if (data.data && data.data.token) {
            wazuhToken = data.data.token;
            tokenExpiresAt = Date.now() + (850 * 1000); // Token valid for ~900s, refresh at 850s
            return wazuhToken;
        } else {
            throw new Error('Token not found in response');
        }
    } catch (error) {
        console.error('Error authenticating with Wazuh:', error.message);
        throw error;
    }
}

function mapSeverity(level) {
    const l = Number(level) || 0;
    if (l >= 12) return 4;
    if (l >= 8) return 3;
    if (l >= 4) return 2;
    return 1;
}

async function fetchAlertsFromIndexer() {
    const credentials = Buffer.from(`${WAZUH_USER}:${WAZUH_PASS}`).toString('base64');
    const response = await httpsReq(`${INDEXER_URL}/wazuh-alerts-*/_search`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            "query": { "bool": { "must": [{ "match": { "rule.groups": "suricata" } }] } },
            "sort": [{ "timestamp": "desc" }],
            "size": 500
        })
    });

    if (!response.ok) {
        throw new Error(`Indexer failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.hits?.hits?.map(hit => hit._source) || [];
}

async function fetchAlertsFromWazuhAPI() {
    const token = await getWazuhToken();
    // Try manager logs endpoint first
    const response = await httpsReq(`${WAZUH_URL}/manager/logs?limit=500`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`API failed with status ${response.status}`);
    }

    const data = await response.json();
    const items = data.data?.affected_items || data.data?.items || [];
    return items;
}

const fs = require('fs');

async function fetchAlertsFromEveJson() {
    const evePath = 'C:\\Program Files\\Suricata\\log\\eve.json';
    if (!fs.existsSync(evePath)) return [];

    try {
        const fileContent = fs.readFileSync(evePath, 'utf8');
        const lines = fileContent.trim().split('\n').slice(-500);
        const alerts = [];

        for (const line of lines) {
            try {
                const item = JSON.parse(line);
                if (item && item.event_type === 'alert') {
                    const alertData = item.alert || {};
                    const httpData = item.http || {};
                    alerts.push({
                        id: item.flow_id ? String(item.flow_id) : Math.random().toString(36).substring(7),
                        timestamp: item.timestamp || new Date().toISOString(),
                        agent: 'LAPTOP-5GFOE079',
                        event_type: 'alert',
                        signature_id: alertData.signature_id || 0,
                        signature: alertData.signature || 'Suricata Alert',
                        severity: alertData.severity || 1,
                        src_ip: item.src_ip || '-',
                        src_port: item.src_port || 0,
                        dest_ip: item.dest_ip || '-',
                        dest_port: item.dest_port || 0,
                        app_proto: item.app_proto || item.proto || 'http',
                        url: httpData.url || httpData.hostname || '-',
                        method: httpData.http_method || '-',
                        status: httpData.status || 200
                    });
                }
            } catch (e) {
                // skip line
            }
        }

        return alerts.reverse(); // newest first
    } catch (err) {
        console.error('Error reading eve.json:', err.message);
        return [];
    }
}

async function fetchAlerts() {
    // 1. Primary: Read real-time Suricata alerts from eve.json
    const eveAlerts = await fetchAlertsFromEveJson();
    if (eveAlerts.length > 0) {
        return eveAlerts;
    }

    // 2. Secondary fallback to Wazuh API / Indexer
    let rawAlerts = [];
    try {
        rawAlerts = await fetchAlertsFromWazuhAPI();
    } catch (apiError) {
        console.warn('Could not fetch from Wazuh API directly. Falling back to Wazuh Indexer...', apiError.message);
        try {
            rawAlerts = await fetchAlertsFromIndexer();
        } catch (indexerError) {
            console.error('Could not fetch from Indexer either:', indexerError.message);
            return [];
        }
    }

    return rawAlerts.map(alert => {
        const data = alert.data || {};
        const alertData = data.alert || {};
        const rule = alert.rule || {};
        const httpData = data.http || {};

        return {
            id: alert.id || data.flow_id || Math.random().toString(36).substring(7),
            timestamp: data.timestamp || alert.timestamp || new Date().toISOString(),
            agent: alert.agent?.name || 'LAPTOP-5GFOE079',
            event_type: data.event_type || 'alert',
            signature_id: alertData.signature_id || 0,
            signature: alertData.signature || rule.description || 'Unknown Signature',
            severity: Number(alertData.severity) || mapSeverity(rule.level),
            src_ip: data.src_ip || '',
            src_port: Number(data.src_port) || 0,
            dest_ip: data.dest_ip || '',
            dest_port: Number(data.dest_port) || 0,
            app_proto: data.app_proto || data.proto || '',
            url: httpData.url || httpData.hostname || '',
            method: httpData.http_method || '',
            status: Number(httpData.status) || 0
        };
    });
}


app.get('/api/wazuh-alerts', async (req, res, next) => {
    try {
        if (alertsCache && (Date.now() - alertsCacheTime < CACHE_TTL)) {
            return res.json(alertsCache);
        }

        const alerts = await fetchAlerts();
        alertsCache = alerts;
        alertsCacheTime = Date.now();
        
        res.json(alerts);
    } catch (error) {
        res.status(503).json({ error: 'Wazuh API unavailable', details: error.message });
    }
});

app.get('/api/wazuh-alerts/summary', async (req, res, next) => {
    try {
        let alerts = alertsCache;
        if (!alerts || (Date.now() - alertsCacheTime >= CACHE_TTL)) {
            alerts = await fetchAlerts();
            alertsCache = alerts;
            alertsCacheTime = Date.now();
        }

        const severityBreakdown = { "1": 0, "2": 0, "3": 0, "4": 0 };
        const sourceIPs = {};
        const signatures = {};
        const alertsByHour = {};

        alerts.forEach(alert => {
            severityBreakdown[alert.severity] = (severityBreakdown[alert.severity] || 0) + 1;
            
            if (alert.src_ip) {
                sourceIPs[alert.src_ip] = (sourceIPs[alert.src_ip] || 0) + 1;
            }
            
            if (alert.signature) {
                signatures[alert.signature] = (signatures[alert.signature] || 0) + 1;
            }

            const hour = alert.timestamp.substring(0, 13) + ':00:00Z'; // 2026-08-10T14
            alertsByHour[hour] = (alertsByHour[hour] || 0) + 1;
        });

        const topSourceIPs = Object.entries(sourceIPs)
            .map(([ip, count]) => ({ ip, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const topSignatures = Object.entries(signatures)
            .map(([signature, count]) => ({ signature, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const alertsPerHour = Object.entries(alertsByHour)
            .map(([hour, count]) => ({ hour, count }))
            .sort((a, b) => a.hour.localeCompare(b.hour));

        res.json({
            totalAlerts: alerts.length,
            highSeverity: severityBreakdown["3"] + severityBreakdown["4"],
            uniqueSourceIPs: Object.keys(sourceIPs).length,
            severityBreakdown,
            topSourceIPs,
            topSignatures,
            alertsPerHour,
            connected: true,
            lastFetch: new Date(alertsCacheTime).toISOString()
        });

    } catch (error) {
        res.status(503).json({ error: 'Wazuh API unavailable', details: error.message });
    }
});

app.post('/api/admin/create-user', async (req, res) => {
    try {
        const { email, password, full_name, department, role } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!supabaseAdmin) {
            return res.status(500).json({ 
                error: 'SUPABASE_SERVICE_ROLE_KEY is not set in server/.env' 
            });
        }

        let userId = '';

        // Step 1: Try creating new user directly via Auth Admin API
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: normalizedEmail,
            password: password || 'DefaultPass123!',
            email_confirm: true,
            user_metadata: {
                full_name: full_name?.trim() || normalizedEmail.split('@')[0],
            },
        });

        if (createErr) {
            // If user already exists in auth.users, find existing user in profiles
            const errLower = (createErr.message || '').toLowerCase();
            if (errLower.includes('already') || errLower.includes('registered') || createErr.status === 422) {
                const { data: existingProfile } = await supabaseAdmin
                    .from('profiles')
                    .select('user_id')
                    .ilike('email', normalizedEmail)
                    .maybeSingle();

                if (existingProfile) {
                    userId = existingProfile.user_id;
                    await supabaseAdmin.from('profiles').update({
                        full_name: full_name?.trim() || undefined,
                        department: department || 'General',
                        access_disabled: false,
                    }).eq('user_id', userId);
                } else {
                    return res.status(400).json({ error: 'User already exists in Auth, please use login.' });
                }
            } else {
                throw createErr;
            }
        } else {
            userId = newUser.user.id;
            // Update profile created by handle_new_user trigger
            await supabaseAdmin.from('profiles').update({
                department: department || 'General',
                access_disabled: false,
            }).eq('user_id', userId);
        }

        // Step 2: Update role in user_roles
        const targetRole = role || 'user';
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
        await supabaseAdmin.from('user_roles').insert({
            user_id: userId,
            role: targetRole,
        });

        return res.status(200).json({
            success: true,
            message: 'User created/updated successfully',
            user_id: userId,
        });
    } catch (err) {
        console.error('Error creating user in backend:', err);
        return res.status(400).json({ error: err.message || 'Failed to process user' });
    }
});

app.get('/health', async (req, res) => {
    let connected = false;
    try {
        await getWazuhToken();
        connected = true;
    } catch (e) {
        connected = false;
    }
    
    res.json({ 
        status: 'ok', 
        wazuhConnected: connected, 
        uptime: process.uptime() 
    });
});

app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Unhandled error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
    console.log(`Wazuh API configured for: ${WAZUH_URL}`);
});
