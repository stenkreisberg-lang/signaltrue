import axios from 'axios';

async function testLogin() {
  try {
    console.log('Attempting to call http://localhost:8080/api/auth/login...');
    const response = await axios.post('http://localhost:8080/api/auth/login', {
      email: 'test@test.com',
      password: 'password123'
    }, {
      timeout: 5000 // 5 second timeout
    });
    console.log('Response from server:');
    console.log(response.status);
    console.log(response.data);
  } catch (error) {
    console.error('Error calling login endpoint:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Error setting up request:', error.message);
    }
  }
}

testLogin();
