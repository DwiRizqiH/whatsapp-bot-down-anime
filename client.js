const fetch = require('node-fetch')
const cheerio = require('cheerio')
const axios = require('axios')
const {
    createAutoDelete,
    getAutoDelete,
    GenerateSerialNumber,
    _notFoundQualityHandler,
    _epsQualityFunction,
    GetLink,
    getLinkRacaty
} = require('./lib/functions')

const { DEFAULT_PREFIX, BASE_DOMAIN_OTAKUDESU } = require('./options')

module.exports = async (rem = undefined, reply = undefined, message, MessageType = {}) => {
    try {
        const { text, extendedText, contact, location, liveLocation, image, video, sticker, document, audio, product } = MessageType
        const { 
            body,
            type, 
            id, 
            from, 
            t, 
            sender, 
            isGroupMsg,
            chatId, 
            caption,
            isMedia, 
            mimetype,
            quotedMsg,
            mentionedJidList 
            } = message
        
        let prefixInz = DEFAULT_PREFIX
        let commands = caption || body || ''
        const args =  commands.split(' ')

        const prefix = prefixInz
        if(message.selectedButtonId != undefined && message.selectedButtonId.startsWith(prefix)) {
            var command = message.selectedButtonId.toLowerCase().split(' ')[0] || ''
            console.log(command)
        } else if(message.selectedRowId != undefined && message.selectedRowId.startsWith(prefix)) {
            var command = message.selectedRowId.toLowerCase().split(' ')[0] || ''
            console.log(command)
        } else {
            var command = commands.toLowerCase().split(' ')[0] || ''
        }

        const isCmd = command.startsWith(prefix)

        switch (command) {
            case prefix+'downanime':
                if (args.length == 1 && type != 'listResponseMessage') return reply(from, `Mohon masukkan nama anime\nContoh : _${prefix}downanime sono bisque doll_`, id)
                
                const baseDomainOtakudesu = BASE_DOMAIN_OTAKUDESU
                const searchUrlAnime = `${baseDomainOtakudesu}/?s=${body.slice(11)}&post_type=anime`
                if(message.selectedRowId == undefined) {
                    //Search Anime
                    let result = []
                    await axios.get(searchUrlAnime)
                    .then(res => res.data) 
                    .then(async (res) => {
                        console.log(res)
                        const $ = cheerio.load(res)
                        await $('div.page > ul.chivsrc > *li').each(async (a, b) => {
                            const img = $(b).find('img').attr('src')
                            const title = $(b).find('h2').find('a').text()
                            const url = $(b).find('h2').find('a').attr('href')
                            await result.push({ title: title, url: url, img: img })
                            console.log(img)
                            console.log(title)
                            console.log(url)
                            console.log('-------')
                        })
    
                        if(result == '') {

                            // Not Found
                            await reply(from, `Maaf, anime tidak ditemukan, mungkin salah penulisan, atau Anime tersebut tidak ada di website *otakudesu.pro*\nCoba cari anime dengan _${prefix}anime <judul>_\n\n*_Abaikan tanda < dan >_*`)
                        } else {
                            const rows = []
                            for(let i = 0; i < result.length; i++) {
                                rows.push({ title: result[i].title, description: result[i].url, rowId: `${prefix}downanime anime ${JSON.stringify(result[i])}` })
                            }
                
                            const sections = [{ title: baseDomainOtakudesu, rows: rows }]
                            const button = {
                                text: `Pilih Anime\n_${baseDomainOtakudesu}_`,
                                footer: '@dwirizqi.h',
                                title: 'Anime',
                                buttonText: 'Anime',
                                sections
                            }
            
                            await rem.sendMessage(from, button)
                        }
                    })
                    
                //GetEps
                } else if(message.selectedRowId.split(' ')[1] == 'anime') {
                    const searchUrlAnimeEps = JSON.parse(message.selectedRowId.replace(`${prefix}downanime anime `, ''))
    
                    rem.sendText(from, 'Scraping...')
                    let resultEps = []
    
                    await fetch(searchUrlAnimeEps.url)
                    .then(res => res.text()) 
                    .then(async (res) => {
                        const $ = cheerio.load(res)
                        $('div.venser > div:nth-child(8) > ul > *li').each((c, d) => {
                            const scrapingEps = { url: $(d).find('span > a').attr('href'), title: $(d).find('span > a').text() }
                            resultEps.push(scrapingEps)
                        })
                        resultEps.reverse()
    
                        const IdButtonAutoDelete = GenerateSerialNumber("000000000000000")
                        const rows = [{ title: 'ALL', description: 'Download All Episodes', rowId: `${prefix}downanime down_all ----${JSON.stringify(resultEps)}----${JSON.stringify(searchUrlAnimeEps)}----${IdButtonAutoDelete}` }]
                        for(let i = 0; i < resultEps.length; i++) {
                            rows.push({ title: resultEps[i].title, description: resultEps[i].url, rowId: `${prefix}downanime down_eps ----${JSON.stringify(resultEps[i])}----${JSON.stringify(searchUrlAnimeEps)}----${IdButtonAutoDelete}` })
                        }
            
                        const sections = [{ title: baseDomainOtakudesu, rows: rows }]
                        const button = {
                            text: `Pilih Episodes\n_${baseDomainOtakudesu}_`,
                            footer: '@dwirizqi.h',
                            title: 'Anime Episodes',
                            buttonText: 'Anime Episodes',
                            sections
                        }
        
                        const buttonMessageListSend = await rem.sendMessage(from, button)
                        createAutoDelete(IdButtonAutoDelete, buttonMessageListSend.key.id, buttonMessageListSend.key.remoteJid)
                    })
    
                } else if(message.selectedRowId.split(' ')[1].startsWith('down')) {
                    reply(from, '[WAIT] Sedang di proses⏳ silahkan tunggu ± 10 min!')
                    const isDownloadAll = message.selectedRowId.split(' ')[1] == 'down_all'
                    const dataLinkDownload = JSON.parse(message.selectedRowId.split('----')[1])
                    const clctResource = JSON.parse(message.selectedRowId.split('----')[2])
                    const oldButtonListId = message.selectedRowId.split('----')[3]
    
                    //AutoDel
                    const _autoDel = global.db['./lib/database/bot/msgDel.json']
                    const getMsgAutoDel = getAutoDelete(oldButtonListId)
                    if(getMsgAutoDel == undefined) return reply(from, 'Invalid!. Coba lagi')
                    await rem.deleteMessage(_autoDel[getMsgAutoDel].msgFrom, { id: _autoDel[getMsgAutoDel].msgId, remoteJid: _autoDel[getMsgAutoDel].msgFrom, fromMe: true })
                    global.db['./lib/database/bot/msgDel.json'].splice(getMsgAutoDel, 1)
    
                    await rem.sendFile(from, clctResource.img, 'downanime.png', `Judul : *${clctResource.title}*\n\n_${clctResource.url}_`, '', image)
    
                    let result = []
                    let url = []
                    let finalResult = []
                    let sSize = []
                    let finalSize = []
    
                    if(isDownloadAll) {
                        console.log(dataLinkDownload.length)
                        if(dataLinkDownload.length >= 50) return reply(from, 'Maaf, Bot tidak bisa mendownload lebih dari 50eps Karena keterbatasan bandwith')
                        let currentEps = 0
                        rem.sendText(from, 'Downloading...')
        
                        let checkS = undefined
                        let $ = undefined
                        let Search = undefined
    
                        for(let i = currentEps; i < dataLinkDownload.length; i++) {
                            await fetch(dataLinkDownload[currentEps].url)
                            .then(res => res.text()) 
                            .then(async (res) => {
                                const $ = cheerio.load(res)
        
                                if($('#venkonten > div.venser > div.venutama > div.download > ul > li:nth-child(1)').text() === '') {
                                    Search = await _notFoundQualityHandler(res, 3)
                                    if(Search == undefined) Search = await _notFoundQualityHandler(res, 2) 
                                    let splitSize = Search.size.split(' ')
                                    let size = Number(splitSize[0].replace(',', '.'))
                                    if(splitSize[1] == 'Gb' || splitSize[1] == 'GB') size = Number(size * 1024)
        
                                    let loop = 1
                                    console.log(loop)
                                    for(let i = 0; i < loop; i++) {
                                        if(size >= 100) {
                                            if(Number(3 - i) <= -1) {
                                                console.log('Error! Big')
                                                Search = await _notFoundQualityHandler(res, 0)
                                            } else {
                                                Search = await _notFoundQualityHandler(res, 3-i)
                                                if(Search == undefined) Search = await _notFoundQualityHandler(res, 2-i)
                                                splitSize = Search.size.split(' ')
                                                size = Number(splitSize[0].replace(',', '.'))
                                                if(splitSize[1] == 'Gb' || splitSize[1] == 'GB') size = Number(size * 1024)
                                                loop += 1
                                            }
                                        }
                                    }
                                    currentEps += 1
                                    finalResult.push({ id: currentEps, res: Search })
                                } else {
                                    await fetch(dataLinkDownload[currentEps].url)
                                    .then(res => res.text()) 
                                    .then(async (res) => {
                                        Search = await _epsQualityFunction(res, 3)  
                                        if(Search == undefined) Search = await _epsQualityFunction(res, 2)
                                        let splitSize = Search.size.split(' ')
                                        let size = Number(splitSize[0].replace(',', '.'))
                                        if(splitSize[1] == 'Gb' || splitSize[1] == 'GB') size = Number(size * 1024)
        
                                        let loop = 1
                                        for(let i = 0; i < loop; i++) {
                                            if(size >= 100) {
                                                if(Number(3 - i) <= -1) {
                                                    console.log('Error! Big')
                                                    Search = await _epsQualityFunction(res, 0)
                                                } else {
                                                    Search = await _epsQualityFunction(res, 3-i)
                                                    if(Search == undefined) Search = await _epsQualityFunction(res, 2-i)
                                                    splitSize = Search.size.split(' ')
                                                    size = Number(splitSize[0].replace(',', '.'))
                                                    if(splitSize[1] == 'Gb' || splitSize[1] == 'GB') size = Number(size * 1024)
                                                    loop += 1
                                                }
                                            }
                                        }
                                        currentEps += 1
                                        console.log(currentEps)
                                        finalResult.push({ id: currentEps, res: Search })
                                    })
                                }
                            })
                        }
                        rem.sendText(from, 'Sending...')
                        let posDownloadLink = undefined
                        for(let i = 0; i < finalResult.length; i++) {
                            posDownloadLink = await finalResult[i].res.download_links.findIndex(id => id.host.trim().toLowerCase() == 'racaty')
                            if(posDownloadLink == -1) posDownloadLink = await finalResult[i].res.download_links.findIndex(id => id.host.trim().toLowerCase() == 'zippyshare')
                            if(posDownloadLink == -1) {
                                let linkListAnime = ``
                                for(let a = 0; a < finalResult[i].res.download_links.length; a++) {
                                    linkListAnime += `${a+1}. *${finalResult[i].res.download_links[a].host}*\n${finalResult[i].res.download_links[a].link}\n\n`
                                }
                                reply(from, `Error!. tidak dapat mengirim\n\nJudul : ${finalResult[i].res.title}\nQuality : ${finalResult[i].res.quality}\nSize : ${finalResult[i].res.size}Link : \n${linkListAnime}`)
                            } else {
                                const identifyHostLink = finalResult[i].res.download_links[posDownloadLink].host
                                let linkRawDownloadAnime = finalResult[i].res.download_links[posDownloadLink].link
                                let linkDownloadAnime = undefined
        
                                if(identifyHostLink.trim().toLowerCase() == 'zippyshare') {
                                    linkDownloadAnime = await GetLink(linkRawDownloadAnime)
        
                                    if(!linkDownloadAnime.error) {
                                        try {
                                            await rem.sendFile(from, linkDownloadAnime.url, linkDownloadAnime.name, '', '', document, 'video/mp4')
                                        } catch (err) {
                                            console.log(err)
                                            let linkListAnime = ``
                                            for(let a = 0; a < finalResult[i].res.download_links.length; a++) {
                                                linkListAnime += `${a+1}. *${finalResult[i].res.download_links[a].host}*\n${finalResult[i].res.download_links[a].link}\n\n`
                                            }
                                            reply(from, `Error!. tidak dapat mengirim\n\nJudul : ${finalResult[i].res.title}\nQuality : ${finalResult[i].res.quality}\nSize : ${finalResult[i].res.size}Link : \n${linkListAnime}`)
                                        }
                                    } else {
                                        let loopCheckZippy = 1
                                        for(let i = 0; i < loopCheckZippy; i++) {
                                            linkDownloadAnime = await GetLink(linkRawDownloadAnime)
                                            if(linkDownloadAnime.error) {
                                                if(loopCheckZippy < 10) {
                                                    loopCheckZippy += 1
                                                } else {
                                                    linkDownloadAnime = undefined
                                                }
                                            }
                                        }
        
                                        if(linkDownloadAnime == undefined) {
                                            posDownloadLink = await finalResult[i].res.download_links.findIndex(id => id.host.trim().toLowerCase() == 'racaty')
                                            if(posDownloadLink == -1) {
                                                let linkListAnime = ``
                                                for(let a = 0; a < finalResult[i].res.download_links.length; a++) {
                                                    linkListAnime += `${a+1}. *${finalResult[i].res.download_links[a].host}*\n${finalResult[i].res.download_links[a].link}\n\n`
                                                }
                                                reply(from, `Error!. tidak dapat mengirim\n\nJudul : ${finalResult[i].res.title}\nQuality : ${finalResult[i].res.quality}\nSize : ${finalResult[i].res.size}Link : \n${linkListAnime}`)
                                            } else {
                                                linkRawDownloadAnime = finalResult[i].res.download_links[posDownloadLink].link
                                                linkDownloadAnime = await getLinkRacaty(linkRawDownloadAnime)
    
                                                if(linkDownloadAnime == undefined || linkDownloadAnime.error) {
                                                    linkDownloadAnime == undefined ? console.log('error no file') : console.log(linkDownloadAnime.errId)
                                                    linkDownloadAnime == undefined ? console.log('error no file') :  console.log(linkDownloadAnime.err)
    
                                                    let linkListAnime = ``
                                                    for(let a = 0; a < finalResult[i].res.download_links.length; a++) {
                                                        linkListAnime += `${a+1}. *${finalResult[i].res.download_links[a].host}*\n${finalResult[i].res.download_links[a].link}\n\n`
                                                    }
                                                    reply(from, `Error!. tidak dapat mengirim, mungkin file telah dihapus\n\nJudul : ${finalResult[i].res.title}\nQuality : ${finalResult[i].res.quality}\nSize : ${finalResult[i].res.size}Link : \n${linkListAnime}`)
                                                } else {
                                                    await rem.sendFile(from, linkDownloadAnime.link, linkDownloadAnime.title, '', '', document, 'video/mp4')
                                                }
                                            }
                                        } else {
                                            try {
                                                await rem.sendFile(from, linkDownloadAnime.url, linkDownloadAnime.name, '', '', document, 'video/mp4')   
                                            } catch (err) {
                                                let linkListAnime = ``
                                                for(let a = 0; a < finalResult[i].res.download_links.length; a++) {
                                                    linkListAnime += `${a+1}. *${finalResult[i].res.download_links[a].host}*\n${finalResult[i].res.download_links[a].link}\n\n`
                                                }
                                                reply(from, `Error!. tidak dapat mengirim\n\nJudul : ${finalResult[i].res.title}\nQuality : ${finalResult[i].res.quality}\nSize : ${finalResult[i].res.size}Link : \n${linkListAnime}`)
                                            }
                                        }
                                    }
                                } else {
                                    linkDownloadAnime = await getLinkRacaty(linkRawDownloadAnime)
    
                                    if(linkDownloadAnime == undefined || linkDownloadAnime.error) {
                                        linkDownloadAnime == undefined ? console.log('error no file') : console.log(linkDownloadAnime.errId)
                                        linkDownloadAnime == undefined ? console.log('error no file') :  console.log(linkDownloadAnime.err)
    
                                        let linkListAnime = ``
                                        for(let a = 0; a < finalResult[i].res.download_links.length; a++) {
                                            linkListAnime += `${a+1}. *${finalResult[i].res.download_links[a].host}*\n${finalResult[i].res.download_links[a].link}\n\n`
                                        }
                                        reply(from, `Error!. tidak dapat mengirim\n\nJudul : ${finalResult[i].res.title}\nQuality : ${finalResult[i].res.quality}\nSize : ${finalResult[i].res.size}Link : \n${linkListAnime}`)
                                    } else {
                                        try {
                                            await rem.sendFile(from, linkDownloadAnime.link, linkDownloadAnime.title, '', '', document, 'video/mp4')
                                        } catch (err) {
                                            console.log(err)
                                            let linkListAnime = ``
                                            for(let a = 0; a < finalResult[i].res.download_links.length; a++) {
                                                linkListAnime += `${a+1}. *${finalResult[i].res.download_links[a].host}*\n${finalResult[i].res.download_links[a].link}\n\n`
                                            }
                                            reply(from, `Error!. tidak dapat mengirim\n\nJudul : ${finalResult[i].res.title}\nQuality : ${finalResult[i].res.quality}\nSize : ${finalResult[i].res.size}Link : \n${linkListAnime}`)
                                        }
                                    }
                                }
                            }
                        }
    
                    } else {
                        let Search = undefined
                        rem.sendText(from, 'Downloading...')
    
                        console.log(dataLinkDownload.url)
                        await fetch(dataLinkDownload.url)
                            .then(res => res.text()) 
                            .then(async (res) => {
                                const $ = cheerio.load(res)
    
                                if($('#venkonten > div.venser > div.venutama > div.download > ul > li:nth-child(1)').text() === '') {
                                    Search = await _notFoundQualityHandler(res, 3)
                                    if(Search == undefined) Search = await _notFoundQualityHandler(res, 2) 
                                    let splitSize = Search.size.split(' ')
                                    let size = Number(splitSize[0].replace(',', '.'))
                                    if(splitSize[1] == 'Gb' || splitSize[1] == 'GB') size = Number(size * 1024)
        
                                    let loop = 1
                                    console.log(loop)
                                    for(let i = 0; i < loop; i++) {
                                        if(size >= 100) {
                                            if(Number(3 - i) <= -1) {
                                                console.log('Error! Big')
                                                Search = await _notFoundQualityHandler(res, 0)
                                            } else {
                                                Search = await _notFoundQualityHandler(res, 3-i)
                                                if(Search == undefined) Search = await _notFoundQualityHandler(res, 2-i)
                                                splitSize = Search.size.split(' ')
                                                size = Number(splitSize[0].replace(',', '.'))
                                                if(splitSize[1] == 'Gb' || splitSize[1] == 'GB') size = Number(size * 1024)
                                                loop += 1
                                            }
                                        }
                                    }
    
                                } else {
                                    Search = await _epsQualityFunction(res, 3)  
                                    if(Search == undefined) Search = await _epsQualityFunction(res, 2)
                                    let splitSize = Search.size.split(' ')
                                    let size = Number(splitSize[0].replace(',', '.'))
                                    if(splitSize[1] == 'Gb' || splitSize[1] == 'GB') size = Number(size * 1024)
    
                                    let loop = 1
                                    for(let i = 0; i < loop; i++) {
                                        if(size >= 100) {
                                            if(Number(3 - i) <= -1) {
                                                console.log('Error! Big')
                                                Search = await _epsQualityFunction(res, 0)
                                            } else {
                                                Search = await _epsQualityFunction(res, 3-i)
                                                if(Search == undefined) Search = await _epsQualityFunction(res, 2-i)
                                                splitSize = Search.size.split(' ')
                                                size = Number(splitSize[0].replace(',', '.'))
                                                if(splitSize[1] == 'Gb' || splitSize[1] == 'GB') size = Number(size * 1024)
                                                loop += 1
                                            }
                                        }
                                    }
                                }
    
                                let posDownloadLink = await Search.download_links.findIndex(id => id.host.trim().toLowerCase() == 'racaty')
                                if(posDownloadLink == -1) posDownloadLink = await Search.download_links.findIndex(id => id.host.trim().toLowerCase() == 'zippyshare')
                                if(posDownloadLink == -1) {
                                    console.log('Error no url supported')
                                    console.log(Search.download_links)
                                    let linkListAnime = ``
                                    for(let a = 0; a < Search.download_links.length; a++) {
                                        linkListAnime += `${a+1}. *${Search.download_links[a].host}*\n${Search.download_links[a].link}\n\n`
                                    }
                                    reply(from, `Error!. tidak dapat mengirim\n\nJudul : ${Search.title}\nQuality : ${Search.quality}\nSize : ${Search.size}Link : \n${linkListAnime}`)
                                } else {
                                    const identifyHostLink = Search.download_links[posDownloadLink].host
                                    let linkDownloadAnime = undefined
    
                                    console.log(identifyHostLink)
                                    if(identifyHostLink.trim().toLowerCase() == 'zippyshare') {
                                        linkDownloadAnime = await GetLink(Search.download_links[posDownloadLink].link)
            
                                        if(!linkDownloadAnime.error) {
                                            try {
                                                await rem.sendFile(from, linkDownloadAnime.url, linkDownloadAnime.name, '', '', document, 'video/mp4')
                                            } catch (err) {
                                                console.log(err)
                                                let linkListAnime = ``
                                                for(let a = 0; a < Search.download_links.length; a++) {
                                                    linkListAnime += `${a+1}. *${Search.download_links[a].host}*\n${Search.download_links[a].link}\n\n`
                                                }
                                                reply(from, `Error!. tidak dapat mengirim\n\nJudul : ${Search.title}\nQuality : ${Search.quality}\nSize : ${Search.size}Link : \n${linkListAnime}`)
                                            }
                                        } else {
                                            let loopCheckZippy = 1
                                            for(let i = 0; i < loopCheckZippy; i++) {
                                                linkDownloadAnime = await GetLink(Search.download_links[posDownloadLink].link)
                                                if(linkDownloadAnime.error) {
                                                    if(loopCheckZippy < 10) {
                                                        loopCheckZippy += 1
                                                    } else {
                                                        linkDownloadAnime = undefined
                                                    }
                                                }
                                            }
            
                                            if(linkDownloadAnime == undefined) {
                                                posDownloadLink = await Search.download_links.findIndex(id => id.host.trim().toLowerCase() == 'racaty')
                                                if(posDownloadLink == -1) {
                                                    let linkListAnime = ``
                                                    for(let a = 0; a < Search.download_links.length; a++) {
                                                        linkListAnime += `${a+1}. *${Search.download_links[a].host}*\n${Search.download_links[a].link}\n\n`
                                                    }
                                                    reply(from, `Error!. tidak dapat mengirim\n\nJudul : ${Search.title}\nQuality : ${Search.quality}\nSize : ${Search.size}Link : \n${linkListAnime}`)
                                                } else {
                                                    linkDownloadAnime = await getLinkRacaty(Search.download_links[posDownloadLink].link)
        
                                                    if(linkDownloadAnime == undefined || linkDownloadAnime.error) {
                                                        linkDownloadAnime == undefined ? console.log('error no file') : console.log(linkDownloadAnime.errId)
                                                        linkDownloadAnime == undefined ? console.log('error no file') :  console.log(linkDownloadAnime.err)
        
                                                        let linkListAnime = ``
                                                        for(let a = 0; a < Search.download_links.length; a++) {
                                                            linkListAnime += `${a+1}. *${Search.download_links[a].host}*\n${Search.download_links[a].link}\n\n`
                                                        }
                                                        reply(from, `Error!. tidak dapat mengirim, mungkin file telah dihapus\n\nJudul : ${Search.title}\nQuality : ${Search.quality}\nSize : ${Search.size}Link : \n${linkListAnime}`)
                                                    } else {
                                                        await rem.sendFile(from, linkDownloadAnime.link, linkDownloadAnime.title, '', '', document, 'video/mp4')
                                                    }
                                                }
                                            } else {
                                                try {
                                                    await rem.sendFile(from, linkDownloadAnime.url, linkDownloadAnime.name, '', '', document, 'video/mp4')   
                                                } catch (err) {
                                                    console.log(err)
                                                    let linkListAnime = ``
                                                    for(let a = 0; a < Search.download_links.length; a++) {
                                                        linkListAnime += `${a+1}. *${Search.download_links[a].host}*\n${Search.download_links[a].link}\n\n`
                                                    }
                                                    reply(from, `Error!. tidak dapat mengirim\n\nJudul : ${Search.title}\nQuality : ${Search.quality}\nSize : ${Search.size}Link : \n${linkListAnime}`)
                                                }
                                            }
                                        }
                                    } else {
                                        linkDownloadAnime = await getLinkRacaty(Search.download_links[posDownloadLink].link)
    
                                        if(linkDownloadAnime == undefined || linkDownloadAnime.error) {
                                            linkDownloadAnime == undefined ? console.log('error no file') : console.log(linkDownloadAnime.errId)
                                            linkDownloadAnime == undefined ? console.log('error no file') :  console.log(linkDownloadAnime.err)
        
                                            let linkListAnime = ``
                                            for(let a = 0; a < Search.download_links.length; a++) {
                                                linkListAnime += `${a+1}. *${Search.download_links[a].host}*\n${Search.download_links[a].link}\n\n`
                                            }
                                            reply(from, `Error!. tidak dapat mengirim\n\nJudul : ${Search.title}\nQuality : ${Search.quality}\nSize : ${Search.size}Link : \n${linkListAnime}`)
    
                                        } else {
                                            try {
                                                await rem.sendFile(from, linkDownloadAnime.link, linkDownloadAnime.title, '', '', document, 'video/mp4')
                                            } catch (err) {
                                                console.log(err)
                                                let linkListAnime = ``
                                                for(let a = 0; a < Search.download_links.length; a++) {
                                                    linkListAnime += `${a+1}. *${Search.download_links[a].host}*\n${Search.download_links[a].link}\n\n`
                                                }
                                                reply(from, `Error!. tidak dapat mengirim\n\nJudul : ${Search.title}\nQuality : ${Search.quality}\nSize : ${Search.size}Link : \n${linkListAnime}`)
                                            }
                                        }
                                    }
                                }
                            })
                            
                    }
                }
               break
        
            default:
                break;
        }
    } catch (err) {
        console.log(err)
    }
}