const jwt = require('jsonwebtoken');

const email = 'pdelprat@cisco.com';

// const licence = 'Essentials';
// const licence = 'Advantage';
const licence = 'Premier';

var token = jwt.sign(
  {
    email,
    licence,
  },
  'secret',
  { expiresIn: '1d' }
);

setTimeout(() => {
  try {
    console.log(token);
    var decoded = jwt.verify(token, 'secret');
    console.log(decoded);
  } catch (err) {
    console.log('error:', err);
  }
}, 1 * 60);
