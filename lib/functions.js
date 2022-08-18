const axios = require('axios')
const cheerio = require('cheerio')
const fetch = require('node-fetch')
const FormData = require('form-data')
const _url = require('url')
const _math = require('mathjs')


//AutoDelete
const createAutoDelete = (MessageKey, id, from, participant = undefined) => {
    if(global.db['./lib/database/bot/msgDel.json'] == undefined) global.db['./lib/database/bot/msgDel.json'] = []

    const obj = { Msgkey: MessageKey, msgId: id, msgFrom: from, prtcp: participant }
    global.db['./lib/database/bot/msgDel.json'].push(obj)
}

const getAutoDelete = (MessageKey) => {
    if(global.db['./lib/database/bot/msgDel.json'] == undefined) global.db['./lib/database/bot/msgDel.json'] = []

    let position = global.db['./lib/database/bot/msgDel.json'].findIndex(object => object.Msgkey == MessageKey)
    if (position !== -1) {
        return position
    }
}

//RANDOM
function GenerateRandomNumber(min,max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
// Generates a random alphanumberic character
function GenerateRandomChar() {
    var chars = "1234567890ABCDEFGIJKLMNOPQRSTUVWXYZ";
    var randomNumber = GenerateRandomNumber(0,chars.length - 1);
    return chars[randomNumber];
}
function GenerateSerialNumber(mask){
    var serialNumber = "";
    if(mask != null){
        for(var i=0; i < mask.length; i++){
            var maskChar = mask[i];
            serialNumber += maskChar == "0" ? GenerateRandomChar() : maskChar;
        }
    }
    return serialNumber;
}

function _notFoundQualityHandler(res,num) {
    const $ = cheerio.load(res)
    const download_links = []
    const element = $('.download')
    const title = $('div.venutama > h1.posttl').text()
    let response;
  
    element.filter(function(){
        if($(this).find('.anime-box > .anime-title').eq(0).text() === '') {
            $(this).find('.yondarkness-box').filter(function() {
                const quality = $(this).find('.yondarkness-title').eq(num).text().split('[')[1].split(']')[0]
                const size = $(this).find('.yondarkness-title').eq(num).text().split(']')[1].split('[')[1]
                $(this).find('.yondarkness-item').eq(num).find('a').each((idx, el) => {
                    const _list = {
                        host: $(el).text(),
                        link: $(el).attr("href"),
                    }
                    download_links.push(_list)
                    response = { title, quality, size, download_links }
                })
            })
        } else {
            $(this).find('.anime-box').filter(function() {
                const quality = $(this).find('.anime-title').eq(num).text().split('[')[1].split(']')[0]
                const size = $(this).find('.anime-title').eq(num).text().split(']')[1].split('[')[1]
                $(this).find('.anime-item').eq(num).find('a').each((idx, el) => {
                    const _list = {
                        host: $(el).text(),
                        link: $(el).attr("href"),
                    }
                    download_links.push(_list)
                    response = { title, quality, size, download_links }
                })
            })
        }
    })
    return response
}

function _epsQualityFunction(res, num) {
    const $ = cheerio.load(res)
    const element = $(".download")
    const download_links = []
    const title = $('div.venutama > h1.posttl').text()
    let response;
  
    element.find("ul:nth-child(2)").filter(function () {
        const quality = $(this).find("li").eq(num).find("strong").text()
        const size = $(this).find("li").eq(num).find("i").text()
        $(this).find("li").eq(num).find("a").each(function () {
            const _list = {
                host: $(this).text(),
                link: $(this).attr("href"),
            }
            download_links.push(_list)
            response = { title, quality, size, download_links }
          
        })
    })
    return response
}

//SCRAPER    
//Zippy
//const _proggers = require('cli-progress'),
const GetLink = async (u) => {
    console.log('⏳  ' + `Get Page From : ${u}`)
    const zippy = await _axios({ method: 'GET', url: u }).then(res => res.data).catch(err => false)
    console.log('✅  ' + 'Done')
    const $ = cheerio.load(zippy)
    if (!$('#dlbutton').length) {
        return { error: true, message: $('#lrbox>div').first().text().trim() }
    }
    console.log('⏳  ' + 'Fetch Link Download...')
    const filename0 = $('title').text()
    const filename = filename0.replace('Zippyshare.com - ', '')
    const url = _url.parse($('.flagen').attr('href'), true)
    const urlori = $('meta[property="og:url"]').attr('content').split('/')[2]
    const key = url.query['key']
    let time;
    let dlurl;
    // try {
    //     time = /var b = ([0-9]+);$/gm.exec($('#dlbutton').next().html())[1]
    //     dlurl = 'http:' + '//' + urlori + '/d/' + key + '/' + (2 + 2 * 2 + parseInt(time)) + '3/DOWNLOAD'
    // } catch (error) {
    //     time = _math.evaluate(/ \+ \((.*)\) \+ /gm.exec($('#dlbutton').next().html())[1])
    //     dlurl = 'http:' + '//' + urlori + '/d/' + key + '/' + (time) + '/DOWNLOAD'
    // }

    let getId = $('#lrbox > div:nth-child(2) > div:nth-child(2) > div > script').text()
    getId = getId.replace("var d = document.getElementById('omg').getAttribute('class');", `var d = ${$('#omg').attr('class')}`)
    getId = getId.replace("document.getElementById('dlbutton').href", "dlurl")
    getId = getId.split("if (document.getElementById('fimage'))")[0]
    eval(getId)

    dlurl = `http://${urlori}${dlurl}`
    console.log('✅  ' + 'Done')
    return { error: false, url: dlurl, name: filename }
}
//END
//Racaty
const getLinkRacaty = async (url, isFollow = false) => {
    if(isFollow) {
        const tempGetPage = await axios.get(url)
        const $ = cheerio.load(tempGetPage.data)
        url = $('a.abutton.copy').attr('data-clipboard-text')
        if(url == undefined) return { error: true, errId: 'deleted' }
    }

    const tempGetPage = await axios.get(url)
    url = tempGetPage.request.res.responseUrl.replace('.com', '.net')

    try {
        const formdata = new FormData()
        formdata.append('op', 'download2')
        formdata.append('id', url.split('/')[3])
        formdata.append('rand', '')
        formdata.append('referer', '')
        formdata.append('method_free', '')
        formdata.append('method_premium', '')
        
        let result = undefined
        await fetch(url, {
            method: "POST",
            body: formdata,
            headers: formdata.getHeaders() 
        })
        .then(res => res.text())
        .then(res => {
            const $ = cheerio.load(res)
            if($('a#uniqueExpirylink').attr('href') == undefined) return { error: true, errId: 'missingTagHtml' }
            result =  { error: false, title: $('div.name > strong').text().trim(), link: $('a#uniqueExpirylink').attr('href') }
        })

        return result
    } catch (err) {
        console.log(err)
        return { error: true, errId: 'unknown', err: err }
    }
}

module.exports = {
    createAutoDelete,
    getAutoDelete,
    GenerateSerialNumber,
    _notFoundQualityHandler,
    _epsQualityFunction,
    GetLink,
    getLinkRacaty
}