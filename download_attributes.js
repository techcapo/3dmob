var fs = require('fs');

const axios = require('axios');

var requests = []
var i = 0;

function scheduleRequests(axiosInstance, intervalMs) {
    let lastInvocationTime = undefined;

    const scheduler = (config) => {
        const now = Date.now();
        if (lastInvocationTime) {
            lastInvocationTime += intervalMs;
            const waitPeriodForThisRequest = lastInvocationTime - now;
            if (waitPeriodForThisRequest > 0) {
                return new Promise((resolve) => {
                    setTimeout(
                        () => resolve(config),
                        waitPeriodForThisRequest);
                });
            }
        }

        lastInvocationTime = now;
        return config;
    }

    axiosInstance.interceptors.request.use(scheduler);
}

const arService = axios.create({ baseURL: 'https://arweave.net/' });
scheduleRequests(arService, 300);

var errors = [];

fs.readFile('metadata/monkettez-metadata.json', 'utf-8', (err, data) => {

  if (err) {
    return console.log(err);
  }
  var json = JSON.parse(data);
  for (const [key, value] of Object.entries(json)) {
    if (key !== value.mintMetaData.mint) {
      throw `OMG key ${key} not equal mint id ${value.mintMetaData.mint}`;
    }

    // if (![
    //   '2yACtzj1ERtbywJUFvQyM9sKHYAyosnRGsQPF6tc95r1',
    //   'CjW1c4CdndZnyXJesnN1xecEKyvXphi7LwkxaCchTWRK',
    //   'DuTB9ktxjP955Gu8EjuUacRYRqHv1hYkCKseP9KNtVAG',
    //   ].includes(key)) {
    //   continue;
    // }

//    console.log(`downloading ${key}: ${value.name} ${value.uri}`);

    requests.push(arService
      .get(value.uri)
      .then(res => {
        // console.log(`statusCode: ${res.status}`);
        // console.log(res.data);
        if (value.name !== res.data.name) {
          throw `OMG name not equal: ${value.name} ${res.data.name}`;
        }
        const regexpName = /Mob Monk.* #([0-9]+)$/;
        const match = value.name.match(regexpName);
        const number = match[1]
        const id = 'y' + number
        console.log(`Number: ${number}`);
        return {
          id: id,
          number: number,
          mint: key,
          url: value.uri,
          gender: 'Monkette',
          attr: res.data.attributes.reduce((memo, cur) => {
            memo[cur.trait_type] = cur.value;
            return memo;
          }, {})
        };
      })
      .catch(error => {
        errors.push({
          name: value.name,
          mint: key,
          url: value.uri,
        })
        console.error(error);
      })
    );
    // if (i++ > 2) {
    //   break;
    // }
  }

  Promise.all(requests).then(metadata => {
    // console.log(metadata);

    fs.writeFile('metadata/attributes.json', JSON.stringify(metadata), err => {
      if (err) {
        console.error(err);
      }
    });

    console.log('errors ======')
    console.log(errors)

  })

});

