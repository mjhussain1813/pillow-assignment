import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
const moment = require('moment');
const { redisClient: redis } = require('./redis');
const WINDOW_SIZE_IN_SECONDS = 60;
const MAX_WINDOW_REQUEST_COUNT = 5;
const WINDOW_LOG_INTERVAL_IN_SECONDS = 60;
let requestCount;

@Injectable()
export class RateLimmiterMiddleware implements NestMiddleware {
  async use(request: Request, response: Response, next: NextFunction) {
		const { ip = '' } = request
    try {
      if (!redis) {
        throw new Error('Redis client does not exist!');
        process.exit(1);
      }
			response.setHeader("X-RATE-LIMIT", MAX_WINDOW_REQUEST_COUNT)
      const redisLastRecord = await redis.get(ip);
			// console.log("redisLastRecord >>>>", redisLastRecord)
      const currentRequestTime = moment();    // Moment<2023-01-21T19:05:06+05:30>
      if (redisLastRecord == null) {
        let redisRecord = [];
        let requestLog = {
          requestTimeStamp: currentRequestTime.unix(),
          requestCount: 1,
        };
        redisRecord.push(requestLog);
        request['requestLogsData'] = requestLog;
				let nextHit = moment(currentRequestTime).add(WINDOW_SIZE_IN_SECONDS, 'seconds').utc().format('DD/MM/YYYY hh:mm:ss');
				response.setHeader("X-WAIT-TILL", nextHit)
        await redis.set(ip, JSON.stringify(redisRecord));
        next();
      } else {
				let data = JSON.parse(redisLastRecord);
				let windowStartTimestamp = currentRequestTime.subtract(WINDOW_SIZE_IN_SECONDS, 'seconds').unix();
				console.log("windowStartTimestamp >>", windowStartTimestamp)
				let requestsWithinWindow = data.filter((entry) => {
					return entry.requestTimeStamp > windowStartTimestamp;
				});
				console.log("requestsWithinWindow >>", requestsWithinWindow)
				let totalWindowRequestsCount = requestsWithinWindow.reduce(
					(accumulator, entry) => {
						return accumulator + entry.requestCount;
					},
					0,
				);
				console.log("totalWindowRequestsCount >>", totalWindowRequestsCount)
				if (totalWindowRequestsCount >= MAX_WINDOW_REQUEST_COUNT) {
					let nextHit = moment.unix(requestsWithinWindow[0].requestTimeStamp).add(WINDOW_LOG_INTERVAL_IN_SECONDS, 'seconds').format('DD/MM/YYYY hh:mm:ss')
						response.setHeader("X-WAIT-TILL", nextHit)
					response
						.status(429)
						.send(
							{
								message: `You have exceeded the ${MAX_WINDOW_REQUEST_COUNT} requests in ${WINDOW_SIZE_IN_SECONDS} seconds limit!`,
							}
						);
				} else {
					let lastRequestLog = data[data.length - 1];
					let potentialCurrentWindowIntervalStartTimeStamp = moment().subtract(WINDOW_LOG_INTERVAL_IN_SECONDS, 'seconds').unix();
					console.log("lastRequestLog.requestTimeStamp >>>>", lastRequestLog.requestTimeStamp)
					console.log("potentialCurrentWindowIntervalStartTimeStamp >>", potentialCurrentWindowIntervalStartTimeStamp)
					if ( lastRequestLog.requestTimeStamp > potentialCurrentWindowIntervalStartTimeStamp && totalWindowRequestsCount != 0 ) {
						let nextHit = moment(moment.unix(lastRequestLog.requestTimeStamp)).add(WINDOW_LOG_INTERVAL_IN_SECONDS, 'seconds').format('DD/MM/YYYY hh:mm:ss')
						response.setHeader("X-WAIT-TILL", nextHit)
						lastRequestLog.requestCount++;
						request['requestLogsData'] = lastRequestLog;
						data[data.length - 1] = lastRequestLog;
					} else {
						data.push({
							requestTimeStamp: currentRequestTime.unix(),
							requestCount: 1
						});
						let nextHit = moment(currentRequestTime).add(WINDOW_LOG_INTERVAL_IN_SECONDS, 'seconds').format('DD/MM/YYYY hh:mm:ss')
						response.setHeader("X-WAIT-TILL", nextHit)
						request['requestLogsData'] = data[0];
					}
					await redis.set(ip, JSON.stringify(data));
					next();
				}
			}
			redis.expire(ip, 59);
    } catch (error) {
      next(error);
    }
  }
}

//   git config --global user.email "you@example.com"
//  git config --global user.name "Your Name"