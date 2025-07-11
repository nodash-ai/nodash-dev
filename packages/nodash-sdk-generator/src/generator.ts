import openapiGenerator from '@openapitools/openapi-generator-cli';

export async function generateSDK(specPath: string) {
  await openapiGenerator.generate({
    input: specPath,
    output: 'generated-sdk',
    generator: 'typescript-fetch'
  });
  console.log('SDK generated using standard openapi tool');
}
