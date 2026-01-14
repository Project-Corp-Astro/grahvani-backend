const axios = require('axios');

async function createUser() {
    const userData = {
        email: 'chandukomera999@gmail.com',
        password: 'Chandu@123',
        name: 'Chandu Komera',
        tenantId: '00000000-0000-0000-0000-000000000000'
    };

    try {
        console.log('Attempting to create user...');
        const response = await axios.post('http://localhost:3001/api/v1/auth/register', userData);
        console.log('Success! User created:', response.data.user.email);
    } catch (error) {
        if (error.response?.data?.error?.code === 'USER_EXISTS') {
            console.log('User already exists, ready for login.');
        } else {
            console.error('Registration failed:', error.response?.data || error.message);
        }
    }
}

createUser();
