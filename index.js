const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');
const express = require('express');

// 1. Web Server for Render Hosting
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Melodix Bot is Online!'));
app.listen(port, () => console.log(`Web server running on port ${port}`));

// 2. Initialize Discord Client with Intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 3. Initialize Music Player
const player = new Player(client);
player.extractors.loadDefault();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}! Ready to play music.`);
});

// 4. Prefix Command Handler
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Command: !play [song name or link]
    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('Please provide a song name or a link!');

        const channel = message.member?.voice.channel;
        if (!channel) return message.reply('You need to join a voice channel first!');

        await message.reply(`🔍 Searching for **${query}**...`);

        try {
            const { track } = await player.play(channel, query, {
                nodeOptions: {
                    metadata: message
                }
            });
            return message.channel.send(`🎶 Now playing: **${track.title}**`);
        } catch (e) {
            console.error(e);
            return message.channel.send('Something went wrong! Could not play the track.');
        }
    }
});

client.login(process.env.DISCORD_CLIENT_TOKEN);
