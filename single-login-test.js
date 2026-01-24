const http = require('http');

console.log('🚀 SINGLE LOGIN TEST: Port 6543...');

const data = JSON.stringify({
    email: 'naveenmotika143@gmail.com',
    password: 'password123',
    rememberMe: true
});

const req = http.request({
    hostname: '127.0.0.1',
    port: 3001,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        if (res.statusCode === 200) {
            console.log('✅ Login Successful!');
            const response = JSON.parse(body);
            console.log('User ID:', response.data.user.id);
            console.log('Session ID:', response.data.session.id);
        } else {
            console.log('❌ Login Failed');
            console.log(body);
        }
    });
});

req.on('error', (e) => {
    console.error(`❌ Error: ${e.message}`);
});

req.write(data);
req.end();
