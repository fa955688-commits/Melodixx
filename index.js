const { Client, GatewayIntentBits, Routes, REST, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { Player } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const express = require('express');

// 1. Light Web Server for Render
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Melodix Pro is Running!'));
app.listen(port, () => console.log(`Web server active on port ${port}`));

// 2. Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 3. Initialize Music Player with Optimized Buffering
const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 22 // মেমোরি বাঁচাতে বাফারিং সাইজ কমানো হয়েছে
    }
});

// Global Player Error Handlers
player.events.on('error', (queue, error) => console.log(`[Player Error] ${error.message}`));
player.events.on('playerError', (queue, error) => console.log(`[Connection Error] ${error.message}`));

// Load only the most stable Youtubei extractor (Supports YouTube, Spotify links via bridge)
async function initPlayer() {
    await player.extractors.register(YoutubeiExtractor, {});
    console.log('Optimized Music Engine Loaded!');
}
initPlayer();

// Premium Embed Notification
player.events.on('playerStart', (queue, track) => {
    const embed = new EmbedBuilder()
        .setColor('#00ffbb')
        .setTitle('🎶 Now Playing')
        .setDescription(`[${track.title}](${track.url})`)
        .setThumbnail(track.thumbnail)
        .addFields(
            { name: 'Duration', value: track.duration, inline: true },
            { name: 'Requested By', value: `${queue.metadata.author}`, inline: true }
        )
        .setFooter({ text: 'Melodix Premium' })
        .setTimestamp();

    queue.metadata.channel.send({ embeds: [embed] });
});

// Slash Command Definition
const commands = [
    {
        name: 'play',
        description: 'Play any song/link (Spotify/YouTube)',
        options: [
            {
                name: 'song',
                type: ApplicationCommandOptionType.String,
                description: 'Song name or link',
                required: true
            }
        ]
    }
];

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_CLIENT_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Slash commands synced.');
    } catch (error) {
        console.error(error);
    }
});

async function handlePlay(channel, query, context) {
    try {
        await player.play(channel, query, {
            nodeOptions: {
                metadata: context,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 30000,
                leaveOnEnd: false
            }
        });
    } catch (e) {
        console.error(e);
        context.channel.send('❌ Out of memory or stream error. Please try again!');
    }
}

// 4. Slash Command Handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'play') {
        const query = interaction.options.getString('song');
        const channel = interaction.member?.voice.channel;
        if (!channel) return interaction.reply({ content: 'You need to join a voice channel first!', ephemeral: true });
        
        await interaction.reply(`🔍 Processing...`);
        await handlePlay(channel, query, interaction);
    }
});

// 5. Prefix Command Handler
const PREFIX = '!!';
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('Please provide a song name or link!');
        const channel = message.member?.voice.channel;
        if (!channel) return message.reply('You need to join a voice channel first!');

        await message.reply(`🔍 Processing...`);
        await handlePlay(channel, query, message);
    }
});

client.login(process.env.DISCORD_CLIENT_TOKEN);
