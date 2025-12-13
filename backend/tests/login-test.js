import axios from 'axios';

async function testLogin() {
  console.log('--- Starting Login Test ---');
  const url = 'http://localhost:8080/api/auth/login';
  const payload = {
    email: 'test@test.com',
    password: 'password123'
  };

  console.log(`Sending POST request to: ${url}`);
  console.log('Payload:', payload);

  try {
    const response = await axios.post(url, payload, {
      timeout: 15000 // Set a 15-second timeout
    });
    console.log('--- TEST SUCCEEDED ---');
    console.log('Status Code:', response.status);
    console.log('Response Data:', response.data);
  } catch (error) {
    console.error('--- TEST FAILED ---');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status Code:', error.response.status);
      console.error('Response Data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from the server.');
      console.error('This likely means the request timed out, confirming the issue is on the backend.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up the request:', error.message);
    }
  }
}

testLogin();
