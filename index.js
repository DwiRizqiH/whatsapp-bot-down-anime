const {
    default: makeWASocket,
    fetchLatestBaileysVersion,
    useSingleFileAuthState,
    DisconnectReason,
    makeInMemoryStore,
    generateWAMessageFromContent, 
    proto
    //MessageType,
} = require('@adiwajshing/baileys')

const axios = require('axios')
const fetch = require('node-fetch')
const exec = require('child_process').exec;
const imageThumbnail = require('image-thumbnail')

const https = require('https')
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const MessageType = { "document": "documentMessage", "video": "videoMessage", "image": "imageMessage", "audio": "audioMessage", "sticker": "stickerMessage", "buttonsMessage": "buttonsMessage", "extendedText": "extendedTextMessage", "contact": "contactMessage", "location": "locationMessage", "liveLocation": "liveLocationMessage", "product": "productMessage", "list": "listMessage", "listResponse": "listResponseMessage" }

const { state, saveState } = useSingleFileAuthState('./session.data.json')
const start = async () => {
    const { version } = await fetchLatestBaileysVersion()
    let rem = makeWASocket({ version, printQRInTerminal: true, auth: state, getMessage: async key => { 
        console.log('getMessage_main', key)
        return getMessageFromDb(key.id, rem.user.jid) || undefined
    } })

    console.log('------------------------------------------------')
    console.log('Rem Bot')
    console.log('------------------------------------------------')
    console.log('[DEV] Mizuki')
    console.log('[SERVER] Server Started!')

    rem.ev.on('creds.update', saveState)

    rem.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if(connection == 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if(lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                console.log('- connection closed, reconnecting...')
                await exec('pm2 restart index')
            } else {
                console.log('+ connection closed', lastDisconnect.error, ', reconnecting ', shouldReconnect)
            }
        } else if(connection === 'open') {
            console.log('opened connection')

            rem.user.jid = rem.user.id.split('@')[0].split(':')[0] + '@s.whatsapp.net'
            if(global.db == undefined) global.db = []
            if(global.messageBody == undefined) global.messageBody = []
            if(global.messageBody[`./lib/message/${rem.user.jid}.json`] == undefined) global.messageBody[`./lib/message/${rem.user.jid}.json`] = []
        }
    })

    //Hanlde incoming Message
    rem.ev.on('messages.upsert', async (chatUpdate) => {
        let message = chatUpdate.messages[0]
        let messageRaw = chatUpdate.messages[0]
        global.messageBody[`./lib/message/${rem.user.jid}.json`].push(message)

        if(global.lastMessages == undefined) global.lastMessages = []
        global.lastMessages[message.key.remoteJid] = message
        if(!message.key.fromMe) return 'not_fromMe'


        // Aditional Function
         const reply = async (from, teks) => {
            return await rem.sendMessage(from, { text: teks }, { quoted: message })
        }

        rem.sendText = async (from, teks) => {
            return await rem.sendMessage(from, { text: teks })
        }

        rem.sendFile = async (from, file, title = '', caption = '', isReply = '', type = '', mimetype = '') => {
            if(Buffer.isBuffer(file)) {
                var res = file
            } else if(file.startsWith('https://') || file.startsWith('http://')) {
                var response = await axios.get(file, { responseType: 'arraybuffer', httpsAgent })
                var res = response.data
            } else if(Array.isArray(file)) {
                if(type == MessageType.document || type == MessageType.video || type == MessageType.audio || type == MessageType.sticker) {
                    var res = { url: file.url }
                } else if(type == MessageType.image) {
                    if(file.url.startsWith('https://') || file.url.startsWith('http://')) {
                        var response = await fetch(file.url, { agent: httpsAgent })
                        var res = await response.buffer()
                    } else if(Buffer.isBuffer(file.url)) {
                        var res = file.url
                    }
                }
            } else {
                var res = await fs.readFileSync(file)
            }

            if(type != '') {
                if(type == MessageType.image) {
                    let options = { image: res, fileName: title, caption: caption }
                    try {
                        const thumb = await imageThumbnail(res)
                        options = { image: res, fileName: title, caption: caption, jpegThumbnail: thumb }
                        return await rem.sendMessage(from, options, { quoted: isReply })
                    } catch (err) {
                        console.log(err)
                        return await rem.sendMessage(from, options, { quoted: isReply })
                    }
                } else if(type == MessageType.video) {
                    let options = { video: res, fileName: title, caption: caption }
                    return await rem.sendMessage(from, options, { quoted: isReply })
                } else if(type == MessageType.audio) {
                    let options = { audio: res, fileName: title, mimetype: mimetype }
                    return await rem.sendMessage(from, options, { quoted: isReply })
                } else if(type == MessageType.document) {
                    let options = { document: res, fileName: title, mimetype: mimetype }
                    return await rem.sendMessage(from, options, { quoted: isReply })
                } else if(type == MessageType.sticker) {
                    let options = {}
                    if(isReply != '') {
                        options = { quoted: isReply }
                    }
                    return await rem.sendMessage(from, { sticker: res }, options)
                }
            }
        }

        rem.deleteMessage = async (from, payload) => {
            if(payload.fromMe != undefined && payload.fromMe == true) {
                await rem.sendMessage(from, { delete: { remoteJid: payload.remoteJid, fromMe: true, id: payload.id, participant: rem.user.id } })
            } else {
                await rem.sendMessage(from, { delete: payload.key })
            }
        }

        message = require('./lib/Message')(rem, message)
        require('./client')(rem, reply, message, MessageType)
    })
}

function getMessageFromDb (id, number) {
    const findMessage = global.messageBody[`./lib/message/${number}.json`].findIndex(all => all.key.id == id)
    if(findMessage == -1) return undefined
    const findedMessage = global.messageBody[`./lib/message/${number}.json`][findMessage]?.message
    return findedMessage
}

start()
    .catch(error => console.log(error))