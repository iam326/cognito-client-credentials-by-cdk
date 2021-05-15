import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as cognito from '@aws-cdk/aws-cognito';
import * as lambda from '@aws-cdk/aws-lambda';

export class CognitoClientCredentialsByCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const projectName: string = this.node.tryGetContext('projectName');

    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${projectName}-user-pool`,
    });
    const readOnlyScope = new cognito.ResourceServerScope({
      scopeName: 'read',
      scopeDescription: 'Read-only access',
    });
    const fullAccessScope = new cognito.ResourceServerScope({
      scopeName: '*',
      scopeDescription: 'Full access',
    });
    userPool.addResourceServer('ResourceServer', {
      identifier: 'users',
      scopes: [readOnlyScope, fullAccessScope],
    });
    userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: 'client-credentials-sample',
      },
    });

    const helloWorldFunction = new lambda.Function(this, 'helloWorldFunction', {
      code: lambda.AssetCode.fromAsset('src/hello-world'),
      functionName: `${projectName}-hello-world`,
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    const restApi = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `${projectName}-api`,
      deployOptions: {
        stageName: 'v1',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['POST', 'OPTIONS', 'PUT', 'DELETE'],
        statusCode: 200,
      },
    });
    restApi.addGatewayResponse('Default4XXGatewayResponse', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'gatewayresponse.header.Access-Control-Allow-Headers':
          "'Content-Type,Authorization'",
        'gatewayresponse.header.header.Access-Control-Allow-Methods':
          "'OPTIONS,POST,PUT,GET,DELETE'",
        'gatewayresponse.header.header.Access-Control-Allow-Origin': "'*'",
      },
    });
    restApi.addGatewayResponse('Default5XXGatewayResponse', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'gatewayresponse.header.Access-Control-Allow-Headers':
          "'Content-Type,Authorization'",
        'gatewayresponse.header.header.Access-Control-Allow-Methods':
          "'OPTIONS,POST,PUT,GET,DELETE'",
        'gatewayresponse.header.header.Access-Control-Allow-Origin': "'*'",
      },
    });

    const authorizer = new apigateway.CfnAuthorizer(
      this,
      'APIGatewayAuthorizer',
      {
        name: 'authorizer',
        identitySource: 'method.request.header.Authorization',
        providerArns: [userPool.userPoolArn],
        restApiId: restApi.restApiId,
        type: apigateway.AuthorizationType.COGNITO,
      }
    );

    const methodOptionsWithAuth: apigateway.MethodOptions = {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: authorizer.ref,
      },
    };

    const usersResource = restApi.root.addResource('users');
    usersResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(helloWorldFunction),
      {
        ...methodOptionsWithAuth,
        authorizationScopes: ['users/read', 'users/*'],
      }
    );
    usersResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(helloWorldFunction),
      {
        ...methodOptionsWithAuth,
        authorizationScopes: ['users/*'],
      }
    );

    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: userPool.userPoolId,
      exportName: `CognitoUserPoolId`,
    });
  }
}
