const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { spawn } = require('child_process');

(async () => {
    // Replace this path with the actual path to your Chrome executable
    const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    // Additional parameters to be passed to the Chrome process
    const chromeArgs = ['--remote-debugging-port=9222'];

    const child = spawn(chromePath, chromeArgs);

    child.on('error', (err) => {
        console.error('Failed to start child process.', err);
    });

    child.on('exit', (code, signal) => {
        console.log(`Child process exited with code ${code} and signal ${signal}`);
    });

    await new Promise(r => setTimeout(r, 2000));

    const browserURL = 'http://127.0.0.1:9222';
    const browser = await puppeteer.connect({ browserURL, defaultViewport: null });

    

    const page = await browser.newPage();
    await page.goto(`https://web.whatsapp.com/`);

    const page2 = await browser.newPage();
    var aichat = 'https://beta.character.ai/chat?char=OYYf4iM6fjt9eZ72oXRsY3UGPeXd9Y-uJwfAjF5JAwk'; //replace this with your character.ai link
    await page2.goto(aichat);

    await page.bringToFront();

    await new Promise(r => setTimeout(r, 16000));
    console.log('done waiting');

    var person = 'person'//whatsapp contact you want to chat with

    await page.click(`span[title="${person}"]`);
    await new Promise(r => setTimeout(r, 2000));


    var lastMessages = [];//await getLastMessages(page);
    console.log(lastMessages);

    while (true) {
        latestMessages = await getLastMessages(page);
        
        if (JSON.stringify(lastMessages)!=JSON.stringify(latestMessages)) {
            if (latestMessages.length > 0) {
                console.log(latestMessages);
                //var response = await getChatGPT(browser,page, person, latestMessages);
                var response = await getCharacterAI(page, page2, person, latestMessages);
                await sendMessage(page, response.replace('\n', ' '));
                console.log(response);
                lastMessages = latestMessages;
            }
        }
        await new Promise(r => setTimeout(r, 2000));
    }

})().catch(err => {
    console.log(err);
    process.exit();
});

async function sendMessage(page, text) {
    await (await page.$$('div.lexical-rich-text-input'))[1].click();
    await new Promise(r => setTimeout(r, 500));
    await (await page.$$('div.lexical-rich-text-input'))[1].type(text);

    await new Promise(r => setTimeout(r, 500));
    await page.click('span[data-icon="send"]');
}

async function getLastMessages(page) {
    var latestMessages = [];

    const divs = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('div[role="application"]'));
        var last = elements[elements.length - 1];
        return last.innerHTML;
    });

    var $ = cheerio.load(divs);

    var rows = $('div[role="row"]')


    for (var row of rows) {
        if (!$(row).html()) continue;

        //var messageIn = $(row).find('div.message-in');
        var messageOut = $(row).find('div.message-out');

        if ($(messageOut).html() != null) {
            //color = "\x1b[32m";
            latestMessages = [];
            continue;
        }

        var text = $(row).find('.selectable-text');


        latestMessages.push($(text).text());
        //console.log(color, $(text).text(), "\x1b[0m");
    }

    await new Promise(r => setTimeout(r, 1000));
    return latestMessages;
}

async function sendMessageChatGPT(page, message) {
    await page.click('textarea#prompt-textarea');
    await new Promise(r => setTimeout(r, 1000));
    await page.type('textarea#prompt-textarea', message);

    await new Promise(r => setTimeout(r, 2000));
    await page.click('button[data-testid="send-button"]');
}

async function sendMessageCharacterAI(page, message) {
    await page.click('textarea#user-input');
    await new Promise(r => setTimeout(r, 1000));
    await page.type('textarea#user-input', message);

    await new Promise(r => setTimeout(r, 2000));
    await page.click('button[title="Submit Message"]');
}


async function getCharacterAI(page, page2, person, latestMessages) {
    await page2.bringToFront();
    await new Promise(r => setTimeout(r, 2000))
    console.log('done waiting');
    //var conversacion = `conversacion con ${person}`
    //console.log(conversacion)

    await new Promise(r => setTimeout(r, 1000));

    await sendMessageCharacterAI(page2, latestMessages.join(' '))
    //await new Promise(r => setTimeout(r, 000));

    var response = latestMessages.join(' ');
    while (response == latestMessages.join(' ')) {
        response = await page2.evaluate(() => {
            const elements = document.querySelectorAll('p')
    
            return elements[elements.length - 1].innerText;
        });
    }
    
    console.log(response);

    await page.bringToFront();

    return response;
}

async function getChatGPT(browser,page, person, latestMessages) {
    //send this message to chatgpt
    const page2 = await browser.newPage();
    await page2.bringToFront();
    await page2.goto(`https://chat.openai.com/`);
   
    await new Promise(r => setTimeout(r, 2000))
    console.log('done waiting');
 
    var conversacion = `conversacion con ${person}`
    console.log(conversacion)

    const ConversacionId = await page2.evaluate((conversacion) => {
        const elements = document.querySelectorAll('li div');
        for (var elementId in elements) {
            if (elements[elementId].innerText == conversacion) {
                return elementId;
            }
        }
        return false;
    }, conversacion);

    console.log('found:', ConversacionId);

    await new Promise(r => setTimeout(r, 1000));
    //si existe la conversacion
    if (ConversacionId) {
        console.log('div with id', ConversacionId)
        await (await page2.$$('li div'))[ConversacionId].click();
    }
    else {
        await page2.click('span.truncate');//new chat button
    }

    await new Promise(r => setTimeout(r, 1000));

    await sendMessageChatGPT(page2, latestMessages.join(' '))
    await new Promise(r => setTimeout(r, 8000));


    const chatGPTResponse = await page2.evaluate(() => {
        const elements = document.querySelectorAll('div.items-start')

        return elements[elements.length - 1].innerText;
    });

    console.log(chatGPTResponse);

    await page.bringToFront();

    return chatGPTResponse;
}