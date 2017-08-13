'use strict'
var DBHandler = require("./DBHandler")

var APP_ID = '';

exports.handler = (event, context, callback) => {
    try {
        if (APP_ID !== '' && event.session.application.applicationId !== APP_ID) {
            context.fail('Invalid Application ID');
        }
        console.log('Request is '+JSON.stringify(event.request))
        
        var request = event.request;

        if (request.type === "LaunchRequest") {
            context.succeed(buildResponse({
                speechText: "Welcome to quick remedy. Please tell me what remedy you want?",
                repromptText: "You can say for example, Quick remedy for headache",
                endSession: false
            }));
        }
        else if (request.type === "IntentRequest") {
            let options = {};

            if (request.intent.name === "RemedyIntent") {

                if (request.intent.slots.problem !== undefined)
                    var problem = request.intent.slots.problem.value;


                //Check sign is valid
                if (problem === undefined || problem === null) {
                    options.speechText = " hmmm you have forgotten to tell your problem . Please tell me your problem so that I can try to find a quick remedy for you?"
                    options.endSession = false;
                    context.succeed(buildResponse(options));
                    return;
                }

                //if (request.intent.slots.problem !== undefined && !ValidateZodiacSign(sign)) {
                //    options.speechText = ` The Zoadiac sign ${sign} is not a valid one. Please tell a valid zodiac sign .`
                //    options.endSession = false;
                //    context.succeed(buildResponse(options));
                //    return;
                //}

                DBHandler.getSolutionForProblem(problem, function (err, data) {
                    if (err) {
                        context.fail(err);

                    } else {

                        if (data.Item !== undefined) {
                            let remedies = data.Item.Remedies.values;
                            console.log("Remedies are " + JSON.stringify(remedies))
                            var length = remedies.length;

                            if (length === 1) {

                            } else {
                                let count = 1;
                                let tempData = '';
                                options.speechText = `I have found, ${length} quick remedies for ${problem} .`

                                remedies.forEach(function (remedy) {
                                    tempData += `<break time='1s' /> Remedy ${count} <break time='1s' /> ${remedy} .`
                                    count++;
                                });

                                if (data.Item.Reason) {
                                    tempData += `<break time='500ms'/> ${data.Item.Reason} .`
                                }

                                tempData += `<break time='500ms'/>${data.Item.AdviceMessage}`
                                options.speechText += tempData
                                //options.sign = sign
                                //options.cardText = todaysFortune
                                options.endSession = true;
                                context.succeed(buildResponse(options));
                            }
                        }

                        console.log('length is ' + length)
                        callback(null, data)
                    }
                });

                //findMyFortune(sign, function (todaysFortune, error) {
                //    if (error) {
                //        context.fail(error);
                //        options.speechText = "There has been a problem with the request."
                //        options.endSession = true;
                //        context.succeed(buildResponse(options));
                //    } else {
                //        options.speechText = todaysFortune
                //        options.speechText += " . Have a nice day ahead . "
                //        options.sign = sign
                //        options.cardText = todaysFortune
                //        options.endSession = true;
                //        context.succeed(buildResponse(options));
                //    }
                //});

            } else if (request.intent.name === "AMAZON.StopIntent" || request.intent.name === "AMAZON.CancelIntent") {
                options.speechText = "ok, good bye."
                options.endSession = true;
                context.succeed(buildResponse(options));
            }
            else if (request.intent.name === "AMAZON.HelpIntent") {
                options.speechText = "My fortune will forecast the day, based on zodiac sign. For example, you can ask what is the fortune for Aquarius today, to know about the day for the zodiac sign Aquarius. Please refer to skill description for all possible utterences. What is the zodiac sign you want to know today's fortune?.";
                options.repromptText = "What is the zodiac sign you want to know fortune about today? If you want to exit from my fortune skill please say stop or cancel."
                options.endSession = false;
                context.succeed(buildResponse(options));
            }
            else {
                context.fail("Unknown Intent")
            }
        }

        else if (request.type === "SessionEndedRequest") {
            options.endSession = true;
            context.succeed();
        }
        else {
            context.fail("Unknown Intent type")
        }



    } catch (e) {

    }


};


function buildResponse(options) {
    var response = {
        version: "1.0",
        response: {
            outputSpeech: {
                "type": "SSML",
                "ssml": `<speak><prosody rate="slow">${options.speechText}</prosody></speak>`
            },

            shouldEndSession: options.endSession
        }
    };

    if (options.repromptText) {
        response.response.reprompt = {
            outputSpeech: {
                "type": "SSML",
                "ssml": `<speak><prosody rate="slow">${options.repromptText}</prosody></speak>`
            }
        };
    }
    if (options.cardText) {
        response.response.card = {
            "type": "Standard",
            "title": `Fortune for ${options.sign} today`,
            "text": options.cardText,
        }
        response.response.card.image = {
            "smallImageUrl": "https://s3.amazonaws.com/myfortunezodiacsign/ZodiacSmall.jpg",
            "largeImageUrl": "https://s3.amazonaws.com/myfortunezodiacsign/ZodiacLarge.jpg"
        }
    }
    return response;
}