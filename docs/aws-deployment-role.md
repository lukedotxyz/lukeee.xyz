# AWS deployment role

GitHub Actions should assume a short-lived AWS role through OIDC. Replace every
uppercase placeholder before applying these policies.

## Trust policy

Create the GitHub OIDC identity provider once per AWS account:

- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

Create an IAM role with this trust policy. Restricting the `sub` claim to the
repository's `main` branch prevents other repositories and branches from
assuming it.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::AWS_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:GITHUB_OWNER/GITHUB_REPOSITORY:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

## Permissions policy

Attach this policy to the role. Remove the CloudFront statement if the site
does not use CloudFront.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListWebsiteBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::S3_BUCKET_NAME"
    },
    {
      "Sid": "PublishWebsiteObjects",
      "Effect": "Allow",
      "Action": ["s3:DeleteObject", "s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::S3_BUCKET_NAME/*"
    },
    {
      "Sid": "InvalidateWebsiteCache",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::AWS_ACCOUNT_ID:distribution/CLOUDFRONT_DISTRIBUTION_ID"
    }
  ]
}
```
