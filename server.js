const express = require('express');
const subdomain = require('express-subdomain');
const proxy = require('express-http-proxy');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const dotenv = require('dotenv');
const _ = require('lodash');

dotenv.config();

const env = process.env;

const app = express();

app.use(bodyParser.json({
    limit: '1024mb',
    verify: (req, res, buf, encoding) => {
        if (buf && buf.length) {
            req.rawBody = buf.toString(encoding || 'utf8');
        }
    },
}));
app.use(bodyParser.urlencoded({ limit: '1024mb', extended: true }));

let records = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'storage', 'records.json'), 'utf-8'));

records.forEach((r) => {
    console.log(`${r.subdomain} --> ${r.server}`);
    app.use(subdomain(r.subdomain, proxy(r.server)));
});

const verifyDigest = (req, res, next) => {
    if (!req.rawBody) {
        return next('Request body empty')
    }
    const secret = process.env.GITHUB_SECRET;
    const sigHeaderName = 'X-Hub-Signature-256'
    const sigHashAlg = 'sha256';
    const sig = Buffer.from(req.get(sigHeaderName) || '', 'utf8')
    const hmac = crypto.createHmac(sigHashAlg, secret)
    const digest = Buffer.from(sigHashAlg + '=' + hmac.update(req.rawBody).digest('hex'), 'utf8')
    if (sig.length !== digest.length || !crypto.timingSafeEqual(digest, sig)) {
        return next(`Request body digest (${digest}) did not match ${sigHeaderName} (${sig})`)
    }
    return next()
}

app.post('/update', verifyDigest, (req, res) => {
    const { action, pull_request, repository } = req.body;
    if (action === 'opened' || action === 'reopened') {
        const { head: { ref } } = pull_request;
        const { name, clone_url } = repository;

        console.log('Action: ', action);
        console.log('Repo Name: ', name);
        console.log('Branch: ', ref);
        console.log('Clone URL: ', clone_url);

        cp.exec(`./createContainer.sh ${clone_url} ${name} ${ref}`, (err, stdout, stderr) => {
            if (err) return console.log('Error: ', err);
            if (stderr) return console.log('Error: ', stderr);
            const container_ip = stdout;
            const subdomain = ref + '.' + env.SUBDOMAIN_AFFIX;
            const server = container_ip + ':' + env.APP_PORT;
            records.push({ subdomain, server });
            fs.writeFileSync(path.resolve(__dirname, 'storage', 'records.json'), JSON.stringify(records));
        });
    } else if (action === 'closed') {
        const { head: { ref } } = pull_request;
        const { name } = repository;
        cp.exec(`./removeContainer.sh ${name} ${ref}`, (err, stdout, stderr) => {
            if (err) return console.log('Error: ', err);
            if (stderr) return console.log('Error: ', stderr);
            const subdomain = ref + '.' + env.SUBDOMAIN_AFFIX;
            const idx = _.findIndex(records, ['subdomain', subdomain]);
            records.splice(idx, 1);
            fs.writeFileSync(path.resolve(__dirname, 'storage', 'records.json'), JSON.stringify(records));
        });
    }
    res.send({ ok: true });
});

app.listen(8080, () => {
    console.log('server running');
});