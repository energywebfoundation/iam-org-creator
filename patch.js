// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
const file = 'node_modules/nats.ws/package.json';

fs.readFile(file, 'utf8', function (err, data) {
  if (err) {
    return console.log(err);
  }
  const result = data.replace(
    '"main": "./cjs/nats.cjs",',
    '"main": "./cjs/nats.js",',
  );

  fs.writeFile(file, result, 'utf8', function (err) {
    if (err) return console.log(err);
  });
});
