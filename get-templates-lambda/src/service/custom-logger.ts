var aws = require('aws-sdk');
import { config } from "../config/config";
aws.config.update({ region: config.REGION_AWS });

const cloudwatchlogs = new aws.CloudWatchLogs({
    apiVersion: process.env.apiVersion || config.apiVersion,
    region: process.env.REGION_AWS || config.REGION_AWS,
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID_AWS || config.ACCESS_KEY_ID_AWS,
        secretAccessKey: process.env.SECRET_ACCESS_KEY_AWS || config.SECRET_ACCESS_KEY_AWS,
        sessionToken: null
    }
});

const logGroupName: string = process.env.LOG_GROUP_NAME || config.LOG_GROUP_NAME;
const logStreamName: string = `${(process.env.LOG_STREAM_NAME || config.LOG_STREAM_NAME)}-${new Date().toLocaleDateString().split('/').reverse().join('')} `;

export const log = async (message: string, sequenceToken = null, retries: number = 3) => {
    let result = await createLogs(message, logStreamName);
    Promise.resolve(result);
}

const createLogs = async (message: string, logStreamName: string, sequenceToken = null, retries: number = 3) => {
    if (!sequenceToken) {
        sequenceToken = await retrieveNextSequenceToken(
            logGroupName,
            logStreamName,
        );
    }

    var params = {
        logEvents: [{
            message,
            timestamp: new Date(new Date().toUTCString()).getTime(),
        }],
        logGroupName,
        logStreamName,
        sequenceToken,
    };

    return await new Promise((resolve, reject) => {
        cloudwatchlogs.putLogEvents(params, function (err, data) {
            if (err) {
                if (
                    retries > 0 &&
                    err.code === 'InvalidSequenceTokenException'
                ) {
                    const nextSequenceToken =
                        /sequenceToken is: (.*)/.exec(err.message)[1];
                    //  console.log('nextSequenceToken: ' + nextSequenceToken);
                    createLogs(
                        message,
                        logStreamName,
                        nextSequenceToken,
                        retries - 1,
                    ).then(resolve).catch(reject);
                }
                else {
                    reject(err);
                }
            }
            else {
                resolve(data.nextSequenceToken);
            }
        });
    });
};

const retrieveNextSequenceToken = async (logGroupName: string, logStreamName: string) => {
    const params = {
        logGroupName,
        descending: true,
        limit: 1,
        logStreamNamePrefix: logStreamName,
        orderBy: 'LogStreamName',
    };

    return await new Promise((resolve, reject) => {
        cloudwatchlogs.describeLogStreams(params, function (err, data) {
            if (err) {
                console.log("error..." + JSON.stringify(err));
                reject(err);
            }
            else {
                // console.log("data" + JSON.stringify(data));
                resolve(data.logStreams[0].uploadSequenceToken);
            }
        });
    });
};


export const createLogGroup_Stream = async function () {
    console.log("Create Log Group Stream  method called");
    await createLogGroup();
    await createLogStream();
}



export const createLogGroup = async () => {
    const logGroupParams = {
        logGroupName: config.LOG_GROUP_NAME
    };
    const responseHandler = (resolve, reject) => (err, data) => {
        if (err) {
            console.log(err.message);
            if (err.message == 'The specified log group already exists') {
                console.log(config.LOG_GROUP_NAME, "Log Group Created Successfully");
                resolve("success")
            } else {
                resolve(err);
            }
        }
        else {
            console.log(config.LOG_GROUP_NAME, "Log Group Created Successfully");
            resolve("success");
        }
    };
    return new Promise((resolve, reject) => {
        cloudwatchlogs.createLogGroup(logGroupParams, responseHandler(resolve, reject));
    });
}

export const createLogStream = async () => {
    const streamParams = {
        logStreamName: logStreamName,
        logGroupName: config.LOG_GROUP_NAME
    };
    const responseHandler = (resolve, reject) => (err, data) => {
        if (err) {
            console.log(err.message);
            if (err.message == 'The specified log stream already exists') {
                console.log(streamParams.logStreamName, "Log Group Stream Created Successfully");
                resolve("success")
            } else {
                resolve(err);
            }
        }
        else {
            console.log(streamParams.logStreamName, "Log Group Stream Created Successfully");
            resolve("success");
        }
    };
    return new Promise((resolve, reject) => {
        cloudwatchlogs.createLogStream(streamParams, responseHandler(resolve, reject));
    });
}


