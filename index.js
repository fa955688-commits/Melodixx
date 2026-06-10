const { Client, GatewayIntentBits, Routes, REST, ApplicationCommandOptionType, EmbedBuilder } = require('discord.js');
const { Player } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const { SpotifyExtractor, SoundCloudExtractor } = require('@discord-player/extractor');
const express = require('express');

// 1. Web Server for Render Hosting
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Melodix Pro is Online!'));
app.listen(port, () => console.log(`Web server running on port ${port}`));

// 2. Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 3. Initialize Music Player with Audio Configurations
const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25
    }
});

// Global Player Error Handlers
player.events.on('error', (queue, error) => console.log(`[Player Error] ${error.message}`));
player.events.on('playerError', (queue, error) => console.log(`[Connection Error] ${error.message}`));

// Load all extractors properly
async function loadExtractors() {
    await player.extractors.register(YoutubeiExtractor, {});
    await player.extractors.register(SpotifyExtractor, {});
    await player.extractors.register(SoundCloudExtractor, {});
    console.log('All Professional Extractors Loaded Successfully!');
}
loadExtractors();

// Professional Embed Notification on Song Start
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
        .setTimestamp()
        .setFooter({ text: 'Melodix Premium Music Experience' });

    queue.metadata.channel.send({ embeds: [embed] });
});

// Slash Command Definition
const commands = [
    {
        name: 'play',
        description: 'Play any song or playlist',
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

// Register Slash Commands
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_CLIENT_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Application (/) commands registered.');
    } catch (error) {
        console.error(error);
    }
});

// Shared Play Function
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
        context.channel.send('❌ Could not process or stream this track. Try another link/name!');
    }
}

// 4. Slash Command Handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'play') {
        const query = interaction.options.getString('song');
        const channel = interaction.member?.voice.channel;
        if (!channel) return interaction.reply({ content: 'You need to join a voice channel first!', ephemeral: true });
        
        await interaction.reply(`🔍 Processing your request...`);
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
        if (!query) return message.reply('Please provide a song name or a link!');
        const channel = message.member?.voice.channel;
        if (!channel) return message.reply('You need to join a voice channel first!');

        await message.reply(`🔍 Processing your request...`);
        await handlePlay(channel, query, message);
    }
});

client.login(process.env.DISCORD_CLIENT_TOKEN);
