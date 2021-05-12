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

    const getHelloWorldFunction = new lambda.Function(
      this,
      'GetHelloWorldFunction',
      {
        code: lambda.AssetCode.fromAsset('src/hello-world'),
        functionName: `${projectName}-hello-world`,
        handler: 'index.handler',
        runtime: lambda.Runtime.NODEJS_14_X,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
      }
    );

    const restApi = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `${projectName}-api`,
      deployOptions: {
        stageName: 'v1',
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
      authorizationScopes: ['users/read', 'users/*'],
    };

    const corsIntegration = new apigateway.MockIntegration({
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers':
              "'Content-Type,Authorization'",
            'method.response.header.Access-Control-Allow-Methods':
              "'OPTIONS,POST,PUT,GET,DELETE'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
          },
          responseTemplates: {
            'application/json': '{}',
          },
        },
      ],
      passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    });

    const methodOptionsWithCors: apigateway.MethodOptions = {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': new apigateway.EmptyModel(),
          },
          responseParameters: {
            'method.response.header.Access-Control-Allow-Methods': false,
            'method.response.header.Access-Control-Allow-Headers': false,
            'method.response.header.Access-Control-Allow-Origin': false,
          },
        },
      ],
    };

    const helloResource = restApi.root.addResource('hello');
    helloResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getHelloWorldFunction),
      methodOptionsWithAuth
    );
    helloResource.addMethod('OPTIONS', corsIntegration, methodOptionsWithCors);

    // admin のみのパス、メソッドを作る
  }
}
