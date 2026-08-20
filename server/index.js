process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
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

// Token Cache
let wazuhToken = null;
let tokenExpiresAt = 0;

// Alerts Cache
let alertsCache = null;
let alertsCacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds

async function getWazuhToken() {
    if (wazuhToken && Date.now() < tokenExpiresAt) {
        return wazuhToken;
    }

    try {
        const credentials = Buffer.from(`${WAZUH_USER}:${WAZUH_PASS}`).toString('base64');
        const response = await fetch(`${WAZUH_URL}/security/user/authenticate`, {
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
    // Attempting OpenSearch method
    const credentials = Buffer.from(`${WAZUH_USER}:${WAZUH_PASS}`).toString('base64');
    const response = await fetch(`${INDEXER_URL}/wazuh-alerts-*/_search`, {
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
    const response = await fetch(`${WAZUH_URL}/alerts?limit=500&sort=-timestamp&q=rule.groups=suricata`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`API failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.data?.items || [];
}

async function fetchAlerts() {
    let rawAlerts = [];
    try {
        // Try Wazuh 4.x API Endpoint
        rawAlerts = await fetchAlertsFromWazuhAPI();
    } catch (apiError) {
        console.warn('Could not fetch from Wazuh API directly. Falling back to Wazuh Indexer...', apiError.message);
        try {
            rawAlerts = await fetchAlertsFromIndexer();
        } catch (indexerError) {
            console.error('Could not fetch from Indexer either:', indexerError.message);
            throw new Error('All Wazuh fetch methods failed');
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
            agent: alert.agent?.name || 'unknown',
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
