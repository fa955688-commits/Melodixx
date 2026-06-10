const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { Poru } = require('poru');
const express = require('express');

// 1. Web Server for Hosting
const app = express();
app.get('/', (req, res) => res.send('Lavalink Bot is Online!'));
app.listen(process.env.PORT || 3000);

// 2. Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 3. Lavalink Nodes Configuration 
const nodes = [
    {
        name: 'Free-Lavalink',
        host: 'lavalink.jonathansk.com', //ট
        port: 443,
        password: 'https://dsc.gg/ajdevserver',
        secure: true
    }
];

// Initialize Poru (Lavalink Client)
client.poru = new Poru(client, nodes, {
    apple: true,
    spotify: true
});

// Lavalink Events
client.poru.on('nodeConnect', (node) => console.log(`🎵 Lavalink Node "${node.name}" Connected successfully!`));
client.poru.on('nodeError', (node, error) => console.log(`❌ Lavalink Node Error: ${error.message}`));

client.poru.on('trackStart', (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#00ffbb')
        .setTitle('🎶 Now Playing (Lavalink Stream)')
        .setDescription(`[${track.info.title}](${track.info.uri})`)
        .setThumbnail(track.info.image)
        .addFields(
            { name: 'Author', value: track.info.author, inline: true },
            { name: 'Duration', value: new Date(track.info.length).toISOString().substr(11, 8), inline: true }
        )
        .setFooter({ text: 'Powered by Lavalink Engine' });

    channel.send({ embeds: [embed] });
});

// Voice State Update for Lavalink
client.on('voiceStateUpdate', (oldState, newState) => {
    client.poru.sendRawData(oldState.guild.id, {
        op: 'voiceUpdate',
        guildId: newState.guild.id,
        sessionId: newState.sessionId,
        event: newState.voiceChannel // Handled automatically by Poru
    });
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.poru.init(client); // Initialize Lavalink
});

// 4. Prefix Command Handler (!!play)
const PREFIX = '!!';
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('Please provide a song name or link!');

        const voiceChannel = message.member?.voice.channel;
        if (!voiceChannel) return message.reply('You need to join a voice channel first!');

        // Create or get the player for the guild
        const player = client.poru.createConnection({
            guildId: message.guild.id,
            voiceChannel: voiceChannel.id,
            textChannel: message.channel.id,
            deaf: true
        });

        // Search track via Lavalink
        const resolve = await client.poru.resolve(query);
        
        if (resolve.loadType === 'LOAD_FAILED' || resolve.loadType === 'NO_MATCHES') {
            return message.reply('❌ No results found or Lavalink failed to load.');
        }

        if (resolve.loadType === 'PLAYLIST_LOADED') {
            for (const track of resolve.tracks) {
                player.queue.add(track);
            }
            message.reply(`🎶 Added playlist **${resolve.playlistInfo.name}** with ${resolve.tracks.length} songs.`);
            if (!player.isPlaying) player.play();
        } else {
            const track = resolve.tracks[0];
            player.queue.add(track);
            message.reply(`🔍 Added to queue: **${track.info.title}**`);
            if (!player.isPlaying) player.play();
        }
    }
});

client.login(process.env.DISCORD_CLIENT_TOKEN);
