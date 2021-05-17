const express = require('express');
const subdomain = require('express-subdomain');
const proxy = require('express-http-proxy');
const fs = require('fs');
const path = require('path');

const app = express();
const records = fs.readFileSync(path.resolve(__dirname, 'storage', 'records.json'));

// app.post('/update', )

app.use(subdomain('mahasiswa.testing.malendong', proxy('malendong')));

app.listen(8080, () => {
    console.log('server running');
});