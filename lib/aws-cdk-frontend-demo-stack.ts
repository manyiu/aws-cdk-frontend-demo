require("dotenv").config();
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

const domainName = `${
  process.env.GITHUB_HEAD_REF === "main"
    ? ""
    : process.env.GITHUB_HEAD_REF?.replace("/", "_") + "."
}${process.env.GITHUB_REPOSITORY_ID}.${process.env.HOST_ZONE}`;

export class AwsCdkFrontendDemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hostingBucket = new cdk.aws_s3.Bucket(this, "HostingBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const existingHostZone = cdk.aws_route53.HostedZone.fromLookup(
      this,
      "ExistingHostedZone",
      {
        domainName: process.env.HOST_ZONE as string,
      }
    );

    const domainCertificate = new cdk.aws_certificatemanager.Certificate(
      this,
      "DomainCertificate",
      {
        domainName,
        validation:
          cdk.aws_certificatemanager.CertificateValidation.fromDns(
            existingHostZone
          ),
      }
    );

    const distribution = new cdk.aws_cloudfront.Distribution(
      this,
      "Distribution",
      {
        defaultBehavior: {
          origin: new cdk.aws_cloudfront_origins.S3Origin(hostingBucket),
        },
        domainNames: [domainName],
        certificate: domainCertificate,
      }
    );

    const cloudfrontTarget = new cdk.aws_route53_targets.CloudFrontTarget(
      distribution
    );

    new cdk.aws_route53.ARecord(this, "AAliasRecord", {
      zone: existingHostZone,
      recordName: domainName,
      target: cdk.aws_route53.RecordTarget.fromAlias(cloudfrontTarget),
    });

    new cdk.aws_route53.AaaaRecord(this, "AAAAAliasRecord", {
      zone: existingHostZone,
      recordName: domainName,
      target: cdk.aws_route53.RecordTarget.fromAlias(cloudfrontTarget),
    });
  }
}
