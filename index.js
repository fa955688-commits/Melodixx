const { Client, GatewayIntentBits, Routes, REST, ApplicationCommandOptionType } = require('discord.js');
const { Player } = require('discord-player');
const express = require('express');

// 1. Web Server for Render Hosting
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Melodix Bot is Online!'));
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

// 3. Initialize Music Player
const player = new Player(client, {
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25
    }
});

// Global Player Error Handlers (Fixes the UnhandledEventsWarning)
player.events.on('error', (queue, error) => {
    console.log(`[Player Error] ${error.message}`);
});
player.events.on('playerError', (queue, error) => {
    console.log(`[Connection Error] ${error.message}`);
});

// Load default extractors
player.extractors.loadDefault();

// Track Start Event
player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send(`🎶 Now playing: **${track.title}**`);
});

// Slash Command Definition
const commands = [
    {
        name: 'play',
        description: 'Play a song from YouTube/Spotify',
        options: [
            {
                name: 'song',
                type: ApplicationCommandOptionType.String,
                description: 'The name or link of the song',
                required: true
            }
        ]
    }
];

// Register Slash Commands on Ready
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_CLIENT_TOKEN);
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('Successfully reloaded application (/) commands.');
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
        context.channel.send('Something went wrong! Could not play the track.');
    }
}

// 4. Slash Command Handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'play') {
        const query = interaction.options.getString('song');
        const channel = interaction.member?.voice.channel;

        if (!channel) return interaction.reply({ content: 'You need to join a voice channel first!', ephemeral: true });
        
        await interaction.reply(`🔍 Searching for **${query}**...`);
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

        await message.reply(`🔍 Searching for **${query}**...`);
        await handlePlay(channel, query, message);
    }
});

client.login(process.env.DISCORD_CLIENT_TOKEN);
