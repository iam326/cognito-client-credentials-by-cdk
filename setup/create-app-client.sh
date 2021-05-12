#!/bin/bash

set -euo pipefail

PROJECT_NAME="cognito-client-credentials-sample"

USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name CognitoClientCredentialsByCdkStack \
  | jq -r '.Stacks[] | .Outputs[] | select(.OutputKey == "CognitoUserPoolId") | .OutputValue' \
)

# Read Only Client
aws cognito-idp create-user-pool-client \
  --user-pool-id ${USER_POOL_ID} \
  --client-name "read-only-client" \
  --generate-secret \
  --allowed-o-auth-flows "client_credentials" \
  --allowed-o-auth-scopes "users/read" \
  --allowed-o-auth-flows-user-pool-client

# Full Access Client
aws cognito-idp create-user-pool-client \
  --user-pool-id ${USER_POOL_ID} \
  --client-name "full-access-client" \
  --generate-secret \
  --allowed-o-auth-flows "client_credentials" \
  --allowed-o-auth-scopes "users/read" "users/*" \
  --allowed-o-auth-flows-user-pool-client
