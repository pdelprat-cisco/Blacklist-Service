"use strict";
const pulumi = require('@pulumi/pulumi');
const aws = require('@pulumi/aws');
const awsx = require('@pulumi/awsx');

const appName = "pdelprat-bl";

const cluster = new awsx.ecs.Cluster(`${appName}-cluster`);

const alb = new awsx.elasticloadbalancingv2.ApplicationLoadBalancer(
  `${appName}-loadbalancer`,
  {
    external: true,
    securityGroups: cluster.securityGroups,
  }
);

const atg = alb.createTargetGroup(`${appName}-targetgroup`, {
  port: 80,
  deregistrationDelay: 0,
});

const web = atg.createListener(`${appName}-listener`, {
  port: 443,
  protocol: 'HTTPS',
  certificateArn:
    'arn:aws:acm:eu-west-3:104375662757:certificate/7bcdcfd0-4a00-449d-bfbd-c5e523d0157b',
});

// Define the service to run.  We pass in the load balancer to hook up the network load balancer
// to the container(s) the service will launch.
let service = new awsx.ecs.FargateService(`${appName}-fargate`, {
  cluster,
  desiredCount: 1,
  taskDefinitionArgs: {
    containers: {
      express: {
        image: awsx.ecs.Image.fromPath(`${appName}-image`, './app'),
        memory: 512,
        portMappings: [web],
      },
    }
  },
});

// Catch the zoneId for standard loadbalancer in aws for eu-west-3 region
const elbZone = aws.elb.getHostedZoneId({
  region: 'eu-west-3',
});

// Catch the zoneId for my created domain dp-tuto.com
const dpTutoZone = aws.route53.getZone({
  name: 'dp-tuto.com.',
  privateZone: false,
});

// Create a alias to use a human readable fqdn on my personal domain
const container = new aws.route53.Record(`${appName}-route`, {
  zoneId: dpTutoZone.then((dpTutoZone) => dpTutoZone.zoneId),
  name: `${appName}.dp-tuto.com`,
  type: 'A',
  aliases: [
    {
      name: web.endpoint.hostname,
      zoneId: elbZone.then((elbZone) => elbZone.id),
      evaluateTargetHealth: true,
    },
  ],
});

exports.frontendURL = pulumi.interpolate`http://${web.endpoint.hostname}/`;

