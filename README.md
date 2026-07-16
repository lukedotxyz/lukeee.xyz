# [lukedotxyz](https://lukeee.xyz/)

Personal website built with Next.js and exported as static files for deployment
to Amazon S3.

## Local development

The repository pins Node and pnpm with mise. It does not require a global npm
installation.

```sh
mise trust
mise install
pnpm install
pnpm dev
```

The site runs at <http://localhost:10001>.

Useful commands:

```sh
pnpm build
pnpm lint
pnpm lint:check
pnpm format
pnpm format:check
```

`pnpm build` writes the static site to `web/out`.

## Deployment

The site is deployed to Amazon S3 through GitHub Actions and served through
CloudFront. Pull requests and pushes to `main` run formatting, linting, type
checking, and a static build. Successful builds on `main` are synchronized to
S3, followed by a CloudFront cache invalidation.

GitHub authenticates with AWS through OpenID Connect, avoiding long-lived
access keys. The deployment uses these repository variables:

| Variable                         | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `AWS_DEPLOY_ROLE_ARN`            | Branch-restricted GitHub deployment role       |
| `AWS_REGION`                     | Region containing the S3 bucket                |
| `AWS_S3_BUCKET`                  | Static-site bucket name                        |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution used to serve the site |

The IAM trust and permissions policies supporting the deployment are
documented in
[`docs/aws-deployment-role.md`](docs/aws-deployment-role.md).
