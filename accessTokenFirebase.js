const { JWT } = require('google-auth-library');
const fs = require('fs');

// Ganti path di sini sesuai nama file JSON dari Firebase
const serviceAccount = require('./objectdetectionflutter.json');

async function getAccessToken() {
  const client = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });

  const accessToken = await client.authorize();
  console.log('Access Token:', accessToken.access_token);
}

getAccessToken();
