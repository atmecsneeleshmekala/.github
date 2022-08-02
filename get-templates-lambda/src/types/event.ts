export interface Response {
    statusCode: number
    headers: any
    body: any
}

export interface GetDataParams {
    TableName: string
    Key?: any
    UpdateExpression?: string
    ExpressionAttributeValues?: any
    ReturnValues?: string
    Item?: any
    IndexName?: string
    FilterExpression?: string
    KeyConditionExpression?: string
    ProjectionExpression?: string
}



export interface ResponseObject {
    version: number;
    template_id: string;
    notification_channel: string;
    created_at: string;
    sourceCode?: string;
    children?:any
}


export interface TemplateData {
    notification_channel: string;
    version: number;
    created_at: string;
    template_id: string;
    children?: any;
    sourceCode?: string;
}



