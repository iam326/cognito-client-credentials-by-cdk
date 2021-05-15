# cognito-client-credentials-by-cdk

API Gateway と Cognito で Client Credentials Grant による認証フローを試す CDK のサンプル

## Environment

```
$ cdk --version
1.102.0 (build a75d52f)

$ yarn --version
1.22.10

$ node --version
v14.7.0

$ jq --version
jq-1.6
```

## Deploy

```
$ cdk bootstrap
$ yarn build
$ yarn deploy

$ cd ./setup
$ ./create-app-client.sh
```
