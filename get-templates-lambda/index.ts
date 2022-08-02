
import * as AWS from "aws-sdk";
import * as _ from 'underscore';
import { Response, GetDataParams, ResponseObject, TemplateData } from "./src/types/event"
var logger = require("./src/service/custom-logger");
// Create the DynamoDB object
const docClient = new AWS.DynamoDB.DocumentClient();



/**
 * @param  {any} event
 */
exports.handler = async (event, context, callback) => {
  await logger.createLogGroup_Stream();
  let statusCode: number = 200;
  const response: Response = {
    statusCode: statusCode,
    headers: {
      "Access-Control-Allow-Headers": "APIkey, Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    },
    body: ''
  };
  try {
    await logger.log("Get templates lambda triggered");
    let { search } = event.queryStringParameters || {};
    // Call DynamoDB to query from the table 
    let params: GetDataParams = {
      TableName: process.env.TemplateEngineTableName || "TemplateEngine",
      IndexName: 'SearchByNotificationType',
      FilterExpression: "is_active = :is_active",
      KeyConditionExpression: "notification_channel = :notification_type",
      ProjectionExpression: "version,template_id,notification_channel,created_at,sourceCode",
      ExpressionAttributeValues: {
        ":notification_type": search,
        ":is_active": true
      }
    }
    let dbresponse: ResponseObject[] = [];
    let items: any;
    do {
      items = await docClient.query(params).promise();
      items.Items.map((item) => dbresponse.push(item));
      params['ExclusiveStartKey'] = items.LastEvaluatedKey;
    } while (typeof items.LastEvaluatedKey != "undefined");

    let respData: TemplateData[] = await getTreeViewData(dbresponse);
    response.statusCode = 200
    response.body = JSON.stringify(respData);
    callback(null, response);
  } catch (error) {
    await logger.log(`Error in Get templates lambda - ${JSON.stringify(error)}`);
    response.body = `unable to process the request -  ${JSON.stringify(error)}`
    callback(null, response);
  }

};

async function getTreeViewData(templatesData: ResponseObject[]) {
  let TemplateData: TemplateData[] = []
  let uniqTemplateData: ResponseObject[] = _.uniq(templatesData, item => item.template_id);
  for (let index = 0; index < uniqTemplateData.length; index++) {
    const element: ResponseObject = uniqTemplateData[index];
    let result: TemplateData[] = _.where(templatesData, { template_id: element.template_id });
    var sortedDesc: TemplateData[] = _.sortBy(result, 'version').reverse();
    let firstElement: ResponseObject = sortedDesc[0];
    sortedDesc.shift();
    firstElement['children'] = sortedDesc.length > 0 ? sortedDesc : null;
    TemplateData.push(firstElement);
  }
  return TemplateData;
}