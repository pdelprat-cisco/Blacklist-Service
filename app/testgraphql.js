const { GraphQLClient, gql } = require('graphql-request');
const moment = require('moment');

// Target Hasura endpoint
const graphQLEndpoint = 'http://pdelprat-hasura.dp-tuto.com:8080/v1/graphql';

// GraphQL client admin secret
const graphQLClient = new GraphQLClient(graphQLEndpoint, {
  headers: {
    'x-hasura-admin-secret': 'aooQD*G&mF66nFqV',
  },
});

// Query to get status of observable
const query = gql`
  query MyQuery($type: String!, $value: String!) {
    blacklists(where: { type: { _eq: $type }, value: { _eq: $value } }) {
      type
      value
    }
  }
`;

// Query to get numbers of entries of a observable type
const queryNumbers = gql`
  query MyQuery($type: String!) {
    blacklists_aggregate(where: { type: { _eq: $type } }) {
      aggregate {
        count
      }
    }
  }
`;

const requests = [
  {
    value: '10.1.1.1',
    type: 'ip',
  },
  {
    value: '10.1.1.2',
    type: 'ip',
  },
  {
    value: '10.1.1.3',
    type: 'ip',
  },
  {
    value: '10.1.1.4',
    type: 'ip',
  },
  {
    value: 'internetbadguys.com',
    type: 'domain',
  },
  {
    value: 'http://internetbadguys.com',
    type: 'url',
  },
];

// Simple request numbers
const requestNumbers = (type) => {
  return new Promise((resolve, reject) => {
    graphQLClient.request(queryNumbers, { type }).then((response) => {
      response.blacklists_aggregate.aggregate.type = type;
      resolve(response);
    });
  });
};

// Fetch blacklist numbers
async function numbers() {
  return new Promise((resolve, reject) => {
    let promises = [];
    promises.push(requestNumbers('ip'));
    promises.push(requestNumbers('domain'));
    promises.push(requestNumbers('url'));
    Promise.all(promises).then((response) => {
      let data = [];  
      response.map((element) => {
        data.push({
          type: element.blacklists_aggregate.aggregate.type,
          count: element.blacklists_aggregate.aggregate.count,
        });
      })
      resolve(data);
    });
  });
}

numbers().then((response) => {
  console.dir(response, { depth: null });
});

// Simple request of blacklist observable status
const request = (type, value) => {
  return new Promise((resolve, reject) => {
    graphQLClient.request(query, { type, value }).then((response) => {
      resolve(response);
    });
  });
};

// Fetch a collection of observables blacklist status
async function search(data) {
  return new Promise((resolve, reject) => {
    let promises = [];
    data.map((element) => {
      console.log(element);
      switch (element.type) {
        case 'ip':
          promises.push(request(element.type, element.value));
          break;
        case 'domain':
          promises.push(request(element.type, element.value));
          break;
        case 'url':
          promises.push(request(element.type, element.value));
      }
    });
    Promise.all(promises).then((response) => {
      resolve(response);
    });
  });
}

search(requests).then((response) => {
  let list = [];
  response.map((element) => {
    if (element.blacklists.length > 0) {
      list.push(element.blacklists[0]);
      //console.dir(element.blacklists, { depth: null });
    }
  });
  let data = {
    verdicts: {
      count: list.length,
      docs: [],
    },
    judgements: {
      count: list.length,
      docs: [],
    },
  };
  list.map((element) => {
    data.verdicts.docs.push({
      type: 'verdict',
      disposition: 2,
      observable: { value: element.value, type: element.type },
      judgement_id: '',
      disposition_name: 'Malicious',
      valid_time: {
        start_time: new moment().toDate().toISOString(),
        end_time: new moment().add(1, 'h').toDate().toISOString(),
      },
    });
    data.judgements.docs.push({
      schema_version: '1.1.3',
      observable: { value: element.value, type: element.type },
      type: 'judgement',
      source: 'blacklist API',
      disposition: 2,
      reason: 'Poor blacklist reputation status',
      source_uri: '',
      disposition_name: 'Malicious',
      priority: 90,
      id: '',
      severity: 'High',
      tlp: 'amber',
      confidence: 'High',
      valid_time: {
        start_time: new moment().toDate().toISOString(),
        end_time: new moment().add(1, 'h').toDate().toISOString(),
      },
    });
  });

  console.dir(data, { depth: null });
});

