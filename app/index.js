const express = require('express');
const app = express();
const needle = require('needle');
const fs = require('fs');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const blacklist = require('./blacklist');

app.use(express.json());

function getPublicIp() {
  needle.get('http://ip.dp-tuto.com', function (error, response) {
    if (error) console.log('publicIp error', error);
    else {
      if (response.statusCode == 200) {
        console.log('publicIp', response.body.sourceIp);
      } else {
        console.log('publicIp statusCode', response.statusCode);
      }
    }
  });
}

function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    try {
      var decodedToken = jwt.verify(bearerToken, 'secret');
      req.licence = decodedToken.licence;
      next();
    } catch (err) {
      console.log('error:', err);
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(403);
  }
}

app.get('/', function (req, res) {
  getPublicIp();
  var sourceIp = (function (req) {
    var ipaddr = require('ipaddr.js');
    var ipString = req.connection.remoteAddress;

    if (ipaddr.isValid(ipString)) {
      try {
        var addr = ipaddr.parse(ipString);
        if (ipaddr.IPv6.isValid(ipString) && addr.isIPv4MappedAddress()) {
          return addr.toIPv4Address().toString();
        }
        return addr.toNormalizedString();
      } catch (e) {
        return ipString;
      }
    }
    return 'unknown';
  })(req);
  var localIp = (function (req) {
    var ipaddr = require('ipaddr.js');
    var ipString = req.connection.localAddress;

    if (ipaddr.isValid(ipString)) {
      try {
        var addr = ipaddr.parse(ipString);
        if (ipaddr.IPv6.isValid(ipString) && addr.isIPv4MappedAddress()) {
          return addr.toIPv4Address().toString();
        }
        return addr.toNormalizedString();
      } catch (e) {
        return ipString;
      }
    }
    return 'unknown';
  })(req);
  console.log(
    'request',
    req.method,
    req.hostname,
    req.path,
    JSON.stringify(req.headers)
  );
  const bearerHeader = req.headers['authorization'];
  let licence = 'Essentials';
  if (typeof bearerHeader !== 'undefined') {
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    try {
      var decodedToken = jwt.verify(bearerToken, 'secret');
      licence = decodedToken.licence;
    } catch (err) {
      console.log('error:', err);
    }
  }
  res.json({ headers: req.headers, sourceIp, localIp, licence });
});

app.post('/health', verifyToken, async (req, res) => {
  let returnObj = {
    data: {
      status: 'ok',
    },
  };
  res.json(returnObj);
});

app.post('/tiles', verifyToken, async (req, res) => {
  let returnObj = {
    data: [
      {
        id: 'bl-stats',
        type: 'markdown',
        title: 'Summary',
        periods: [],
        short_description: 'A simple blacklist service',
        description: 'A simple blacklist service',
        tags: ['blacklist'],
      },
    ],
  };
  res.json(returnObj);
});

app.post('/tiles/tile', verifyToken, async (req, res) => {
  let returnObj = { data: {} };
  res.json(returnObj);
});

app.post('/tiles/tile-data', verifyToken, async (req, res) => {
  blacklist.numbers().then((response) => {
    let data = [];
    switch (req.body.tile_id) {
      case 'bl-stats':
        switch (req.licence) {
          case 'Essentials':
            data.push('| | |');
            data.push('| - | - |');
            data.push('| Collection name | Number of entries |');
            data.push(`| IPs | ${response[0].count} |`);
            break;
          case 'Advantage':
            data.push('| | |');
            data.push('| - | - |');
            data.push('| Collection name | Number of entries |');
            data.push(`| IPs | ${response[0].count} |`);
            data.push(`| Domains | ${response[1].count} |`);
            break;
          case 'Premier':
            data.push('| | |');
            data.push('| - | - |');
            data.push('| Collection name | Number of entries |');
            data.push(`| IPs | ${response[0].count} |`);
            data.push(`| Domains | ${response[1].count} |`);
            data.push(`| Urls | ${response[2].count} |`);
            break;
        }

        break;
    }
    res.json({
      data: {
        valid_time: {
          start_time: new moment().toDate().toISOString(),
          end_time: new moment().add(1, 'h').toDate().toISOString(),
        },
        cache_scope: 'user',
        observed_time: {
          start_time: new moment().toDate().toISOString(),
          end_time: new moment().add(1, 'h').toDate().toISOString(),
        },
        data: data,
      },
    });
  });
});

app.post('/respond/observables', verifyToken, async (req, res) => {
  let returnObj = { data: [] };
  res.json(returnObj);
});

app.post('/respond/trigger', verifyToken, async (req, res) => {
  let returnObj = { data: {} };
  res.json(returnObj);
});

app.post('/deliberate/observables', verifyToken, async (req, res) => {
  // filter request regarding licence level
  // console.dir(req.body, { depth: null });
  let request = [];
  req.body.map((element) => {
    if (
      element.type == 'ip' &&
      (req.licence == 'Essentials' ||
        req.licence == 'Advantage' ||
        req.licence == 'Premier')
    ) {
      request.push(element);
    }
    if (
      element.type == 'domain' &&
      (req.licence == 'Advantage' || req.licence == 'Premier')
    ) {
      request.push(element);
    }
    if (element.type == 'url' && req.licence == 'Premier') {
      request.push(element);
    }
  });
  // console.dir(request, { depth: null });
  // Blacklist search for verdicts 
  blacklist.deliberate(request).then((data) => {
    // console.dir(data, { depth: null });
    res.json({ data });
  });
});

app.post('/refer/observables', verifyToken, async (req, res) => {
  let returnObj = { data: {} };
  res.json(returnObj);
});

app.post('/observe/observables', verifyToken, async (req, res) => {
  // filter request regarding licence level
  // console.dir(req.body, { depth: null });
  let request = [];
  req.body.map((element) => {
    if (
      element.type == 'ip' &&
      (req.licence == 'Essentials' ||
        req.licence == 'Advantage' ||
        req.licence == 'Premier')
    ) {
      request.push(element);
    }
    if (
      element.type == 'domain' &&
      (req.licence == 'Advantage' || req.licence == 'Premier')
    ) {
      request.push(element);
    }
    if (element.type == 'url' && req.licence == 'Premier') {
      request.push(element);
    }
  });
  // console.dir(request, { depth: null });
  // Blacklist search for verdicts & judgements
  blacklist.observe(request).then((data) => {
    // console.dir(data, { depth: null });
    res.json({ data });
  });
});

app.listen(80, () => {
  console.log('Starting express on port 80');
});
